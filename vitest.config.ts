import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    globals: true,
    setupFiles: ["src/test-setups/vitest.setup.ts"],
    env: {
      ENVIRONMENT: "local",
    },
  },
});

export default config;
