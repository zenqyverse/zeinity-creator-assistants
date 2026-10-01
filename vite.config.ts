import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function feedProxyPlugin(): Plugin {
  return {
    name: 'vite-feed-proxy-middleware',
    configureServer(server) {
      server.middlewares.use('/api/feed-proxy', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Missing "url" query parameter');
            return;
          }

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
          });

          if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(`Upstream error: ${response.statusText}`);
            return;
          }

          const text = await response.text();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(text);
        } catch (err: unknown) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          const msg = err instanceof Error ? err.message : String(err);
          res.end(msg || 'Internal proxy error');
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), feedProxyPlugin()],
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
