// Where the todo corpus lives, for the tests that read real todo files (quick-261023-61k): the made-up
// Lendshed project, the dashboard's synthetic fixture, the committed Labelore fixture and labelore's own
// `.planning/`. Every project here is committed to this repository; nothing is read from the machine.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { FX_ROOT } from './fixture-project.ts';

export const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const FIXTURES = join(LB_ROOT, 'test/fixtures/todos');

export const DUET_ROOT = join(FIXTURES, 'duet');
export const PORTAL_ROOT = join(FIXTURES, 'portal');
export const LABELORE_FIXTURE_ROOT = join(FIXTURES, 'labelore');
export const SYNTHETIC_ROOT = join(LB_ROOT, 'test/fixtures/dashboard/synthetic');

/** The committed fixture projects and the synthetic one. */
export const FIXTURE_ROOTS: string[] = [FX_ROOT, LABELORE_FIXTURE_ROOT, SYNTHETIC_ROOT];

export const RESOUNDANT_ROOT = join(homedir(), 'Work/Ibis/resoundant');

export interface KeyedFile {
  root: string;
  /** Relative to the root, e.g. `.planning/todos/completed/x.md`. */
  path: string;
}

/** The eleven sketch todos by the sketch's own keys. */
export const TODO_KEYS: Record<string, KeyedFile> = {
  dcrop: { root: FX_ROOT, path: '.planning/todos/completed/2026-03-24-add-crop-and-round-member-avatars.md' },
  dsfx: { root: FX_ROOT, path: '.planning/todos/completed/2026-03-23-checkout-sound-cues.md' },
  dcall: { root: FX_ROOT, path: '.planning/todos/completed/2026-03-23-scanner-debug-logging.md' },
  sretry: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/2026-10-12-retry-queue-dead-letter.md' },
  srec: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/2026-10-15-reconcile-report-pdf.md' },
  star: { root: SYNTHETIC_ROOT, path: '.planning/todos/pending/004-tariff-note-tooltips.md' },
  sport: { root: SYNTHETIC_ROOT, path: '.planning/todos/completed/2026-10-02-port-timezone-table.md' },
  pcheck: { root: FX_ROOT, path: '.planning/todos/pending/pre-milestone-sensor-and-shed-cleanup.md' },
  pdev: { root: FX_ROOT, path: '.planning/todos/completed/kiosk-detect-vanished-shed-sensor.md' },
  lfig: { root: LABELORE_FIXTURE_ROOT, path: '.planning/todos/pending/lifted-figures-everywhere.md' },
  ldrift: { root: LABELORE_FIXTURE_ROOT, path: '.planning/todos/done/artifact-chrome-drift.md' },
};

/** The notes the sketch's todos point at, by the note sketch's own keys. */
export const NOTE_KEYS: Record<string, KeyedFile> = {
  dcrop: { root: FX_ROOT, path: '.planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md' },
  dround: { root: FX_ROOT, path: '.planning/notes/2026-03-24-round-member-avatars.md' },
  dsfx: { root: FX_ROOT, path: '.planning/notes/2026-03-23-checkout-sound-cues.md' },
  dcall: { root: FX_ROOT, path: '.planning/notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md' },
  dback: { root: FX_ROOT, path: '.planning/notes/2026-03-23-back-button-closes-the-kiosk.md' },
  pcap: { root: FX_ROOT, path: '.planning/notes/2026-03-24-raise-single-export-size-cap.md' },
  pbrief: { root: FX_ROOT, path: '.planning/notes/2026-03-26-steward-desk-milestone-brief.md' },
  star: { root: SYNTHETIC_ROOT, path: '.planning/notes/2026-10-16-tariff-note-tooltips.md' },
  sundo: { root: SYNTHETIC_ROOT, path: '.planning/notes/2026-10-08-brokers-want-undo.md' },
  lperkind: { root: LABELORE_FIXTURE_ROOT, path: '.planning/notes/per-kind-artifact-rendering.md' },
};

export function readKeyed(file: KeyedFile): string {
  return readFileSync(join(file.root, file.path), 'utf8');
}

// The loaders moved to fixture-project.ts (plan 06-01); re-exported so every current importer keeps working.
export { loadFiles, loadProject, planningFiles } from './fixture-project.ts';
export type { LoadedProject } from './fixture-project.ts';
