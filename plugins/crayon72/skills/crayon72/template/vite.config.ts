import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  assetsInclude: ['**/*.mp4'],
  build: {
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    chunkSizeWarningLimit: 100000,
    cssCodeSplit: false,
    outDir: 'dist',
  },
  server: { port: 7272 },
});
