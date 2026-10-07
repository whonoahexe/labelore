// quick-261006-iz7 (sketch 020 D): composeSummaryRun from literal ViewInput objects and from the real
// handler on the sketch docs, the pure title / status / proof-matching helpers, the requirement and
// lineage lookups, and the static markup of the view (modal bodies and the preview card are
// rendered directly — Base UI portals draw nothing in static markup). The narrow e2e spec covers
// the page end to end.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { buildArtifactUrl, buildPhaseUrl } from '../../src/presentation/routes.ts';
import { SummaryHandler } from '../../src/planning-repo/handlers/summary.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import {
  composeSummaryRun,
  humanize,
  lineageLinks,
  matchProof,
  requirementPreviews,
  statusOf,
  titleOf,
} from '../../src/web/views/summary-run.ts';
import type { ComposedSummaryRun, SummaryPresentation } from '../../src/web/views/summary-run.ts';
import {
  FilesModalBody,
  RequirementPreviewCard,
  RequirementsModalBody,
  SummaryRunView,
  TasksModalBody,
} from '../../src/web/views/summary-run-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const LB = '.planning';
const P0501 = `${LB}/milestones/v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md`;
const P3US = `${LB}/quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md`;
const SP0406 = `${SP_PLANNING}/phases/04-bulk-archive-downloads/04-06-SUMMARY.md`;
const SP0101 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md`;
const hasSp = existsSync(SP_PLANNING);

function inputOf(
  file: URL | string,
  ref: Partial<ArtifactRef> & Pick<ArtifactRef, 'path' | 'location'>,
  headings: ViewInput['headings'] = [],
): ViewInput {
  const content = readFileSync(file, 'utf8');
  const full: ArtifactRef = {
    kind: 'summary',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    ...ref,
  };
  const raw: RawArtifact = { path: full.path, content, mtimeMs: 0, size: content.length };
  const parsed = SummaryHandler.parse(raw, full);
  return {
    kind: 'summary',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

function lb0501(headings: ViewInput['headings'] = []): ViewInput {
  return inputOf(new URL(`../../${P0501}`, import.meta.url), {
    path: P0501,
    location: 'archived-phase',
    milestoneVersion: 'v1.1',
    phaseIdentity: { milestoneVersion: 'v1.1', number: '05', projectCode: null, slug: 'per-type-document-views' },
  }, headings);
}

function view(model: ComposedSummaryRun, path = P0501, presentation: SummaryPresentation | null = null): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(SummaryRunView, {
        model,
        fallbackTitle: 'Fallback title',
        path,
        presentation,
        mode: 'view',
        onModeChange: () => {},
        onShowSource: () => {},
        chip: null,
      }),
    ),
  );
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

const MINIMAL = {
  h1: 'Phase 3 Plan 02: Thing Summary',
  oneLiner: 'It did a thing.',
  preamble: [],
  performance: { started: null, completed: null, duration: null },
  accomplishments: [{ head: 'Did the first thing', rest: '' }],
  tasks: [],
  fileNotes: [],
  decisionsBody: null,
  deviations: null,
  userSetup: null,
  next: null,
  selfCheck: null,
  others: [],
  sections: [],
  pathPhase: null,
  quickId: null,
};

describe('composeSummaryRun — literal inputs', () => {
  it('returns null without structured.summary and when nothing beyond the head composes', () => {
    expect(composeSummaryRun({ kind: 'summary', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(
      composeSummaryRun({
        kind: 'summary',
        frontmatter: { phase: '03-x', plan: 2 },
        structured: { summary: { ...MINIMAL, accomplishments: [] } },
        groups: [],
        planSegments: [],
      }),
    ).toBeNull();
  });

  it('formats a Date, an ISO string and a bare date alike and reads numeric phase and plan', () => {
    const base = { kind: 'summary', structured: { summary: MINIMAL }, groups: [], planSegments: [] };
    for (const completed of ['2026-09-20', '2026-09-20T00:00:00.000Z', new Date('2026-09-20T00:00:00Z')]) {
      const model = composeSummaryRun({ ...base, frontmatter: { phase: 3, plan: 2, completed } });
      expect(model?.head.completed).toBe('20 Sep 2026');
      expect(model?.head.planId).toBe('3-02');
    }
    const named = composeSummaryRun({ ...base, frontmatter: { phase: '03-the-slug', plan: 2 } });
    expect(named?.head.eyebrow).toBe('Summary · Phase 3 · The slug');
    expect(named?.head.planId).toBe('03-02');
    expect(named?.head.completed).toBeNull();
    expect(named?.head.status).toEqual({ label: '—', tone: 'quiet' });
  });

  it('falls back from frontmatter phase to pathPhase, quick-<id> and the filename quick id', () => {
    const run = (fm: Record<string, unknown>, extra: Record<string, unknown>): ComposedSummaryRun | null =>
      composeSummaryRun({ kind: 'summary', frontmatter: fm, structured: { summary: { ...MINIMAL, ...extra } }, groups: [], planSegments: [] });
    expect(run({}, { pathPhase: { number: '07', slug: 'a-b' } })?.head.eyebrow).toBe('Summary · Phase 7 · A b');
    expect(run({ phase: 'quick-260101-abc' }, {})?.head.eyebrow).toBe('Quick summary · 260101-abc');
    expect(run({}, { quickId: '260101-xyz' })?.head.eyebrow).toBe('Quick summary · 260101-xyz');
    expect(run({}, {})?.head.eyebrow).toBe('Summary');
  });

  it('reads the status from the preamble Status fact when the frontmatter has none', () => {
    const model = composeSummaryRun({
      kind: 'summary',
      frontmatter: {},
      structured: { summary: { ...MINIMAL, preamble: [{ key: 'Status', value: 'Complete. 2/2 tasks.' }] } },
      groups: [],
      planSegments: [],
    });
    expect(model?.head.status).toEqual({ label: 'Complete', tone: 'complete' });
  });

  it('falls back to frontmatter commit hashes as unnamed tasks and a commit count', () => {
    const base = { kind: 'summary', structured: { summary: MINIMAL }, groups: [], planSegments: [] };
    const hashes = composeSummaryRun({ ...base, frontmatter: { metrics: { commits: ['abc1234', 'def5678'] } } });
    expect(hashes?.triggers.tasks).toEqual({ label: 'Tasks', count: 2 });
    expect(hashes?.modals.tasks.unnamed).toBe(true);
    const counted = composeSummaryRun({ ...base, frontmatter: { commits: 16 } });
    expect(counted?.triggers.tasks).toEqual({ label: 'Commits', count: 16 });
    expect(counted?.run.aside).toBe('16 commits · 0 fixed on the way');
    const stop = counted?.run.stops.find((s) => s.kind === 'commits');
    expect(stop?.label).toBe('16 commits');
  });

  it('hangs deviations off their task, an unlisted task off the Completed stop, and all off the commits stop without a list', () => {
    const dev = (title: string, found: string | null): Record<string, unknown> => ({ rule: 1, type: 'Bug', title, found, issue: null, fix: null, files: null, commit: null, others: [], text: 'x' });
    const deviations = { none: false, note: null, items: [dev('A', 'Task 2, here'), dev('B', 'Task 9, elsewhere'), dev('C', null)], prose: [], extras: [] };
    const tasks = [{ n: 1, name: 'One', hashes: ['aaaaaaa'], kinds: [] }, { n: 2, name: 'Two', hashes: ['bbbbbbb'], kinds: ['feat'] }];
    const listed = composeSummaryRun({ kind: 'summary', frontmatter: {}, structured: { summary: { ...MINIMAL, tasks, deviations } }, groups: [], planSegments: [] });
    const stops = listed?.run.stops ?? [];
    expect(stops.map((s) => [s.kind, s.deviations.map((d) => d.title)])).toEqual([
      ['start', []],
      ['task', []],
      ['task', ['A']],
      ['end', ['B', 'C']],
    ]);
    expect(stops[2].label).toBe('Task 2 · feat');
    expect(stops[2].deviations[0].kicker).toBe('Rule 1 · Bug · fixed on the way');
    const unlisted = composeSummaryRun({ kind: 'summary', frontmatter: {}, structured: { summary: { ...MINIMAL, deviations } }, groups: [], planSegments: [] });
    expect(unlisted?.run.stops.map((s) => [s.kind, s.deviations.length])).toEqual([['start', 0], ['commits', 3], ['end', 0]]);
    expect(unlisted?.run.went).toBeNull();
  });

  it('puts human-wait sections on the timeline and in Waiting, the rest in Also, and drops none sections', () => {
    const model = composeSummaryRun({
      kind: 'summary',
      frontmatter: {},
      structured: {
        summary: {
          ...MINIMAL,
          others: [
            { title: 'Verification', blocks: [{ kind: 'paragraph', text: 'ok' }], none: false },
            { title: 'Task 3 — Pending Human Verification', blocks: [{ kind: 'paragraph', text: 'wait' }], none: false },
            { title: 'Known Stubs', blocks: [], none: true },
          ],
        },
      },
      groups: [],
      planSegments: [],
    });
    expect(model?.also.map((s) => s.title)).toEqual(['Verification']);
    expect(model?.waits.map((s) => s.title)).toEqual(['Task 3 — Pending Human Verification']);
    expect(model?.run.stops.map((s) => s.kind)).toEqual(['start', 'commits', 'wait', 'end']);
  });

  it('computes the source-only entries and resolves Performance and Self-check to heading ids', () => {
    const model = composeSummaryRun({
      kind: 'summary',
      frontmatter: { tags: ['a'], actuals: { commits: 1 }, phase: '01-x' },
      structured: { summary: { ...MINIMAL, sections: [{ heading: 'Performance', claimed: true }, { heading: 'Self-Check: PASSED', claimed: true }] } },
      groups: [],
      planSegments: [],
      headings: [{ id: 'performance', text: 'Performance', depth: 2 }, { id: 'self-check-passed', text: 'Self-Check: PASSED', depth: 2 }],
    });
    expect(model?.sourceOnly).toEqual([
      { label: 'Tags', targetId: null },
      { label: 'Actuals', targetId: null },
      { label: 'Performance', targetId: 'performance' },
      { label: 'Self-check', targetId: 'self-check-passed' },
      { label: 'Frontmatter', targetId: null },
    ]);
  });
});

describe('titleOf / statusOf / humanize', () => {
  it('strips the plan prefix and the Summary suffix', () => {
    expect(titleOf('Phase 5 Plan 01: Discussion-log view, section-projection extractor, view registry Summary')).toBe('Discussion-log view, section-projection extractor, view registry');
    expect(titleOf('Phase 04 Plan 06: Archive Job Presentation, Auto-Collection & Omission Disclosure — Summary (PARTIAL)')).toBe('Archive Job Presentation, Auto-Collection & Omission Disclosure');
    expect(titleOf('Quick Task 260910-0x4: Close Every Tech-Debt Item Summary')).toBe('Close Every Tech-Debt Item');
    expect(titleOf('Quick 260922-3us: sketch-004 B3 folded-chapters document layout')).toBe('sketch-004 B3 folded-chapters document layout');
    expect(titleOf('Phase quick-261003-528 Plan 01: UI-REVIEW scorecard (sketch 018 B)')).toBe('UI-REVIEW scorecard (sketch 018 B)');
    expect(titleOf('02-12 Summary — Per-tier staleness deadline')).toBe('Per-tier staleness deadline');
    expect(titleOf('Auth: how login works')).toBe('Auth: how login works');
    expect(titleOf('Summary')).toBeNull();
    expect(titleOf(null)).toBeNull();
  });

  it('classifies a status', () => {
    expect(statusOf('complete')).toEqual({ label: 'Complete', tone: 'complete' });
    expect(statusOf('awaiting-checkpoint')).toEqual({ label: 'Awaiting checkpoint', tone: 'in-flight' });
    expect(statusOf('blocked')).toEqual({ label: 'Blocked', tone: 'missing' });
    expect(statusOf('partial')).toEqual({ label: 'Partial', tone: 'quiet' });
    expect(statusOf(null)).toEqual({ label: '—', tone: 'quiet' });
  });

  it('humanizes a subsystem with the known acronyms upper-cased', () => {
    expect(humanize('ui')).toBe('UI');
    expect(humanize('web-ui')).toBe('Web UI');
    expect(humanize('tech-debt-remediation')).toBe('Tech debt remediation');
    expect(humanize('per-type-document-views')).toBe('Per type document views');
  });
});

describe('matchProof', () => {
  const acc = [
    { head: 'The first thing', rest: 'about `ExtractThing` parsing' },
    { head: 'Another thing', rest: 'concerning the registry seam and manifests' },
  ];
  const row = (description: string) => ({ id: 'D', anchorId: 'a', description, requirement: null, human: false, rationale: null, checks: [] });

  it('prefers a backticked match (weight 3), needs a score above 1 and sends ties to the first', () => {
    expect(matchProof(acc, [row('`ExtractThing` returns rows')])).toEqual([0]);
    expect(matchProof(acc, [row('registry manifests are listed')])).toEqual([1]);
    expect(matchProof(acc, [row('only registry here')])).toEqual([-1]);
    expect(matchProof(acc, [row('registry parsing')])).toEqual([-1]);
  });
});

describe('0501 through the real handler', () => {
  const input = lb0501();
  const model = composeSummaryRun(input) as ComposedSummaryRun;

  it('composes the pinned head, triggers and modals', () => {
    expect(model.head).toMatchObject({
      eyebrow: 'Summary · Phase 5 · Per type document views',
      title: 'Discussion-log view, section-projection extractor, view registry',
      planId: '05-01',
      completed: '20 Sep 2026',
      duration: '26min',
      started: '20:34',
      type: 'UI',
      status: { label: 'Complete', tone: 'complete' },
      selfCheck: { label: 'Self-check passed', tone: 'complete' },
    });
    expect(model.triggers).toEqual({ tasks: { label: 'Tasks', count: 2 }, files: { count: 15 }, requirements: { done: 3, pending: 0 } });
    expect(model.modals.files.created).toHaveLength(12);
    expect(model.modals.files.modified).toHaveLength(3);
    expect(model.modals.requirements.map((r) => r.id)).toEqual(['VIEW-01', 'VIEW-02', 'UI-06']);
    expect(model.setup).toBeNull();
    expect(model.quick).toBe(false);
  });

  it('composes the outcome rows with the proof pills on the right rows', () => {
    const outcome = model.outcome;
    expect(outcome).not.toBeNull();
    expect(outcome?.rows).toHaveLength(5);
    expect(outcome?.rows[1].head).toBe('The client-side view registry');
    expect(outcome?.rows[1].long).toBe(true);
    expect(outcome?.rows[2].long).toBe(true);
    expect(outcome?.rows.map((r) => r.pills.map((p) => p.id))).toEqual([['D1'], [], ['D2', 'D3'], [], []]);
    expect(outcome?.rows[0].pills[0]).toMatchObject({ state: 'pass', human: false, anchorId: 'summary-proof-D1' });
    expect(outcome?.rows[2].pills[1]).toMatchObject({ state: 'unknown', human: true });
    expect([outcome?.shipped, outcome?.proven, outcome?.human, outcome?.fixed]).toEqual([5, 3, 1, 0]);
  });

  it('composes four stops, no cards, Went to plan and three proof rows', () => {
    expect(model.run.stops.map((s) => [s.kind, s.label])).toEqual([
      ['start', 'Started · 20:34'],
      ['task', 'Task 1 · feat'],
      ['task', 'Task 2 · feat'],
      ['end', 'Completed · 20 Sep 2026 · 26min'],
    ]);
    expect(model.run.aside).toBe('2 tasks · 0 fixed on the way');
    expect(model.run.cards).toEqual([]);
    expect(model.run.went?.note?.startsWith('Plan executed exactly as written')).toBe(true);
    expect(model.proof?.map((p) => [p.id, p.human, p.requirement])).toEqual([['D1', false, 'VIEW-02'], ['D2', false, 'VIEW-01'], ['D3', true, 'UI-06']]);
    expect(model.proof?.[2].checks[0]).toMatchObject({ kind: 'manual procedural', state: 'unknown' });
  });

  it('composes decisions, patterns, also, lineage, next and the source-only entries', () => {
    expect(model.decisions.items).toHaveLength(4);
    expect(model.patterns?.items).toHaveLength(4);
    expect(model.patterns?.items.filter((p) => p.kind === 'convention')).toHaveLength(1);
    expect(model.patterns?.added).toEqual([]);
    expect(model.also.map((s) => s.title)).toEqual(['Known Stubs']);
    expect(model.waits).toEqual([]);
    expect(model.lineage?.planId).toBe('05-01');
    expect(model.lineage?.requires).toHaveLength(1);
    expect(model.lineage?.requires[0].label).toBe('Phase 2');
    expect(model.lineage?.affects).toHaveLength(5);
    expect(model.next).toContain('view-registry seam');
    expect(model.sourceOnly.map((s) => s.label)).toEqual(['Tags', 'Provides', 'Actuals', 'Performance', 'Self-check', 'Frontmatter']);
  });

  it('renders the head, outcome, timeline and proof as static markup', () => {
    const html = view(model);
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('Discussion-log view, section-projection extractor, view registry</h1>');
    expect(html).toContain('Summary · Phase 5 · Per type document views');
    expect(html).toContain('Completed <b>20 Sep 2026</b>');
    expect(html).toContain('<b data-tone="complete">Complete</b>');
    expect(html).toContain('<b>26min</b>');
    expect(html).toContain('<b>20:34</b>');
    expect(html).toContain('Type:</span> UI');
    expect(html).toContain('Self-check passed');
    expect(html).toContain('Tasks <b>2</b>');
    expect(html).toContain('Files <b>15</b>');
    expect(html).toContain('Requirements <b>3</b>');
    expect(count(html, 'class="view-summary-row"')).toBe(5);
    expect(count(html, 'class="view-summary-pill"')).toBe(3);
    expect(html).toContain('<b>5</b> things shipped');
    expect(html).toContain('3 deliverables proven');
    expect(html).toContain('1 need a human');
    expect(count(html, 'class="view-summary-stop"')).toBe(4);
    expect(html).toContain('Went to plan.');
    expect(count(html, 'id="summary-proof-D')).toBe(3);
    expect(html).toContain('Needs a human');
    expect(html).toContain('+ More');
    expect(html).not.toContain('dangerously');
    expect(html).toContain('id="summary-source-only"');
  });
});

describe('modal bodies and the preview card', () => {
  const model = composeSummaryRun(lb0501()) as ComposedSummaryRun;

  it('lists the requirements as triggers with Completed chips', () => {
    const previews = requirementPreviews(null, P0501, model.modals.requirements, false);
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RequirementsModalBody, { requirements: model.modals.requirements, previews })));
    for (const id of ['VIEW-01', 'VIEW-02', 'UI-06']) expect(html).toContain(`>${id}</button>`);
    expect(count(html, 'Completed')).toBe(3);
    expect(count(html, 'class="view-summary-req"')).toBe(3);
  });

  it('lists 12 created and 3 modified files with their notes', () => {
    const html = renderToStaticMarkup(createElement(FilesModalBody, { files: model.modals.files }));
    expect(html).toContain('Created · 12');
    expect(html).toContain('Modified · 3');
    expect(count(html, '>New<')).toBe(12);
    expect(html).toContain('view-summary-file-note');
  });

  it('shows the task names, kind chips and copy buttons', () => {
    const html = renderToStaticMarkup(createElement(TasksModalBody, { tasks: model.modals.tasks, copiedHash: null, onCopy: () => {} }));
    expect(count(html, 'aria-label="Copy ')).toBe(2);
    expect(html).toContain('Copy 807003d');
    expect(html).toContain('>feat<');
    const copied = renderToStaticMarkup(createElement(TasksModalBody, { tasks: model.modals.tasks, copiedHash: '807003d', onCopy: () => {} }));
    expect(copied).toContain('>Copied<');
  });

  it('says plainly when only a commit count is known', () => {
    const html = renderToStaticMarkup(createElement(TasksModalBody, { tasks: { rows: [], commitCount: 16, unnamed: false }, copiedHash: null, onCopy: () => {} }));
    expect(html).toContain('16 commits');
    expect(html).toContain('no per-task list');
  });

  it('renders the preview card for a found requirement and for an unknown one', () => {
    const found = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(RequirementPreviewCard, {
        preview: { id: 'VIEW-01', found: true, text: 'Each artifact `type` renders', notFound: null, status: 'Complete', location: '.planning/milestones/v1.1-REQUIREMENTS.md', phase: 'Phase 5', url: '/artifacts/x' },
      })),
    );
    expect(found).toContain('>Requirement</p>');
    expect(found).toContain('<h2>VIEW-01</h2>');
    expect(found).toContain('<code>type</code>');
    expect(found).toContain('Phase 5');
    expect(found).toContain('class="reference-preview-open"');
    const missing = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(RequirementPreviewCard, {
        preview: { id: 'B3-01', found: false, text: null, notFound: "Not in this project's requirements files. A quick-task ID.", status: 'Complete in this summary', location: '—', phase: '—', url: null },
      })),
    );
    expect(missing).toContain('A quick-task ID.');
    expect(missing).not.toContain('reference-preview-open');
  });
});

describe('requirementPreviews / lineageLinks', () => {
  const file = (path: string, items: unknown[], traceability: unknown[] = []) => ({ path, structured: { items, outOfScope: [], traceability } });
  const presentation: SummaryPresentation = {
    artifacts: [
      file('.planning/REQUIREMENTS.md', [{ id: 'ROOT-01', text: 'Root text', checked: false }, { id: 'BOTH-01', text: 'Root both', checked: true }], [{ requirementId: 'ROOT-01', phase: 'Phase 6 — Six', status: 'Pending' }]),
      file('.planning/milestones/v1.1-REQUIREMENTS.md', [{ id: 'VIEW-01', text: 'View one', checked: true }, { id: 'BOTH-01', text: 'v1.1 both', checked: true }], [{ requirementId: 'VIEW-01', phase: 'Phase 5', status: 'Complete' }]),
      file('.planning/milestones/v1.0-REQUIREMENTS.md', [{ id: 'OLD-01', text: 'Old one', checked: null }, { id: 'BOTH-01', text: 'v1.0 both', checked: true }]),
      { path: '.planning/milestones/v1.1-MILESTONE-AUDIT.md', structured: {} },
    ],
    milestones: [
      { phases: [{ identity: { milestoneVersion: 'v1.0', number: '02', projectCode: null, slug: 'situational-awareness' } }] },
      { phases: [{ identity: { milestoneVersion: 'v1.1', number: '02', projectCode: null, slug: 'situational-awareness' } }] },
    ],
  };
  const refs = (...ids: string[]) => ids.map((id) => ({ id, state: 'completed' as const }));

  it('prefers the summary’s own milestone file, then the root, then the archives newest first', () => {
    const own = requirementPreviews(presentation, '.planning/milestones/v1.1-phases/05-x/05-01-SUMMARY.md', refs('VIEW-01', 'BOTH-01'), false);
    expect(own['VIEW-01']).toMatchObject({ found: true, text: 'View one', status: 'Complete', location: '.planning/milestones/v1.1-REQUIREMENTS.md', phase: 'Phase 5' });
    expect(own['VIEW-01'].url).toBe(buildArtifactUrl(null, '.planning/milestones/v1.1-REQUIREMENTS.md'));
    expect(own['BOTH-01'].text).toBe('v1.1 both');
    const live = requirementPreviews(presentation, '.planning/phases/06-y/06-01-SUMMARY.md', refs('ROOT-01', 'BOTH-01', 'OLD-01', 'VIEW-01'), false);
    expect(live['ROOT-01']).toMatchObject({ status: 'Pending', phase: 'Phase 6 — Six', location: '.planning/REQUIREMENTS.md' });
    expect(live['BOTH-01'].text).toBe('Root both');
    expect(live['OLD-01']).toMatchObject({ found: true, status: 'Not recorded', phase: '—', location: '.planning/milestones/v1.0-REQUIREMENTS.md' });
    expect(live['VIEW-01'].location).toBe('.planning/milestones/v1.1-REQUIREMENTS.md');
  });

  it('answers an unknown ID with the summary’s own state and no link', () => {
    const quick = requirementPreviews(presentation, '.planning/quick/260101-abc-x/260101-abc-SUMMARY.md', [{ id: 'B3-01', state: 'completed' }, { id: 'B3-02', state: 'pending' }, { id: 'B3-03', state: 'partial' }], true);
    expect(quick['B3-01']).toMatchObject({ found: false, status: 'Complete in this summary', location: '—', phase: '—', url: null });
    expect(quick['B3-01'].notFound).toBe("Not in this project's requirements files. A quick-task ID.");
    expect(quick['B3-02'].status).toBe('Pending in this summary');
    expect(quick['B3-03'].status).toBe('Partial in this summary');
    const phase = requirementPreviews(null, '.planning/phases/06-y/06-01-SUMMARY.md', refs('X-01'), false);
    expect(phase['X-01'].notFound).toBe("Not in this project's requirements files.");
  });

  it('resolves a requires phase to its phase page, preferring the summary’s own milestone', () => {
    const links = lineageLinks(presentation, '.planning/milestones/v1.1-phases/05-x/05-01-SUMMARY.md', [
      { key: '02-situational-awareness' },
      { key: '9-unmatched-phase' },
      { key: 'v1.0-milestone-audit' },
    ]);
    expect(links['02-situational-awareness']).toBe(buildPhaseUrl({ milestoneVersion: 'v1.1', number: '02', projectCode: null, slug: 'situational-awareness' }));
    expect(links['9-unmatched-phase']).toBeNull();
    expect(links['v1.0-milestone-audit']).toBeNull();
    const old = lineageLinks(presentation, '.planning/milestones/v1.0-phases/03-x/03-01-SUMMARY.md', [{ key: '02-situational-awareness' }]);
    expect(old['02-situational-awareness']).toBe(buildPhaseUrl({ milestoneVersion: 'v1.0', number: '02', projectCode: null, slug: 'situational-awareness' }));
    expect(lineageLinks(null, P0501, [{ key: '02-x' }])['02-x']).toBeNull();
  });
});

describe.runIf(hasSp)('studio-portal summaries through the real handler', () => {
  function sp(path: string, rel: string, slug: string, number: string): ComposedSummaryRun {
    const input = inputOf(path, {
      path: `.planning/phases/${rel}`,
      location: 'phase',
      phaseIdentity: { milestoneVersion: null, number, projectCode: null, slug },
    });
    return composeSummaryRun(input) as ComposedSummaryRun;
  }

  it('0406: awaiting a checkpoint, no outcome, +4 pending, a wait stop and Also in document order', () => {
    const model = sp(SP0406, '04-bulk-archive-downloads/04-06-SUMMARY.md', 'bulk-archive-downloads', '04');
    expect(model.head.status).toEqual({ label: 'Awaiting checkpoint', tone: 'in-flight' });
    expect(model.head.completed).toBeNull();
    expect(model.head.duration).toBeNull();
    expect(model.outcome).toBeNull();
    expect(model.proof).toBeNull();
    expect(model.triggers).toEqual({ tasks: { label: 'Tasks', count: 2 }, files: { count: 11 }, requirements: { done: 0, pending: 4 } });
    expect(model.run.stops.map((s) => s.kind)).toEqual(['start', 'task', 'task', 'wait', 'end']);
    expect(model.run.stops.find((s) => s.kind === 'task' && s.n === 1)?.deviations).toHaveLength(1);
    expect(model.run.stops.find((s) => s.kind === 'task' && s.n === 2)?.deviations).toHaveLength(1);
    expect(model.run.stops[model.run.stops.length - 1].label).toBe('Not completed yet');
    expect(model.also.map((s) => s.title)).toEqual(['What Was Built', 'Verification', 'Flagged Conflict — D-04 vs. D-14/D-16 — RESOLVED (E1, 2026-08-25)']);
    expect(model.waits.map((s) => s.title)).toEqual(['Task 3 — Pending Human Verification']);
    expect(model.run.extras.map((e) => e.title)).toHaveLength(2);
    expect(model.lineage?.requires).toHaveLength(2);
    expect(model.lineage?.affects).toHaveLength(2);
    expect(model.next).toBeNull();
    const html = view(model, '.planning/phases/04-bulk-archive-downloads/04-06-SUMMARY.md');
    expect(html).toContain('+4 pending');
    expect(html).toContain('Not completed yet');
    expect(html).not.toContain('id="summary-outcome"');
    expect(html).toContain('Waits on a human');
  });

  it('0101: five deviations, four under Task 1 and one under Task 3, six new dependencies, a starting point', () => {
    const model = sp(SP0101, '01-portal-owned-identity-sessions/01-01-SUMMARY.md', 'portal-owned-identity-sessions', '01');
    const tasks = model.run.stops.filter((s) => s.kind === 'task');
    expect(tasks.map((s) => s.deviations.length)).toEqual([4, 0, 1]);
    expect(tasks[0].label).toBe('Task 1 · feat, tracer, tdd');
    expect(model.patterns?.added).toHaveLength(6);
    expect(model.patterns?.items).toHaveLength(6);
    expect(model.outcome?.rows.map((r) => r.pills.map((p) => p.id))).toEqual([['D1'], ['D2'], ['D3'], ['D4'], ['D5']]);
    expect(model.outcome?.rows[3].pills[0].human).toBe(true);
    expect([model.outcome?.shipped, model.outcome?.proven, model.outcome?.human, model.outcome?.fixed]).toEqual([5, 5, 1, 5]);
    expect(model.run.aside).toBe('3 tasks · 5 fixed on the way');
    expect(model.lineage?.requires).toEqual([]);
    const html = view(model, '.planning/phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md');
    expect(html).toContain('Nothing — a starting point');
    expect(html).toContain('New dependencies · 6');
    expect(html).toContain('<b>5</b> things shipped');
  });
});

describe('3us (quick, labelore)', () => {
  it('composes the quick eyebrow, table tasks with names, the quick-ID fallback and the Completed-stop deviations', () => {
    const input = inputOf(new URL(`../../${P3US}`, import.meta.url), { path: P3US, location: 'quick', quickTaskId: '260922-3us' });
    const model = composeSummaryRun(input) as ComposedSummaryRun;
    expect(model.head.eyebrow).toBe('Quick summary · 260922-3us');
    expect(model.head.title).toBe('sketch-004 B3 folded-chapters document layout');
    expect(model.head.completed).toBe('22 Sep 2026');
    expect(model.head.type).toBe('Web UI');
    expect(model.head.selfCheck).toBeNull();
    expect(model.quick).toBe(true);
    expect(model.triggers).toEqual({ tasks: { label: 'Tasks', count: 3 }, files: { count: 18 }, requirements: { done: 4, pending: 0 } });
    expect(model.modals.tasks.rows.every((t) => t.name !== null)).toBe(true);
    expect(model.outcome).toBeNull();
    expect(model.decisions.items).toHaveLength(2);
    expect(model.patterns).toBeNull();
    expect(model.run.stops[model.run.stops.length - 1].deviations).toHaveLength(2);
    const previews = requirementPreviews({ artifacts: [], milestones: [] }, P3US, model.modals.requirements, model.quick);
    expect(previews['B3-01'].status).toBe('Complete in this summary');
    expect(model.lineage?.requires).toEqual([]);
    expect(model.lineage?.affects).toHaveLength(4);
    const html = view(model, P3US);
    expect(html).toContain('Quick summary · 260922-3us');
    expect(html).not.toContain('id="summary-outcome"');
    expect(html).toContain('Unblocks · 4');
  });
});
