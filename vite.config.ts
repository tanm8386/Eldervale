import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { deny: ['**/.data/**', '**/.env*', '**/*.{crt,pem}', '**/.git/**'] },
  },
  build: { target: 'es2022' },
});
