// quick-261003-528: extractUiReview on the sketch's synthetic doc, the real corpus rows, and the
// degrade cases (empty body, no Overall line, an unclosed fence, a pillar heading with no score, a
// Top 3 section with prose only, an orphan "See Priority Fix 9", and a 1 MB body holding one
// 200k-character line within 250 ms).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { classify, extractUiReview, fileRefs } from '../src/planning-repo/handlers/ui-review-audit.ts';

function bodyOf(path: URL | string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

const SYN = new URL('../.planning/sketches/018-ui-review-page/synthetic-UI-REVIEW.md', import.meta.url);
const LB05 = new URL('../.planning/milestones/v1.1-phases/05-per-type-document-views/05-UI-REVIEW.md', import.meta.url);
const LB03 = new URL('../.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-UI-REVIEW.md', import.meta.url);
const LB04 = new URL(
  '../.planning/milestones/v1.0-phases/04-portability-degradation-hardening/04-UI-REVIEW.md',
  import.meta.url,
);
const SP03 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-UI-REVIEW.md`;

describe('classify and fileRefs', () => {
  it('classes a line by its mark', () => {
    expect(classify('❌ a')).toBe('fail');
    expect(classify('a ✗')).toBe('fail');
    expect(classify('⚠️ a')).toBe('flag');
    expect(classify('✅ a')).toBe('pass');
    expect(classify('a ✓')).toBe('pass');
    expect(classify('plain')).toBe('note');
    expect(classify('✗x is not a fail mark')).toBe('note');
  });

  it('finds file references token by token', () => {
    expect(fileRefs('see `src/a/b.tsx:88`, then (globals.css:3911) and `:232` and UI-SPEC.md.')).toEqual([
      'src/a/b.tsx:88',
      'globals.css:3911',
      'UI-SPEC.md',
    ]);
    expect(fileRefs('no refs here, only words.ts-like')).toEqual([]);
  });
});

describe('extractUiReview — synthetic doc', () => {
  const audit = extractUiReview(bodyOf(SYN));

  it('reads the header facts, scores and overall', () => {
    expect(audit.h1Phase).toBe('06');
    expect(audit.facts.map((f) => f.key)).toEqual([
      'Audited',
      'Baseline',
      'Screenshots',
      'Interaction captures',
      'Prior reviews superseded',
    ]);
    expect(audit.facts[4].items).toHaveLength(1);
    expect(audit.pillars.map((p) => p.score)).toEqual([3, 3, 2, 4, 3, 2]);
    expect(audit.pillars[0].key).toContain('inspector');
    expect(audit.overall).toEqual({ score: 17, max: 24 });
  });

  it('counts ✗ and ⚠ items per pillar and keeps every verdict', () => {
    const count = (kind: string): number[] =>
      audit.pillars.map((p) => p.groups.flatMap((g) => g.items).filter((i) => i.kind === kind).length);
    expect(count('fail')).toEqual([0, 0, 2, 0, 0, 3]);
    expect(count('flag')).toEqual([1, 1, 0, 0, 1, 2]);
    for (const pillar of audit.pillars) expect(pillar.verdict).not.toBeNull();
  });

  it('splits fixes and links them to pillars through the See lines', () => {
    expect(audit.fixes.map((f) => f.n)).toEqual([1, 2, 3]);
    expect(audit.fixes[0].impact).toContain('keyboard and screen-reader users');
    expect(audit.fixes[0].fix).toContain('render each square as a `button`');
    expect(audit.fixes[0].refs).toEqual(['src/web/views/validation/wave-lanes.tsx:88']);
    expect(audit.fixes[1].refs).toHaveLength(2);
    expect(audit.fixes.map((f) => f.pillars)).toEqual([['Experience Design'], ['Color'], ['Experience Design']]);
    expect(audit.pillars[2].fixes).toEqual([2]);
    expect(audit.pillars[5].fixes).toEqual([1, 3]);
  });

  it('reads the history, the back matter and the Files Audited tree', () => {
    expect(audit.history).toEqual([
      expect.objectContaining({ when: '2026-09-28', score: 14, max: 24 }),
    ]);
    expect(audit.back.map((b) => b.heading)).toEqual(['Files Audited', 'Summary']);
    const files = audit.back[0].files;
    expect(files?.groups).toHaveLength(1);
    expect(files?.groups[0].entries).toHaveLength(6);
    expect(files?.groups[0].entries[5]).toEqual({ path: 'src/web/styles/globals.css', note: 'lines 3840–3960' });
    expect(audit.sections.filter((s) => s.claimed).map((s) => s.heading)).toEqual([
      'Pillar Scores',
      'Top 3 Priority Fixes',
      'Detailed Findings',
    ]);
  });
});

describe('extractUiReview — corpus rows', () => {
  it('labelore 05: title-fallback fix links, notes, a code block, a sub-list, four file groups', () => {
    const audit = extractUiReview(bodyOf(LB05));
    expect(audit.fixes.map((f) => f.pillars)).toEqual([['Color', 'Experience Design'], ['Typography'], ['Visuals']]);
    for (const pillar of audit.pillars) expect(pillar.notes).toHaveLength(2);
    const color = audit.pillars[2].groups.flatMap((g) => g.items);
    expect(color.some((i) => i.kind === 'flag' && i.code !== null && i.code.includes('card-veil'))).toBe(true);
    const accent = audit.pillars[2].groups.flatMap((g) => g.items).find((i) => i.text.includes('Accent color usage'));
    expect(accent?.sub).toHaveLength(5);
    expect(audit.back.map((b) => b.heading)).toEqual(['Registry Safety', 'Files Audited', 'Summary']);
    const files = audit.back[1].files;
    expect(files?.groups).toHaveLength(4);
    expect(files?.groups.reduce((n, g) => n + g.entries.length, 0)).toBe(24);
    expect(files?.groups.reduce((n, g) => n + g.other.length, 0)).toBe(1);
  });

  it.runIf(existsSync(SP03))('studio-portal 03: no frontmatter, a dropped third fix, a lead sentence, a correction note', () => {
    const audit = extractUiReview(bodyOf(SP03));
    expect(audit.h1Phase).toBe('03');
    expect(audit.fixes[2].none).toBe(true);
    expect(audit.fixes.filter((f) => !f.none).map((f) => f.pillars)).toEqual([['Typography'], ['Spacing']]);
    const copy = audit.pillars[0].groups[0];
    expect(copy.title).toBe('Contract Compliance');
    expect(copy.items[0].text).toContain('All strings match verbatim');
    const summary = audit.back.find((b) => b.heading === 'Summary');
    expect(summary?.parts.map((p) => p.heading)).toContain('Correction note');
  });

  it('labelore 03: no fixes, history from the Supersession Notice, back sections in document order', () => {
    const audit = extractUiReview(bodyOf(LB03));
    expect(audit.fixes).toEqual([]);
    expect(audit.fixesNote).toBeNull();
    expect(audit.history.map((h) => h.when)).toEqual(['2026-09-02', '2026-09-10 early']);
    expect(audit.back.map((b) => b.heading)).toEqual([
      'Supersession Notice',
      'Technical Verification',
      'Summary',
      'Files Audited',
    ]);
  });

  it('labelore 04: the note in place of fixes, history from the header list, caption groups', () => {
    const audit = extractUiReview(bodyOf(LB04));
    expect(audit.fixes).toEqual([]);
    expect(audit.fixesNote).toBe('All specification requirements met. No blocking issues.');
    expect(audit.history.map((h) => h.score)).toEqual([22, 23]);
    expect(audit.facts.map((f) => f.key)).toContain('This audit');
    const files = audit.back.find((b) => b.heading === 'Files Audited')?.files;
    expect(files?.groups.map((g) => g.caption)).toEqual([
      'Core Phase 4 surfaces',
      'Shared presentation layer',
      'Styling and testing',
    ]);
    expect(files?.groups.reduce((n, g) => n + g.entries.length, 0)).toBe(13);
  });
});

describe('extractUiReview — degrade', () => {
  it('an empty body yields zero pillars', () => {
    const audit = extractUiReview('');
    expect(audit.pillars).toEqual([]);
    expect(audit.fixes).toEqual([]);
  });

  it('sums the scores when the table has no Overall line', () => {
    const audit = extractUiReview('## Pillar Scores\n\n| Pillar | Score | Key |\n|---|---|---|\n| 1. A | 3/4 | x |\n| 2. B | 4/4 | y |\n');
    expect(audit.overall).toEqual({ score: 7, max: 8 });
  });

  it('survives an unclosed fence, a pillar heading with no score, prose-only fixes and an orphan See line', () => {
    const body = [
      '## Pillar Scores',
      '| 1. Color | 2/4 | k |',
      '## Top 3 Priority Fixes',
      '*(None this round.)*',
      '## Detailed Findings',
      '### Pillar 1: Color',
      '❌ bad',
      'See Priority Fix 9.',
      '```css',
      'a { color: red }',
    ].join('\n');
    const audit = extractUiReview(body);
    expect(audit.pillars).toHaveLength(1);
    expect(audit.fixes).toEqual([]);
    expect(audit.fixesNote).toBe('None this round.');
    expect(audit.pillars[0].fixes).toEqual([]);
  });

  it('extracts a 1 MB body with one 200k-character line within 250 ms', () => {
    const body = `## Pillar Scores\n| 1. A | 3/4 | k |\n${'./'.repeat(100_000)}\n${'x'.repeat(800_000)}\n`;
    const started = performance.now();
    const audit = extractUiReview(body);
    expect(performance.now() - started).toBeLessThan(250);
    expect(audit.pillars).toHaveLength(1);
  });
});
