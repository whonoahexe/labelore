// quick-261017-wlg: the dashboard head (sketch 025 R3b) through the real reader. Expected values
// come from the sketch's own data.js and gen-data.mjs rules, not from the code under test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import {
  activityClause,
  activityDateLabel,
  buildDashboardHead,
  projectSectionLead,
  splitProjectTitle,
  sectionLead,
} from '../../src/presentation/dashboard-head.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = (name: string) => readFileSync(join(REPO_ROOT, 'test/fixtures/dashboard', name), 'utf8');

async function headOfDirectory(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardHead(toProjectPresentation({ ...snapshot, readAt: '2026-10-17T12:00:00.000Z' }));
}

async function headOf(files: Record<string, string>) {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  return buildDashboardHead(toProjectPresentation({ ...snapshot, readAt: '2026-10-17T12:00:00.000Z' }));
}

const ARCHIVED_STATE = `---
milestone: v1.1
milestone_name: Legible Documents
current_phase: 05
status: Awaiting next milestone
last_activity: 2026-10-17
last_activity_desc: Completed quick task 261016-2j6 (compact discussion-log tables)
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
---
`;

const plan = (id: string) => `---\nphase: 05\nplan: ${id.slice(3)}\n---\n<objective>\nBuild ${id}.\n</objective>\n`;

describe('dashboard head', () => {
  it('opens the dense fixture on its project, its current phase and the next plan', async () => {
    const head = await headOfDirectory(join(REPO_ROOT, 'fixtures/dense'));
    expect(head.name).toBe('Dense Fixture Project');
    expect(head.tagline).toBeNull();
    expect(head.lead).toBe(
      "A synthetic, hand-authored GSD project three milestones deep, carrying every artifact type `gsd-core`'s templates define plus several it does not.",
    );
    expect(head.now).toEqual({
      milestone: 'v3.0 Live Read Surface',
      phase: '1',
      title: 'Identity Slice',
      status: 'Executing',
      done: false,
    });
    expect(head.next?.plans).toEqual([
      { id: '01-01', done: true, next: false },
      { id: '01-02', done: true, next: false },
    ]);
    expect(head.next?.percent).toBe(100);
    expect(head.next?.last).toEqual({
      date: '2026-08-22',
      dateLabel: '22 Aug',
      text: 'Phase 1 hardening task committed',
    });
    expect(head.next?.step).toMatchObject({ kind: 'execute', title: 'Execute phase 2', plan: { id: '02-01' } });
    expect(head.next?.step?.plan?.url).toContain('/plans/02-01');
  });

  it('splits a tagline off the title, and asks to discuss a phase with no folder yet', async () => {
    const head = await headOf({
      '.planning/PROJECT.md': fixture('synthetic-PROJECT.md'),
      '.planning/STATE.md': fixture('synthetic-STATE.md'),
    });
    expect(head.name).toBe('Harbor Ledger');
    expect(head.tagline).toBe('Customs Filing Automation');
    expect(head.lead).toBe(
      "A batch service and review console that turns a broker's shipment manifests into customs filings for the `ace-gateway` submission API.",
    );
    expect(head.now).toMatchObject({ milestone: 'v2.0 Gateway Corrections', phase: '3', title: 'Correction Reconciliation', status: 'Planning' });
    expect(head.next).toMatchObject({
      plans: [],
      percent: null,
      last: { dateLabel: '14 Oct', text: 'Phase 3 context gathered' },
      step: { kind: 'discuss', title: 'Discuss phase 3', plan: null },
    });
  });

  it('resolves a shipped phase from the milestone archive and points at the next milestone', async () => {
    const head = await headOf({
      '.planning/STATE.md': ARCHIVED_STATE,
      '.planning/milestones/v1.1-ROADMAP.md': '# v1.1\n\n### Phase 5: Per-Type Document Views\n\n**Goal:** Views.\n',
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md': plan('05-01'),
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md': '# Summary\n',
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-02-PLAN.md': plan('05-02'),
      '.planning/milestones/v1.1-phases/05-per-type-document-views/05-02-SUMMARY.md': '# Summary\n',
    });
    expect(head.name).toBe('project');
    expect(head.now).toEqual({
      milestone: 'v1.1 Legible Documents',
      phase: '5',
      title: 'Per-Type Document Views',
      status: 'Awaiting next milestone',
      done: true,
    });
    expect(head.next?.plans.map((entry) => entry.done)).toEqual([true, true]);
    expect(head.next?.last?.text).toBe('Quick task: compact discussion-log tables');
    expect(head.next?.step).toEqual({ kind: 'new-milestone', title: 'Start the next milestone', plan: null });
  });

  it('cuts any PROJECT.md section to a lead, such as Core Value for the Traceability lede', async () => {
    const snapshot = await new PlanningRepository(
      new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': fixture('synthetic-PROJECT.md') }),
      '/project',
    ).load();
    const presentation = toProjectPresentation(snapshot);
    expect(projectSectionLead(presentation, /^core value\b/i)).toBe(
      'Every manifest line becomes a cited filing row or a visible exception, with nothing silently dropped.',
    );
    expect(projectSectionLead(presentation, /^no such section\b/i)).toBeNull();
  });

  it('shows just the name for a project with a bare PROJECT.md', async () => {
    const head = await headOf({ '.planning/PROJECT.md': fixture('sparse-PROJECT.md') });
    expect(head).toEqual({ name: 'Untitled Spike', tagline: null, lead: null, now: null, next: null });
  });

  it('never throws on malformed STATE frontmatter', async () => {
    const head = await headOf({ '.planning/STATE.md': '---\nmilestone: [unclosed\n---\n' });
    expect(head.name).toBe('project');
  });
});

const liveState = (phase: string, status = 'executing') => `---
milestone: v1.0
current_phase: ${phase}
status: ${status}
---
`;

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
const stepFor = async (files: Record<string, string>) => (await headOf({ '.planning/ROADMAP.md': ROADMAP, ...files })).next?.step;

describe('dashboard head next step, routed as /gsd-next routes it', () => {
  it('executes the lowest phase with a plan missing its summary, from that plan', async () => {
    const step = await stepFor({
      '.planning/STATE.md': liveState('2'),
      ...planFile('01-first-slice', '01-01'),
      ...planFile('01-first-slice', '01-02'),
      ...summaryFile('01-first-slice', '01-01'),
      ...planFile('02-second-slice', '02-01'),
    });
    expect(step).toMatchObject({ kind: 'execute', title: 'Execute phase 1', plan: { id: '01-02' } });
  });

  it('verifies a phase whose plans all have summaries but nothing is verified yet', async () => {
    const step = await stepFor({
      '.planning/STATE.md': liveState('1', 'verifying'),
      ...planFile('01-first-slice', '01-01'),
      ...summaryFile('01-first-slice', '01-01'),
    });
    expect(step).toEqual({ kind: 'verify', title: 'Verify phase 1', plan: null });
  });

  it('moves on to discuss the next phase once verification passed', async () => {
    const step = await stepFor({
      '.planning/STATE.md': liveState('1'),
      ...planFile('01-first-slice', '01-01'),
      ...summaryFile('01-first-slice', '01-01'),
      ...phaseFile('01-first-slice', '01-VERIFICATION.md', '---\nstatus: passed\n---\n# Verification\n'),
    });
    expect(step).toEqual({ kind: 'discuss', title: 'Discuss phase 2', plan: null });
  });

  it('completes the milestone after its last phase is verified', async () => {
    const step = await stepFor({
      '.planning/STATE.md': liveState('2'),
      ...phaseFile('01-first-slice', '01-UAT.md', '---\nstatus: complete\n---\n# UAT\n'),
      ...planFile('02-second-slice', '02-01'),
      ...summaryFile('02-second-slice', '02-01'),
      ...phaseFile('02-second-slice', '02-UAT.md', '---\nstatus: complete\n---\n# UAT\n'),
    });
    expect(step).toEqual({ kind: 'complete-milestone', title: 'Complete the milestone', plan: null });
  });

  it('plans a phase with context but no plans, and discusses one without context', async () => {
    const planned = await stepFor({ '.planning/STATE.md': liveState('1', 'planning'), ...phaseFile('01-first-slice', '01-CONTEXT.md') });
    expect(planned).toEqual({ kind: 'plan', title: 'Plan phase 1', plan: null });
    const bare = await stepFor({ '.planning/STATE.md': liveState('1', 'planning'), ...phaseFile('01-first-slice', '01-NOTES.md') });
    expect(bare).toEqual({ kind: 'discuss', title: 'Discuss phase 1', plan: null });
  });
});

describe('dashboard head extractors', () => {
  it('splits the title at the first spaced dash, and falls back to the folder name', () => {
    expect(splitProjectTitle('Harbor Ledger — Customs Filing Automation', '/x')).toEqual({
      name: 'Harbor Ledger',
      tagline: 'Customs Filing Automation',
    });
    expect(splitProjectTitle('.planning/PROJECT.md', '/work/labelore')).toEqual({ name: 'labelore', tagline: null });
  });

  it('cuts What This Is to a lead', () => {
    expect(sectionLead('**Bold lead here.** Then more text follows here.')).toBe('Bold lead here.');
    expect(sectionLead('Short one. Second sentence here that adds detail to make it longer than seventy chars.')).toBe(
      'Short one. Second sentence here that adds detail to make it longer than seventy chars.',
    );
    expect(sectionLead('*Reviewed at v1.0 close.*\n\nThe real lead sentence, long enough to stand alone as a lead here.')).toBe(
      'The real lead sentence, long enough to stand alone as a lead here.',
    );
    expect(sectionLead('### Sub\n\nNever used.')).toBeNull();
  });

  it('shortens the last activity to one clause', () => {
    expect(activityClause('Completed quick task 261016-2j6 (compact discussion-log tables)')).toBe(
      'Quick task: compact discussion-log tables',
    );
    expect(activityClause('Phase 3 context gathered — five decisions locked, two left open')).toBe('Phase 3 context gathered');
    expect(activityClause('Phase 04 execution resumed (wave continue)')).toBe('Phase 04 execution resumed (wave continue)');
    expect(activityClause('Shipped the reconciliation worker; two follow-ups remain')).toBe('Shipped the reconciliation worker');
    expect(
      activityClause('An extremely long activity description that keeps going well past the seventy-two character limit for sure'),
    ).toBe('An extremely long activity description that keeps going well past the…');
  });

  it('shows the year only when it differs from the snapshot', () => {
    expect(activityDateLabel('2026-08-22', '2026-10-17T00:00:00.000Z')).toBe('22 Aug');
    expect(activityDateLabel('2026-08-22', '2027-01-02T00:00:00.000Z')).toBe('22 Aug 2026');
    expect(activityDateLabel('not a date', '2026-10-17T00:00:00.000Z')).toBeNull();
  });
});
