import { defineConfig } from 'vitest/config';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local from project root into process.env
config({ path: path.resolve(__dirname, '../.env.local') });

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
