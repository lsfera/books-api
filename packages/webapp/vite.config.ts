import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://api:3001'
const apiDocsProxyTarget = process.env.VITE_API_DOCS_PROXY_TARGET ?? apiProxyTarget

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            },
            '/api-docs': {
                target: apiDocsProxyTarget,
                changeOrigin: true,
                rewrite: (path) =>
                    path === '/api-docs/openapi.json'
                        ? '/openapi.json'
                        : path.replace(/^\/api-docs/, '')
            }
        }
    }
})
