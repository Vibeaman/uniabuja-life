import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist' },
  server: { proxy: { '/presence': 'http://localhost:8787' } },
});
