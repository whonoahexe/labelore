// quick-261003-528: composeUiReview, built from literal ViewInput objects and from the real
// synthetic doc / corpus extractions (test/ui-review-audit.test.ts covers the server extractor; the
// narrow e2e spec covers the page end to end), the radar geometry, the keyboard helper, and the
// static markup of the view.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { UiReviewHandler } from '../../src/planning-repo/handlers/ui-review.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import {
  ITEM_MARK,
  ITEM_TONE,
  SHOTS,
  classifyShots,
  composeUiReview,
  pillarTone,
  radarGeometry,
  statusChip,
} from '../../src/web/views/ui-review.ts';
import type { ComposedUiReview } from '../../src/web/views/ui-review.ts';
import { UiReviewIntroMeta, UiReviewView, stepPillar } from '../../src/web/views/ui-review-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const SYN = new URL('../../.planning/sketches/018-ui-review-page/synthetic-UI-REVIEW.md', import.meta.url);
const LB05 = new URL('../../.planning/milestones/v1.1-phases/05-per-type-document-views/05-UI-REVIEW.md', import.meta.url);
const LB03 = new URL('../../.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-UI-REVIEW.md', import.meta.url);
const LB04 = new URL(
  '../../.planning/milestones/v1.0-phases/04-portability-degradation-hardening/04-UI-REVIEW.md',
  import.meta.url,
);
const SP03 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-UI-REVIEW.md`;

const HEADINGS: ViewInput['headings'] = [
  { id: 'pillar-scores', text: 'Pillar Scores', depth: 2 },
  { id: 'top-3-priority-fixes', text: 'Top 3 Priority Fixes', depth: 2 },
  { id: 'detailed-findings', text: 'Detailed Findings', depth: 2 },
];

function inputFor(
  path: URL | string,
  identity: { number: string; slug: string } | null = null,
  extra: Partial<ViewInput> = {},
): ViewInput {
  const content = readFileSync(path, 'utf8');
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-UI-REVIEW.md',
    kind: 'ui-review',
    location: 'phase',
    phaseIdentity: identity ? { milestoneVersion: null, projectCode: null, ...identity } : null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = UiReviewHandler.parse(raw, ref);
  return {
    kind: 'ui-review',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings: HEADINGS,
    ...extra,
  };
}

function compose(path: URL | string, identity: { number: string; slug: string } | null = null, extra: Partial<ViewInput> = {}): ComposedUiReview {
  const review = composeUiReview(inputFor(path, identity, extra));
  expect(review).not.toBeNull();
  return review as ComposedUiReview;
}

const SIBLING_SPEC = [{ kind: 'ui-spec', path: '.planning/phases/x/06-UI-SPEC.md', url: '/artifact/x' }];

function markup(review: ComposedUiReview, props: { initialPillar?: number; initialFix?: number | null } = {}, onShow = (): void => {}): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(UiReviewView, { review, onShowSource: onShow, ...props })),
  );
}

describe('tone maps and chips', () => {
  it('maps scores, items, screenshots and status', () => {
    expect([4, 3, 2, 1, 0].map(pillarTone)).toEqual(['complete', 'in-flight', 'missing', 'missing', 'missing']);
    expect(ITEM_TONE).toEqual({ pass: 'complete', flag: 'in-flight', fail: 'missing', note: 'quiet' });
    expect(ITEM_MARK).toEqual({ pass: '✓', flag: '!', fail: '✗', note: '·' });
    expect(classifyShots('Captured (wide only — narrow widths not captured)', false)).toBe('partial');
    expect(classifyShots('Not captured (code-only audit)', false)).toBe('none');
    expect(classifyShots('Captured (dark/light)', false)).toBe('yes');
    expect(classifyShots(null, true)).toBe('yes');
    expect(classifyShots(null, false)).toBe('unknown');
    expect(SHOTS.unknown.tone).toBe('quiet');
    expect(statusChip('gaps_found')).toEqual({ label: 'Gaps found', tone: 'in-flight' });
    expect(statusChip('passed')).toEqual({ label: 'Passed', tone: 'complete' });
    expect(statusChip('complete')).toEqual({ label: 'Passed', tone: 'complete' });
    expect(statusChip('draft')).toEqual({ label: 'draft', tone: 'quiet' });
    expect(statusChip('')).toBeNull();
  });
});

describe('radarGeometry', () => {
  it('points the first axis up, puts a 4 on the outer ring and clamps', () => {
    const g = radarGeometry([4, 4, 4, 4, 4, 4]);
    expect(g.rings).toHaveLength(4);
    expect(g.spokes).toHaveLength(6);
    expect(g.dots[0]).toEqual({ x: g.cx, y: g.cy - g.radius });
    expect(g.shape).toBe(g.rings[3]);
    const flat = radarGeometry([0, 0, 0, 0, 0, 0]);
    expect(flat.dots.every((d) => d.x === flat.cx && d.y === flat.cy)).toBe(true);
    expect(radarGeometry([9, -3, 4, 4, 4, 4]).dots.slice(0, 2)).toEqual([g.dots[0], { x: g.cx, y: g.cy }]);
  });
});

describe('composeUiReview — literal input', () => {
  it('is null without structured.uiReview and for zero pillars', () => {
    const base = { kind: 'ui-review', frontmatter: {}, groups: [], planSegments: [] };
    expect(composeUiReview({ ...base, structured: {} })).toBeNull();
    expect(composeUiReview({ ...base, structured: { uiReview: { pillars: [] } } })).toBeNull();
  });

  it('formats a Date audit_date and a numeric phase', () => {
    const review = composeUiReview({
      kind: 'ui-review',
      frontmatter: { audit_date: new Date('2026-09-21T00:00:00Z'), phase: 5 },
      structured: { uiReview: { pillars: [{ n: 1, name: 'Color', score: 4, key: '', verdict: null, notes: [], groups: [], fixes: [] }, { n: 2, name: 'Spacing', score: 4, key: '', verdict: null, notes: [], groups: [], fixes: [] }, { n: 3, name: 'Visuals', score: 4, key: '', verdict: null, notes: [], groups: [], fixes: [] }], facts: [], overall: { score: 12, max: 12 }, fixes: [], back: [], sections: [], history: [] } },
      groups: [],
      planSegments: [],
    }) as ComposedUiReview;
    expect(review.intro.audited).toBe('21 Sep 2026');
    expect(review.intro.phase).toBe('5');
    expect(review.intro.eyebrow).toBe('UI Review · Phase 5');
    expect(review.radar?.labels).toHaveLength(3);
  });
});

describe('composeUiReview — synthetic doc', () => {
  const review = compose(SYN, null, { siblingArtifacts: SIBLING_SPEC });

  it('builds the header, verdict and radar', () => {
    expect(review.intro).toEqual({
      eyebrow: 'UI Review · Phase 6',
      title: 'Run sheet views',
      audited: '2 Oct 2026',
      phase: '6',
      fixCount: 3,
    });
    expect([review.score, review.max, review.lost]).toEqual([17, 24, 7]);
    expect(review.verdict).toEqual({
      line: '7 points lost, in Copywriting, Visuals, Color, Spacing and Experience Design.',
      fixesLine: '3 fixes asked for.',
    });
    expect(review.noFixes).toBeNull();
    expect(review.radar?.labels.map((l) => l.fixLabel)).toEqual([null, null, 'fix 2', null, null, 'fix 1, 3']);
    expect(review.pillars.map((p) => p.tone)).toEqual(['in-flight', 'in-flight', 'missing', 'complete', 'in-flight', 'missing']);
  });

  it('opens on Color and splits found from held', () => {
    expect(review.pillars.find((p) => p.n === review.initialPillar)?.name).toBe('Color');
    const experience = review.pillars[5];
    expect([experience.found.length, experience.heldCount]).toEqual([5, 3]);
    expect(experience.found[0]).toMatchObject({ kind: 'flag', mark: '!', tone: 'in-flight' });
    expect(review.pillars[2].squares.map((s) => s.on)).toEqual([true, true, false, false]);
  });

  it('links fixes, chips and history', () => {
    expect(review.fixes.map((f) => f.pillarNumbers)).toEqual([[6], [3], [6]]);
    expect(review.unlinkedFixes).toEqual([]);
    expect(review.method.status).toEqual({ label: 'Gaps found', tone: 'in-flight' });
    expect(review.method.shots).toMatchObject({ label: 'Partly seen in a browser', tone: 'in-flight' });
    expect(review.method.baseline).toMatchObject({ label: 'Against 06-UI-SPEC.md', url: '/artifact/x' });
    expect(review.method.human).toBe(true);
    expect(review.method.supersedes).toBe(1);
    expect(review.method.extraFacts).toEqual([{ key: 'Interaction captures', value: 'skipped (no Chrome binary resolved)' }]);
    expect(review.history?.map((b) => [b.score, b.now])).toEqual([[14, false], [17, true]]);
    expect(review.sourceOnly.map((s) => s.label)).toEqual(['Frontmatter', 'Pillar Scores table']);
    expect(review.sourceOnly[1].targetId).toBe('pillar-scores');
  });
});

describe('composeUiReview — corpus docs', () => {
  it('labelore 05', () => {
    const review = compose(LB05, { number: '05', slug: 'per-type-document-views' });
    expect(review.verdict.line).toBe('2 points lost, in Color and Experience Design.');
    expect(review.method.status).toBeNull();
    expect(review.method.shots).toMatchObject({ label: 'Seen in a browser', tone: 'complete' });
    expect(review.method.baseline?.label).toBe('Against UI-SPEC.md');
    expect(review.history).toBeNull();
    expect(review.fixes.map((f) => f.pillarNumbers)).toEqual([[3, 6], [4], [2]]);
    expect(review.pillars[2].fixNumbers).toEqual([1]);
    expect(review.pillars[5].fixNumbers).toEqual([1]);
    expect(review.sourceOnly.map((s) => s.label)).toEqual(['Frontmatter', 'Pillar Scores table', 'Audit method notes']);
    expect(review.sourceOnly[2].targetId).toBe('detailed-findings');
  });

  it.runIf(existsSync(SP03))('studio-portal 03', () => {
    const review = compose(SP03, { number: '03', slug: 'account-administration-session-control' });
    expect(review.intro.title).toBe('Account administration session control');
    expect(review.fixes.map((f) => f.n)).toEqual([1, 2]);
    expect(review.verdict.fixesLine).toBe('2 fixes asked for.');
    expect(review.method.shots).toMatchObject({ label: 'Code only · not seen in a browser', tone: 'in-flight' });
    expect(review.pillars.find((p) => p.n === review.initialPillar)?.name).toBe('Typography');
    expect(review.sourceOnly.map((s) => s.label)).toEqual(['Pillar Scores table', 'Top 3 Priority Fixes (as written)']);
  });

  it('labelore 03 and 04: full marks, history bars, no frontmatter noise', () => {
    const lb03 = compose(LB03, { number: '03', slug: 'search-browsing-traceability' });
    expect(lb03.noFixes).toEqual({ kind: 'clear', note: null });
    expect(lb03.history).toHaveLength(3);
    expect(lb03.method.status).toEqual({ label: 'Passed', tone: 'complete' });
    expect(lb03.method.supersedes).toBe(2);
    const lb04 = compose(LB04, { number: '04', slug: 'portability-degradation-hardening' });
    expect(lb04.noFixes).toEqual({ kind: 'clear', note: 'All specification requirements met. No blocking issues.' });
    expect(lb04.method.shots).toMatchObject({ label: 'Screenshots not stated', tone: 'quiet' });
    expect(lb04.method.extraFacts.map((f) => f.key)).toEqual(['This audit']);
    expect(lb04.history).toHaveLength(3);
    expect(lb04.intro.audited).toBe('10 Sep 2026');
  });
});

describe('stepPillar', () => {
  const ok = { editable: false, inside: true, modified: false };
  it('steps and wraps, and refuses modifiers, editable targets and outside targets', () => {
    expect(stepPillar('ArrowRight', 3, 6, ok)).toBe(4);
    expect(stepPillar('ArrowRight', 6, 6, ok)).toBe(1);
    expect(stepPillar('ArrowLeft', 1, 6, ok)).toBe(6);
    expect(stepPillar('ArrowLeft', 3, 6, ok)).toBe(2);
    expect(stepPillar('ArrowRight', 3, 6, { ...ok, modified: true })).toBeNull();
    expect(stepPillar('ArrowRight', 3, 6, { ...ok, editable: true })).toBeNull();
    expect(stepPillar('ArrowRight', 3, 6, { ...ok, inside: false })).toBeNull();
    expect(stepPillar('Enter', 3, 6, ok)).toBeNull();
  });
});

describe('UiReviewView static markup', () => {
  const syn = compose(SYN, null, { siblingArtifacts: SIBLING_SPEC });

  it('renders the radar, pins, tabs and the Color inspector', () => {
    const html = markup(syn);
    expect(html.match(/view-ui-review-label"/g)).toHaveLength(6);
    expect(html).toContain('>17</text>');
    expect(html).toContain('of 24');
    expect(html.match(/data-fixpin=/g)).toHaveLength(3);
    expect(html.match(/role="tab"/g)).toHaveLength(6);
    expect(html).toMatch(/id="ui-review-tab-3"[^>]*aria-selected="true"/);
    expect(html).toContain('Pillar 3 of 6 · ← → to step');
    expect(html).toContain('Found · 2');
    expect(html.match(/data-kind="fail"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Fix 2');
    expect(html).toContain('Held up · 2');
    expect(html).toContain('Score across reviews');
    expect(html.match(/class="view-ui-review-bar"/g)).toHaveLength(2);
    expect(html).toContain('data-now="true"');
    expect(html).toContain('href="/artifact/x"');
  });

  it('opens a pressed fix: its pillar, its highlighted card and the pressed pin', () => {
    const html = markup(syn, { initialPillar: 6, initialFix: 3 });
    expect(html).toContain('Pillar 6 of 6');
    expect(html).toMatch(/id="ui-review-fix-3"[^>]*data-highlight="true"/);
    expect(html).toMatch(/data-fixpin="3"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-fixpin="3"/);
    expect(html).not.toMatch(/id="ui-review-fix-1"[^>]*data-highlight/);
  });

  it('shows a shared fix under both pillars (labelore 05)', () => {
    const lb05 = compose(LB05, { number: '05', slug: 'per-type-document-views' });
    expect(markup(lb05, { initialPillar: 3 })).toContain('id="ui-review-fix-1"');
    expect(markup(lb05, { initialPillar: 6 })).toContain('id="ui-review-fix-1"');
    expect(markup(lb05, { initialPillar: 1 })).not.toContain('id="ui-review-fix-1"');
  });

  it.runIf(existsSync(SP03))('studio-portal Typography: the ref chip and the more toggle', () => {
    const sp = compose(SP03, { number: '03', slug: 'account-administration-session-control' });
    const html = markup(sp);
    expect(html).toContain('frontend/components/destructive-confirm-dialog.tsx:182');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('>more<');
  });

  it('renders the back matter in document order, folded, with the files tree', () => {
    const lb03 = compose(LB03, { number: '03', slug: 'search-browsing-traceability' });
    const html = markup(lb03);
    const summaries = [...html.matchAll(/<summary>([^<]*)<\/summary>/g)].map((m) => m[1]);
    expect(summaries).toEqual(['Supersession Notice', 'Technical Verification', 'Summary', 'Files Audited']);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain('All Phase 3 tests');
    expect(html).toContain('Nothing to fix.');
    expect(html).toContain('Full marks. Nothing to fix.');
    expect(html).toContain('Nothing found — every check held.');
    expect(html.match(/class="view-ui-review-bar"/g)).toHaveLength(3);

    const lb05 = compose(LB05, { number: '05', slug: 'per-type-document-views' });
    const files = markup(lb05);
    expect(files.match(/class="view-ui-review-files-group"/g)).toHaveLength(4);
    expect(files).toContain('New Phase 5 Files');
    expect(files).toContain('src/web/components/');
    expect(files).not.toContain('class="view-ui-review-bar"');

    const lb04 = compose(LB04, { number: '04', slug: 'portability-degradation-hardening' });
    expect(markup(lb04).match(/class="view-ui-review-files-group"/g)).toHaveLength(3);
  });

  it.runIf(existsSync(SP03))('folds the correction note into a bold line, never a literal hash', () => {
    const sp = compose(SP03, { number: '03', slug: 'account-administration-session-control' });
    const html = markup(sp);
    expect(html).toContain('Correction note');
    expect(html).not.toContain('###');
  });

  it('lists what only the source holds, in order, as buttons', () => {
    const calls: (string | null)[] = [];
    const lb05 = compose(LB05, { number: '05', slug: 'per-type-document-views' });
    const html = markup(lb05, {}, () => calls.push('x'));
    const nav = html.slice(html.indexOf('id="ui-review-source-only"'));
    const labels = [...nav.matchAll(/class="status-chip"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(labels).toEqual(['Frontmatter', 'Pillar Scores table', 'Audit method notes']);
  });

  it('renders the facts row through UiReviewIntroMeta', () => {
    const html = renderToStaticMarkup(createElement(UiReviewIntroMeta, { intro: syn.intro }));
    expect(html).toContain('Audited<b>2 Oct 2026</b>');
    expect(html).toContain('Phase<b>6</b>');
    expect(html).toContain('Fixes<b>3</b>');
  });
});
