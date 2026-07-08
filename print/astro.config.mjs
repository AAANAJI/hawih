// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// print.hawih.com.sa — static storefront for the Hawih printing store.
// Private routes (account/cart/checkout/thank-you/auth) are excluded from the
// sitemap in both the Arabic (/) and English (/en/) trees.
const EXCLUDE = [
  '/account',
  '/cart',
  '/checkout',
  '/thank-you',
  '/auth',
];

export default defineConfig({
  site: 'https://print.hawih.com.sa',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) => {
        // page is an absolute URL string. Drop it if any private segment
        // appears in the path (covers /en/ variants automatically).
        const path = new URL(page).pathname;
        return !EXCLUDE.some(
          (seg) => path === seg || path.startsWith(seg + '/') ||
            path.startsWith('/en' + seg + '/') || path === '/en' + seg,
        );
      },
    }),
  ],
});
