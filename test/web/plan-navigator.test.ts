// quick-261006-iz6: composePlanNavigator over a synthetic plan run through the real PlanHandler, its
// helpers (the Planned precedence, the tone maps, token formatting), the keyboard stepper and the static
// markup of the view with and without a modal. The real-corpus values are pinned in
// plan-navigator-corpus.test.ts; the page end to end is covered by test/e2e/plan-page.spec.ts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PlanHandler } from '../../src/planning-repo/handlers/plan.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import {
  CHECKPOINT_TONE,
  NEW_FILE_TONE,
  REVERSIBILITY,
  STATUS,
  TRACER_TONE,
  TYPE_INFO,
  composePlanNavigator,
  confidenceTone,
  formatTokens,
  plannedDate,
  reversibilityChip,
} from '../../src/web/views/plan-navigator.ts';
import { PlanIntroMeta, PlanModalBody, PlanNavigatorView, modalTitle, stepTask } from '../../src/web/views/plan-navigator-components.tsx';

const FRONTMATTER = `---
phase: 01-demo
plan: 06
type: execute
wave: 4
depends_on: [01-03, 01-04, 09-99]
files_modified:
  - src/a.ts
  - src/web/b.ts
  - README.md
creates:
  - src/web/new.ts
requirements: [AUTH-01, ZZ-01, QK-02]
autonomous: false
gap_closure: true
estimate:
  tokens: 54000
  confidence: medium
must_haves:
  truths:
    - "QK-02: the page reads well"
---
`;

const BODY = `
<objective>
Close the loop. Give a holder a way in. Purpose: Finish it. Output: A page.
</objective>

<context>
@a.md
</context>

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Build it</name>
  <files>src/a.ts, src/web/b.ts</files>
  <read_first>
    - src/a.ts
  </read_first>
  <action>${'Long action text. '.repeat(70)}</action>
  <verify><automated>npm test</automated><fails_when>red</fails_when></verify>
  <acceptance_criteria>
    - one
    - two
  </acceptance_criteria>
  <done>It is built.</done>
</task>
<task type="checkpoint:decision" gate="blocking">
  <name>Task 2: Choose</name>
  <decision>Pick.</decision>
  <options>Proceed — go; Stop — halt.</options>
</task>
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>A thing was built: look at it.</what-built>
  <how-to-verify>Open it.</how-to-verify>
</task>
<task type="checkpoint:human-action" gate="blocking-human">
  <name>Task 4: Cut over</name>
  <instructions>1. Do it.</instructions>
  <verification>Works.</verification>
  <resume-signal>approved</resume-signal>
  <reversibility rating="costly">Hard to undo.</reversibility>
</task>
</tasks>

<verification>
- The suite passes.
</verification>

<success_criteria>
- It reads well.
- It works.
</success_criteria>

<threat_model>
x
</threat_model>

<output>
Create the summary.
</output>
`;

const PATH = '.planning/phases/01-demo/01-06-PLAN.md';

function inputOf(overrides: Partial<ViewInput> = {}, path = PATH, extraRef: Partial<ArtifactRef> = {}): ViewInput {
  const content = `${FRONTMATTER}${BODY}`;
  const ref: ArtifactRef = {
    path,
    kind: 'plan',
    location: 'phase',
    phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'demo-phase' },
    milestoneVersion: null,
    quickTaskId: null,
    ...extraRef,
  };
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = PlanHandler.parse(raw, ref);
  return {
    kind: 'plan',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    planProgress: { complete: true, summaryStatus: 'complete' },
    headings: [],
    siblingArtifacts: [],
    ...overrides,
  };
}

function html(plan: NonNullable<ReturnType<typeof composePlanNavigator>>, props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(PlanNavigatorView, { plan, onShowSource: () => undefined, ...props }),
    ),
  );
}

describe('composePlanNavigator — degradation', () => {
  it('returns null without structured.plan, with a non-object plan or with zero tasks', () => {
    expect(composePlanNavigator(inputOf({ structured: {} }))).toBeNull();
    expect(composePlanNavigator(inputOf({ structured: { plan: 'nope' } }))).toBeNull();
    expect(composePlanNavigator(inputOf({ structured: { plan: { tasks: [] } } }))).toBeNull();
    expect(composePlanNavigator(inputOf({ structured: { plan: { tasks: [null] } } }))).toBeNull();
  });
});

describe('composePlanNavigator — the synthetic plan', () => {
  const plan = composePlanNavigator(inputOf())!;

  it('builds the eyebrow, the plain title and no Planned date without a context', () => {
    expect(plan.intro.eyebrow).toBe('Plan 01-06 · Phase 1 · Demo phase');
    expect(plan.intro.title).toBe('Close the loop');
    expect(plan.intro.planned).toBeNull();
  });

  it('builds the chips with their tones', () => {
    expect(plan.head.chips).toEqual([
      { label: 'Execute', tone: 'quiet' },
      { label: 'Wave 4', tone: 'quiet' },
      { label: '3 checkpoints', tone: 'in-flight' },
      { label: 'Gap closure', tone: 'in-flight' },
      { label: 'Executed', tone: 'complete' },
    ]);
  });

  it('counts the triggers and builds the stats', () => {
    expect(plan.head.triggers.deps).toEqual({ count: 3, disabled: false });
    // files_modified + creates, de-duplicated.
    expect(plan.head.triggers.files).toEqual({ count: 4, disabled: false });
    expect(plan.head.triggers.requirements).toEqual({ count: 3, disabled: false });
    expect(plan.head.stats).toEqual([
      { label: 'Tasks', value: '4', tone: null },
      { label: 'Confidence', value: 'medium', tone: 'in-flight' },
      { label: 'Est. tokens', value: '54k', tone: null },
    ]);
  });

  it('shows Not autonomous when there are no checkpoints but autonomy is false', () => {
    const calm = composePlanNavigator(
      inputOf({ structured: { plan: { ...(inputOf().structured.plan as object), tasks: [(inputOf().structured.plan as { tasks: unknown[] }).tasks[0]] } } }),
    )!;
    expect(calm.head.chips.map((chip) => chip.label)).toContain('Not autonomous');
  });

  it('lists the tasks with a sub-line, tabs per type and a source row', () => {
    expect(plan.tasks.map((task) => task.sub)).toEqual([
      'T1 · Auto · TDD · 2 files',
      'T2 · Decision · waits',
      'T3 · Verify · waits',
      'T4 · Action · waits',
    ]);
    expect(plan.tasks.map((task) => task.glyph)).toEqual(['A', '?', 'V', 'H']);
    expect(plan.tasks[0].tabs).toEqual([
      { key: 'main', label: 'Do', count: null },
      { key: 'side', label: 'Prove it', count: 2 },
      { key: 'done', label: 'Done', count: null },
    ]);
    expect(plan.tasks[1].tabs.map((tab) => tab.label)).toEqual(['Decision']);
    expect(plan.tasks[2].tabs.map((tab) => tab.label)).toEqual(['Verify']);
    expect(plan.tasks[3].tabs.map((tab) => tab.label)).toEqual(['Action', 'Afterwards']);
    expect(plan.tasks[3].waits).toBe('Waits for you to do it');
    expect(plan.tasks[3].chips.map((chip) => chip.label)).toEqual(['Action', 'Costly to undo']);
    expect(plan.tasks[0].sourceRow?.labels.map((entry) => entry.label)).toEqual(['Read first']);
    expect(plan.tasks[3].sourceRow?.labels.map((entry) => entry.label)).toEqual(['Resume signal']);
    // A name derived from what-built.
    expect(plan.tasks[2].name).toBe('A thing was built');
  });

  it('puts a long action behind a clamp with its word count', () => {
    const action = plan.tasks[0].sections.main.find((section) => section.key === 'action');
    expect(action).toMatchObject({ kind: 'blocks', clamp: true, words: 210 });
  });

  it('builds Done when and the source-only strip in the documented order', () => {
    expect(plan.doneWhen).toMatchObject({
      aside: '2 outcomes · 1 check',
      outcomes: { items: ['It reads well.', 'It works.'] },
      checks: { items: ['The suite passes.'] },
    });
    expect(plan.sourceOnly.map((entry) => entry.label)).toEqual([
      'Must-haves',
      'Threat model',
      'Context files',
      'Output',
      'Frontmatter',
    ]);
    expect(plan.sourceOnly.find((entry) => entry.label === 'Threat model')?.target).toMatch(/^plan-at-\d+$/);
    expect(plan.sourceOnly.find((entry) => entry.label === 'Frontmatter')?.target).toBeNull();
  });

  it('groups the files by folder, marks created ones and names the tasks that touch each', () => {
    const groups = plan.modals.files.groups;
    expect(groups.map((group) => group.dir)).toEqual(['(root)', 'src', 'src/web']);
    const a = groups[1].files[0];
    expect(a).toMatchObject({ path: 'src/a.ts', isNew: false, tasks: [{ n: 1, gate: false, name: 'Build it' }] });
    const created = groups[2].files.find((file) => file.path === 'src/web/new.ts');
    expect(created).toMatchObject({ isNew: true, newTone: NEW_FILE_TONE, tasks: [] });
    expect(groups[2].files.find((file) => file.path === 'src/web/b.ts')?.tasks.map((task) => task.n)).toEqual([1]);
    expect(plan.modals.files.total).toBe(4);
  });

  it('takes a requirement text from a must-have truth when nothing else knows it', () => {
    expect(plan.modals.requirements).toEqual([
      { id: 'AUTH-01', text: null, source: null },
      { id: 'ZZ-01', text: null, source: null },
      { id: 'QK-02', text: 'The page reads well', source: 'truth' },
    ]);
  });
});

describe('composePlanNavigator — planContext', () => {
  const context = {
    addedAt: '2026-08-31T00:44:11+05:30',
    mtimeMs: 1,
    description: 'The ROADMAP line',
    dependencies: [
      { raw: '01-03', id: '01-03', title: 'Build the CLI', complete: true, url: '/phase/plan-03' },
      { raw: '01-04', id: '01-04', title: null, complete: false, url: null },
    ],
    requirementTexts: { 'AUTH-01': 'A member can log in' },
  };
  const plan = composePlanNavigator(inputOf({ planContext: context }))!;

  it('reads the Planned date as the author wrote it', () => {
    expect(plan.intro.planned).toEqual({ date: '31 Aug 2026', source: 'git', title: 'The day the file was added to git' });
  });

  it('resolves dependency rows and requirement texts', () => {
    expect(plan.modals.deps).toEqual([
      { id: '01-03', title: 'Build the CLI', status: STATUS.executed, url: '/phase/plan-03' },
      { id: '01-04', title: null, status: null, url: null },
      { id: '09-99', title: null, status: null, url: null },
    ]);
    expect(plan.modals.depsFooter).toBe('Each row opens that plan. Wave 4 runs after these finish.');
    expect(plan.modals.requirements[0]).toEqual({ id: 'AUTH-01', text: 'A member can log in', source: 'requirements' });
  });

  it('falls back to the ROADMAP line for the title when the objective has none', () => {
    const base = inputOf({ planContext: context });
    const structured = { plan: { ...(base.structured.plan as { objective: object }), objective: null } };
    expect(composePlanNavigator({ ...base, structured })?.intro.title).toBe('The ROADMAP line');
  });
});

describe('a quick plan', () => {
  const quickPath = '.planning/quick/260910-0x4-x/260910-0x4-PLAN.md';
  const quick = (siblings: ViewInput['siblingArtifacts'] = []) =>
    composePlanNavigator(
      inputOf(
        { planProgress: null, siblingArtifacts: siblings, planContext: { addedAt: '2026-01-01T00:00:00Z', mtimeMs: null, description: null, dependencies: [], requirementTexts: {} } },
        quickPath,
        { location: 'quick', phaseIdentity: null, quickTaskId: '260910-0x4' },
      ),
    )!;

  it('names the quick id in the eyebrow and takes the Planned date from it', () => {
    const plan = quick();
    expect(plan.intro.eyebrow).toBe('Quick plan 260910-0x4');
    expect(plan.intro.planned).toEqual({ date: '10 Sep 2026', source: 'quick-id', title: 'From the quick task id' });
  });

  it('reads Executed from a paired SUMMARY sibling', () => {
    expect(quick().head.chips.at(-1)).toEqual(STATUS['not-run']);
    const paired = quick([{ kind: 'summary', path: '.planning/quick/260910-0x4-x/260910-0x4-SUMMARY.md', url: '/s' }]);
    expect(paired.head.chips.at(-1)).toEqual(STATUS.executed);
  });
});

describe('helpers', () => {
  it('plannedDate: the quick id beats git, git is read as written, mtime is the last resort', () => {
    expect(plannedDate('260910-0x4', '2026-08-31T00:44:11+05:30', 5)?.source).toBe('quick-id');
    expect(plannedDate(null, '2026-08-31T00:44:11+05:30', 5)).toMatchObject({ date: '31 Aug 2026', source: 'git' });
    expect(plannedDate(null, null, Date.UTC(2026, 9, 1, 12))).toMatchObject({ date: '1 Oct 2026', source: 'mtime' });
    expect(plannedDate(null, null, null)).toBeNull();
    expect(plannedDate('261399-abc', null, null)).toBeNull();
    expect(plannedDate(null, 'not a date at all', null)).toBeNull();
  });

  it('maps confidence, reversibility, tokens and types', () => {
    expect(confidenceTone('high')).toBe('complete');
    expect(confidenceTone('medium')).toBe('in-flight');
    expect(confidenceTone('med')).toBe('in-flight');
    expect(confidenceTone('low')).toBe('missing');
    expect(confidenceTone('whatever')).toBeNull();
    expect(REVERSIBILITY.costly.tone).toBe('in-flight');
    expect(reversibilityChip('one-way')).toMatchObject({ label: 'One-way', tone: 'in-flight' });
    expect(reversibilityChip('reversible')).toMatchObject({ label: 'Reversible', tone: 'quiet' });
    expect(reversibilityChip('odd')).toEqual({ label: 'Odd to undo', tone: 'quiet' });
    expect(reversibilityChip(null)).toBeNull();
    expect(formatTokens(160000)).toBe('160k');
    expect(formatTokens(900)).toBe('900');
    expect(formatTokens(null)).toBe('—');
    expect(TYPE_INFO['checkpoint:decision'].tone).toBe(CHECKPOINT_TONE);
    expect(TYPE_INFO.tracer.tone).toBe(TRACER_TONE);
  });

  it('stepTask clamps at the ends and ignores modified, editable and outside targets', () => {
    const ok = { editable: false, inside: true, modified: false };
    expect(stepTask('ArrowRight', 2, 4, ok)).toBe(3);
    expect(stepTask('ArrowLeft', 2, 4, ok)).toBe(1);
    expect(stepTask('ArrowRight', 4, 4, ok)).toBeNull();
    expect(stepTask('ArrowLeft', 1, 4, ok)).toBeNull();
    expect(stepTask('ArrowRight', 2, 4, { ...ok, modified: true })).toBeNull();
    expect(stepTask('ArrowRight', 2, 4, { ...ok, editable: true })).toBeNull();
    expect(stepTask('ArrowRight', 2, 4, { ...ok, inside: false })).toBeNull();
    expect(stepTask('Enter', 2, 4, ok)).toBeNull();
  });
});

describe('PlanNavigatorView — static markup', () => {
  const plan = composePlanNavigator(inputOf({ planContext: { addedAt: '2026-08-03T22:12:52+05:30', mtimeMs: null, description: null, dependencies: [{ raw: '01-03', id: '01-03', title: 'Build the CLI', complete: true, url: '/p/03' }], requirementTexts: { 'AUTH-01': 'A member can log in' } } }))!;

  it('shows the header fact, the head row, the objective, the workspace, Done when and the strip', () => {
    expect(renderToStaticMarkup(createElement(PlanIntroMeta, { intro: plan.intro }))).toContain('Planned');
    expect(renderToStaticMarkup(createElement(PlanIntroMeta, { intro: plan.intro }))).toContain('3 Aug 2026');
    const out = html(plan);
    expect((out.match(/class="status-chip"/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(out).toContain('data-modal="deps"');
    expect(out).toContain('data-modal="files"');
    expect(out).toContain('data-modal="reqs"');
    expect(out).toContain('Objective');
    expect(out).toContain('You get');
    expect((out.match(/role="tab"[^>]*data-task=/g) ?? []).length).toBe(4);
    expect(out).toMatch(/data-task="1"[^>]*aria-selected="true"/);
    expect(out).toContain('id="plan-task-workspace"');
    expect(out).toContain('Task 1 of 4');
    expect(out).toContain('Prove it');
    expect(out).toContain('Read all · 210 words');
    expect(out).toContain('Done when');
    expect(out).toContain('id="plan-source-only"');
    expect(out).toContain('Threat model');
  });

  it('shows the Action and Afterwards tabs and the waits label for a human-action task', () => {
    const out = html(plan, { initialTask: 4 });
    expect(out).toContain('Waits for you to do it');
    expect(out).toContain('>Action<');
    expect(out).toContain('>Afterwards<');
    expect(out).toContain('Resume signal');
  });

  // The dialog itself renders in a portal, which static markup does not reach: the body and the title
  // are exported and rendered on their own.
  const modal = (key: 'deps' | 'files' | 'reqs'): string =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PlanModalBody, { plan, modal: key, onGoto: () => undefined, onClose: () => undefined }),
      ),
    );

  it('shows the three modals', () => {
    expect(modalTitle(plan, 'files')).toBe('Files · 4');
    const files = modal('files');
    expect(files).toContain('data-goto="1"');
    expect(files).toContain('no task names it');
    expect(files).toContain('New');
    expect(files).toContain('From files_modified (and creates).');
    expect(modalTitle(plan, 'reqs')).toBe('Requirements · 3');
    const reqs = modal('reqs');
    expect(reqs).toContain('A member can log in');
    expect(reqs).toContain('Not in this project&#x27;s REQUIREMENTS.md');
    expect(reqs).toContain('href="/traceability"');
    expect(modalTitle(plan, 'deps')).toBe('Depends on · 3');
    const deps = modal('deps');
    expect(deps).toContain('href="/p/03"');
    expect(deps).toContain('Not found in this project');
    expect(deps).toContain('Wave 4 runs after these finish.');
    expect(deps).toContain('Executed');
  });
});
