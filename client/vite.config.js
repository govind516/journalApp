import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/public': 'http://localhost:8080',
      '/journal': 'http://localhost:8080',
      '/user': 'http://localhost:8080',
      '/admin': 'http://localhost:8080',
      '/auth': 'http://localhost:8080',
      '/swagger-ui': 'http://localhost:8080',
      '/v3/api-docs': 'http://localhost:8080',
    },
  },
})
