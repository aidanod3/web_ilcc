import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* VITE_BASE  — URL prefix the built app is served under ("/ilcc/" in prod).
                Leaks into import.meta.env.BASE_URL, which the client uses for
                every fetch/WebSocket URL and for React Router's basename.
   VITE_API_PROXY — dev-only: where `vite dev` forwards /api (and WS upgrades).
                Defaults to a local server; docker-compose overrides it. */
const base     = process.env.VITE_BASE ?? '/'
const apiProxy = process.env.VITE_API_PROXY ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: apiProxy, ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: { reporter: ['text', 'lcov'], include: ['src/hooks/**', 'src/editor/**', 'src/data/**'] },
  },
})
