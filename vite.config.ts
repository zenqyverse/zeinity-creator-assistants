import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Code-splitting: Pisahkan vendor libraries besar ke chunk terpisah
         * agar browser dapat meng-cache kode vendor yang stabil secara independen
         * dari kode aplikasi yang sering berubah.
         *
         * Strategi chunking:
         * - vendor-react      : React core runtime (react, react-dom, react/jsx-runtime)
         * - vendor-supabase   : Supabase JS client (@supabase/supabase-js + sub-packages)
         * - vendor-google-ai  : Google Generative AI SDK (@google/generative-ai)
         * - vendor-mammoth    : Mammoth.js (.docx parser) — library besar (~500 kB raw)
         * - vendor-lucide     : Lucide React icon library
         * - vendor-misc       : Semua vendor library lain yang tidak dikategorikan
         */
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react/jsx-runtime') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('@google/generative-ai')) {
              return 'vendor-google-ai';
            }
            if (id.includes('/mammoth/') || id.includes('\\mammoth\\')) {
              return 'vendor-mammoth';
            }
            if (id.includes('/lucide-react/') || id.includes('\\lucide-react\\')) {
              return 'vendor-lucide';
            }
            // Semua vendor lainnya (ws, xmldom, jszip, dll)
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
