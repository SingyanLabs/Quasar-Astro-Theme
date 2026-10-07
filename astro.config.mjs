import vercel from "@astrojs/vercel";
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),

  build: {
    inlineStylesheets: 'always',
  },
  
  vite: {
    build: {
      cssTarget: ['chrome80', 'safari13.1', 'firefox78'],
    },
  },
});
