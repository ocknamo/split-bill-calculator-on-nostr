import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/vitest.setup.ts"],
    alias: [
      // Use client-side Svelte for component tests (not SSR)
      {
        find: /^svelte$/,
        replacement: fileURLToPath(
          new URL("./node_modules/svelte/src/index-client.js", import.meta.url),
        ),
      },
    ],
  },
});
