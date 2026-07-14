import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In dev the API runs on a separate port (5000); proxy /api to it so the
  // frontend can always call relative "/api/*" paths. In production the same
  // Express server serves both the build and the API, so relative paths work.
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
