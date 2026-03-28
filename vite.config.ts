/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/vitest.setup.ts'],
    globals: true,
    alias: {
      '$app/environment': new URL('./src/mocks/app-environment.ts', import.meta.url).pathname,
      '$app/navigation': new URL('./src/mocks/app-navigation.ts', import.meta.url).pathname,
      '$app/stores': new URL('./src/mocks/app-stores.ts', import.meta.url).pathname,
    },
  },
} as any)
