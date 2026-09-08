# ADR-001: Tauri Desktop Framework

## Status

Accepted

## Context

Aegis Agent is an AI-powered RPA desktop application targeting non-engineers. We need a cross-platform desktop framework that delivers a native-like experience while keeping the binary size small for easy distribution.

Key constraints:
- Target users are non-technical; the installer must be lightweight
- The app must handle desktop automation (recording, replaying user actions) with low-latency, high-performance code
- Cross-platform support for Windows and macOS is required
- Security is critical — the app executes user-generated automation scripts
- The team has prior experience building desktop apps with this framework (DeskSpawn project)

Alternatives considered:
- **Electron** — ~150MB bundles, ships its own Chromium; large attack surface; poor startup performance on low-end machines
- **Flutter Desktop** — newer ecosystem, limited Rust interop, fewer mature desktop-specific plugins
- **.NET MAUI** — Windows-only by default, heavy runtime dependency on macOS

## Decision

Use **Tauri** (Rust backend + React frontend) as the desktop framework.

- Rust backend provides memory safety and high performance for recorder/executor engine
- WebView2 on Windows, WKWebView on macOS — no bundled browser runtime
- Built-in security model: Tauri enforces permission-based IPC by default
- ~10MB binary size vs Electron's ~150MB
- Mature IPC layer between Rust and the web frontend

## Consequences

**Positive:**
- Tiny distributable (~10MB) — low friction for non-technical users
- Rust backend enables high-performance desktop automation without garbage collection pauses
- WebView is the OS-provided browser engine — always up to date with security patches
- Tauri's capability system prevents the frontend from accessing system resources without explicit permission
- Consistent with proven approach from the DeskSpawn project

**Negative:**
- Rust toolchain required for development (adds setup complexity for contributors)
- Platform-specific build configurations must be maintained (Windows vs macOS)
- WebView2 is not available on older Windows versions (pre-Win10) — may need graceful fallback or clear OS requirement
- Smaller ecosystem than Electron; fewer community plugins

**Trade-offs accepted:**
- We accept the Rust learning curve for contributors in exchange for a significantly smaller, more secure binary
- Platform-specific WebView differences mean CSS/JS compatibility testing is needed across OS targets
