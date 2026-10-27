import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В разработке запросы /api идут на backend FastAPI (порт 8000), так не нужен CORS.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } },
});
