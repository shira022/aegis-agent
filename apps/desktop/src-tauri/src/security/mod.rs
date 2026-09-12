//! In-memory mock keychain.
//!
//! The raw secret is never persisted, not even inside the map value: the store
//! only ever holds a [`KeyMask`]. `get_api_key` always returns `None`.

use serde::{Deserialize, Serialize};

use crate::ipc::{now_ms, AppState, KeychainStore};

const MIN_KEY_CHARS: usize = 4;
const MASK_PREFIX_CHARS: usize = 4;
const ELLIPSIS: char = '…';

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

// ─── MOCK SEAM ───────────────────────────────────────────────────────────
// To persist real credentials, plug the `keyring` crate in here (Windows
// Credential Manager / macOS Keychain / Secret Service on Linux). Keep the
// command signatures unchanged: store_api_key still returns a KeyMask and
// get_api_key is the only place that material is released. The mock below
// intentionally performs no OS calls and returns no material.
#[tauri::command]
pub fn store_api_key(
    provider: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<KeyMask, String> {
    let mut store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    store_key(&mut store, &provider, &key, now_ms())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    // The mock never returns secret material, by design. A future real
    // implementation would fetch the value from the OS keychain here.
    let _ = provider;
    Ok(None)
}

#[tauri::command]
pub fn has_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    Ok(has_key(&store, &provider))
}

#[tauri::command]
pub fn delete_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut store = state
        .keychain
        .lock()
        .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
    delete_key(&mut store, &provider);
    Ok(())
}

#[tauri::command]
pub fn list_api_key_providers(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
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
        assert_eq!(get_mock_value(), None);
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

    fn get_mock_value() -> Option<String> {
        // Mirrors get_api_key without needing a Tauri State.
        None
    }
}
