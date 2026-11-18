import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// The server bundle: src/server/index.ts and everything it imports, built by Vite's SSR mode into one
// unminified file, release/server/labelore-server.mjs. Nothing is installed beside it, so every
// dependency is inlined (`ssr.noExternal`) and only `node:` built-ins stay as imports.
//
// The two defines are inlined at build time and are not runtime knobs:
// - `process.env.LABELORE_BUNDLE` is the string "1". It makes the bundle always-production, so the
//   dev-only branch that imports Vite folds away and the built file holds no import of the vite package,
//   and it makes the bundle always the entry (index.ts isEntryPoint()), so it starts when run through a
//   symlinked path where a path comparison would fail.
// - `process.env.LABELORE_VERSION` is the package.json version, so `GET /api/identity` reports it
//   without a package.json sitting beside the bundle.
//
// `publicDir` is off because an SSR build would otherwise copy public/ (the favicon and fonts) into the
// server directory, and the web build already carries them in dist/.
//
// The build prints a rolldown `[EVAL]` warning for gray-matter's engines.js. It is expected: our
// frontmatter parsing replaces gray-matter's javascript engines, so that eval is never reached. gray-matter
// is not patched.
export default defineConfig({
  define: {
    'process.env.LABELORE_BUNDLE': '"1"',
    'process.env.LABELORE_VERSION': JSON.stringify(version),
  },
  publicDir: false,
  ssr: { noExternal: true },
  build: {
    ssr: 'src/server/index.ts',
    outDir: 'release/server',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
    reportCompressedSize: false,
    rolldownOptions: { output: { entryFileNames: 'labelore-server.mjs', codeSplitting: false } },
  },
});
