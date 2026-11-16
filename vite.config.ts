import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function stripRawRepoFallbackPlugin(): Plugin {
  let resolvedBase = '/';
  return {
    name: 'strip-raw-repo-fallback',
    apply: 'build',
    configResolved(config) {
      resolvedBase = config.base || '/';
    },
    transformIndexHtml(html) {
      let out = html
        .replace(/\s*<script id="kt-gh-fallback">[\s\S]*?<\/script>\s*/g, '\n    ')
        .replace(/\s+onerror="window\.__ktFallbackToDocs && window\.__ktFallbackToDocs\(\)"/g, '');
      if (resolvedBase === '/') {
        out = out.replace('href="./official-logo.png"', 'href="/official-logo.png"');
      }
      return out;
    },
  };
}

export default defineConfig(() => {
  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss(), stripRawRepoFallbackPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')
            ) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'charts-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
