import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// For a user/organization site the repo MUST be named `anarusdiati.github.io`.
// In that case the site lives at the root, so `base` stays as '/'.
// If you ever host this under a project repo (e.g. github.com/you/portfolio),
// change `base` to '/portfolio' and update `site` accordingly.
export default defineConfig({
  site: 'https://anarusdiati.github.io',
  base: '/',
  integrations: [tailwind()],
  markdown: {
    // Lets any .md file use LaTeX math: $inline$ and $$block$$.
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
