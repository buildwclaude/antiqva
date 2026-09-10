import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // served from https://buildwclaude.github.io/antiqva/ once built; plain / in dev
  base: command === 'build' ? '/antiqva/' : '/',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        // three is the heavy one — let it cache separately from the page code
        manualChunks: { three: ['three'], anim: ['gsap', 'lenis'] },
      },
    },
  },
}));
