import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Every worker gets its own throwaway settings directory (D-09).
    setupFiles: ['test/helpers/config-dir-setup.ts'],
  },
});
