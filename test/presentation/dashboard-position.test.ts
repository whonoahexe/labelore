// quick-261115-o34: the dashboard position block (sketches 066 C and 067 S) through the real reader.
// Expected values come from the sketches' own states and from /gsd-next's routing, not from the code under
// test. Files are written the way GSD writes them; nothing here reads a real project.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDashboardPosition } from '../../src/presentation/dashboard-position.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const READ_AT = '2026-11-15T12:00:00.000Z';

async function presentationOf(files: Record<string, string>) {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  return toProjectPresentation({ ...snapshot, readAt: READ_AT });
}

async function positionOf(files: Record<string, string>) {
  return buildDashboardPosition(await presentationOf(files));
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
