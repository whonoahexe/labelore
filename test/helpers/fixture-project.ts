// The one made-up project every test reads (D-01, D-05): Lendshed, committed at test/fixtures/lendshed.
// Nothing here looks anywhere else on the machine, and a missing fixture is a failure, never a skip:
// importing this module throws when the tree is absent, and fxPath() throws on a missing file. The
// loaders below (loadProject, loadFiles, planningFiles) moved here from todo-corpus.ts, which re-exports
// them so existing importers keep working.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import type { ReferenceRegistry } from '../../src/presentation/references.ts';
import { buildArtifactIndex } from '../../src/server/artifact-index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';

/** Absolute path of the made-up Lendshed project, no trailing slash. */
export const FX_ROOT: string = fileURLToPath(new URL('../fixtures/lendshed', import.meta.url)).replace(/[\\/]$/, '');

/** Absolute path of the Lendshed project's `.planning/` folder. */
export const FX_PLANNING: string = join(FX_ROOT, '.planning');

if (!existsSync(FX_PLANNING)) {
  throw new Error(
    `The made-up Lendshed fixture project is missing at ${FX_ROOT}; tests never fall back to another project.`,
  );
}

/** Absolute path of a file under the Lendshed `.planning/`; throws when the file is absent. */
export function fxPath(relativeToPlanning: string): string {
  const abs = join(FX_PLANNING, relativeToPlanning);
  if (!existsSync(abs)) throw new Error(`Lendshed fixture file missing: ${abs}`);
  return abs;
}

/** The text of a file under the Lendshed `.planning/`, read through fxPath. */
export function fxRead(relativeToPlanning: string): string {
  return readFileSync(fxPath(relativeToPlanning), 'utf8');
}

export interface LoadedProject {
  snapshot: ProjectSnapshot;
  presentation: ProjectPresentation;
  registry: ReferenceRegistry;
  /** A body lookup over the project's artifacts, the way the server reads note bodies. */
  bodyOf: (path: string) => string | null;
}

/** A project root loaded through the real repository, the way the server builds a request's bundle. */
export async function loadProject(root: string): Promise<LoadedProject> {
  const snapshot = await new PlanningRepository(new LocalFsPlanningFilesystem(root), root).load();
  const presentation = toProjectPresentation(snapshot);
  const index = buildArtifactIndex(snapshot);
  return {
    snapshot,
    presentation,
    registry: buildReferenceRegistry(presentation),
    bodyOf: (path) => {
      const found = index.lookup(path);
      return found.found ? found.artifact.body : null;
    },
  };
}

/** The Lendshed project loaded through the real repository. */
export async function loadFixtureProject(): Promise<LoadedProject> {
  return loadProject(FX_ROOT);
}

/** Every file under a root's `.planning/`, keyed by its path relative to the root. A missing tree throws. */
export function planningFiles(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else out[relative(root, abs).split('\\').join('/')] = readFileSync(abs, 'utf8');
    }
  };
  walk(join(root, '.planning'));
  return out;
}

/** A project built in memory from a path -> content map, loaded the way the server loads one. */
export async function loadFiles(files: Record<string, string>): Promise<LoadedProject> {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  const presentation = toProjectPresentation(snapshot);
  const index = buildArtifactIndex(snapshot);
  return {
    snapshot,
    presentation,
    registry: buildReferenceRegistry(presentation),
    bodyOf: (path) => {
      const found = index.lookup(path);
      return found.found ? found.artifact.body : null;
    },
  };
}
