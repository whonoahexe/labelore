// 11-31 (VIEW-20, D-10, D-12, D-13; sketch 056 C "Shared root"): the workstream index model over the real Brinkwater
// fixture and over inventories written by hand. The model holds every sentence the page shows, so the wording, the
// pointer states, the progress note, the dashed branch, the Completed bar and the mid-migration notice are pinned here
// without a browser. Expected strings are the UI-SPEC copywriting contract's, not the code's.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildWorkstreamIndex, NO_POINTER_LINE, sharedRootFiles } from '../../src/presentation/workstream-index.ts';
import type { WorkstreamIndexModel } from '../../src/presentation/workstream-index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { flatInventory, readWorkstreamInventory } from '../../src/server/workstreams.ts';
import type { WorkstreamEntry, WorkstreamInventory } from '../../src/server/workstreams.ts';
import { planningFiles } from '../helpers/fixture-project.ts';

const BRINKWATER = fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');

async function modelOf(change: (files: Record<string, string>) => void = () => undefined): Promise<{
  model: WorkstreamIndexModel;
  inventory: WorkstreamInventory;
  presentation: ProjectPresentation;
}> {
  const files = planningFiles(BRINKWATER);
  change(files);
  const fs = new InMemoryPlanningFilesystem(files);
  const snapshot = await new PlanningRepository(fs, BRINKWATER).load();
  const presentation = toProjectPresentation({ ...snapshot, readAt: '2026-11-07T12:00:00.000Z' });
  const inventory = await readWorkstreamInventory(fs);
  return { model: buildWorkstreamIndex(inventory, presentation), inventory, presentation };
}

const entry = (overrides: Partial<WorkstreamEntry> & { name: string }): WorkstreamEntry => ({
  kind: 'folder',
  status: 'executing',
  currentPhase: null,
  progress: null,
  hasRoadmap: true,
  ownFiles: ['ROADMAP.md', 'STATE.md'],
  phaseCount: 0,
  dashed: null,
  ...overrides,
});

describe('the workstream index over Brinkwater', () => {
  it('gives three branches, intake, ledger and notices, with intake Active and only intake', async () => {
    const { model } = await modelOf();
    expect(model.branches.map((branch) => branch.name)).toEqual(['intake', 'ledger', 'notices']);
    expect(model.branches.map((branch) => branch.active)).toEqual([true, false, false]);
    expect(model.countText).toBe('3 workstreams');
  });

  it('writes the head: the eyebrow, the project name and the What This Is lead', async () => {
    const { model } = await modelOf();
    expect(model.head.eyebrow).toBe('Project · workstream mode');
    expect(model.head.name).toBe('Brinkwater');
    expect(model.head.lead).toContain('A tide-gauge service for a small harbour');
  });

  it('names the pointer as the contract words it', async () => {
    const { model } = await modelOf();
    expect(model.pointer.state).toBe('present');
    expect(model.pointer.text).toBe('Active workstream intake, from .planning/active-workstream');
    expect(model.root.pointerText).toBe('active-workstream → intake');
    expect(model.root.label).toBe('Shared by every workstream · .planning/');
  });

  it("draws intake's phase, status, ring and plans from its STATE and ROADMAP", async () => {
    const [intake] = (await modelOf()).model.branches;
    expect(intake.url).toBe('/workstreams/intake/');
    expect(intake.status).toEqual({ word: 'executing', tone: 'in-flight' });
    expect(intake.phase).toEqual({ label: 'Phase 2', name: 'Feed Alerts' });
    expect(intake.ring).toMatchObject({ done: 1, total: 2, text: '1/2', label: '1 of 2 phases done' });
    expect(intake.plans).toEqual({ done: 1, total: 2, label: '1 of 2 plans' });
    expect(intake.note).toBeNull();
    expect(intake.dashed).toBe(false);
  });

  it("gives ledger's plans and phases as two facts and the progress note that names both", async () => {
    const ledger = (await modelOf()).model.branches[1];
    expect(ledger.ring).toMatchObject({ done: 4, total: 6, label: '4 of 6 phases done' });
    expect(ledger.plans).toEqual({ done: 22, total: 22, label: '22 of 22 plans' });
    expect(ledger.note).toBe('Every plan is done; STATE marks 4 of 6 phases complete.');
    expect(ledger.files.map((chip) => chip.label)).toEqual(['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'phases/ (1)', 'config.json']);
  });

  it('draws notices dashed with "No roadmap yet", no ring, and the STATE-only file chip', async () => {
    const notices = (await modelOf()).model.branches[2];
    expect(notices.dashed).toBe(true);
    expect(notices.dashedLabel).toBe('No roadmap yet');
    expect(notices.ring).toBeNull();
    expect(notices.status).toEqual({ word: 'Not started', tone: 'quiet' });
    expect(notices.files.map((chip) => chip.label)).toEqual(['STATE.md']);
  });

  it('lists the root files that are present: PROJECT.md, config.json, codebase/, todos/', async () => {
    const { model } = await modelOf();
    expect(model.root.files.map((chip) => chip.label)).toEqual(['PROJECT.md', 'config.json', 'codebase/', 'todos/']);
    expect(model.root.files[0].url).toBe('/project');
  });

  it('keeps the workstream archive out of the shared files and in one Completed row', async () => {
    const { model } = await modelOf();
    expect(model.completed?.label).toBe('Completed');
    expect(model.completed?.countText).toBe('1 workstream');
    expect(model.completed?.rows).toEqual([
      { name: 'archive', folder: 'milestones/ws-archive-2026-05-01/', phasesText: '1 phase archived' },
    ]);
    expect(model.root.files.map((chip) => chip.label)).not.toContain('milestones/');
  });

  it('links a branch to its own scope and its files to their pages inside it', async () => {
    const ledger = (await modelOf()).model.branches[1];
    const urls = Object.fromEntries(ledger.files.map((chip) => [chip.label, chip.url]));
    expect(urls['ROADMAP.md']).toBe('/workstreams/ledger/roadmap');
    expect(urls['STATE.md']).toBe('/workstreams/ledger/state');
    expect(urls['REQUIREMENTS.md']).toBe('/workstreams/ledger/requirements');
    expect(urls['config.json']).toBe('/workstreams/ledger/settings');
    expect(urls['phases/ (1)']).toBeNull();
  });

  it('is not a mid-migration project', async () => {
    expect((await modelOf()).model.midMigration).toBeNull();
  });
});

describe('the pointer states', () => {
  it('shows no Active mark and the absent line when the file is missing', async () => {
    const { model } = await modelOf((files) => {
      for (const key of Object.keys(files)) if (key.endsWith('/active-workstream')) delete files[key];
    });
    expect(model.branches.every((branch) => !branch.active)).toBe(true);
    expect(model.pointer.state).toBe('absent');
    expect(model.pointer.text).toBe(NO_POINTER_LINE);
    expect(model.pointer.text).toBe(
      'No active workstream on disk: GSD keeps the active one per agent session, which Labelore cannot see.',
    );
    expect(model.root.pointerText).toBe('no active-workstream file');
  });

  it('shows no Active mark and the stale line naming the missing workstream', async () => {
    const { model } = await modelOf((files) => {
      for (const key of Object.keys(files)) if (key.endsWith('/active-workstream')) files[key] = 'gone\n';
    });
    expect(model.branches.every((branch) => !branch.active)).toBe(true);
    expect(model.pointer.state).toBe('stale');
    expect(model.pointer.text).toBe('active-workstream names gone, which is not in workstreams/.');
    expect(model.root.pointerText).toBe('active-workstream → gone');
  });
});

describe('the progress note', () => {
  const bare = { artifacts: [], projectName: null, rootPath: '/x' } as unknown as ProjectPresentation;
  const make = (progress: WorkstreamEntry['progress']): string | null => {
    const inventory: WorkstreamInventory = {
      ...flatInventory(),
      mode: 'workstreams',
      entries: [entry({ name: 'a', progress })],
    };
    return buildWorkstreamIndex(inventory, bare).branches[0].note;
  };

  it('appears only when every plan is done and fewer phases are marked', () => {
    expect(make({ phasesDone: 4, phasesTotal: 8, plansDone: 90, plansTotal: 90 })).toBe(
      'Every plan is done; STATE marks 4 of 8 phases complete.',
    );
    expect(make({ phasesDone: 8, phasesTotal: 8, plansDone: 90, plansTotal: 90 })).toBeNull();
    expect(make({ phasesDone: 4, phasesTotal: 8, plansDone: 80, plansTotal: 90 })).toBeNull();
    expect(make({ phasesDone: 0, phasesTotal: 3, plansDone: 0, plansTotal: 0 })).toBeNull();
    expect(make(null)).toBeNull();
  });
});

describe('the Completed bar and the count', () => {
  const presentation = { artifacts: [], projectName: null, rootPath: '/x' } as unknown as ProjectPresentation;
  const inventory = (completed: WorkstreamInventory['completed'], count: number): WorkstreamInventory => ({
    ...flatInventory(),
    mode: 'workstreams',
    entries: Array.from({ length: count }, (_, index) => entry({ name: `w${index}` })),
    completed,
  });

  it('is omitted when there are no completed rows', () => {
    expect(buildWorkstreamIndex(inventory([], 2), presentation).completed).toBeNull();
  });

  it('counts "1 workstream" and "2 workstreams" and "1 phase archived"', () => {
    expect(buildWorkstreamIndex(inventory([], 1), presentation).countText).toBe('1 workstream');
    expect(buildWorkstreamIndex(inventory([], 2), presentation).countText).toBe('2 workstreams');
    const done = buildWorkstreamIndex(
      inventory(
        [
          { name: 'a', folder: 'milestones/ws-a-2026-01-01/', phasesArchived: 1 },
          { name: 'b', folder: 'milestones/ws-b-2026-01-02/', phasesArchived: 3 },
        ],
        1,
      ),
      presentation,
    ).completed;
    expect(done?.countText).toBe('2 workstreams');
    expect(done?.rows.map((row) => row.phasesText)).toEqual(['1 phase archived', '3 phases archived']);
  });
});

describe('a mid-migration project', () => {
  it('shows one notice naming the root files beside workstreams/', async () => {
    const { model } = await modelOf((files) => {
      const intakeRoadmap = Object.keys(files).find((key) => key.endsWith('workstreams/intake/ROADMAP.md'));
      const intakeState = Object.keys(files).find((key) => key.endsWith('workstreams/intake/STATE.md'));
      if (!intakeRoadmap || !intakeState) throw new Error('intake files missing from the fixture');
      files[intakeRoadmap.replace('workstreams/intake/', '')] = files[intakeRoadmap];
      files[intakeState.replace('workstreams/intake/', '')] = files[intakeState];
    });
    expect(model.midMigration).toBe(
      'This project has ROADMAP.md and STATE.md at the root beside workstreams/; GSD moves them into a workstream when it migrates, so each workstream below shows its own.',
    );
    expect(model.branches).toHaveLength(3);
  });
});

describe('a branch that is not a workstream folder', () => {
  it('is dashed, has no address, and is not counted', () => {
    const presentation = { artifacts: [], projectName: null, rootPath: '/x' } as unknown as ProjectPresentation;
    const inventory: WorkstreamInventory = {
      ...flatInventory(),
      mode: 'workstreams',
      entries: [entry({ name: 'real' }), entry({ name: 'stray.md', kind: 'file', dashed: 'STATE.md not found', hasRoadmap: false })],
    };
    const model = buildWorkstreamIndex(inventory, presentation);
    expect(model.countText).toBe('1 workstream');
    expect(model.branches[1]).toMatchObject({ url: null, dashed: true, dashedLabel: 'Not a workstream folder', active: false });
  });
});

describe('the shared root files', () => {
  it('shows milestones/ only when it holds something other than workstream archives', () => {
    const artifact = (path: string) => ({ path, key: path, kind: 'unknown' }) as unknown as ProjectPresentation['artifacts'][number];
    expect(sharedRootFiles([artifact('.planning/milestones/ws-a-2026-01-01/STATE.md')])).toEqual([]);
    expect(sharedRootFiles([artifact('.planning/milestones/v1.0-ROADMAP.md')]).map((chip) => chip.label)).toEqual(['milestones/']);
    expect(sharedRootFiles([artifact('.planning/workstreams/a/STATE.md'), artifact('.planning/research/x.md')]).map((chip) => chip.label)).toEqual(['research/']);
  });
});

describe('names stay text', () => {
  it('encodes a name into its address as one segment and leaves the name itself untouched', () => {
    const presentation = { artifacts: [], projectName: null, rootPath: '/x' } as unknown as ProjectPresentation;
    const odd = '<img src=x onerror=alert(1)>';
    const inventory: WorkstreamInventory = { ...flatInventory(), mode: 'workstreams', entries: [entry({ name: odd })] };
    const [branch] = buildWorkstreamIndex(inventory, presentation).branches;
    expect(branch.name).toBe(odd);
    expect(branch.url).toBe(`/workstreams/${encodeURIComponent(odd)}/`);
    expect(branch.url).not.toContain('<');
  });
});
