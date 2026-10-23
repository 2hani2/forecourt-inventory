import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/**/*.test.ts'],
  coverage: { provider: 'v8', include: ['server/{app,auth,database,vehicles}.ts'], reporter: ['text', 'html', 'json-summary'], thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 } }
} });
