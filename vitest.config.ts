import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: [
      // Use client-side Svelte for component tests (not SSR)
      { find: /^svelte$/, replacement: fileURLToPath(new URL("node_modules/svelte/src/index-client.js", import.meta.url)) },
    ],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/vitest.setup.ts"],
  },
});
