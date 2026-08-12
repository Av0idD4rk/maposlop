import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../backend/static/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.ts',
      output: { entryFileNames: 'app.js', assetFileNames: 'app.[ext]' },
    },
  },
});
