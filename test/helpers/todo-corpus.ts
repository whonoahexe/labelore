// Where the todo corpus lives, for the tests that read real todo files (quick-261023-61k): the three
// committed fixture projects (copied byte for byte from the sketch's data), the dashboard's synthetic
// fixture, labelore's own `.planning/` and each sibling project that has a `.planning/todos` folder on
// this machine. The sibling projects are only ever read; a machine without the checkouts skips the tests
// that need them (their own `it.runIf(existsSync(...))` gates).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import type { ReferenceRegistry } from '../../src/presentation/references.ts';
import { buildArtifactIndex } from '../../src/server/artifact-index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';

export const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const FIXTURES = join(LB_ROOT, 'test/fixtures/todos');

export const DUET_ROOT = join(FIXTURES, 'duet');
export const PORTAL_ROOT = join(FIXTURES, 'portal');
export const LABELORE_FIXTURE_ROOT = join(FIXTURES, 'labelore');
export const SYNTHETIC_ROOT = join(LB_ROOT, 'test/fixtures/dashboard/synthetic');

/** The committed fixture projects and the synthetic one. */
export const FIXTURE_ROOTS: string[] = [DUET_ROOT, PORTAL_ROOT, LABELORE_FIXTURE_ROOT, SYNTHETIC_ROOT];

const SIBLINGS = [
  join(homedir(), 'Work/Ibis/resoundant'),
  join(homedir(), 'Work/Cinedise/studio-portal'),
  join(homedir(), 'Work/Ibis/deid/deid-ui'),
  join(homedir(), 'Work/Sideby/plan.sideby.me'),
];

/** The sibling project roots that hold a `.planning/todos` directory. */
export const TODO_SIBLING_ROOTS: string[] = SIBLINGS.filter((root) => existsSync(join(root, '.planning', 'todos')));

export const RESOUNDANT_ROOT = join(homedir(), 'Work/Ibis/resoundant');

export interface KeyedFile {
  root: string;
  /** Relative to the root, e.g. `.planning/todos/completed/x.md`. */
  path: string;
}

/** The eleven sketch todos by the sketch's own keys. */
export const TODO_KEYS: Record<string, KeyedFile> = {
  dcrop: { root: DUET_ROOT, path: '.planning/todos/completed/2026-10-21-add-crop-and-round-profile-photos.md' },
  dsfx: { root: DUET_ROOT, path: '.planning/todos/completed/2026-10-20-sound-effects.md' },
  dcall: { root: DUET_ROOT, path: '.planning/todos/completed/2026-10-20-call-debug-logging.md' },
  sretry: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/2026-10-12-retry-queue-dead-letter.md' },
  srec: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/2026-10-15-reconcile-report-pdf.md' },
  star: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/004-tariff-note-tooltips.md' },
  sport: { root: SYNTHETIC_ROOT, path: '.planning/todos/completed/2026-10-02-port-timezone-table.md' },
  pcheck: { root: PORTAL_ROOT, path: '.planning/todos/pending/pre-milestone-hardware-and-tier-cleanup.md' },
  pdev: { root: PORTAL_ROOT, path: '.planning/todos/completed/portal-detect-vanished-tier-device.md' },
  lfig: { root: LABELORE_FIXTURE_ROOT, path: '.planning/todos/pending/lifted-figures-everywhere.md' },
  ldrift: { root: LABELORE_FIXTURE_ROOT, path: '.planning/todos/done/artifact-chrome-drift.md' },
};

/** The notes the sketch's todos point at, by the note sketch's own keys. */
export const NOTE_KEYS: Record<string, KeyedFile> = {
  dcrop: { root: DUET_ROOT, path: '.planning/notes/2026-10-21-crop-images-and-profile-photos.md' },
  dround: { root: DUET_ROOT, path: '.planning/notes/2026-10-21-round-profile-photos.md' },
  dsfx: { root: DUET_ROOT, path: '.planning/notes/2026-10-20-sound-effects.md' },
  dcall: { root: DUET_ROOT, path: '.planning/notes/2026-10-20-call-debug-logging-webrtc-turn.md' },
  dback: { root: DUET_ROOT, path: '.planning/notes/2026-10-20-back-button-closes-app.md' },
  pcap: { root: PORTAL_ROOT, path: '.planning/notes/2026-10-21-raise-single-file-download-cap.md' },
  pbrief: { root: PORTAL_ROOT, path: '.planning/notes/2026-10-23-studio-media-workflow-milestone-brief.md' },
  star: { root: SYNTHETIC_ROOT, path: '.planning/notes/2026-10-16-tariff-note-tooltips.md' },
  sundo: { root: SYNTHETIC_ROOT, path: '.planning/notes/2026-10-08-brokers-want-undo.md' },
  lperkind: { root: LABELORE_FIXTURE_ROOT, path: '.planning/notes/per-kind-artifact-rendering.md' },
};

/** The sketch's data.js payload (`window.DATA = {…};`) parsed as JSON. */
function sketchData(file: string): Record<string, { raw: string }> {
  const text = readFileSync(join(LB_ROOT, '.planning/sketches', file), 'utf8');
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, { raw: string }>;
}

/** The todo file as the sketch read it. */
export function sketchTodoRaw(key: string): string {
  return sketchData('027-todo-page/data.js')[key].raw;
}

/** The note file as the sketch read it. */
export function sketchNoteRaw(key: string): string {
  return sketchData('028-note-page/data.js')[key].raw;
}

export function readKeyed(file: KeyedFile): string {
  return readFileSync(join(file.root, file.path), 'utf8');
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

/** Every file under a root's `.planning/`, keyed by its path relative to the root. */
export function planningFiles(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else out[relative(root, abs).split('\\').join('/')] = readFileSync(abs, 'utf8');
    }
  };
  if (existsSync(join(root, '.planning'))) walk(join(root, '.planning'));
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
