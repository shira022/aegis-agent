import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const DEFAULT_TIMEOUT_MS = 120000;

function testTimeoutFromEnv(): number {
  const raw = process.env.AEGIS_E2E_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TIMEOUT_MS;
}

export default defineConfig({
  test: {
    // The project root is the repository root so the include pattern
    // `e2e/**/*.spec.ts` resolves regardless of the invocation directory.
    root: fileURLToPath(new URL('..', import.meta.url)),
    environment: 'node',
    include: ['e2e/**/*.spec.ts'],
    testTimeout: testTimeoutFromEnv(),
  },
});
