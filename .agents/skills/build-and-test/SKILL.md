---
name: build-and-test
description: Build, test, and type-check the Aegis monorepo. Use when verifying changes or debugging CI failures.
tags: [build, test, typecheck, turbo, monorepo]
category: development
---

# build-and-test

Procedure for building, testing, and type-checking the Aegis monorepo.

## Trigger Conditions

- When verifying changes
- When debugging CI failures
- When checking before creating a PR

## Procedure

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Test based on changed areas**
   ```bash
   # All tests
   pnpm test

   # Individual packages
   cd packages/@aegis/ai-engine && pnpm test
   cd packages/@aegis/security && pnpm test

   # Desktop app
   cd apps/desktop && pnpm test
   ```

3. **Type check**
   ```bash
   pnpm typecheck
   # or individually: cd packages/@aegis/shared && pnpm typecheck
   ```

4. **Build verification**
   ```bash
   pnpm build
   # Verify that dist/ was generated
   ls packages/@aegis/*/dist/
   ```

5. **Full CI-equivalent check** — the exact gates `.github/workflows/ci.yml` runs
   ```bash
   node -v                    # MUST be >= 22.13: pnpm 11 uses Node's built-in node:sqlite
   pnpm install --frozen-lockfile
   pnpm lint                  # turbo lint      — expect 10 tasks
   pnpm typecheck             # turbo typecheck
   pnpm test                  # turbo test
   pnpm test:coverage         # the same command the CI "Test" job runs
   pnpm build                 # turbo build
   ```
   Read the turbo summary: **`0 tasks` is a failure, not a pass.** A missing per-package
   script silently turns a gate into a no-op, and the job still reports success.

6. **Components CI does not cover yet** (run manually when touching those trees)
   ```bash
   cd packages/@aegis/python-runtime && .venv/bin/python -m pytest        # Python runtime
   cargo test --lib --manifest-path apps/desktop/src-tauri/Cargo.toml   # Rust (WSL cannot link Tauri — use the Windows host)
   ```

## Package List

| Package | Path | Role |
|---------|------|------|
| shared | packages/@aegis/shared | Shared types & utilities |
| ai-engine | packages/@aegis/ai-engine | AI inference (Vercel AI SDK v6) |
| executor | packages/@aegis/executor | RPA execution |
| approval | packages/@aegis/approval | Approval workflow |
| hitl | packages/@aegis/hitl | Human-in-the-loop |
| healer | packages/@aegis/healer | Self-healing |
| recorder | packages/@aegis/recorder | Action recording |
| security | packages/@aegis/security | Security |
| ui | packages/@aegis/ui | Shared UI |

## Notes

- Python packages (python-runtime) require a venv: `cd packages/@aegis/python-runtime && python -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Tauri builds (apps/desktop/src-tauri) require the Rust Toolchain
- `pnpm test` at the root resolves dependencies and runs tests in parallel via turbo, so running it from the root is sufficient
- **Tests must be timezone-independent.** CI runners are UTC; a test asserting a local-time literal passes under JST and fails in CI. Reproduce with `TZ=UTC npx vitest run <file>` — derive expected values with the same formatter the component uses instead of hardcoding times.
- **`.gitignore` patterns containing a slash are anchored at the repo root.** Write `**/src-tauri/target/`, not `src-tauri/target/`, or build output under `apps/` will be committed (this once put 1,704 Cargo artefacts into a PR).
