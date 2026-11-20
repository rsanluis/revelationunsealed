/// <reference types="vitest/config" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,

    // List every test by name in the output (like JUnit), not just a per-file summary
    reporters: ['verbose'],
  },
})
