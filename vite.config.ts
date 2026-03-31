import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // Allow StackBlitz and other WebContainer proxied hostnames
    allowedHosts: true,
  },
});
