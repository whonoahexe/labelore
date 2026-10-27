// Where the browser tests' made-up projects live (D-01, D-05): the in-repo Lendshed fixture, served on
// port 4198 by playwright.config.ts, and the in-repo Shapes fixture, served twice for the deep-reload spec:
// 4197 through the development server and 4196 from the freshly built ./dist. 4199 is the repo itself;
// 4173 and 4174 belong to the user's running instances and are never touched. resolveFixtureRoot throws when the tree is missing, so a missing
// fixture fails the run at config load instead of skipping specs. This is a helper, not a spec
// (testMatch is *.spec.ts).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE_ROOT: string = fileURLToPath(new URL('../fixtures/lendshed', import.meta.url)).replace(
  /[\\/]$/,
  '',
);
export const FIXTURE_PORT = 4198;
export const FIXTURE_BASE_URL = `http://127.0.0.1:${FIXTURE_PORT}`;

/** The made-up Shapes project (Phase 7): images, binaries and the awkward URL classes. */
export const SHAPES_FIXTURE_ROOT: string = fileURLToPath(new URL('../fixtures/shapes', import.meta.url)).replace(
  /[\\/]$/,
  '',
);
/** Shapes through the development server (Vite middleware). */
export const SHAPES_PORT = 4197;
export const SHAPES_BASE_URL = `http://127.0.0.1:${SHAPES_PORT}`;
/** Shapes through the built app (npm run build, then npm start serving ./dist). */
export const SHAPES_BUILT_PORT = 4196;
export const SHAPES_BUILT_BASE_URL = `http://127.0.0.1:${SHAPES_BUILT_PORT}`;

/** The fixture root, or a thrown error when its `.planning/` folder does not exist. */
export function resolveFixtureRoot(root: string = FIXTURE_ROOT): string {
  if (!existsSync(join(root, '.planning'))) {
    throw new Error(`Browser tests need the in-repo fixture project at ${root}; it is missing.`);
  }
  return root;
}
