// sketch-004 B3 (quick-260922-3us Task 2): PLAN and VERIFICATION adopting the shared layout
// through manifest data only. Node has no DOMParser, so the Observable Truths table mapping is
// driven through `mapCriteriaRows`'s pure row-mapping export with synthetic `TableRow[]` literals
// rather than through `extractTableRows` itself.
import { describe, expect, it } from 'vitest';
import { composeDocumentLayout } from '../../src/web/views/layout.ts';
import { planLayout } from '../../src/web/views/layout-plan.ts';
import { mapCriteriaRows, verificationLayout } from '../../src/web/views/layout-verification.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';
import type { PlanSegmentAttributes } from '../../src/web/views/document-sections.ts';
import type { TableRow } from '../../src/web/views/document-sections.ts';

function baseInput(overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'plan',
    frontmatter: {},
    structured: {},
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

function taskSegment(overrides: Partial<PlanSegmentAttributes> & Pick<PlanSegmentAttributes, 'ordinal'>): PlanSegmentAttributes {
  return {
    tag: 'task',
    label: 'Task',
    gate: null,
    type: null,
    name: null,
    html: '<section>task html</section>',
    ...overrides,
  };
}

const planManifest: ViewManifest = { kind: 'plan', lead: 'lead.', promote: [], layout: planLayout };
const verificationManifest: ViewManifest = {
  kind: 'verification',
  lead: 'lead.',
  promote: [],
  layout: verificationLayout,
};

describe('plan layout — Tasks chapter', () => {
  it('one item per task segment in document order, title falling back to the segment label', () => {
    const segments = [
      taskSegment({ ordinal: '1.1', name: 'Wire the API', type: 'auto' }),
      taskSegment({ ordinal: '1.2', name: null, label: 'Task 2 fallback label' }),
    ];
    const composed = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    const items = composed.chapters.find((c) => c.specId === 'tasks')!.items!;
    expect(items.map((i) => i.ref)).toEqual(['Task 1', 'Task 2']);
    expect(items.map((i) => i.title)).toEqual(['Wire the API', 'Task 2 fallback label']);
  });

  it('chips: type (quiet), TDD (quiet) when tdd is true, Gates (active) when gated', () => {
    const segments = [taskSegment({ ordinal: '1.1', type: 'auto', tdd: 'true', gate: 'blocking-human' })];
    const composed = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    const item = composed.chapters.find((c) => c.specId === 'tasks')!.items![0];
    expect(item.chips).toEqual([
      { label: 'auto', tone: 'quiet' },
      { label: 'TDD', tone: 'quiet' },
      { label: 'Gates', tone: 'active' },
    ]);
  });

  it('state Done (complete) only when planProgress.complete; otherwise a "planned" tally', () => {
    const segments = [taskSegment({ ordinal: '1.1' })];
    const complete = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: true, summaryStatus: null } }),
    )!;
    expect(complete.chapters.find((c) => c.specId === 'tasks')!.items![0].state).toEqual({
      label: 'Done',
      tone: 'complete',
    });

    const notComplete = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: false, summaryStatus: 'awaiting-checkpoint' } }),
    )!;
    const item = notComplete.chapters.find((c) => c.specId === 'tasks')!.items![0];
    expect(item.state).toBeNull();
    expect(item.tally).toEqual({ label: 'Planned', tone: 'quiet', rollup: 'planned' });
  });

  it("detail label \"What it does · how it's verified\" carries the segment html", () => {
    const segments = [taskSegment({ ordinal: '1.1', html: '<section>verify me</section>' })];
    const composed = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    expect(composed.chapters.find((c) => c.specId === 'tasks')!.items![0].detail).toEqual({
      label: "What it does · how it's verified",
      html: '<section>verify me</section>',
    });
  });

  it('the Tasks group is accounted for only when every task carries html', () => {
    const groups = [{ id: 'tasks-group', heading: 'Tasks', html: '<section>Tasks</section>' }];
    const allHtml = [taskSegment({ ordinal: '1.1', html: '<section>a</section>' })];
    const composedAllHtml = composeDocumentLayout(planManifest, baseInput({ planSegments: allHtml, groups }))!;
    expect(composedAllHtml.also).toBeNull(); // consumed — nothing left for remainder/also

    const missingHtml = [taskSegment({ ordinal: '1.1', html: undefined })];
    const composedMissing = composeDocumentLayout(planManifest, baseInput({ planSegments: missingHtml, groups }))!;
    expect(composedMissing.also!.remainder.map((g) => g.heading)).toEqual(['Tasks']);
  });
});

describe('plan layout — Must be true when done chapter', () => {
  it('renders truths, prohibitions, artifacts and key_links; absent must_haves omits the chapter', () => {
    const segments = [taskSegment({ ordinal: '1.1' })];
    const mustHaves = {
      truths: ['Every request is validated.'],
      prohibitions: [{ statement: 'Never write outside the target root.', status: 'resolved' }],
      artifacts: [{ path: 'src/x.ts', provides: 'the X thing', exports: 'doX' }],
      key_links: [{ from: 'a.ts', to: 'b.ts', via: 'import', pattern: 'doX(' }],
    };
    const composed = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, frontmatter: { must_haves: mustHaves } }),
    )!;
    const chapter = composed.chapters.find((c) => c.specId === 'must-haves')!;
    expect(chapter.items!.map((i) => i.ref)).toEqual(['Truth', 'Prohibition', 'Artifact', 'Key link']);
    expect(chapter.items![0].tally).toEqual({ label: 'Truth', tone: 'quiet', rollup: 'truths' });
    expect(chapter.items![1]).toMatchObject({ title: 'Never write outside the target root.', state: { label: 'resolved', tone: 'quiet' } });
    expect(chapter.items![2]).toMatchObject({ title: 'src/x.ts — the X thing', detail: { label: 'Exports', rows: [{ text: 'doX' }] } });
    expect(chapter.items![3]).toMatchObject({
      title: 'a.ts → b.ts',
      detail: { label: 'Details', rows: [{ label: 'Via', text: 'import' }, { label: 'Pattern', text: 'doX(' }] },
    });

    const withoutMustHaves = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    expect(withoutMustHaves.chapters.some((c) => c.specId === 'must-haves')).toBe(false);
  });
});

describe('plan layout — cover', () => {
  const segments = [
    taskSegment({ ordinal: '1.1', gate: 'blocking-human' }),
    taskSegment({ ordinal: '1.2' }),
  ];

  it('headline "N/N tasks done" when complete, else "N task(s) planned"', () => {
    const complete = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: true, summaryStatus: null } }),
    )!;
    expect(complete.cover.headline).toEqual({ value: '2/2', label: 'tasks done' });

    const notStarted = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    expect(notStarted.cover.headline).toEqual({ value: '2', label: 'tasks planned' });
  });

  it('status: Complete / Awaiting checkpoint / Not yet executed / none when planProgress is null', () => {
    const none = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    expect(none.cover.status).toBeNull();

    const notYet = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: false, summaryStatus: null } }),
    )!;
    expect(notYet.cover.status).toEqual({ label: 'Not yet executed', tone: 'quiet' });

    const awaiting = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: false, summaryStatus: 'awaiting-checkpoint' } }),
    )!;
    expect(awaiting.cover.status).toEqual({ label: 'Awaiting checkpoint', tone: 'in-flight' });

    const done = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: true, summaryStatus: null } }),
    )!;
    expect(done.cover.status).toEqual({ label: 'Complete', tone: 'complete' });
  });

  it('glance for the first gated task, wording varying by planProgress', () => {
    const notComplete = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: false, summaryStatus: 'awaiting-checkpoint' } }),
    )!;
    expect(notComplete.cover.glance).toMatchObject({ title: 'Task 1 needs a human', action: 'Open task 1' });

    const complete = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: segments, planProgress: { complete: true, summaryStatus: null } }),
    )!;
    expect(complete.cover.glance).toMatchObject({ title: 'Task 1 was a human checkpoint' });

    const unknown = composeDocumentLayout(planManifest, baseInput({ planSegments: segments }))!;
    expect(unknown.cover.glance).toMatchObject({ title: 'Task 1 is a human checkpoint' });

    const ungated = composeDocumentLayout(
      planManifest,
      baseInput({ planSegments: [taskSegment({ ordinal: '1.1' })] }),
    )!;
    expect(ungated.cover.glance).toBeNull();
  });

  it('facts from wave, depends_on, requirements, autonomous, type via factValueText (records skipped)', () => {
    const composed = composeDocumentLayout(
      planManifest,
      baseInput({
        planSegments: segments,
        frontmatter: {
          wave: 2,
          depends_on: ['01-01'],
          requirements: ['B3-01', 'B3-02'],
          autonomous: true,
          type: 'execute',
          must_haves: { skip: true }, // a record — never a fact
        },
      }),
    )!;
    expect(composed.cover.facts.map((f) => f.label)).toEqual(['Wave', 'Depends on', 'Requirements', 'Autonomous', 'Type']);
    expect(composed.cover.facts.find((f) => f.label === 'Requirements')!.value).toBe('B3-01, B3-02');
  });
});

describe('verification layout — score parsing', () => {
  it('"5/7 truths verified" parses to 5/7 + "truths verified"', () => {
    const composed = composeDocumentLayout(
      verificationManifest,
      baseInput({
        kind: 'verification',
        frontmatter: { score: '5/7 truths verified', human_verification: [{ test: 'x' }] },
      }),
    )!;
    expect(composed.cover.headline).toEqual({ value: '5/7', label: 'truths verified' });
  });

  it('a label stops before "(" or ";"', () => {
    const composed = composeDocumentLayout(
      verificationManifest,
      baseInput({
        kind: 'verification',
        frontmatter: {
          score: '5/5 roadmap success criteria verified (39/39 truths)',
          human_verification: [{ test: 'x' }],
        },
      }),
    )!;
    expect(composed!.cover.headline).toEqual({ value: '5/5', label: 'roadmap success criteria verified' });
  });

  it('an unparseable or absent score yields no headline', () => {
    const composed = composeDocumentLayout(
      verificationManifest,
      baseInput({ kind: 'verification', frontmatter: { human_verification: [{ test: 'x' }] } }),
    )!;
    expect(composed.cover.headline).toBeNull();

    const garbled = composeDocumentLayout(
      verificationManifest,
      baseInput({
        kind: 'verification',
        frontmatter: { score: 'not a score at all', human_verification: [{ test: 'x' }] },
      }),
    )!;
    expect(garbled.cover.headline).toBeNull();
  });
});

describe('verification layout — Needs a human chapter', () => {
  it('only composes when human_verification is an array; the string "resolved" yields nothing', () => {
    const withArray = composeDocumentLayout(
      verificationManifest,
      baseInput({
        kind: 'verification',
        frontmatter: {
          human_verification: [
            { test: 'Run the walk-deadline test', expected: 'refuses cleanly', why_human: 'exceeds the spot-check bound' },
          ],
        },
      }),
    )!;
    const chapter = withArray.chapters.find((c) => c.specId === 'human-checks')!;
    expect(chapter.items![0]).toMatchObject({
      ref: 'Check 1',
      title: 'Run the walk-deadline test',
      tally: { label: 'Check', tone: 'quiet', rollup: 'checks' },
      detail: {
        label: 'What to expect · why a person',
        rows: [
          { label: 'Expected', text: 'refuses cleanly' },
          { label: 'Why a person', text: 'exceeds the spot-check bound' },
        ],
      },
    });

    // The literal string "resolved" (01-VERIFICATION.md's real shape) composes no human-checks
    // chapter — with no criteria/gaps chapter either in this synthetic input, zero chapters
    // compose at all and the whole layout is null (the documented "falls back to the existing
    // view" rule), which is itself the proof that no chapter was built from the string.
    const withString = composeDocumentLayout(
      verificationManifest,
      baseInput({ kind: 'verification', frontmatter: { human_verification: 'resolved', score: '6/6 verified' } }),
    );
    expect(withString).toBeNull();
  });
});

describe('verification layout — Gaps to close chapter', () => {
  it('maps failed/partial/other status, and absent gaps omits the chapter', () => {
    const gaps = [
      { truth: 'A cancel leaves no partial file.', status: 'failed', reason: 'handler rejects the tool', missing: ['end-to-end test'], artifacts: [{ path: 'jobs.rs', issue: 'wrong branch' }] },
      { truth: 'Native archives open cleanly.', status: 'partial' },
      { truth: 'Something else.', status: 'weird' },
    ];
    const composed = composeDocumentLayout(
      verificationManifest,
      baseInput({ kind: 'verification', frontmatter: { gaps, human_verification: [{ test: 'x' }] } }),
    )!;
    const chapter = composed.chapters.find((c) => c.specId === 'gaps')!;
    expect(chapter.items!.map((i) => i.state)).toEqual([
      { label: 'Failed', tone: 'missing' },
      { label: 'Partial', tone: 'quiet' },
      { label: 'weird', tone: 'quiet' },
    ]);
    expect(chapter.items![0].detail).toEqual({
      label: 'Why it failed · what to fix',
      rows: [{ text: 'handler rejects the tool' }, { text: 'end-to-end test' }, { text: 'jobs.rs — wrong branch' }],
    });

    const noGaps = composeDocumentLayout(
      verificationManifest,
      baseInput({ kind: 'verification', frontmatter: { human_verification: [{ test: 'x' }] } }),
    )!;
    expect(noGaps.chapters.some((c) => c.specId === 'gaps')).toBe(false);
  });
});

describe('verification layout — Roadmap success criteria (mapCriteriaRows, pure)', () => {
  it('✓/verified/pass -> Verified complete; ✗/fail -> Failed missing; partial/uncertain -> quiet; empty -> no state', () => {
    const header = ['#', 'Truth', 'Status', 'Evidence'];
    const rows: TableRow[] = [
      { header, cells: [{ text: '1', html: '1' }, { text: 'A', html: 'A' }, { text: '✓ VERIFIED', html: '✓ VERIFIED' }, { text: 'proof', html: '<p>proof</p>' }] },
      { header, cells: [{ text: '2', html: '2' }, { text: 'B', html: 'B' }, { text: '✗ FAILED', html: '✗ FAILED' }, { text: '', html: '' }] },
      { header, cells: [{ text: '3', html: '3' }, { text: 'C', html: 'C' }, { text: 'Partial', html: 'Partial' }, { text: '', html: '' }] },
      { header, cells: [{ text: '4', html: '4' }, { text: 'D', html: 'D' }, { text: '', html: '' }, { text: '', html: '' }] },
    ];
    const items = mapCriteriaRows(rows);
    expect(items.map((i) => i.state)).toEqual([
      { label: 'Verified', tone: 'complete' },
      { label: 'Failed', tone: 'missing' },
      { label: 'Partial', tone: 'quiet' },
      null,
    ]);
    expect(items.map((i) => i.ref)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(items[0].detail).toEqual({ label: 'Evidence', html: '<p>proof</p>' });
    expect(items[1].detail).toBeNull();
  });

  it('falls back to positions 1 (truth), 2 (status), 3 (evidence), 0 (number) when header text does not match', () => {
    const header = ['col-a', 'col-b', 'col-c', 'col-d'];
    const rows: TableRow[] = [
      { header, cells: [{ text: '7', html: '7' }, { text: 'A truth', html: 'A truth' }, { text: '✓', html: '✓' }, { text: 'ev', html: 'ev' }] },
    ];
    const items = mapCriteriaRows(rows);
    expect(items[0]).toMatchObject({ ref: 'R7', title: 'A truth', state: { label: 'Verified', tone: 'complete' } });
  });
});

describe('verification layout — status and glance', () => {
  it('status tones: passed complete, gaps_found missing, human_needed in-flight, other humanized quiet', () => {
    const of = (status: string) =>
      composeDocumentLayout(
        verificationManifest,
        baseInput({ kind: 'verification', frontmatter: { status, human_verification: [{ test: 'x' }] } }),
      )!.cover.status;
    expect(of('passed')).toEqual({ label: 'Passed', tone: 'complete' });
    expect(of('gaps_found')).toEqual({ label: 'Gaps found', tone: 'missing' });
    expect(of('human_needed')).toEqual({ label: 'Needs a human', tone: 'in-flight' });
    expect(of('something_else')).toEqual({ label: 'Something else', tone: 'quiet' });
  });

  it('glance "N check(s) only a person can run" targets the human chapter, body = first check', () => {
    const composed = composeDocumentLayout(
      verificationManifest,
      baseInput({
        kind: 'verification',
        frontmatter: { human_verification: [{ test: 'Check one' }, { test: 'Check two' }] },
      }),
    )!;
    const humanChapter = composed.chapters.find((c) => c.specId === 'human-checks')!;
    expect(composed.cover.glance).toEqual({
      eyebrow: 'Needs a human',
      title: '2 checks only a person can run',
      body: 'Check one',
      action: 'See the checks',
      target: humanChapter.id,
    });
  });
});
