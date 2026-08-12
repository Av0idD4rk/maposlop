import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFile, writeFile } from 'node:fs/promises';

const production = process.env.NODE_ENV === 'production';
const djangoStaticBase = '/static/dist';
const outputDir = '../backend/static/dist';

const staticAdapter = adapter({
  pages: outputDir,
  assets: outputDir,
  fallback: 'index.html',
  precompress: false,
  strict: true,
});

const djangoAdapter = {
  name: 'django-static',
  async adapt(builder) {
    await staticAdapter.adapt(builder);

    const indexUrl = new URL(`${outputDir}/index.html`, import.meta.url);
    const html = await readFile(indexUrl, 'utf8');
    const bootstrapPaths = /base: "\/static\/dist",\s+assets: "\/static\/dist"/;
    if (!bootstrapPaths.test(html)) {
      throw new Error('Could not locate SvelteKit bootstrap paths in the generated fallback');
    }

    // Assets live under Django's STATIC_URL, while the client router lives at `/`.
    const patched = html.replace(
      bootstrapPaths,
      `base: "",\n\t\t\t\t\t\tassets: "${djangoStaticBase}"`,
    );
    await writeFile(indexUrl, patched);
  },
};

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Serverless static SPA: build output is a plain HTML/JS/CSS bundle,
    // no Node server needed. Django serves it as-is from static/dist/.
    adapter: djangoAdapter,
    paths: {
      base: production ? djangoStaticBase : '',
    },
  },
};
