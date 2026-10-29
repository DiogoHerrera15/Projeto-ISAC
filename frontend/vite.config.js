import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // O cookie de sessão é do backend; o proxy faz o site e a API parecerem
    // uma só origem. O Origin do navegador segue intacto até o backend, por
    // isso APP_ORIGIN (backend/.env) precisa ser o endereço deste site.
    proxy: { '/api': process.env.API_PROXY_TARGET || 'http://localhost:3001' },
    // Endereços do GitHub Codespaces (https://<nome>-5173.app.github.dev).
    allowedHosts: ['.app.github.dev'],
  },
})
