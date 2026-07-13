import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// For a user/organization site the repo MUST be named `anarusdiati.github.io`.
// In that case the site lives at the root, so `base` stays as '/'.
// If you ever host this under a project repo (e.g. github.com/you/portfolio),
// change `base` to '/portfolio' and update `site` accordingly.
export default defineConfig({
  site: 'https://anarusdiati.github.io',
  base: '/',
  integrations: [tailwind()],
});
