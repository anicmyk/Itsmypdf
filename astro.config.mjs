import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://itsmypdf.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    react(),
    tailwind()
  ],
});
