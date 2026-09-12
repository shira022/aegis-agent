//! Deterministic, offline mock AI client.
//!
//! This module performs no I/O, reads no credentials and never touches the
//! network. Identical input always yields byte-identical output.

use serde::{Deserialize, Serialize};

const MOCK_MODEL: &str = "mock-local";
const MAX_PROMPT_COMMENT_CHARS: usize = 200;

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationRequest {
    pub prompt: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub context: Option<String>,
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

fn prompt_comment(prompt: &str) -> String {
    prompt
        .replace(['\n', '\r'], " ")
        .chars()
        .take(MAX_PROMPT_COMMENT_CHARS)
        .collect()
}

fn mock_generate(req: &AiGenerationRequest) -> AiGenerationResponse {
    let hash = prompt_hash(&req.prompt);
    let model = req
        .model
        .clone()
        .unwrap_or_else(|| MOCK_MODEL.to_string());

    let script = format!(
        "# Aegis Agent mock-generated script\n# prompt: {comment}\n\n\ndef main():\n    print(\"Aegis Agent mock script\")\n    print(\"prompt-hash: {hash}\")\n\n\nif __name__ == \"__main__\":\n    main()\n",
        comment = prompt_comment(&req.prompt),
        hash = hash,
    );

    AiGenerationResponse {
        script,
        language: "python".to_string(),
        mocked: true,
        model,
        prompt_hash: hash,
    }
}

// ─── MOCK SEAM ───────────────────────────────────────────────────────────
// This is the single swap point for a real provider client. To wire the real
// thing: add the HTTP client dependency, read the credential through
// security::get_api_key, replace mock_generate() below with a real call, and
// keep AiGenerationResponse's shape unchanged so the TypeScript side keeps working.
// Today this function performs no I/O and never touches the network.
#[tauri::command]
pub fn ai_generate_script(
    request: AiGenerationRequest,
) -> Result<AiGenerationResponse, String> {
    Ok(mock_generate(&request))
}

#[tauri::command]
pub fn ai_provider_status() -> Result<AiProviderStatus, String> {
    // The mock provider requires no credential and is always "ready".
    Ok(AiProviderStatus {
        provider: MOCK_MODEL.to_string(),
        configured: true,
        mocked: true,
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
        }
    }

    #[test]
    fn generation_is_deterministic() {
        let first = ai_generate_script(request("open the browser")).expect("first");
        let second = ai_generate_script(request("open the browser")).expect("second");
        assert_eq!(first, second);
    }

    #[test]
    fn different_prompts_produce_different_hashes() {
        let first = ai_generate_script(request("prompt one")).expect("first");
        let second = ai_generate_script(request("prompt two")).expect("second");
        assert_ne!(first.prompt_hash, second.prompt_hash);
    }

    #[test]
    fn response_is_mocked_and_never_contains_a_key() {
        let response = ai_generate_script(request("do the thing")).expect("response");
        assert!(response.mocked);
        assert_eq!(response.model, "mock-local");
        assert_eq!(response.language, "python");
        assert!(!response.script.contains("sk-"));
    }

    #[test]
    fn explicit_model_overrides_the_mock_default() {
        let mut req = request("x");
        req.model = Some("some-model".to_string());
        let response = ai_generate_script(req).expect("response");
        assert_eq!(response.model, "some-model");
        assert!(response.mocked);
    }

    #[test]
    fn prompt_hash_is_stable_and_line_safe() {
        assert_eq!(prompt_hash("abc"), prompt_hash("abc"));
        let with_newline = ai_generate_script(request("line one\nline two")).expect("response");
        let comment_line = with_newline
            .script
            .lines()
            .find(|line| line.starts_with("# prompt:"))
            .expect("prompt comment");
        assert_eq!(comment_line, "# prompt: line one line two");
    }
}
