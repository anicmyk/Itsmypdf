import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://itsmypdf.com',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) =>
        page !== 'https://itsmypdf.com/privacy/' &&
        page !== 'https://itsmypdf.com/terms/'
    })
  ],
  vite: {
    optimizeDeps: {
      exclude: ['@embedpdf/pdfium']
    },
    worker: {
      format: 'es'
    }
  }
});
