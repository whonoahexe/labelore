// The made-up Shapes project (Phase 7): images, binaries, GSD bookkeeping files and URL edge cases,
// committed at test/fixtures/shapes. Same rules as fixture-project.ts: nothing here looks anywhere else
// on the machine, and a missing fixture is a failure, never a skip - importing this module throws when
// the tree is absent, and shapesPath() throws on a missing file.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './fixture-project.ts';
import type { LoadedProject } from './fixture-project.ts';

/** Absolute path of the made-up Shapes project, no trailing slash. */
export const SHAPES_ROOT: string = fileURLToPath(new URL('../fixtures/shapes', import.meta.url)).replace(/[\\/]$/, '');

/** Absolute path of the Shapes project's `.planning/` folder. */
export const SHAPES_PLANNING: string = join(SHAPES_ROOT, '.planning');

if (!existsSync(SHAPES_PLANNING)) {
  throw new Error(
    `The made-up Shapes fixture project is missing at ${SHAPES_ROOT}; tests never fall back to another project.`,
  );
}

/** Absolute path of a file under the Shapes `.planning/`; throws when the file is absent. */
export function shapesPath(relativeToPlanning: string): string {
  const abs = join(SHAPES_PLANNING, relativeToPlanning);
  if (!existsSync(abs)) throw new Error(`Shapes fixture file missing: ${abs}`);
  return abs;
}

/** The Shapes project loaded through the real repository. */
export async function loadShapesProject(): Promise<LoadedProject> {
  return loadProject(SHAPES_ROOT);
}
