// quick-261001-qk7: composeUatSession, built from literal ViewInput objects and from the real
// synthetic doc / corpus extractions (test/uat-session.test.ts covers the server extractor; the
// narrow e2e spec covers the page end to end), plus the static markup of the view.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { UatHandler } from '../../src/planning-repo/handlers/uat.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import {
  NOT_DIAGNOSED_TONE,
  NOW_TONE,
  RESULT_LABEL,
  RESULT_TONE,
  SEVERITY_TONE,
  composeUatSession,
  formatStamp,
  gapStatusTone,
  spanText,
  statusOf,
} from '../../src/web/views/uat-session.ts';
import type { ComposedUatSession } from '../../src/web/views/uat-session.ts';
import { UatIntroMeta, UatSessionView } from '../../src/web/views/uat-session-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const SYN = new URL('../../.planning/sketches/015-uat-page/synthetic-testing-UAT.md', import.meta.url);
const LB01 = new URL(
  '../../.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-UAT.md',
  import.meta.url,
);
const LB02 = new URL(
  '../../.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UAT.md',
  import.meta.url,
);
const SP103 = `${SP_PLANNING}/milestones/v1.0-phases/03-file-browsing/03-UAT.md`;
const SP3 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-UAT.md`;
const SP1 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-UAT.md`;
const SP2 = `${SP_PLANNING}/phases/02-roles-permission-enforcement/02-UAT.md`;

function inputFor(path: URL | string, headings: ViewInput['headings'] = []): ViewInput {
  const content = readFileSync(path, 'utf8');
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-UAT.md',
    kind: 'uat',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = UatHandler.parse(raw, ref);
  return {
    kind: 'uat',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

function compose(path: URL | string, headings?: ViewInput['headings']): ComposedUatSession {
  const composed = composeUatSession(inputFor(path, headings));
  expect(composed).not.toBeNull();
  return composed as ComposedUatSession;
}

function render(composed: ComposedUatSession): string {
  return renderToStaticMarkup(
    createElement(UatSessionView, { session: composed, title: 'UAT' }),
  );
}

describe('formatting helpers', () => {
  it('formats stamps in UTC and shows the time only when there is one', () => {
    expect(formatStamp('2026-07-21T09:12:00Z')).toBe('21 Jul 2026 · 09:12');
    expect(formatStamp('2026-08-29')).toBe('29 Aug 2026');
    expect(formatStamp('2026-07-21T00:00:00.000Z')).toBe('21 Jul 2026');
    expect(formatStamp('not a date')).toBe('not a date');
  });

  it('spans in minutes, hours and days, and nothing when out of order', () => {
    expect(spanText('2026-09-09T13:50:00Z', '2026-09-09T14:25:00Z')).toBe('35 min');
    expect(spanText('2026-07-21T09:12:00Z', '2026-07-21T10:47:31Z')).toBe('1h 35m');
    expect(spanText('2026-08-29', '2026-09-09')).toBe('11 days');
    expect(spanText('2026-08-05T12:35:00Z', '2026-08-05T09:26:00Z')).toBeNull();
    expect(spanText('x', 'y')).toBeNull();
  });

  it('maps statuses, results, severities and gap statuses to tones in one place', () => {
    expect(statusOf('testing')).toEqual({ label: 'Testing', tone: 'active' });
    expect(statusOf('partial')).toEqual({ label: 'Partial', tone: 'in-flight' });
    expect(statusOf('diagnosed')).toEqual({ label: 'Diagnosed', tone: 'in-flight' });
    expect(statusOf('complete')).toEqual({ label: 'Complete', tone: 'complete' });
    expect(statusOf('passed')).toEqual({ label: 'Passed', tone: 'complete' });
    expect(statusOf('')).toEqual({ label: 'Unknown', tone: 'quiet' });
    expect(RESULT_TONE).toEqual({
      pass: 'complete',
      issue: 'missing',
      blocked: 'in-flight',
      skipped: 'quiet',
      pending: 'quiet',
      other: 'quiet',
    });
    expect(SEVERITY_TONE).toEqual({ blocker: 'missing', major: 'in-flight', minor: 'quiet', cosmetic: 'quiet' });
    expect(gapStatusTone('resolved')).toBe('complete');
    expect(gapStatusTone('failed')).toBe('missing');
    expect(gapStatusTone('whatever')).toBe('quiet');
    expect(NOW_TONE).toBe('active');
    expect(NOT_DIAGNOSED_TONE).toBe('quiet');
    expect(RESULT_LABEL.pending).toBe('Pending');
  });
});

describe('composeUatSession — the synthetic testing doc', () => {
  const composed = compose(SYN);

  it('composes the cover facts', () => {
    expect(composed.intro).toMatchObject({
      eyebrow: 'User acceptance test · Phase 3',
      title: 'File browsing',
      status: { label: 'Testing', tone: 'active' },
      started: '21 Jul 2026 · 09:12',
      updated: '21 Jul 2026 · 10:47',
      gap: '1h 35m',
      source: ['03-01-SUMMARY.md', '03-02-SUMMARY.md', '03-VERIFICATION.md'],
    });
  });

  it('is live on test 5 of 7', () => {
    expect(composed.current).toMatchObject({ live: true, n: 5, total: 7, awaiting: 'user response', padded: '05' });
  });

  it('composes the squares, counts and no mismatch', () => {
    expect(composed.squares.map((s) => s.tone)).toEqual([
      'missing',
      'missing',
      'in-flight',
      'quiet',
      'quiet',
      'quiet',
      'quiet',
    ]);
    expect(composed.squares.map((s) => s.result)).toEqual([
      'issue',
      'issue',
      'blocked',
      'skipped',
      'pending',
      'pending',
      'pending',
    ]);
    expect(composed.squares.filter((s) => s.isNow).map((s) => s.n)).toEqual([5]);
    expect(composed.counts).toEqual({ pass: 0, issue: 2, blocked: 1, skipped: 1, pending: 3, other: 0 });
    expect(composed.mismatch).toBeNull();
  });

  it('composes the pairs: severity, blocked-by, reason and Reported', () => {
    const [first, , third, fourth, fifth] = composed.tests;
    expect(first.severity).toEqual({ value: 'major', tone: 'in-flight' });
    expect(first.reported.length).toBeGreaterThan(0);
    expect(third.blockedBy).toBe('third-party');
    expect(third.reason?.quiet).toBe(false);
    expect(fourth.reason?.quiet).toBe(true);
    expect(fifth.isNow).toBe(true);
    expect(fifth.rawResult).toBeNull();
    expect(composed.tests[1].severity).toEqual({ value: 'minor', tone: 'quiet' });
  });

  it('composes a two-row register, the first diagnosed and the second not', () => {
    expect(composed.gaps.mode).toBe('register');
    expect(composed.gaps.aside).toBe('2 · 2 open');
    const [a, b] = composed.gaps.items;
    expect(a.diagnosed).toBe(true);
    expect(b.diagnosed).toBe(false);
    expect(a.severity).toEqual({ value: 'major', tone: 'in-flight' });
    expect(b.severity).toEqual({ value: 'minor', tone: 'quiet' });
    expect(a.reason?.startsWith('User reported')).toBe(false);
    expect(a.testAnchor).toBe('uat-test-1');
  });

  it('lists the source-only entries, including a non-interactive Template comments', () => {
    expect(composed.sourceOnly.map((s) => s.label)).toEqual(['Summary block', 'Frontmatter', 'Template comments']);
    expect(composed.sourceOnly.at(-1)?.interactive).toBe(false);
  });
});

describe('composeUatSession — real documents', () => {
  it('labelore v1.0/01: a done line, a 35 min gap, no gaps, two source-only entries', () => {
    const composed = compose(LB01);
    expect(composed.current).toMatchObject({ live: false, headline: 'Testing complete', passed: 23, total: 23 });
    expect(composed.intro.status).toEqual({ label: 'Complete', tone: 'complete' });
    expect(composed.intro.title).toBe('Read layer domain model');
    expect(composed.intro.eyebrow).toBe('User acceptance test · Phase 1');
    expect(composed.intro.started).toBe('9 Sep 2026 · 13:50');
    expect(composed.intro.updated).toBe('9 Sep 2026 · 14:25');
    expect(composed.intro.gap).toBe('35 min');
    expect(composed.gaps.mode).toBe('none');
    expect(composed.gaps.aside).toBe('none');
    expect(composed.gaps.emptyLine).toBe('No gaps — no test reported an issue.');
    expect(composed.sourceOnly.map((s) => s.label)).toEqual(['Summary block', 'Frontmatter']);
    expect(composed.tests[0].more.map((m) => m.label)).toEqual(
      expect.arrayContaining(['executed by', 'evidence']),
    );
  });

  it('labelore v1.0/02: date-only stamps and a gap of 11 days, prose cards', () => {
    const composed = compose(LB02);
    expect(composed.intro.started).toBe('29 Aug 2026');
    expect(composed.intro.updated).toBe('9 Sep 2026');
    expect(composed.intro.gap).toBe('11 days');
    expect(composed.gaps.mode).toBe('cards');
    expect(composed.gaps.cards).toHaveLength(12);
    expect(composed.gaps.aside).toBe('12');
    expect(composed.extras).toHaveLength(4);
  });

  it.runIf(existsSync(SP1))('studio-portal P1: no gap when updated precedes started', () => {
    expect(compose(SP1).intro.gap).toBeNull();
  });

  it.runIf(existsSync(SP2))('studio-portal P2: Passed, no mismatch, four cards, a resolution source-only entry', () => {
    const composed = compose(SP2, [{ id: 'resolution', text: 'Resolution', depth: 2 }]);
    expect(composed.intro.status).toEqual({ label: 'Passed', tone: 'complete' });
    expect(composed.mismatch).toBeNull();
    expect(composed.gaps.mode).toBe('cards');
    expect(composed.gaps.cards).toHaveLength(4);
    const entry = composed.sourceOnly.find((s) => s.label === 'Resolution (resolved current test)');
    expect(entry).toBeDefined();
    expect(entry?.targetId).toBe('resolution');
    const [, second] = composed.tests;
    expect(second.rawResult).toContain('structurally unprovable');
    expect(composed.tests[2].rawResult).toContain('closed on unit-level proof');
    expect(composed.tests[0].rawResult).toContain('operator-approved');
  });

  it.runIf(existsSync(SP103))('studio-portal v1.0/03: six resolved register rows with resolution strips', () => {
    const composed = compose(SP103);
    expect(composed.gaps.mode).toBe('register');
    expect(composed.gaps.aside).toBe('6 · 0 open');
    expect(composed.gaps.items.every((g) => g.resolution !== null && g.missingDone)).toBe(true);
    expect(composed.gaps.items[0].artifacts.map((a) => a.path)).toContain('backend/src/lib.rs:82');
  });

  it.runIf(existsSync(SP3))('studio-portal P3: the strip carries reverified and the re-check text', () => {
    const [gap] = compose(SP3).gaps.items;
    expect(gap.resolution?.reverifiedAt).toBeTruthy();
    expect(gap.resolution?.reverify).toContain('Test 4');
  });
});

describe('composeUatSession — guards', () => {
  const base = (uat: unknown, overrides: Partial<ViewInput> = {}): ViewInput => ({
    kind: 'uat',
    frontmatter: { status: 'complete', phase: '02-x' },
    structured: { uat },
    groups: [],
    planSegments: [],
    ...overrides,
  });
  const test = (n: number, result: string): unknown => ({
    number: n,
    name: `T${n}`,
    result,
    resultRaw: result,
    fields: [],
    lead: [],
  });
  const session = (tests: unknown[], summary: Record<string, string> | null): unknown => ({
    current: null,
    currentLine: null,
    tests,
    testsNote: [],
    summary,
    gaps: { mode: 'none', heading: null, lead: '', items: [], cards: [] },
    extras: [],
    sections: [],
    commentCount: 0,
  });

  it('names both numbers when the Summary disagrees with the counted tests', () => {
    const composed = composeUatSession(
      base(session([test(1, 'pass'), test(2, 'pass')], { total: '2', passed: '5', issues: '0' })),
    );
    expect(composed?.mismatch).toBe("The doc's Summary says 5 pass — counted from the tests: 2");
  });

  it('counts accepted toward pass', () => {
    const composed = composeUatSession(
      base(session([test(1, 'pass'), test(2, 'pass'), test(3, 'pass')], { passed: '1', accepted: '2' })),
    );
    expect(composed?.mismatch).toBeNull();
  });

  it('composes to null with no structured.uat or with zero tests', () => {
    expect(composeUatSession(base(undefined))).toBeNull();
    expect(composeUatSession(base(session([], null)))).toBeNull();
    expect(composeUatSession({ ...base(undefined), structured: {} })).toBeNull();
  });

  it('is not live when the status is complete, even with a named current test', () => {
    const uat = {
      ...(session([test(1, 'pass')], null) as object),
      current: { number: '1', name: 'x', expected: '', expectedBlocks: [], awaiting: 'user', fromSection: 'Current Test' },
    };
    const composed = composeUatSession(base(uat));
    expect(composed?.current.live).toBe(false);
    expect(composed?.sourceOnly.map((s) => s.label)).toContain('Current Test (resolved current test)');
  });

  it('strips leading zeros from the phase number and tolerates a missing phase', () => {
    const uat = session([test(1, 'pass')], null);
    expect(composeUatSession(base(uat, { frontmatter: { phase: '02.1-x', status: 'complete' } }))?.intro.eyebrow).toBe(
      'User acceptance test · Phase 2.1',
    );
    const bare = composeUatSession(base(uat, { frontmatter: {} }));
    expect(bare?.intro.eyebrow).toBe('User acceptance test');
    expect(bare?.intro.title).toBeNull();
    expect(bare?.intro.status.label).toBe('Unknown');
  });

  it('reads Date instances and numeric phases defensively', () => {
    const uat = session([test(1, 'pass')], null);
    const composed = composeUatSession(
      base(uat, {
        frontmatter: {
          status: 'complete',
          phase: 4,
          started: new Date('2026-01-02T03:04:00Z'),
          updated: new Date('2026-01-02T03:40:00Z'),
        },
      }),
    );
    expect(composed?.intro.started).toBe('2 Jan 2026 · 03:04');
    expect(composed?.intro.gap).toBe('36 min');
    expect(composed?.intro.eyebrow).toBe('User acceptance test · Phase 4');
  });
});

describe('UatSessionView — static markup', () => {
  it('end to end: the synthetic doc renders squares, pairs and the attention card', () => {
    const html = render(compose(SYN));
    expect(html.match(/class="view-uat-square"/g)).toHaveLength(7);
    expect(html.match(/class="view-uat-pair"/g)?.length).toBe(7);
    expect(html).toContain('Now testing');
    expect(html).toContain('Test 5 of 7');
    expect(html).toContain('Awaiting');
    expect(html).toContain('Go to test 5');
    expect(html.match(/data-now="true"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/<button[^>]*class="view-uat-square"[^>]*data-now="true"/g)).toHaveLength(1);
  });

  it('LB v1.0/01: the done line, 23 passing squares, no attention card', () => {
    const html = render(compose(LB01));
    expect(html).toContain('Testing complete');
    expect(html).toContain('23 of 23 passed');
    expect(html).not.toContain('Now testing');
    expect(html.match(/data-result="pass"/g)?.length).toBeGreaterThanOrEqual(23);
    expect(html.match(/class="view-uat-pair"/g)).toHaveLength(23);
  });

  it('the cover renders the status chip, Started, Updated with the gap, and Tested from', () => {
    const html = renderToStaticMarkup(createElement(UatIntroMeta, { intro: compose(LB01).intro }));
    expect(html).toContain('Complete');
    expect(html).toContain('9 Sep 2026 · 13:50');
    expect(html).toContain('(35 min later)');
    expect(html).toContain('Tested from');
    expect(html).toContain('01-01-SUMMARY.md · 01-02-SUMMARY.md');
  });
});
