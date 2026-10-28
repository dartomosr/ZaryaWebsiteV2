import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
export default defineConfig({
  plugins: [react(), msw()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 6173, strictPort: true },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'], clearMocks: true },
});
