---
name: new-package
description: Scaffold a new @aegis package in the monorepo. Use when adding a new module or domain.
tags: [scaffold, package, monorepo, pnpm]
category: development
---

# new-package

Procedure for adding a new `@aegis/*` package to the Aegis monorepo.

## Trigger Conditions

- When adding a new domain module
- When splitting an existing package

## Procedure

1. **Create directory**
   ```bash
   mkdir -p packages/@aegis/<name>/src
   cd packages/@aegis/<name>
   ```

2. **Create package.json**
   ```json
   {
     "name": "@aegis/<name>",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "scripts": {
       "build": "tsc",
       "test": "vitest run",
       "typecheck": "tsc --noEmit"
     },
     "devDependencies": {
       "typescript": "^5.8.0",
       "vitest": "^3.1.0"
     }
   }
   ```

3. **Create tsconfig.json** (copy from an existing package)
   ```bash
   cp ../shared/tsconfig.json .
   ```

4. **Create vitest.config.ts**
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
     },
   });
   ```

5. **Create src/index.ts**
   ```typescript
   export {};
   ```

6. **Verify workspace addition in root package.json**
   - Confirm that `packages/@aegis/*` is included in pnpm-workspace.yaml

7. **If there are dependencies on other packages**
   ```json
   "dependencies": {
     "@aegis/shared": "workspace:*"
   }
   ```

8. **Build & test verification**
   ```bash
   cd packages/@aegis/<name>
   pnpm typecheck && pnpm test && pnpm build
   ```

## Documentation

- Record an ADR in `docs/adr/` when a new package is finalized
- Add a README.md inside the package
