import { defineConfig } from 'vite';

export default defineConfig({
  server: { proxy: { '/presence': 'http://localhost:8787' } },
});
