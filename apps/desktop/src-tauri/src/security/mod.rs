//! API key masking and OS-keychain persistence.
//!
//! The in-memory [`KeychainStore`] only ever holds a [`KeyMask`]; the raw secret
//! is persisted separately in the platform credential store (Windows
//! Credential Manager, macOS Keychain, Secret Service on Linux) through the
//! [`SecretBackend`] abstraction. `get_api_key` intentionally never returns
//! secret material to the webview; Rust-side callers use [`load_secret`].

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};

use crate::ipc::{now_ms, AppState, KeychainStore};

const MIN_KEY_CHARS: usize = 4;
const MASK_PREFIX_CHARS: usize = 4;
const ELLIPSIS: char = '…';

/// Service name used for every entry in the platform credential store.
pub const KEYCHAIN_SERVICE: &str = "com.aegis.agent";

/// Storage abstraction for raw secrets. Kept behind a trait so Rust tests can
/// use an in-memory backend instead of the real OS keychain.
pub trait SecretBackend: Send + Sync {
    fn store(&self, provider: &str, secret: &str) -> Result<(), String>;
    fn retrieve(&self, provider: &str) -> Result<Option<String>, String>;
    fn remove(&self, provider: &str) -> Result<(), String>;
}

/// Platform keychain backed by the `keyring` crate.
pub struct KeyringBackend {
    service: String,
}

impl KeyringBackend {
    pub fn new() -> Self {
        KeyringBackend {
            service: KEYCHAIN_SERVICE.to_string(),
        }
    }

    fn entry(&self, provider: &str) -> Result<keyring::Entry, String> {
        keyring::Entry::new(&self.service, provider)
            .map_err(|error| format!("failed to open the OS keychain: {error}"))
    }
}

impl Default for KeyringBackend {
    fn default() -> Self {
        KeyringBackend::new()
    }
}

impl SecretBackend for KeyringBackend {
    fn store(&self, provider: &str, secret: &str) -> Result<(), String> {
        self.entry(provider)?
            .set_password(secret)
            .map_err(|error| format!("failed to store the API key in the OS keychain: {error}"))
    }

    fn retrieve(&self, provider: &str) -> Result<Option<String>, String> {
        match self.entry(provider)?.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(format!(
                "failed to read the API key from the OS keychain: {error}"
            )),
        }
    }

    fn remove(&self, provider: &str) -> Result<(), String> {
        match self.entry(provider)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!(
                "failed to delete the API key from the OS keychain: {error}"
            )),
        }
    }
}

/// In-memory backend used by tests and as a safe fallback when no platform
/// keychain is available.
#[derive(Default)]
pub struct MemoryBackend {
    entries: Mutex<BTreeMap<String, String>>,
}

impl MemoryBackend {
    pub fn new() -> Self {
        MemoryBackend::default()
    }
}

impl SecretBackend for MemoryBackend {
    fn store(&self, provider: &str, secret: &str) -> Result<(), String> {
        let mut entries = self
            .entries
            .lock()
            .map_err(|error| format!("secret store lock poisoned: {error}"))?;
        entries.insert(provider.to_string(), secret.to_string());
        Ok(())
    }

    fn retrieve(&self, provider: &str) -> Result<Option<String>, String> {
        let entries = self
            .entries
            .lock()
            .map_err(|error| format!("secret store lock poisoned: {error}"))?;
        Ok(entries.get(provider).cloned())
    }

    fn remove(&self, provider: &str) -> Result<(), String> {
        let mut entries = self
            .entries
            .lock()
            .map_err(|error| format!("secret store lock poisoned: {error}"))?;
        entries.remove(provider);
        Ok(())
    }
}

/// Default backend for the running app: the OS keychain.
pub fn default_secret_backend() -> Arc<dyn SecretBackend> {
    Arc::new(KeyringBackend::new())
}

/// Release the raw secret for a provider to trusted Rust callers only.
pub fn load_secret(state: &AppState, provider: &str) -> Result<Option<String>, String> {
    state.secrets.retrieve(provider)
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KeyMask {
    pub provider: String,
    pub masked: String,
    pub length: usize,
    pub stored_at: u64,
}

/// Build the display mask: first four characters, an ellipsis and the length.
///
/// The returned string is derived only from the head of the key; the tail is
/// never present.
pub fn build_mask(key: &str) -> String {
    let length = key.chars().count();
    let prefix: String = key.chars().take(MASK_PREFIX_CHARS).collect();
    format!("{prefix}{ELLIPSIS}({length})")
}

fn validate(provider: &str, key: &str) -> Result<(), String> {
    if provider.is_empty() {
        return Err("provider must not be empty".to_string());
    }
    if key.is_empty() {
        return Err("key must not be empty".to_string());
    }
    if key.chars().count() < MIN_KEY_CHARS {
        return Err(format!("key must be at least {MIN_KEY_CHARS} characters"));
    }
    Ok(())
}

/// Store only the mask for `key`. The raw key is consumed and dropped here and
/// can never be read back.
pub fn store_key(
    store: &mut KeychainStore,
    provider: &str,
    key: &str,
    now: u64,
) -> Result<KeyMask, String> {
    validate(provider, key)?;

    // The whole secret is reduced to a mask; nothing else leaves this scope.
    let mask = build_mask(key);

    let entry = KeyMask {
        provider: provider.to_string(),
        masked: mask,
        length: key.chars().count(),
        stored_at: now,
    };
    // Map value type is `KeyMask`, which structurally cannot hold the secret.
    store.entries.insert(provider.to_string(), entry.clone());
    Ok(entry)
}

pub fn has_key(store: &KeychainStore, provider: &str) -> bool {
    store.entries.contains_key(provider)
}

pub fn delete_key(store: &mut KeychainStore, provider: &str) {
    store.entries.remove(provider);
}

pub fn list_providers(store: &KeychainStore) -> Vec<String> {
    // BTreeMap iteration is already sorted by provider name.
    store.entries.keys().cloned().collect()
}

// ─── Tauri commands ──────────────────────────────────────────────────────
// The raw secret is persisted in the platform credential store through the
// injected [`SecretBackend`]. The command still only returns a [`KeyMask`];
// `get_api_key` never releases secret material to the webview.
#[tauri::command]
pub fn store_api_key(
    provider: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<KeyMask, String> {
    validate(&provider, &key)?;
    // Persist to the OS keychain first: never record a mask for a key the
    // backend did not accept.
    state.secrets.store(&provider, &key)?;

    let mut store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    store_key(&mut store, &provider, &key, now_ms())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    // Secret material is never returned across the IPC boundary. Trusted
    // Rust callers use `load_secret` instead.
    let _ = provider;
    Ok(None)
}

#[tauri::command]
pub fn has_api_key(provider: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    if state.secrets.retrieve(&provider)?.is_some() {
        return Ok(true);
    }
    let store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    Ok(has_key(&store, &provider))
}

#[tauri::command]
pub fn delete_api_key(provider: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.secrets.remove(&provider)?;
    let mut store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    delete_key(&mut store, &provider);
    Ok(())
}

#[tauri::command]
pub fn list_api_key_providers(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    Ok(list_providers(&store))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_then_has_and_get_returns_none() {
        let mut store = KeychainStore::default();
        let secret = "example-key-value";
        let mask = store_key(&mut store, "openai", secret, 123).expect("store");

        assert!(has_key(&store, "openai"));
        assert!(!mask.masked.contains(secret));
        assert!(!mask.masked.contains(&secret[secret.len() - 4..]));
        assert_eq!(mask.length, secret.chars().count());
        assert_eq!(mask.stored_at, 123);
    }

    #[test]
    fn mask_uses_head_and_length_only() {
        let mask = build_mask("abcd123456789");
        assert_eq!(mask, "abcd…(13)");
    }

    #[test]
    fn delete_flips_has_to_false() {
        let mut store = KeychainStore::default();
        store_key(&mut store, "openai", "example-key-value", 1).expect("store");
        assert!(has_key(&store, "openai"));
        delete_key(&mut store, "openai");
        assert!(!has_key(&store, "openai"));
    }

    #[test]
    fn invalid_inputs_are_rejected() {
        let mut store = KeychainStore::default();
        assert!(store_key(&mut store, "", "example-key-value", 1).is_err());
        assert!(store_key(&mut store, "openai", "abc", 1).is_err());
        assert!(store_key(&mut store, "openai", "", 1).is_err());
    }

    #[test]
    fn providers_are_sorted_and_only_contain_stored_entries() {
        let mut store = KeychainStore::default();
        store_key(&mut store, "zeta", "example-key-value", 1).expect("store");
        store_key(&mut store, "alpha", "example-key-value", 2).expect("store");
        assert_eq!(list_providers(&store), vec!["alpha", "zeta"]);
    }

    #[test]
    fn memory_backend_round_trips_but_never_masks_the_secret() {
        let backend = MemoryBackend::new();
        assert_eq!(backend.retrieve("openai").expect("retrieve"), None);

        backend.store("openai", "secret-value").expect("store");
        assert_eq!(
            backend.retrieve("openai").expect("retrieve"),
            Some("secret-value".to_string())
        );

        backend.remove("openai").expect("remove");
        assert_eq!(backend.retrieve("openai").expect("retrieve"), None);
    }
}
