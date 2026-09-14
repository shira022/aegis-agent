//! Real AI provider client.
//!
//! Credentials are read from the OS keychain through [`crate::security`] and
//! real HTTP requests are issued to the provider endpoints declared in
//! [`providers`]. The module never logs, echoes or returns API keys or
//! `Authorization` headers; when a provider has no usable credential the call
//! fails with an explicit "not configured" error instead of fabricating output.
//!
//! All TypeScript-facing response shapes are unchanged: `AiGenerationResponse`
//! and `AiProviderStatus` keep their exact field names.

mod providers;

use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::ipc::AppState;
use crate::security;

/// Provider used when the caller does not name one.
pub const DEFAULT_PROVIDER: &str = "openai";

const HTTP_TIMEOUT: Duration = Duration::from_secs(60);
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationRequest {
    pub prompt: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub context: Option<String>,
    /// Required for `azure-foundry` and `openai-compatible`.
    pub base_url: Option<String>,
    /// Required for `gcp-vertexai` and `aws-bedrock`.
    pub region: Option<String>,
    /// Required for `gcp-vertexai`.
    pub project_id: Option<String>,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationResponse {
    pub script: String,
    pub language: String,
    pub mocked: bool,
    pub model: String,
    pub prompt_hash: String,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderStatus {
    pub provider: String,
    pub configured: bool,
    pub mocked: bool,
}

/// Stable FNV-1a 64-bit hash, implemented locally to avoid a dependency.
pub fn fnv1a_64(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// Hex-encoded stable prompt hash.
pub fn prompt_hash(prompt: &str) -> String {
    format!("{:016x}", fnv1a_64(prompt))
}

/// Install the rustls crypto provider exactly once. The reqwest client is
/// built with `rustls-no-provider`, so the process default must exist before a
/// client is created.
fn ensure_crypto_provider() {
    use std::sync::Once;
    static INSTALL: Once = Once::new();
    INSTALL.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

fn http_client() -> Result<reqwest::Client, String> {
    ensure_crypto_provider();
    reqwest::Client::builder()
        .timeout(HTTP_TIMEOUT)
        .connect_timeout(HTTP_CONNECT_TIMEOUT)
        .build()
        .map_err(|error| format!("failed to create http client: {error}"))
}

/// Send a prepared request and return the parsed JSON body. Error bodies are
/// truncated and never include request headers.
async fn send_prepared(request: providers::PreparedRequest) -> Result<Value, String> {
    let client = http_client()?;
    let mut builder = client.post(&request.url).json(&request.body);
    for (name, value) in &request.headers {
        builder = builder.header(name.as_str(), value.as_str());
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("provider request failed: {error}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("failed to read provider response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "provider returned HTTP {}: {}",
            status.as_u16(),
            providers::truncate(&body, providers::MAX_ERROR_BODY_CHARS)
        ));
    }

    serde_json::from_str(&body)
        .map_err(|error| format!("provider returned an invalid JSON response: {error}"))
}

/// Provider id from the request, falling back to [`DEFAULT_PROVIDER`].
fn requested_provider(request: &AiGenerationRequest) -> &str {
    request
        .provider
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_PROVIDER)
}

/// Whether a provider can be used given an optional stored credential.
fn is_configured(spec: &providers::ProviderSpec, api_key: Option<&str>) -> bool {
    spec.accepts_anonymous || api_key.map(|key| !key.is_empty()).unwrap_or(false)
}

/// Resolve the model for a request (ADR-009(a)).
///
/// The registry's `default_model` is only a UI suggestion: a request that
/// carries no resolvable model is an actionable error, never silently served
/// by the suggestion.
fn resolve_model(
    request_model: Option<&str>,
    spec: &providers::ProviderSpec,
) -> Result<String, String> {
    request_model
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .map(str::to_string)
        .ok_or_else(|| {
            format!(
                "no model specified for provider '{}': set a model in AI settings \
                 (registry suggestion: {})",
                spec.id, spec.default_model
            )
        })
}

/// Run a real generation request against the configured provider.
pub async fn generate(
    request: AiGenerationRequest,
    state: &AppState,
) -> Result<AiGenerationResponse, String> {
    let provider_id = requested_provider(&request).to_string();
    let spec = providers::provider_spec(&provider_id)
        .ok_or_else(|| format!("unsupported AI provider: {provider_id}"))?;

    let model = resolve_model(request.model.as_deref(), spec)?;

    let api_key = security::load_secret(state, &provider_id)?;
    if !is_configured(spec, api_key.as_deref()) {
        return Err(format!(
            "provider '{provider_id}' is not configured: no API key stored"
        ));
    }

    let prepared = providers::prepare_request(
        spec,
        api_key.as_deref(),
        &model,
        &request.prompt,
        request.context.as_deref(),
        request.base_url.as_deref(),
        request.region.as_deref(),
        request.project_id.as_deref(),
    )?;

    let body = send_prepared(prepared).await?;
    let script = providers::strip_code_fences(
        &providers::extract_text(spec.api_style, &body).map_err(|e| e.to_string())?,
    );

    Ok(AiGenerationResponse {
        script,
        language: "python".to_string(),
        mocked: false,
        model,
        prompt_hash: prompt_hash(&request.prompt),
    })
}

#[tauri::command]
pub async fn ai_generate_script(
    request: AiGenerationRequest,
    state: State<'_, AppState>,
) -> Result<AiGenerationResponse, String> {
    generate(request, state.inner()).await
}

#[tauri::command]
pub fn ai_provider_status(
    provider: Option<String>,
    state: State<'_, AppState>,
) -> Result<AiProviderStatus, String> {
    let provider_id = provider
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_PROVIDER);

    let spec = providers::provider_spec(provider_id)
        .ok_or_else(|| format!("unsupported AI provider: {provider_id}"))?;

    let api_key = security::load_secret(state.inner(), provider_id)?;

    Ok(AiProviderStatus {
        provider: provider_id.to_string(),
        configured: is_configured(spec, api_key.as_deref()),
        mocked: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(prompt: &str) -> AiGenerationRequest {
        AiGenerationRequest {
            prompt: prompt.to_string(),
            provider: None,
            model: None,
            context: None,
            base_url: None,
            region: None,
            project_id: None,
        }
    }

    #[test]
    fn prompt_hash_is_stable_and_line_safe() {
        assert_eq!(prompt_hash("abc"), prompt_hash("abc"));
        assert_ne!(prompt_hash("abc"), prompt_hash("abd"));
    }

    #[test]
    fn requested_provider_defaults_to_openai() {
        assert_eq!(requested_provider(&request("x")), DEFAULT_PROVIDER);
        let configured = AiGenerationRequest {
            provider: Some("anthropic".to_string()),
            ..request("x")
        };
        assert_eq!(requested_provider(&configured), "anthropic");
    }

    #[test]
    fn response_serializes_with_the_expected_camel_case_fields() {
        let response = AiGenerationResponse {
            script: "print('ok')".to_string(),
            language: "python".to_string(),
            mocked: false,
            model: "gpt-4o".to_string(),
            prompt_hash: "deadbeef".to_string(),
        };
        let value = serde_json::to_value(&response).expect("serialize");
        assert_eq!(value["promptHash"], "deadbeef");
        assert_eq!(value["mocked"], false);
        assert!(value.get("prompt_hash").is_none());
    }

    #[test]
    fn request_deserializes_optional_provider_settings() {
        let value = serde_json::json!({
            "prompt": "hello",
            "provider": "openai-compatible",
            "baseUrl": "https://example.test/v1"
        });
        let request: AiGenerationRequest = serde_json::from_value(value).expect("deserialize");
        assert_eq!(request.base_url.as_deref(), Some("https://example.test/v1"));
        assert_eq!(request.provider.as_deref(), Some("openai-compatible"));
    }

    #[test]
    fn configured_requires_a_key_unless_anonymous() {
        let openai = providers::provider_spec("openai").expect("openai");
        assert!(!is_configured(openai, None));
        assert!(is_configured(openai, Some("key")));

        let ollama = providers::provider_spec("ollama").expect("ollama");
        assert!(is_configured(ollama, None));
    }

    #[test]
    fn resolve_model_uses_the_requested_model() {
        let spec = providers::provider_spec("openai").expect("openai");
        assert_eq!(
            resolve_model(Some("my-local-model"), spec).expect("model"),
            "my-local-model"
        );
        assert_eq!(
            resolve_model(Some("  my-local-model  "), spec).expect("model"),
            "my-local-model"
        );
    }

    #[test]
    fn resolve_model_rejects_requests_without_a_usable_model() {
        let spec = providers::provider_spec("openai").expect("openai");
        for missing in [None, Some(""), Some("   ")] {
            let error = resolve_model(missing, spec).expect_err("must fail");
            assert!(error.contains("no model specified for provider 'openai'"));
            assert!(error.contains("set a model in AI settings"));
            assert!(error.contains(spec.default_model));
        }
    }

    #[test]
    fn real_provider_errors_never_contain_mock_data() {
        // A missing provider is reported explicitly, never mocked.
        let sample = request("x");
        let unknown = requested_provider(&sample);
        assert!(providers::provider_spec(unknown).is_some());
        let error = providers::prepare_request(
            providers::provider_spec("anthropic").expect("anthropic"),
            None,
            "claude-sonnet-4-20250514",
            "hello",
            None,
            None,
            None,
            None,
        )
        .err()
        .expect("not configured");
        assert!(error.contains("not configured"));
        assert!(!error.to_lowercase().contains("mock"));
    }
}
