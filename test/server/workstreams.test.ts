// 11-29 (VIEW-20, D-10, D-13; RESEARCH C7, C12, A9, Pitfalls 5, 6, 12): the workstream inventory over the real
// Brinkwater fixture and over in-memory doubles. The active pointer is a hint read once and matched against the
// listing, the phases and plans counts are two facts, an entry that is a file or has no STATE is listed dashed,
// and the order never depends on the order the directory returns.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import type { DirEntry, PlanningFilesystem } from '../../src/planning-fs/types.ts';
import { isValidWorkstreamName, readWorkstreamInventory } from '../../src/server/workstreams.ts';
import { FX_ROOT, planningFiles } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const BRINKWATER = fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');

function brinkwater(change: (files: Record<string, string>) => void = () => undefined): InMemoryPlanningFilesystem {
  const files = planningFiles(BRINKWATER);
  change(files);
  return new InMemoryPlanningFilesystem(files);
}

/** A port whose directory listings come back in reverse order. */
function reversed(inner: PlanningFilesystem): PlanningFilesystem {
  return {
    capabilities: inner.capabilities,
    list: async (dir: string): Promise<DirEntry[]> => (await inner.list(dir)).slice().reverse(),
    read: (path: string) => inner.read(path),
    exists: (path: string) => inner.exists(path),
    readHead: inner.readHead?.bind(inner),
  };
}

const stateFile = (body: string): string => `---\nworkstream: x\n---\n\n# Project State\n\n${body}\n`;

describe('readWorkstreamInventory over Brinkwater', () => {
  it('lists intake, ledger and notices in that order in workstreams mode', async () => {
    const inventory = await readWorkstreamInventory(brinkwater());
    expect(inventory.mode).toBe('workstreams');
    expect(inventory.entries.map((entry) => entry.name)).toEqual(['intake', 'ledger', 'notices']);
  });

  it("reads intake's status and its current phase name from the ROADMAP", async () => {
    const intake = (await readWorkstreamInventory(brinkwater())).entries[0];
    expect(intake.status).toBe('executing');
    expect(intake.currentPhase).toEqual({ number: '2', name: 'Feed Alerts' });
    expect(intake.progress).toEqual({ phasesDone: 1, phasesTotal: 2, plansDone: 1, plansTotal: 2 });
    expect(intake.hasRoadmap).toBe(true);
    expect(intake.phaseCount).toBe(2);
    expect(intake.dashed).toBeNull();
    expect(intake.ownFiles).toEqual(['REQUIREMENTS.md', 'ROADMAP.md', 'STATE.md', 'phases']);
  });

  it("reports ledger's phases 4 of 6 and plans 22 of 22 as given, neither derived from the other", async () => {
    const ledger = (await readWorkstreamInventory(brinkwater())).entries[1];
    expect(ledger.status).toBe('verifying');
    expect(ledger.progress).toEqual({ phasesDone: 4, phasesTotal: 6, plansDone: 22, plansTotal: 22 });
    expect(ledger.currentPhase).toEqual({ number: '4', name: 'Tide Tables' });
    expect(ledger.ownFiles).toContain('config.json');
  });

  it('lists notices dashed with "No roadmap yet" and the status from its bold line', async () => {
    const notices = (await readWorkstreamInventory(brinkwater())).entries[2];
    expect(notices.hasRoadmap).toBe(false);
    expect(notices.dashed).toBe('No roadmap yet');
    expect(notices.status).toBe('Not started');
    expect(notices.currentPhase).toBeNull();
    expect(notices.progress).toBeNull();
    expect(notices.phaseCount).toBe(0);
  });

  it('reads the active pointer as present, and lists the one completed workstream', async () => {
    const inventory = await readWorkstreamInventory(brinkwater());
    expect(inventory.active).toEqual({ name: 'intake', state: 'present' });
    expect(inventory.completed).toEqual([{ name: 'archive', folder: 'milestones/ws-archive-2026-05-01/', phasesArchived: 1 }]);
    expect(inventory.midMigration).toBeNull();
  });

  it('marks nothing active when the pointer file is removed (the pointer is the only source)', async () => {
    const inventory = await readWorkstreamInventory(brinkwater((files) => delete files['.planning/active-workstream']));
    expect(inventory.active).toEqual({ name: null, state: 'absent' });
    expect(inventory.entries.length).toBe(3);
  });

  it('reads a pointer naming a workstream that is not listed as stale', async () => {
    const inventory = await readWorkstreamInventory(brinkwater((files) => (files['.planning/active-workstream'] = 'gone\n')));
    expect(inventory.active).toEqual({ name: 'gone', state: 'stale' });
  });

  it('treats a pointer of "../x", "none", an oversize or an empty pointer as absent', async () => {
    for (const content of ['../x', 'none', 'a'.repeat(300), '', '   \n', 'a/b', '%2e%2e']) {
      const inventory = await readWorkstreamInventory(brinkwater((files) => (files['.planning/active-workstream'] = content)));
      expect(inventory.active, JSON.stringify(content.slice(0, 12))).toEqual({ name: null, state: 'absent' });
    }
  });

  it('is flat for Shapes and Lendshed', async () => {
    for (const root of [FX_ROOT, SHAPES_ROOT]) {
      const inventory = await readWorkstreamInventory(new InMemoryPlanningFilesystem(planningFiles(root)));
      expect(inventory).toEqual({ mode: 'flat', entries: [], active: { name: null, state: 'absent' }, completed: [], midMigration: null });
    }
  });
});

describe('readWorkstreamInventory edges', () => {
  it('lists a workstreams/ entry that is a file, dashed, and a folder with no STATE.md, dashed', async () => {
    const inventory = await readWorkstreamInventory(
      brinkwater((files) => {
        files['.planning/workstreams/stray.txt'] = 'not a workstream';
        files['.planning/workstreams/empty/phases/.gitkeep'] = '';
      }),
    );
    const byName = new Map(inventory.entries.map((entry) => [entry.name, entry]));
    expect(byName.get('stray.txt')).toMatchObject({ kind: 'file', dashed: 'STATE.md not found', status: null });
    expect(byName.get('empty')).toMatchObject({ kind: 'folder', dashed: 'STATE.md not found', status: null, hasRoadmap: false });
  });

  it('is flat when workstreams/ holds no subfolder', async () => {
    const files = { '.planning/PROJECT.md': '# P', '.planning/ROADMAP.md': '# R', '.planning/workstreams/README.txt': 'x' };
    const inventory = await readWorkstreamInventory(new InMemoryPlanningFilesystem(files));
    expect(inventory.mode).toBe('flat');
    expect(inventory.entries).toEqual([]);
    expect(inventory.midMigration).toBeNull();
  });

  it('reports the root files a migration should have moved, and still reads intake\'s own roadmap', async () => {
    const files = planningFiles(BRINKWATER);
    files['.planning/ROADMAP.md'] = '# Roadmap: root\n\n- [ ] **Phase 1: Root Phase** - leftover\n';
    files['.planning/STATE.md'] = stateFile('**Status:** Executing');
    const inventory = await readWorkstreamInventory(new InMemoryPlanningFilesystem(files));
    expect(inventory.midMigration).toEqual({ rootFiles: ['ROADMAP.md', 'STATE.md'] });
    expect(inventory.entries[0].currentPhase?.name).toBe('Feed Alerts');
  });

  it('gives the same entry order whatever order the directory returns, and keeps case-different names apart', async () => {
    const files = planningFiles(BRINKWATER);
    for (const name of ['roadmap', 'Roadmap', 'phase-2', 'v1.1']) files[`.planning/workstreams/${name}/STATE.md`] = stateFile('**Status:** Planning');
    const forward = await readWorkstreamInventory(new InMemoryPlanningFilesystem(files));
    const backward = await readWorkstreamInventory(reversed(new InMemoryPlanningFilesystem(files)));
    expect(backward).toEqual(forward);
    expect(forward.entries.map((entry) => entry.name)).toEqual(['Roadmap', 'intake', 'ledger', 'notices', 'phase-2', 'roadmap', 'v1.1']);
  });

  it('orders completed rows by archive folder name', async () => {
    const files = planningFiles(BRINKWATER);
    files['.planning/milestones/ws-zeta-2026-02-01/phases/01-a/01-01-SUMMARY.md'] = '# s';
    files['.planning/milestones/ws-archive-2026-05-01-1/STATE.md'] = '# s';
    files['.planning/milestones/v1.0-ROADMAP.md'] = '# not a workstream archive';
    const completed = (await readWorkstreamInventory(reversed(new InMemoryPlanningFilesystem(files)))).completed;
    expect(completed.map((row) => row.folder)).toEqual([
      'milestones/ws-archive-2026-05-01/',
      'milestones/ws-archive-2026-05-01-1/',
      'milestones/ws-zeta-2026-02-01/',
    ]);
    expect(completed.map((row) => row.name)).toEqual(['archive', 'archive', 'zeta']);
    expect(completed.map((row) => row.phasesArchived)).toEqual([1, 0, 1]);
  });

  it('reads STATE frontmatter first, then the bold lines; a numeric phase keeps its written zeros', async () => {
    const files: Record<string, string> = {
      '.planning/workstreams/front/STATE.md': '---\nstatus: paused\ncurrent_phase: 010\n---\n\n**Status:** Executing\n**Current Phase:** 010 — Late\n',
      '.planning/workstreams/front/ROADMAP.md': '### Phase 10: Tenth Phase\n',
      '.planning/workstreams/bold/STATE.md': stateFile('**Status:** Verifying Phase 03\n**Current Phase:** 03'),
      '.planning/workstreams/bold/ROADMAP.md': '- [ ] **Phase 3: Third Phase** - the third\n',
      '.planning/workstreams/bad/STATE.md': '---\nstatus: [unclosed\n---\n\n**Status:** Blocked\n',
    };
    const byName = new Map((await readWorkstreamInventory(new InMemoryPlanningFilesystem(files))).entries.map((entry) => [entry.name, entry]));
    expect(byName.get('front')).toMatchObject({ status: 'paused', currentPhase: { number: '10', name: 'Tenth Phase' } });
    expect(byName.get('bold')).toMatchObject({ status: 'Verifying Phase 03', currentPhase: { number: '3', name: 'Third Phase' } });
    // Unparseable frontmatter degrades to the bold line rather than hiding the workstream.
    expect(byName.get('bad')?.status).toBe('Blocked');
  });

  it('does not derive plans from phases or the reverse when a figure is missing', async () => {
    const files = {
      '.planning/workstreams/half/STATE.md': '---\nprogress:\n  total_phases: 8\n  completed_phases: 4\n---\n\n**Status:** Executing\n',
      '.planning/workstreams/half/ROADMAP.md': '# r\n',
    };
    const [half] = (await readWorkstreamInventory(new InMemoryPlanningFilesystem(files))).entries;
    expect(half.progress).toBeNull();
  });

  it('bounds author text and never throws on an unreadable port', async () => {
    const long = 'x'.repeat(5000);
    const files = {
      '.planning/workstreams/long/STATE.md': stateFile(`**Status:** ${long}\n**Current Phase:** 1`),
      '.planning/workstreams/long/ROADMAP.md': `- [ ] **Phase 1: ${long}**\n`,
    };
    const [entry] = (await readWorkstreamInventory(new InMemoryPlanningFilesystem(files))).entries;
    expect((entry.status ?? '').length).toBeLessThanOrEqual(80);
    expect((entry.currentPhase?.name ?? '').length).toBeLessThanOrEqual(120);

    const broken: PlanningFilesystem = {
      capabilities: { watch: false, write: false },
      list: async () => {
        throw new Error('boom');
      },
      read: async () => {
        throw new Error('boom');
      },
      exists: async () => {
        throw new Error('boom');
      },
    };
    expect((await readWorkstreamInventory(broken)).mode).toBe('flat');
  });

  it('reads the active pointer once through the port', async () => {
    const inner = brinkwater();
    let pointerReads = 0;
    const counting: PlanningFilesystem = {
      capabilities: inner.capabilities,
      list: (dir) => inner.list(dir),
      exists: (path) => inner.exists(path),
      read: (path) => {
        if (path.endsWith('active-workstream')) pointerReads += 1;
        return inner.read(path);
      },
      readHead: (path, max) => {
        if (path.endsWith('active-workstream')) pointerReads += 1;
        return inner.readHead(path, max);
      },
    };
    await readWorkstreamInventory(counting);
    expect(pointerReads).toBe(1);
  });
});

describe('isValidWorkstreamName', () => {
  it('rejects the empty name, dots, separators, encoded dots and the word none', () => {
    for (const bad of ['', '.', '..', 'a/b', '%2e%2e', 'none', '.hidden', '-lead', 'a b', 'a\\b', 'a..b']) {
      expect(isValidWorkstreamName(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('accepts names GSD accepts, including grammar words and mixed case', () => {
    for (const good of ['v1.1', 'phase-2', 'roadmap', 'Roadmap', 'intake', 'a_b', '2026']) {
      expect(isValidWorkstreamName(good), good).toBe(true);
    }
  });
});
