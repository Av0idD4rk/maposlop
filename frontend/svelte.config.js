import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const production = process.env.NODE_ENV === 'production';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Serverless static SPA: build output is a plain HTML/JS/CSS bundle,
    // no Node server needed. Django serves it as-is from static/dist/.
    adapter: adapter({
      pages: '../backend/static/dist',
      assets: '../backend/static/dist',
      fallback: 'index.html',
      precompress: false,
      strict: true,
    }),
    paths: {
      // Django serves the build from /static/dist/, so assets must be
      // referenced with that prefix in production. Dev server stays at root.
      base: production ? '/static/dist' : '',
    },
  },
};
