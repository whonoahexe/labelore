// The drawer model of a flat project at a fixed read time, for the 11-32 contract that a project without workstreams
// keeps exactly the drawer it had before the Shared and own groups existed (success criterion 4). The committed
// captures under test/presentation/captures/ were taken from the code BEFORE that change; the test compares today's
// output with them. Run `node test/helpers/drawer-capture.ts` only to re-take a capture deliberately.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDrawerViewModel } from '../../src/presentation/drawer.ts';
import type { DrawerViewModel } from '../../src/presentation/drawer.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { FX_ROOT } from './fixture-project.ts';
import { SHAPES_ROOT } from './shapes-project.ts';

export const CAPTURE_READ_AT = '2026-11-07T12:00:00.000Z';

export const CAPTURE_DIR: string = fileURLToPath(new URL('../presentation/captures', import.meta.url)).replace(
  /[\\/]$/,
  '',
);

export async function flatDrawerOf(root: string): Promise<DrawerViewModel> {
  const snapshot = await new PlanningRepository(new LocalFsPlanningFilesystem(root), root).load();
  return buildDrawerViewModel(toProjectPresentation({ ...snapshot, readAt: CAPTURE_READ_AT }));
}

export const CAPTURES = [
  { name: 'lendshed', root: FX_ROOT },
  { name: 'shapes', root: SHAPES_ROOT },
] as const;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  for (const { name, root } of CAPTURES) {
    writeFileSync(`${CAPTURE_DIR}/drawer-${name}.json`, `${JSON.stringify(await flatDrawerOf(root), null, 2)}\n`);
  }
}
