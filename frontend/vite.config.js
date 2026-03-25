import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
        port: 3000,
        proxy: {
            '/auth': { target: 'http://localhost:5000', changeOrigin: true },
            '/quiz': { target: 'http://localhost:5000', changeOrigin: true },
            '/institute': { target: 'http://localhost:5000', changeOrigin: true },
            '/student': { target: 'http://localhost:5000', changeOrigin: true },
            '/practice': { target: 'http://localhost:5000', changeOrigin: true },
            '/health': { target: 'http://localhost:5000', changeOrigin: true },
            '/tutor': { target: 'http://localhost:5000', changeOrigin: true },
        },
    },
})