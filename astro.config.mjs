import vercel from "@astrojs/vercel";
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),

    build: {
        inlineStylesheets: 'auto',
  },
  
    prefetch: {
      prefetchAll: true,
       defaultStrategy: 'hover' },

    vite: {
      build: {
        cssTarget: ['chrome80', 'safari13.1', 'firefox78'],
        rollupOptions: {
       output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/gsap')) {
              return 'vendor-gsap';
            }
          }
        }
      }
    }
},
});
