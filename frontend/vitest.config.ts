import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // The e2e suite is Playwright's; vitest picking it up fails the run with a
    // confusing "did not expect test.describe() to be called here".
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    server: {
      deps: {
        inline: ["welcome-ui"],
      },
    },
  },
});
