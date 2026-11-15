// quick-261115-o34: the dashboard position block (sketches 066 C and 067 S) through the real reader.
// Expected values come from the sketches' own states and from /gsd-next's routing, not from the code under
// test. Files are written the way GSD writes them; nothing here reads a real project.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDashboardPosition } from '../../src/presentation/dashboard-position.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { fromDirectory } from '../helpers/from-directory.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const READ_AT = '2026-11-15T12:00:00.000Z';

async function presentationOf(files: Record<string, string>, mtimes: number | Record<string, number> = 0) {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files, mtimes), '/project').load();
  return toProjectPresentation({ ...snapshot, readAt: READ_AT });
}

async function positionOf(files: Record<string, string>, mtimes: number | Record<string, number> = 0) {
  return buildDashboardPosition(await presentationOf(files, mtimes));
}

const liveState = (phase: string | null, status = 'executing') =>
  `---\nmilestone: v1.0\n${phase === null ? '' : `current_phase: ${phase}\n`}status: ${status}\n---\n`;

const ROADMAP = `# Roadmap

## Phase Details

### Phase 1: First Slice
**Goal**: First.

### Phase 2: Second Slice
**Goal**: Second.
`;

const phaseFile = (dir: string, name: string, body = '# File\n') => ({ [`.planning/phases/${dir}/${name}`]: body });
const planFile = (dir: string, id: string) =>
  phaseFile(dir, `${id}-PLAN.md`, `---\nphase: ${dir}\nplan: ${id.slice(3)}\n---\n<objective>\nBuild ${id}.\n</objective>\n`);
const summaryFile = (dir: string, id: string) => phaseFile(dir, `${id}-SUMMARY.md`);

const withRoadmap = (files: Record<string, string>) => ({ '.planning/ROADMAP.md': ROADMAP, ...files });
const stagesOf = (position: ReturnType<typeof buildDashboardPosition>) =>
  position?.now.kind === 'phase'
    ? position.now.stages.map((stage) => [stage.name, stage.state, stage.count])
    : null;

describe('dashboard position: a live milestone, from the files on disk', () => {
  it('reads the dense fixture as Execute phase 2, from its first plan', async () => {
    const root = join(REPO_ROOT, 'fixtures/dense');
    const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
    const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: READ_AT }));
    expect(position?.now).toMatchObject({ kind: 'phase', title: 'Transport Layer', when: 'v3.0 Live Read Surface · Phase 2 of 2' });
    expect(stagesOf(position)).toEqual([
      ['Discuss', 'done', '1 file'],
      ['Research', 'skip', '—'],
      ['Plan', 'done', '1 plan'],
      ['Execute', 'next', '0/1 plans'],
      ['Verify', 'todo', '—'],
    ]);
    expect(position?.next).toMatchObject({
      kind: 'execute',
      title: 'Execute phase 2',
      command: '/gsd-execute-phase 2',
      why: '02-01-PLAN.md is the first plan with no SUMMARY.md.',
      plan: { id: '02-01' },
    });
    expect(position?.next.plan?.url).toMatch(/\/phase-2\/plan-01$/);
  });

  it('executes the lowest phase with an open plan even when STATE.md moved on', async () => {
    const position = await positionOf(
      withRoadmap({
        '.planning/STATE.md': liveState('2'),
        ...planFile('01-first-slice', '01-01'),
        ...planFile('01-first-slice', '01-02'),
        ...summaryFile('01-first-slice', '01-01'),
        ...planFile('02-second-slice', '02-01'),
      }),
    );
    expect(position?.next).toMatchObject({ kind: 'execute', title: 'Execute phase 1', plan: { id: '01-02' } });
    expect(position?.now).toMatchObject({ kind: 'phase', title: 'First Slice' });
    expect(stagesOf(position)?.[3]).toEqual(['Execute', 'now', '1/2 plans']);
  });

  it('verifies a phase whose plans all have summaries but nothing is verified yet', async () => {
    const position = await positionOf(
      withRoadmap({
        '.planning/STATE.md': liveState('1', 'verifying'),
        ...planFile('01-first-slice', '01-01'),
        ...summaryFile('01-first-slice', '01-01'),
      }),
    );
    expect(position?.next).toMatchObject({ kind: 'verify', title: 'Verify phase 1', command: '/gsd-verify-work 1', plan: null });
    expect(stagesOf(position)?.slice(3)).toEqual([
      ['Execute', 'done', '1/1 plans'],
      ['Verify', 'next', 'to do'],
    ]);
  });

  it('moves on to discuss the next phase once verification passed', async () => {
    const position = await positionOf(
      withRoadmap({
        '.planning/STATE.md': liveState('1'),
        ...planFile('01-first-slice', '01-01'),
        ...summaryFile('01-first-slice', '01-01'),
        ...phaseFile('01-first-slice', '01-VERIFICATION.md', '---\nstatus: passed\n---\n# Verification\n'),
      }),
    );
    expect(position?.next).toMatchObject({
      kind: 'discuss',
      title: 'Discuss phase 2',
      command: '/gsd-discuss-phase 2',
      why: 'Phase 1 is verified; phase 2 has no CONTEXT.md yet.',
    });
    expect(position?.now).toMatchObject({ kind: 'phase', title: 'Second Slice' });
    expect(stagesOf(position)?.[0]).toEqual(['Discuss', 'next', 'to do']);
  });

  it('completes the milestone after its last phase is verified', async () => {
    const position = await positionOf(
      withRoadmap({
        '.planning/STATE.md': liveState('2'),
        ...phaseFile('01-first-slice', '01-UAT.md', '---\nstatus: complete\n---\n# UAT\n'),
        ...planFile('02-second-slice', '02-01'),
        ...summaryFile('02-second-slice', '02-01'),
        ...phaseFile('02-second-slice', '02-UAT.md', '---\nstatus: complete\n---\n# UAT\n'),
      }),
    );
    expect(position?.next).toMatchObject({
      kind: 'complete-milestone',
      title: 'Complete the milestone',
      command: '/gsd-complete-milestone',
    });
  });

  it('plans a phase with context but no plans, and discusses one without context', async () => {
    const planned = await positionOf(
      withRoadmap({ '.planning/STATE.md': liveState('1', 'planning'), ...phaseFile('01-first-slice', '01-CONTEXT.md') }),
    );
    expect(planned?.next).toMatchObject({ kind: 'plan', title: 'Plan phase 1', command: '/gsd-plan-phase 1' });
    expect(planned?.next.why).toBe('CONTEXT is written; the phase folder has no PLAN files yet.');
    const bare = await positionOf(
      withRoadmap({ '.planning/STATE.md': liveState('1', 'planning'), ...phaseFile('01-first-slice', '01-NOTES.md') }),
    );
    expect(bare?.next).toMatchObject({ kind: 'discuss', title: 'Discuss phase 1', command: '/gsd-discuss-phase 1' });
    expect(bare?.next.why).toBe('The phase folder has no CONTEXT.md yet.');
  });

  it('D6: places a roadmap-only project at Discuss phase 1 though STATE.md names no current phase', async () => {
    const position = await positionOf(
      withRoadmap({
        '.planning/STATE.md': '---\nmilestone: v1.0\nstatus: planning\n---\n\n## Current Position\n\nPhase: 1 of 2\n',
      }),
    );
    expect(position?.next).toMatchObject({
      kind: 'discuss',
      title: 'Discuss phase 1',
      command: '/gsd-discuss-phase 1',
      why: 'The v1.0 roadmap is written; no phase has a folder yet.',
    });
    expect(position?.now).toMatchObject({ kind: 'phase', title: 'First Slice' });
    expect(stagesOf(position)).toEqual([
      ['Discuss', 'next', 'to do'],
      ['Research', 'todo', '—'],
      ['Plan', 'todo', '—'],
      ['Execute', 'todo', '—'],
      ['Verify', 'todo', '—'],
    ]);
  });

  it('words each empty stage as one sentence naming its command', async () => {
    const position = await positionOf(withRoadmap({ '.planning/STATE.md': liveState(null, 'planning') }));
    const stages = position?.now.kind === 'phase' ? position.now.stages : [];
    expect(stages[0].empty).toEqual({
      text: 'No phase folder yet.',
      command: '/gsd-discuss-phase 1',
      tail: 'creates it and writes NN-CONTEXT.md.',
    });
    expect(stages[1].empty?.text).toBe('Optional; runs after Discuss.');
    expect(stages[2].empty?.text).toBe('Starts after Discuss.');
    expect(stages[3].empty?.text).toBe('Starts once there are plans.');
    expect(stages[4].empty?.text).toBe('Starts once every plan has a SUMMARY.');
  });

  it('is null when there is no roadmap and no phase to place', async () => {
    expect(await positionOf({ '.planning/PROJECT.md': '# Bare\n' })).toBeNull();
  });
});

describe('dashboard position: stage detail kept short at any plan count (067 S refined)', () => {
  const ROADMAP9 = `# Roadmap\n\n## Phase Details\n\n### Phase 9: Big Phase\n**Goal**: Many plans.\n`;
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `09-${String(index + 1).padStart(2, '0')}`);
  const phaseWith = async (count: number, summarised: number) => {
    const files: Record<string, string> = { '.planning/ROADMAP.md': ROADMAP9, '.planning/STATE.md': liveState('9') };
    for (const [index, id] of ids(count).entries()) {
      Object.assign(files, planFile('09-big-phase', id));
      if (index < summarised) Object.assign(files, summaryFile('09-big-phase', id));
    }
    const position = await positionOf(files);
    const stages = position?.now.kind === 'phase' ? position.now.stages : [];
    return { position, plan: stages[2], execute: stages[3] };
  };

  it('16 plans, 9 summarised: 16 squares, three rows from the next plan, and the All link', async () => {
    const { execute, plan } = await phaseWith(16, 9);
    expect(execute.squares).toHaveLength(16);
    expect(execute.squares.map((square) => square.state)).toEqual([
      ...Array(9).fill('done'),
      'next',
      ...Array(6).fill('todo'),
    ]);
    expect(execute.rows.map((row) => [row.id, row.state])).toEqual([
      ['09-10', 'next'],
      ['09-11', 'todo'],
      ['09-12', 'todo'],
    ]);
    expect(execute.plansTotal).toBe(16);
    expect(execute.moreUrl).toMatch(/\/phase-9$/);
    expect(plan.summary).toBe('16 PLAN files · 09-01 … 09-16');
    expect(plan.moreUrl).toBe(execute.moreUrl);
  });

  it('4 plans all summarised: the last three rows and none marked next', async () => {
    const { execute } = await phaseWith(4, 4);
    expect(execute.rows.map((row) => [row.id, row.state])).toEqual([
      ['09-02', 'done'],
      ['09-03', 'done'],
      ['09-04', 'done'],
    ]);
    expect(execute.moreUrl).not.toBeNull();
  });

  it('2 plans: two rows, no link; one plan reads 1 PLAN file', async () => {
    const two = await phaseWith(2, 0);
    expect(two.execute.rows).toHaveLength(2);
    expect(two.execute.moreUrl).toBeNull();
    const one = await phaseWith(1, 0);
    expect(one.plan.summary).toBe('1 PLAN file · 09-01');
  });

  it('reads a row objective from the plan, else the ROADMAP description, else null', async () => {
    const { execute } = await phaseWith(2, 0);
    expect(execute.rows[0].objective).toBe('Build 09-01');
    const described = await positionOf({
      '.planning/ROADMAP.md': `${ROADMAP9}\n- [ ] 09-01-PLAN.md — Wire the transport\n`,
      '.planning/STATE.md': liveState('9'),
      ...phaseFile('09-big-phase', '09-01-PLAN.md', '---\nphase: 09\nplan: 01\n---\n# Plan\n'),
    });
    const stage = described?.now.kind === 'phase' ? described.now.stages[3] : null;
    expect(stage?.rows[0].objective).toBe('Wire the transport');
  });

  it('lists one entry per phase of a shipped milestone', async () => {
    const position = await positionOf({
      '.planning/STATE.md': '---\nmilestone: v1.1\n---\n',
      '.planning/milestones/v1.1-ROADMAP.md': '# v1.1\n\n### Phase 5: Views\n**Goal:** V.\n\n### Phase 6: Pages\n**Goal:** P.\n',
      '.planning/milestones/v1.1-phases/05-views/05-01-PLAN.md': '---\nphase: 05\nplan: 01\n---\n',
      '.planning/milestones/v1.1-phases/05-views/05-01-SUMMARY.md': '# S\n',
      '.planning/milestones/v1.1-phases/06-pages/06-01-PLAN.md': '---\nphase: 06\nplan: 01\n---\n',
    });
    expect(position?.now.kind === 'between' ? position.now.phases : null).toEqual([
      { number: '5', name: 'Views', done: true },
      { number: '6', name: 'Pages', done: false },
    ]);
  });
});

describe('dashboard position: Then, the session note and the shipped states', () => {
  const day = (date: string, hour = 10) => Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`);
  const base = {
    '.planning/ROADMAP.md': ROADMAP,
    '.planning/STATE.md': liveState('1'),
    ...phaseFile('01-first-slice', '01-CONTEXT.md'),
    ...phaseFile('01-first-slice', '01-RESEARCH.md'),
  };

  it('names the newest markdown file on disk with a kind phrase, a date and a link', async () => {
    const presentation = await presentationOf(base, {
      '.planning/ROADMAP.md': day('2026-11-10'),
      '.planning/phases/01-first-slice/01-CONTEXT.md': day('2026-11-12'),
      '.planning/phases/01-first-slice/01-RESEARCH.md': day('2026-11-14'),
      '.planning/STATE.md': day('2026-11-15'),
    });
    const position = buildDashboardPosition(presentation);
    const research = presentation.artifacts.find((artifact) => artifact.path.endsWith('01-RESEARCH.md'));
    expect(position?.then).toMatchObject({
      what: 'Research written',
      dateLabel: '14 Nov',
      file: { name: '01-RESEARCH.md', url: research?.key },
    });
  });

  it('phrases a summary, an archive, a sketch and a quick task, and skips the manifests', async () => {
    const newest = async (path: string, extra: Record<string, string> = {}) => {
      const files = { ...base, [path]: '# File\n', ...extra };
      const position = buildDashboardPosition(await presentationOf(files, { [path]: day('2026-11-15') }));
      return position?.then?.what;
    };
    expect(
      await newest('.planning/phases/01-first-slice/01-01-SUMMARY.md', planFile('01-first-slice', '01-01')),
    ).toBe('Plan 01-01 finished');
    expect(await newest('.planning/milestones/v1.1-ROADMAP.md')).toBe('v1.1 archived');
    expect(await newest('.planning/sketches/067-x/README.md')).toBe('Sketch 067 written');
    expect(await newest('.planning/quick/261115-k9z-x/261115-k9z-SUMMARY.md')).toBe('Quick task 261115-k9z finished');
    const skipped = buildDashboardPosition(
      await presentationOf(
        { ...base, '.planning/sketches/MANIFEST.md': '# Manifest\n' },
        {
          '.planning/sketches/MANIFEST.md': day('2026-11-15'),
          '.planning/phases/01-first-slice/01-RESEARCH.md': day('2026-11-14'),
        },
      ),
    );
    expect(skipped?.then?.what).toBe('Research written');
  });

  it('has no file when no mtime is known, but still carries the session note', async () => {
    const position = await positionOf({
      ...base,
      '.planning/STATE.md': '---\nmilestone: v1.0\nstatus: executing\n---\n\n## Session Continuity\n\nStopped at: here we are\n',
    });
    expect(position?.then?.file).toBeNull();
    expect(position?.then?.what).toBeNull();
    expect(position?.then?.note?.text).toBe('here we are');
  });

  describe('D1: one session note, the newer of the two', () => {
    const state = (stopped: string, session: string, activity: string) =>
      `---\nmilestone: v1.0\nstatus: executing\nlast_activity: ${activity}\nlast_activity_desc: Phase 01 execution started\n---\n\n## Session Continuity\n\nLast session: ${session}T09:00:00.000Z\nStopped at: ${stopped}\n`;
    const noteOf = async (session: string, activity: string) =>
      (await positionOf({ ...base, '.planning/STATE.md': state('Phase 1 context gathered', session, activity) }))?.then?.note;

    it('takes the frontmatter activity when it is newer', async () => {
      expect(await noteOf('2026-11-14', '2026-11-15')).toEqual({ text: 'Phase 01 execution started', dateLabel: '15 Nov' });
    });
    it('takes Stopped at when it is newer', async () => {
      expect(await noteOf('2026-11-15', '2026-11-14')).toEqual({ text: 'Phase 1 context gathered', dateLabel: '15 Nov' });
    });
    it('takes Stopped at on the same day', async () => {
      expect((await noteOf('2026-11-15', '2026-11-15'))?.text).toBe('Phase 1 context gathered');
    });
  });

  describe('S4 / D2: a shipped milestone is between milestones, never the archived phase', () => {
    const ARCHIVED_STATE = `---
milestone: v1.1
milestone_name: Legible Documents
current_phase: 05
status: Awaiting next milestone
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
---
`;
    const archivedPlan = (id: string) =>
      `---\nphase: 05\nplan: ${id.slice(3)}\n---\n<objective>\nBuild ${id}.\n</objective>\n`;
    const archive: Record<string, string> = {
      '.planning/STATE.md': ARCHIVED_STATE,
      '.planning/milestones/v1.1-ROADMAP.md': '# v1.1\n\n### Phase 5: Per-Type Document Views\n\n**Goal:** Views.\n',
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md': archivedPlan('05-01'),
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md': '# Summary\n',
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-02-PLAN.md': archivedPlan('05-02'),
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-02-SUMMARY.md': '# Summary\n',
    };

    it('reads Between milestones with /gsd-new-milestone', async () => {
      const position = await positionOf(archive);
      expect(position?.now).toMatchObject({
        kind: 'between',
        title: 'Between milestones',
        when: 'v1.1 Legible Documents · 1 phase',
        why: '2 plans across 1 phase, archived.',
      });
      expect(position?.next).toMatchObject({
        kind: 'new-milestone',
        title: 'Start the next milestone',
        command: '/gsd-new-milestone',
        why: 'v1.1 is archived; ROADMAP.md has no open phases.',
      });
      // The archived phase is listed among the shipped milestone's phases, but is never the Now title.
      expect(position?.now.title).toBe('Between milestones');
      expect(position?.now.when).not.toContain('Per-Type Document Views');
    });

    it('says audited and archived once a milestone audit file exists', async () => {
      const position = await positionOf({ ...archive, '.planning/milestones/v1.1-MILESTONE-AUDIT.md': '---\nstatus: passed\n---\n# Audit\n' });
      expect(position?.now).toMatchObject({ why: '2 plans across 1 phase, audited and archived.' });
      expect(position?.next.why).toBe('v1.1 is audited and archived; ROADMAP.md has no open phases.');
    });

    it('D5: drops an operator step that repeats the next command', async () => {
      const position = await positionOf({
        ...archive,
        '.planning/STATE.md': `${ARCHIVED_STATE}\n## Operator Next Steps\n\n- Start the next milestone with /gsd-new-milestone\n`,
      });
      expect(position?.also).toEqual([]);
    });
  });

  describe('S5: a roadmap only project, and the also items', () => {
    const ROADMAP3 = `# Roadmap

## Phase Details

### Phase 1: First Slice
**Goal**: First.
**Depends on**: Nothing (first phase)

### Phase 2: Second Slice
**Goal**: Second.
**Depends on**: Nothing (runs in parallel)

### Phase 3: Third Slice
**Goal**: Third.
**Depends on**: Phase 1
`;
    const state = `---
milestone: v1.0
status: planning
---

## Deferred Items

| Item | Status |
|------|--------|
| First | open |
| Second | open |

## Operator Next Steps

1. Discuss Phase 1 with /gsd-discuss-phase 1. Then plan it.
2. Plan an operator session at the team PCs; ask before scheduling it.
3. Also run /gsd-discuss-phase 10 when the time comes.
`;

    it('lists ready phases, the step that adds something, and the deferred count in that order', async () => {
      const position = await positionOf({ '.planning/ROADMAP.md': ROADMAP3, '.planning/STATE.md': state });
      expect(position?.next).toMatchObject({ kind: 'discuss', command: '/gsd-discuss-phase 1' });
      expect(position?.also).toEqual([
        { kind: 'phases', text: 'Phase 2 has no open prerequisites and can be discussed alongside it.' },
        {
          kind: 'step',
          text: 'Plan an operator session at the team PCs; ask before scheduling it.',
          moreUrl: expect.stringContaining('#operator-next-steps'),
          moreCount: 1,
        },
        { kind: 'deferred', count: 2, url: expect.stringContaining('#deferred-items') },
      ]);
    });

    it('names two ready phases together, and keeps a step naming /gsd-discuss-phase 10', async () => {
      const roadmap = `${ROADMAP3}\n### Phase 5: Fifth Slice\n**Goal**: Fifth.\n**Depends on**: Nothing\n`;
      const position = await positionOf({ '.planning/ROADMAP.md': roadmap, '.planning/STATE.md': state });
      expect(position?.also[0]).toEqual({
        kind: 'phases',
        text: 'Phases 2 and 5 have no open prerequisites and can be discussed alongside it.',
      });
      expect(position?.also.find((item) => item.kind === 'step')).toMatchObject({ moreCount: 1 });
    });

    it('treats a phase that depends on an unfinished phase as not ready', async () => {
      const position = await positionOf({ '.planning/ROADMAP.md': ROADMAP3, '.planning/STATE.md': '---\nmilestone: v1.0\n---\n' });
      expect(position?.also.some((item) => item.kind === 'phases' && item.text.includes('Phase 3'))).toBe(false);
    });
  });

  it('falls back to STATE.md alone: Discuss phase 3 from the synthetic project', async () => {
    const fixture = (name: string) => readFileSync(join(REPO_ROOT, 'test/fixtures/dashboard', name), 'utf8');
    const position = await positionOf({
      '.planning/PROJECT.md': fixture('synthetic-PROJECT.md'),
      '.planning/STATE.md': fixture('synthetic-STATE.md'),
    });
    expect(position?.next).toMatchObject({ kind: 'discuss', title: 'Discuss phase 3', command: '/gsd-discuss-phase 3' });
    expect(position?.now).toMatchObject({
      kind: 'phase',
      title: 'Correction Reconciliation',
      when: 'v2.0 Gateway Corrections · Phase 3',
      phaseUrl: null,
    });
    expect(position?.then?.note).toEqual({ text: 'Phase 3 context gathered', dateLabel: '14 Oct' });
  });

  it('reads the Lendshed fixture: Execute phase 2, the operator step and three deferred items', async () => {
    const { presentation } = await loadFixtureProject();
    const position = buildDashboardPosition(presentation);
    expect(position?.next).toMatchObject({ kind: 'execute', title: 'Execute phase 2', plan: { id: '02-01' } });
    expect(position?.also).toContainEqual(
      expect.objectContaining({ kind: 'step', text: 'Run /gsd-execute-phase 4 to continue the bulk loan export waves.' }),
    );
    expect(position?.also).toContainEqual(expect.objectContaining({ kind: 'deferred', count: 3 }));
    expect(position?.then?.note?.text).toBe('Phase 04 UI-SPEC reviewed, export wave 2 next');
  });
});
