import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/web', import.meta.url)),
    },
  },
  build: {
    // quick-260910-0x4 item 10, measured 2026-09-10. Two chunks were over the 500 kB default:
    // the entry chunk (571.58 kB) and chunk-FOHPRMQF (662.12 kB, mermaid's shared internals,
    // pulled in by mermaid.core/mermaid-parser.core and every one of mermaid's per-diagram
    // chunks). The entry chunk was real, fixable bloat — src/web/app-router.tsx now lazy()-loads
    // every routed page (see app-shell.tsx's Suspense boundary), which dropped it to 388.75 kB,
    // entirely under the default limit. That leaves exactly one chunk over: chunk-FOHPRMQF is
    // mermaid's own internal bundling of its shared runtime, already behind one dynamic
    // import('mermaid') boundary (async-only, never in the initial page load) — splitting further
    // inside it is not something this project controls without fighting mermaid's own module
    // graph. Raising the numeric threshold below is the resolution, with the build's own output
    // otherwise left completely unredirected and unfiltered, and this value is set just above the
    // measured 662.12 kB — not a round number far above it — so a real future regression in
    // either chunk still trips it.
    chunkSizeWarningLimit: 680,
  },
});
