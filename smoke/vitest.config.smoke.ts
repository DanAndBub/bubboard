import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  test: {
    environment: 'node',
    include: ['smoke/**/*.smoke.ts'],
    testTimeout: 30_000,
    hookTimeout: 10_000,
    reporters: ['verbose'],
    // Run serially — avoid hammering external APIs simultaneously
    fileParallelism: false,
  },
});
