import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8000,
    proxy: {
      // 桥接后端：NestJS 跑在 4000 端口，前端只访问 /bridge/*，不跨域。
      '/bridge': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
