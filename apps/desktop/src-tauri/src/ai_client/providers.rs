//! Provider registry and pure request/response shaping.
//!
//! Every provider id defined by the TypeScript registry in
//! `packages/@aegis/shared/src/types/provider.ts` is represented here, together
//! with the endpoint style and authentication style it actually speaks. The
//! functions in this module are pure: they never perform I/O and never touch a
//! credential, which makes them directly unit-testable.
//!
//! Secret handling: [`PreparedRequest`] holds an `Authorization`/`x-api-key`
//! header once it is built. It deliberately does not implement `Debug`, so it
//! can never be accidentally logged or formatted into an error string.

use serde_json::{json, Value};

/// Maximum number of provider-error characters echoed back to the caller.
pub const MAX_ERROR_BODY_CHARS: usize = 500;

/// System instruction shared by every provider for script generation.
pub const SCRIPT_SYSTEM_PROMPT: &str = "\
You are a code generation engine for robotic process automation (RPA).
Generate deterministic, safe Python code for the user's request.
Return only the Python source code: no markdown code fences, no commentary.";

const DEFAULT_MAX_TOKENS: u64 = 2048;
const GEMINI_API_VERSION: &str = "v1beta";
const AZURE_API_VERSION: &str = "2024-02-15-preview";

/// Wire protocol a provider speaks.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApiStyle {
    /// OpenAI-compatible `POST {base}/chat/completions`.
    OpenAiChat,
    /// Anthropic `POST {base}/messages`.
    AnthropicMessages,
    /// Gemini `POST {base}/models/{model}:generateContent`.
    GeminiGenerateContent,
    /// AWS Bedrock `POST {base}/model/{model}/invoke` (Anthropic body).
    BedrockInvoke,
}

/// How the credential is attached to the request.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuthStyle {
    /// `Authorization: Bearer <key>`
    Bearer,
    /// `x-api-key: <key>` plus the required `anthropic-version` header.
    AnthropicKey,
    /// `x-goog-api-key: <key>` (keeps the secret out of the URL).
    GeminiKey,
    /// Azure `api-key: <key>`.
    AzureKey,
}

/// Static description of a provider.
///
/// Some fields (display name, region/project requirements) describe the
/// registry for callers and tests, so they are intentionally retained even
/// when the HTTP layer does not need them.
#[allow(dead_code)]
pub struct ProviderSpec {
    pub id: &'static str,
    pub display_name: &'static str,
    pub api_style: ApiStyle,
    pub auth_style: AuthStyle,
    /// Empty when the endpoint can only come from the caller (custom/azure).
    pub default_base_url: &'static str,
    pub default_model: &'static str,
    pub requires_base_url: bool,
    pub requires_region: bool,
    pub requires_project_id: bool,
    /// Local servers such as Ollama do not require a real credential.
    pub accepts_anonymous: bool,
}

/// The canonical provider registry. Keep in sync with the TypeScript
/// `PROVIDER_REGISTRY`.
pub const PROVIDERS: &[ProviderSpec] = &[
    ProviderSpec {
        id: "openai",
        display_name: "OpenAI",
        api_style: ApiStyle::OpenAiChat,
        auth_style: AuthStyle::Bearer,
        default_base_url: "https://api.openai.com/v1",
        default_model: "gpt-4o",
        requires_base_url: false,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "anthropic",
        display_name: "Anthropic",
        api_style: ApiStyle::AnthropicMessages,
        auth_style: AuthStyle::AnthropicKey,
        default_base_url: "https://api.anthropic.com/v1",
        default_model: "claude-sonnet-4-20250514",
        requires_base_url: false,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "google",
        display_name: "Google",
        api_style: ApiStyle::GeminiGenerateContent,
        auth_style: AuthStyle::GeminiKey,
        default_base_url: "https://generativelanguage.googleapis.com/v1beta",
        default_model: "gemini-2.5-flash",
        requires_base_url: false,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "aws-bedrock",
        display_name: "AWS Bedrock",
        api_style: ApiStyle::BedrockInvoke,
        auth_style: AuthStyle::Bearer,
        default_base_url: "",
        default_model: "anthropic.claude-sonnet-4-20250514",
        requires_base_url: false,
        requires_region: true,
        requires_project_id: false,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "azure-foundry",
        display_name: "Azure Foundry",
        api_style: ApiStyle::OpenAiChat,
        auth_style: AuthStyle::AzureKey,
        default_base_url: "",
        default_model: "gpt-4o",
        requires_base_url: true,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "gcp-vertexai",
        display_name: "Google Cloud (Vertex AI)",
        api_style: ApiStyle::GeminiGenerateContent,
        auth_style: AuthStyle::Bearer,
        default_base_url: "",
        default_model: "gemini-2.5-flash",
        requires_base_url: false,
        requires_region: true,
        requires_project_id: true,
        accepts_anonymous: false,
    },
    ProviderSpec {
        id: "ollama",
        display_name: "Ollama (Local)",
        api_style: ApiStyle::OpenAiChat,
        auth_style: AuthStyle::Bearer,
        default_base_url: "http://localhost:11434/v1",
        default_model: "llama3.1",
        requires_base_url: false,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: true,
    },
    ProviderSpec {
        id: "lm-studio",
        display_name: "LM Studio (Local)",
        api_style: ApiStyle::OpenAiChat,
        auth_style: AuthStyle::Bearer,
        default_base_url: "http://localhost:1234/v1",
        default_model: "local-model",
        requires_base_url: false,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: true,
    },
    ProviderSpec {
        id: "openai-compatible",
        display_name: "Custom (OpenAI Compatible)",
        api_style: ApiStyle::OpenAiChat,
        auth_style: AuthStyle::Bearer,
        default_base_url: "",
        default_model: "custom-model",
        requires_base_url: true,
        requires_region: false,
        requires_project_id: false,
        accepts_anonymous: false,
    },
];

/// Look up a provider by id.
pub fn provider_spec(id: &str) -> Option<&'static ProviderSpec> {
    PROVIDERS.iter().find(|spec| spec.id == id)
}

/// All provider ids, in registry order.
#[allow(dead_code)]
pub fn provider_ids() -> Vec<&'static str> {
    PROVIDERS.iter().map(|spec| spec.id).collect()
}

/// A request ready to be sent. No `Debug`: the auth header must never be
/// formatted into a log line.
pub struct PreparedRequest {
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Value,
}

impl PreparedRequest {
    #[allow(dead_code)]
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

/// Truncate an arbitrary string so provider error bodies cannot flood logs.
pub fn truncate(input: &str, max_chars: usize) -> String {
    input.chars().take(max_chars).collect()
}

/// Resolve the credential, honouring providers that accept anonymous access.
fn resolve_key(spec: &ProviderSpec, api_key: Option<&str>) -> Result<String, String> {
    match api_key.filter(|key| !key.is_empty()) {
        Some(key) => Ok(key.to_string()),
        None if spec.accepts_anonymous => Ok("anonymous".to_string()),
        None => Err(format!(
            "provider '{}' is not configured: no API key stored",
            spec.id
        )),
    }
}

fn resolve_base_url(spec: &ProviderSpec, base_url: Option<&str>) -> Result<String, String> {
    let provided = base_url.filter(|value| !value.is_empty());
    if let Some(value) = provided {
        return Ok(value.trim_end_matches('/').to_string());
    }
    if spec.requires_base_url || spec.default_base_url.is_empty() {
        return Err(format!(
            "provider '{}' requires a base URL, but none was provided",
            spec.id
        ));
    }
    Ok(spec.default_base_url.trim_end_matches('/').to_string())
}

fn resolve_region(region: Option<&str>, fallback: &str) -> String {
    region
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn bedrock_region(region: Option<&str>) -> String {
    resolve_region(region, "us-east-1")
}

fn vertex_region(region: Option<&str>) -> String {
    resolve_region(region, "us-central1")
}

fn user_content(prompt: &str, context: Option<&str>) -> String {
    match context.filter(|value| !value.is_empty()) {
        Some(context) => format!("{prompt}\n\nContext:\n{context}"),
        None => prompt.to_string(),
    }
}

fn openai_body(model: &str, prompt: &str, context: Option<&str>) -> Value {
    json!({
        "model": model,
        "messages": [
            { "role": "system", "content": SCRIPT_SYSTEM_PROMPT },
            { "role": "user", "content": user_content(prompt, context) }
        ],
        "temperature": 0,
        "max_tokens": DEFAULT_MAX_TOKENS
    })
}

fn anthropic_body(model: &str, prompt: &str, context: Option<&str>) -> Value {
    json!({
        "model": model,
        "max_tokens": DEFAULT_MAX_TOKENS,
        "system": SCRIPT_SYSTEM_PROMPT,
        "messages": [
            { "role": "user", "content": user_content(prompt, context) }
        ]
    })
}

fn gemini_body(prompt: &str, context: Option<&str>) -> Value {
    json!({
        "systemInstruction": { "parts": [{ "text": SCRIPT_SYSTEM_PROMPT }] },
        "contents": [
            { "role": "user", "parts": [{ "text": user_content(prompt, context) }] }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": DEFAULT_MAX_TOKENS
        }
    })
}

/// Build the HTTP request for a provider. The credential never appears in the
/// returned URL (Gemini uses `x-goog-api-key`, Vertex uses a bearer token).
pub fn prepare_request(
    spec: &ProviderSpec,
    api_key: Option<&str>,
    model: &str,
    prompt: &str,
    context: Option<&str>,
    base_url: Option<&str>,
    region: Option<&str>,
    project_id: Option<&str>,
) -> Result<PreparedRequest, String> {
    let key = resolve_key(spec, api_key)?;
    let model = if model.is_empty() {
        spec.default_model
    } else {
        model
    };

    let mut headers: Vec<(String, String)> = Vec::new();
    let body;

    let url = match (spec.api_style, spec.id) {
        (ApiStyle::OpenAiChat, "azure-foundry") => {
            let base = resolve_base_url(spec, base_url)?;
            headers.push(("api-key".to_string(), key));
            body = openai_body(model, prompt, context);
            format!("{base}/chat/completions?api-version={AZURE_API_VERSION}")
        }
        (ApiStyle::OpenAiChat, _) => {
            let base = resolve_base_url(spec, base_url)?;
            if spec.auth_style == AuthStyle::Bearer {
                headers.push(("Authorization".to_string(), format!("Bearer {key}")));
            }
            body = openai_body(model, prompt, context);
            format!("{base}/chat/completions")
        }
        (ApiStyle::AnthropicMessages, _) => {
            let base = resolve_base_url(spec, base_url)?;
            headers.push(("x-api-key".to_string(), key));
            headers.push(("anthropic-version".to_string(), "2023-06-01".to_string()));
            body = anthropic_body(model, prompt, context);
            format!("{base}/messages")
        }
        (ApiStyle::GeminiGenerateContent, "gcp-vertexai") => {
            let region = vertex_region(region);
            let project = project_id
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    "provider 'gcp-vertexai' requires a project id, but none was provided"
                        .to_string()
                })?;
            let base = if base_url.map(|v| !v.is_empty()).unwrap_or(false) {
                base_url.unwrap().trim_end_matches('/').to_string()
            } else {
                format!("https://{region}-aiplatform.googleapis.com/{GEMINI_API_VERSION}")
            };
            headers.push(("Authorization".to_string(), format!("Bearer {key}")));
            body = gemini_body(prompt, context);
            format!(
                "{base}/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent"
            )
        }
        (ApiStyle::GeminiGenerateContent, _) => {
            let base = resolve_base_url(spec, base_url)?;
            headers.push(("x-goog-api-key".to_string(), key));
            body = gemini_body(prompt, context);
            format!("{base}/models/{model}:generateContent")
        }
        (ApiStyle::BedrockInvoke, _) => {
            let region = bedrock_region(region);
            let base = if base_url.map(|v| !v.is_empty()).unwrap_or(false) {
                base_url.unwrap().trim_end_matches('/').to_string()
            } else {
                format!("https://bedrock-runtime.{region}.amazonaws.com")
            };
            headers.push(("Authorization".to_string(), format!("Bearer {key}")));
            body = anthropic_body(model, prompt, context);
            format!("{base}/model/{model}/invoke")
        }
    };

    Ok(PreparedRequest { url, headers, body })
}

/// Extract the generated text from a provider response body.
pub fn extract_text(style: ApiStyle, body: &Value) -> Result<String, String> {
    let text: Option<String> = match style {
        ApiStyle::OpenAiChat => body
            .pointer("/choices/0/message/content")
            .and_then(Value::as_str)
            .map(str::to_string),
        ApiStyle::AnthropicMessages | ApiStyle::BedrockInvoke => {
            body.get("content").and_then(Value::as_array).map(|parts| {
                parts
                    .iter()
                    .filter_map(|part| part.get("text").and_then(Value::as_str))
                    .collect::<Vec<_>>()
                    .join("")
            })
        }
        ApiStyle::GeminiGenerateContent => body
            .pointer("/candidates/0/content/parts/0/text")
            .and_then(Value::as_str)
            .map(str::to_string),
    };

    text.map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "provider response did not contain generated text".to_string())
}

/// Remove a single surrounding markdown code fence, if present.
pub fn strip_code_fences(input: &str) -> String {
    let trimmed = input.trim();
    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }
    let without_open = match trimmed.find('\n') {
        Some(index) => &trimmed[index + 1..],
        None => return trimmed.to_string(),
    };
    let without_close = without_open
        .trim_end()
        .strip_suffix("```")
        .map(str::trim_end)
        .unwrap_or(without_open.trim_end());
    without_close.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec(id: &str) -> &'static ProviderSpec {
        provider_spec(id).expect("provider spec")
    }

    #[test]
    fn registry_matches_the_typescript_provider_list() {
        let expected = [
            "openai",
            "anthropic",
            "google",
            "aws-bedrock",
            "azure-foundry",
            "gcp-vertexai",
            "ollama",
            "lm-studio",
            "openai-compatible",
        ];
        assert_eq!(provider_ids(), expected);
        for id in expected {
            assert!(provider_spec(id).is_some(), "missing provider {id}");
        }
    }

    #[test]
    fn openai_uses_chat_completions_and_bearer_auth() {
        let request = prepare_request(
            spec("openai"),
            Some("test-key"),
            "gpt-4o",
            "open the browser",
            None,
            None,
            None,
            None,
        )
        .expect("request");
        assert_eq!(request.url, "https://api.openai.com/v1/chat/completions");
        assert_eq!(request.header("authorization"), Some("Bearer test-key"));
        assert_eq!(request.body["model"], "gpt-4o");
        assert_eq!(request.body["messages"][0]["role"], "system");
    }

    #[test]
    fn anthropic_uses_messages_endpoint_and_version_header() {
        let request = prepare_request(
            spec("anthropic"),
            Some("test-key"),
            "claude-sonnet-4-20250514",
            "do the thing",
            None,
            None,
            None,
            None,
        )
        .expect("request");
        assert_eq!(request.url, "https://api.anthropic.com/v1/messages");
        assert_eq!(request.header("x-api-key"), Some("test-key"));
        assert_eq!(request.header("anthropic-version"), Some("2023-06-01"));
        assert_eq!(request.body["system"], SCRIPT_SYSTEM_PROMPT);
    }

    #[test]
    fn google_uses_generate_content_without_key_in_url() {
        let request = prepare_request(
            spec("google"),
            Some("test-key"),
            "gemini-2.5-flash",
            "hello",
            None,
            None,
            None,
            None,
        )
        .expect("request");
        assert_eq!(
            request.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        );
        assert_eq!(request.header("x-goog-api-key"), Some("test-key"));
        assert!(!request.url.contains("test-key"));
    }

    #[test]
    fn vertex_includes_project_and_region_and_uses_bearer() {
        let request = prepare_request(
            spec("gcp-vertexai"),
            Some("token"),
            "gemini-2.5-flash",
            "hello",
            None,
            None,
            Some("europe-west1"),
            Some("demo-project"),
        )
        .expect("request");
        assert!(request
            .url
            .contains("europe-west1-aiplatform.googleapis.com"));
        assert!(request
            .url
            .contains("/projects/demo-project/locations/europe-west1/"));
        assert!(request.url.ends_with(":generateContent"));
        assert_eq!(request.header("authorization"), Some("Bearer token"));
    }

    #[test]
    fn vertex_requires_project_id() {
        let error = prepare_request(
            spec("gcp-vertexai"),
            Some("token"),
            "gemini-2.5-flash",
            "hello",
            None,
            None,
            None,
            None,
        )
        .err()
        .expect("missing project must fail");
        assert!(error.contains("project"));
    }

    #[test]
    fn azure_uses_api_key_header_and_api_version() {
        let request = prepare_request(
            spec("azure-foundry"),
            Some("azure-key"),
            "gpt-4o",
            "hello",
            None,
            Some("https://example.openai.azure.com/openai/deployments/gpt-4o"),
            None,
            None,
        )
        .expect("request");
        assert!(request
            .url
            .ends_with("/chat/completions?api-version=2024-02-15-preview"));
        assert_eq!(request.header("api-key"), Some("azure-key"));
        assert_eq!(request.header("authorization"), None);
    }

    #[test]
    fn openai_compatible_requires_a_base_url() {
        let error = prepare_request(
            spec("openai-compatible"),
            Some("key"),
            "custom-model",
            "hello",
            None,
            None,
            None,
            None,
        )
        .err()
        .expect("missing base url must fail");
        assert!(error.contains("base URL"));
    }

    #[test]
    fn local_providers_accept_anonymous_access() {
        let request = prepare_request(
            spec("ollama"),
            None,
            "llama3.1",
            "hello",
            None,
            None,
            None,
            None,
        )
        .expect("request");
        assert_eq!(request.url, "http://localhost:11434/v1/chat/completions");
    }

    #[test]
    fn bedrock_targets_regional_runtime_endpoint() {
        let request = prepare_request(
            spec("aws-bedrock"),
            Some("bedrock-key"),
            "anthropic.claude-sonnet-4-20250514",
            "hello",
            None,
            None,
            Some("us-west-2"),
            None,
        )
        .expect("request");
        assert_eq!(
            request.url,
            "https://bedrock-runtime.us-west-2.amazonaws.com/model/anthropic.claude-sonnet-4-20250514/invoke"
        );
        assert_eq!(request.header("authorization"), Some("Bearer bedrock-key"));
    }

    #[test]
    fn missing_key_reports_not_configured_without_echoing_a_key() {
        let error = prepare_request(
            spec("openai"),
            None,
            "gpt-4o",
            "hello",
            None,
            None,
            None,
            None,
        )
        .err()
        .expect("missing key must fail");
        assert!(error.contains("not configured"));
        assert!(!error.contains("Bearer"));
    }

    #[test]
    fn extract_text_understands_every_wire_format() {
        let openai = json!({ "choices": [{ "message": { "content": "print(1)" } }] });
        assert_eq!(
            extract_text(ApiStyle::OpenAiChat, &openai).unwrap(),
            "print(1)"
        );

        let anthropic = json!({ "content": [{ "type": "text", "text": "print(2)" }] });
        assert_eq!(
            extract_text(ApiStyle::AnthropicMessages, &anthropic).unwrap(),
            "print(2)"
        );

        let gemini = json!({
            "candidates": [{ "content": { "parts": [{ "text": "print(3)" }] } }]
        });
        assert_eq!(
            extract_text(ApiStyle::GeminiGenerateContent, &gemini).unwrap(),
            "print(3)"
        );

        let bedrock = anthropic.clone();
        assert_eq!(
            extract_text(ApiStyle::BedrockInvoke, &bedrock).unwrap(),
            "print(2)"
        );
    }

    #[test]
    fn extract_text_rejects_empty_responses() {
        let empty = json!({ "choices": [] });
        assert!(extract_text(ApiStyle::OpenAiChat, &empty).is_err());
    }

    #[test]
    fn strips_markdown_code_fences() {
        let fenced = "```python\nprint('hi')\n```";
        assert_eq!(strip_code_fences(fenced), "print('hi')");
        let plain = "print('hi')";
        assert_eq!(strip_code_fences(plain), "print('hi')");
    }

    #[test]
    fn truncate_caps_the_output_length() {
        assert_eq!(truncate("abcdef", 3), "abc");
        assert_eq!(truncate("abc", 10), "abc");
    }
}
