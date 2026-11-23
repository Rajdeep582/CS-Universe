import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';

export default defineConfig({
  plugins: [
    // Lessons (content/**/lesson.mdx): GFM tables, KaTeX maths and Shiki highlighting all run at build time.
    {
      enforce: 'pre',
      ...mdx({
        include: /\.mdx$/,
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex, [rehypeShiki, { theme: 'github-dark-default' }]],
      }),
    },
    react({ include: /\.(mdx|tsx|ts|jsx|js)$/ }),
    tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2023',
    // three.js alone is ~750 kB minified; it is lazy-loaded with the 3D world only.
    chunkSizeWarningLimit: 760,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three|postprocessing|camera-controls|three-stdlib|maath|@use-gesture|its-fine|suspend-react|zustand[\\/]traditional|three-mesh-bvh|troika[^\\/]*|stats-gl|detect-gpu|webgl-constants|bidi-js|tunnel-rat|n8ao)[\\/]/,
            },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
            { name: 'ui-vendor', test: /node_modules[\\/](@radix-ui|cmdk|lucide-react|zustand|clsx)[\\/]/ },
            { name: 'curriculum', test: /src[\\/]generated[\\/]curriculum/ },
            { name: 'katex', test: /node_modules[\\/]katex[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});
