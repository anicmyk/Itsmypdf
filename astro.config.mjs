import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://itsmypdf.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) =>
        page !== 'https://itsmypdf.com/privacy' &&
        page !== 'https://itsmypdf.com/privacy/' &&
        page !== 'https://itsmypdf.com/terms' &&
        page !== 'https://itsmypdf.com/terms/'
    })
  ],
});
