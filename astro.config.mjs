import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://iamspeed.dev',
  output: 'static',
  adapter: vercel(),
  integrations: [preact(), sitemap()],
});
