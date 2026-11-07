// D-15, D-17, VIEW-20: the made-up workstream project (test/fixtures/brinkwater) loaded today, before any
// workstream code exists. This is the BASELINE the last waves change: the project opens without a throw, is
// not map-only (RESEARCH C8, as 11-03 built it), its workstream files are reachable as plain documents at
// location `other`, and GSD's `active-workstream` pointer is internal bookkeeping, never an artifact.
// "Projects without workstreams look and behave exactly as before" (D-13) is checked on Shapes, not here.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { projectMapState } from '../src/presentation/project-map-state.ts';
import { ALL_FIXTURE_ROOTS } from './helpers/fixture-roots.ts';
import { loadProject } from './helpers/fixture-project.ts';
import type { LoadedProject } from './helpers/fixture-project.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const BRINKWATER = join(REPO_ROOT, 'test/fixtures/brinkwater');
const WORKSTREAM_DIR = '.planning/workstreams/intake/';

function artifactsOf(loaded: LoadedProject): { path: string; location: string; kind: string }[] {
  const project = loaded.snapshot.project;
  if (!project) throw new Error('Brinkwater did not load into a project');
  return Object.values(project.artifacts).map((artifact) => ({
    path: artifact.path,
    location: artifact.location,
    kind: artifact.kind,
  }));
}

describe('the Brinkwater workstream fixture, before any workstream code (D-15)', () => {
  it('is one of the fixture roots every all-roots test walks', () => {
    expect(ALL_FIXTURE_ROOTS).toContain(BRINKWATER);
  });

  it('loads through the real repository without a throw and holds a project', async () => {
    const loaded = await loadProject(BRINKWATER);
    expect(loaded.snapshot.project).not.toBeNull();
    expect(loaded.snapshot.loadStatus).not.toBe('failed');
  });

  it('holds the root files GSD writes at the top of a workstream project', async () => {
    const paths = artifactsOf(await loadProject(BRINKWATER)).map((artifact) => artifact.path);
    expect(paths).toContain('.planning/PROJECT.md');
    expect(paths).toContain('.planning/config.json');
    expect(paths).toContain('.planning/codebase/STACK.md');
    expect(paths).not.toContain('.planning/ROADMAP.md');
    expect(paths).not.toContain('.planning/STATE.md');
  });

  it('is not map-only although it holds a codebase map (RESEARCH C8)', async () => {
    const state = projectMapState(artifactsOf(await loadProject(BRINKWATER)));
    expect(state.present).toEqual(['STACK.md']);
    expect(state.mapOnly).toBe(false);
  });

  it('reaches the intake workstream files as plain documents at location other', async () => {
    const inWorkstream = artifactsOf(await loadProject(BRINKWATER)).filter((artifact) =>
      artifact.path.startsWith(WORKSTREAM_DIR),
    );
    const names = inWorkstream.map((artifact) => artifact.path.slice(WORKSTREAM_DIR.length));
    for (const name of ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md']) expect(names).toContain(name);
    for (const artifact of inWorkstream) expect(artifact.location).toBe('other');
  });

  it("reaches intake's phase files as artifacts at location other, not as phases of the project", async () => {
    const loaded = await loadProject(BRINKWATER);
    const phaseFiles = artifactsOf(loaded).filter((artifact) =>
      artifact.path.startsWith(`${WORKSTREAM_DIR}phases/`),
    );
    expect(phaseFiles.map((artifact) => artifact.path.slice(WORKSTREAM_DIR.length)).sort()).toEqual(
      [
        'phases/01-sensor-feed/01-01-PLAN.md',
        'phases/01-sensor-feed/01-01-SUMMARY.md',
        'phases/02-feed-alerts/02-01-PLAN.md',
      ],
    );
    for (const artifact of phaseFiles) expect(artifact.location).toBe('other');
    expect(loaded.snapshot.project?.phases).toEqual([]);
  });

  it('holds the root todo beside the workstream, outside it', async () => {
    const paths = artifactsOf(await loadProject(BRINKWATER)).map((artifact) => artifact.path);
    expect(paths).toContain('.planning/todos/pending/2026-05-02-gauge-calibration.md');
  });

  it('keeps active-workstream out of the artifacts: root internal bookkeeping (UI-SPEC section 8 rule 6)', async () => {
    const loaded = await loadProject(BRINKWATER);
    const paths = artifactsOf(loaded).map((artifact) => artifact.path);
    expect(paths).not.toContain('.planning/active-workstream');
    expect(loaded.snapshot.exclusions.map((exclusion) => exclusion.path)).toContain(
      '.planning/active-workstream',
    );
  });

  it('writes the pointer as GSD does: only the workstream name and a newline', () => {
    expect(readFileSync(join(BRINKWATER, '.planning/active-workstream'), 'utf8')).toBe('intake\n');
  });
});

// 11-28: the hard workstream shapes. Loaded today these are still ordinary documents; the workstream layer that
// reads them as scopes does not exist yet (the scope design is confirmed at the 11-28 checkpoint).
describe('the Brinkwater hard workstream shapes, before any workstream code (D-13, D-15, RESEARCH C12)', () => {
  const WORKSTREAMS_DIR = join(BRINKWATER, '.planning/workstreams');
  const ARCHIVE_DIR = '.planning/milestones/ws-archive-2026-05-01/';

  function frontmatterOf(relative: string): string {
    const text = readFileSync(join(BRINKWATER, relative), 'utf8');
    const match = /^---\n([\s\S]*?)\n---/.exec(text);
    if (!match) throw new Error(`${relative} has no frontmatter`);
    return match[1] ?? '';
  }

  it('holds three workstream folders: intake, ledger and notices', () => {
    const folders = readdirSync(WORKSTREAMS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(folders).toEqual(['intake', 'ledger', 'notices']);
  });

  it("reaches ledger's files as artifacts at location other", async () => {
    const dir = '.planning/workstreams/ledger/';
    const inLedger = artifactsOf(await loadProject(BRINKWATER)).filter((artifact) =>
      artifact.path.startsWith(dir),
    );
    expect(inLedger.map((artifact) => artifact.path.slice(dir.length)).sort()).toEqual([
      'REQUIREMENTS.md',
      'ROADMAP.md',
      'STATE.md',
      'config.json',
      'phases/04-tide-tables/04-01-SUMMARY.md',
    ]);
    for (const artifact of inLedger) expect(artifact.location).toBe('other');
  });

  it('writes ledger with plans all done while fewer phases are marked complete', () => {
    const state = frontmatterOf('.planning/workstreams/ledger/STATE.md');
    expect(state).toMatch(/^status: verifying$/m);
    expect(state).toMatch(/^ {2}total_phases: 6$/m);
    expect(state).toMatch(/^ {2}completed_phases: 4$/m);
    expect(state).toMatch(/^ {2}total_plans: 22$/m);
    expect(state).toMatch(/^ {2}completed_plans: 22$/m);
  });

  it('gives ledger its own config.json', () => {
    const config = JSON.parse(
      readFileSync(join(WORKSTREAMS_DIR, 'ledger/config.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(config.made_up_example).toBe(true);
    expect(config.granularity).toBe('fine');
  });

  it("holds only STATE.md for notices, as GSD's create writes it: not started, no current phase, no roadmap", async () => {
    const dir = '.planning/workstreams/notices/';
    const inNotices = artifactsOf(await loadProject(BRINKWATER)).filter((artifact) =>
      artifact.path.startsWith(dir),
    );
    expect(inNotices.map((artifact) => artifact.path)).toEqual([`${dir}STATE.md`]);
    expect(readdirSync(join(WORKSTREAMS_DIR, 'notices'))).toEqual(['STATE.md']);
    const text = readFileSync(join(WORKSTREAMS_DIR, 'notices/STATE.md'), 'utf8');
    expect(text).toContain('**Status:** Not started');
    expect(text).toContain('**Current Phase:** None');
  });

  it('archives the completed workstream under milestones/ws-<name>-<date> with STATE.md and phases/ only', () => {
    const entries = readdirSync(join(BRINKWATER, ARCHIVE_DIR)).sort();
    expect(entries).toEqual(['STATE.md', 'phases']);
    expect(frontmatterOf(`${ARCHIVE_DIR}STATE.md`)).toMatch(/^status: complete$/m);
  });

  it("reads the archive's files as ordinary milestone-folder documents, in every mode (RESEARCH C12)", async () => {
    const inArchive = artifactsOf(await loadProject(BRINKWATER)).filter((artifact) =>
      artifact.path.startsWith(ARCHIVE_DIR),
    );
    expect(inArchive.map((artifact) => artifact.path.slice(ARCHIVE_DIR.length)).sort()).toEqual([
      'STATE.md',
      'phases/01-cold-storage/01-01-SUMMARY.md',
    ]);
    for (const artifact of inArchive) {
      expect(artifact.location).toBe('milestone-root');
      expect(artifact.kind).toBe('unknown');
    }
  });

  it('still opens without a throw, is not map-only and has no phases of its own', async () => {
    const loaded = await loadProject(BRINKWATER);
    expect(loaded.snapshot.loadStatus).not.toBe('failed');
    expect(projectMapState(artifactsOf(loaded)).mapOnly).toBe(false);
    expect(loaded.snapshot.project?.phases).toEqual([]);
  });
});
