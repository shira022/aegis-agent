# ADR-002: npm Distribution

## Status

Accepted

## Context

Aegis Agent needs a distribution channel that is accessible to both developers and non-technical users. The app must be installable without requiring platform-specific installers (MSI, DMG) and should support automatic updates.

Key constraints:
- Target users include non-engineers who may already have Node.js installed (e.g., via nvm or a previous project)
- Developer users expect standard toolchain integration
- The app is a Tauri binary, not a Node.js library — the npm package is a distribution wrapper, not the runtime
- Updates should be automatic or low-friction

Alternatives considered:
- **Direct binary download** (GitHub Releases) — no auto-update, users must manually manage versions
- **Homebrew** — macOS-only; Windows users left out
- **Platform installers (MSI/DMG)** — large package size, requires code signing for each platform, harder to auto-update
- **Docker** — inappropriate for a desktop GUI application

## Decision

Distribute Aegis Agent via **npm** with platform-specific binary download in a `postinstall` script.

Pattern is established by esbuild, Turbo, and similar tools:
- `npm install -g aegis-agent` triggers a postinstall script
- Postinstall detects the user's OS and architecture (win32/darwin, x64/arm64)
- Platform-specific Tauri binary is downloaded from a release CDN or GitHub Releases
- Binary is placed in a well-known location (e.g., `node_modules/.bin/` or platform cache)
- `npx aegis-agent` also works for zero-install usage

## Consequences

**Positive:**
- Single install command: `npm install -g aegis-agent` — familiar to any user with Node.js
- Zero-install via `npx aegis-agent` for quick evaluation
- npm handles versioning, rollback, and global installs
- Auto-update is straightforward: `npm update -g aegis-agent`
- No code signing needed for the npm channel (users trust npm's registry integrity)

**Negative:**
- Node.js must be installed on the user's machine (but many already have it; setup wizard will check)
- Postinstall scripts can be slow on first install (binary download) and may fail behind corporate proxies
- npm global installs have known permission issues on some systems (mitigated by nvm/n)

**Trade-offs accepted:**
- We accept the Node.js dependency for installation in exchange for a universal, cross-platform install mechanism
- The postinstall download is a one-time cost; subsequent runs use the cached binary
