// quick-261003-528 (QK528-08): real-corpus guards over every UI-REVIEW.md in this repo's `.planning/`
// (excluding the sketches), fixtures/dense and `~/studio-portal/.planning/`, plus the sketch's
// synthetic doc named explicitly — the uat-session-corpus.test.ts idiom (a missing studio-portal
// checkout skips its files). Every file must extract without throwing, compose to a non-null review
// through the real handler, and match the values pinned below. The pinned values were independently
// confirmed with grep / awk over the source files (pillar rows, ❌ / ✗ and ⚠ lines inside each
// `### Pillar` section, "See Priority Fix" lines, `- \`` lines inside `## Files Audited`) — never
// copied from the extractor's own output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { UiReviewHandler } from '../../src/planning-repo/handlers/ui-review.ts';
import type { UiReviewAudit } from '../../src/planning-repo/handlers/ui-review-audit.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composeUiReview } from '../../src/web/views/ui-review.ts';
import type { ComposedUiReview } from '../../src/web/views/ui-review.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;
const SYNTHETIC = new URL('../../.planning/sketches/018-ui-review-page/synthetic-UI-REVIEW.md', import.meta.url).pathname;

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules' || entry === 'worktrees') continue;
        stack.push(abs);
      } else if (entry.endsWith('-UI-REVIEW.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  overall: [number, number];
  scores: number[];
  fails: number[];
  flags: number[];
  /** Fix number -> pillar names (the real fixes only). */
  fixes: Record<number, string[]>;
  history: number;
  back: string[];
  fileEntries: number;
  initial: string;
  title: string;
  verdict: string;
  facts: string;
}

const PINNED: Record<string, Pinned> = {
  'SYN:synthetic': {
    overall: [17, 24],
    scores: [3, 3, 2, 4, 3, 2],
    fails: [0, 0, 2, 0, 0, 3],
    flags: [1, 1, 0, 0, 1, 2],
    fixes: { 1: ['Experience Design'], 2: ['Color'], 3: ['Experience Design'] },
    history: 1,
    back: ['Files Audited', 'Summary'],
    fileEntries: 6,
    initial: 'Color',
    title: 'Run sheet views',
    verdict: '7 points lost, in Copywriting, Visuals, Color, Spacing and Experience Design.',
    facts: '2 Oct 2026|6|3',
  },
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-UI-REVIEW.md': {
    overall: [22, 24],
    scores: [4, 4, 3, 4, 4, 3],
    fails: [0, 0, 0, 0, 0, 0],
    flags: [0, 0, 1, 0, 0, 1],
    fixes: { 1: ['Color', 'Experience Design'], 2: ['Typography'], 3: ['Visuals'] },
    history: 0,
    back: ['Registry Safety', 'Files Audited', 'Summary'],
    fileEntries: 24,
    initial: 'Color',
    title: 'Per type document views',
    verdict: '2 points lost, in Color and Experience Design.',
    facts: '21 Sep 2026|5|3',
  },
  'SP:phases/03-account-administration-session-control/03-UI-REVIEW.md': {
    overall: [22, 24],
    scores: [4, 4, 4, 3, 3, 4],
    fails: [0, 0, 0, 1, 1, 0],
    flags: [0, 0, 0, 0, 0, 0],
    fixes: { 1: ['Typography'], 2: ['Spacing'] },
    history: 0,
    back: ['Files Audited', 'Summary'],
    fileEntries: 12,
    initial: 'Typography',
    title: 'Account administration session control',
    verdict: '2 points lost, in Typography and Spacing.',
    facts: '21 Aug 2026|3|2',
  },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-UI-REVIEW.md': {
    overall: [24, 24],
    scores: [4, 4, 4, 4, 4, 4],
    fails: [0, 0, 0, 0, 0, 0],
    flags: [0, 0, 0, 0, 0, 0],
    fixes: {},
    history: 2,
    back: ['Supersession Notice', 'Technical Verification', 'Summary', 'Files Audited'],
    fileEntries: 9,
    initial: 'Copywriting',
    title: 'Search browsing traceability',
    verdict: 'Full marks. Nothing to fix.',
    facts: '10 Sep 2026|3|0',
  },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-UI-REVIEW.md': {
    overall: [24, 24],
    scores: [4, 4, 4, 4, 4, 4],
    fails: [0, 0, 0, 0, 0, 0],
    flags: [0, 0, 0, 0, 0, 0],
    fixes: {},
    history: 2,
    back: ['Registry Safety Audit', 'Files Audited', 'Supersedes Prior Reviews'],
    fileEntries: 13,
    initial: 'Copywriting',
    title: 'Portability degradation hardening',
    verdict: 'Full marks. Nothing to fix.',
    facts: '10 Sep 2026|4|0',
  },
};

const FILES: { key: string; path: string }[] = [
  ...walk(REPO_PLANNING).map((path) => ({ key: `LB:${relative(REPO_PLANNING, path)}`, path })),
  ...walk(DENSE_PLANNING).map((path) => ({ key: `FX:${relative(DENSE_PLANNING, path)}`, path })),
  ...walk(SP_PLANNING).map((path) => ({ key: `SP:${relative(SP_PLANNING, path)}`, path })),
  { key: 'SYN:synthetic', path: SYNTHETIC },
];

function parse(path: string): { audit: UiReviewAudit; input: ViewInput } {
  const content = readFileSync(path, 'utf8');
  // The phase directory the file sits in, as the discovery layer would hand it to the handler.
  const dir = path.split('/').slice(-2)[0];
  const number = /^(\d+)-/.exec(dir)?.[1] ?? '06';
  const slug = dir.replace(/^\d+-/, '');
  const ref: ArtifactRef = {
    path: `.planning/phases/${number}-${slug}/${number}-UI-REVIEW.md`,
    kind: 'ui-review',
    location: 'phase',
    phaseIdentity: path === SYNTHETIC ? { milestoneVersion: null, number: '06', projectCode: null, slug: 'run-sheet-views' } : { milestoneVersion: null, number, projectCode: null, slug },
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = UiReviewHandler.parse(raw, ref);
  const structured = parsed.structured as Record<string, unknown>;
  return {
    audit: structured.uiReview as UiReviewAudit,
    input: {
      kind: 'ui-review',
      frontmatter: parsed.frontmatter as Record<string, unknown>,
      structured,
      groups: [],
      planSegments: [],
    },
  };
}

describe('UI-REVIEW corpus', () => {
  it('finds the pinned documents (a missing studio-portal checkout drops its one)', () => {
    const present = new Set(FILES.map((f) => f.key));
    for (const key of Object.keys(PINNED)) {
      if (key.startsWith('SP:') && !existsSync(SP_PLANNING)) continue;
      expect(present.has(key), key).toBe(true);
    }
    // Nothing unpinned: a new UI-REVIEW in the corpus must be pinned here on purpose.
    for (const file of FILES) expect(PINNED[file.key], `unpinned ${file.key}`).toBeDefined();
  });

  it.each(FILES.map((f) => [f.key, f.path] as const))('%s extracts and composes with the pinned values', (key, path) => {
    const pinned = PINNED[key];
    expect(pinned).toBeDefined();
    const { audit, input } = parse(path);
    expect(audit).toBeDefined();
    expect(audit.overall).toEqual({ score: pinned.overall[0], max: pinned.overall[1] });
    expect(audit.pillars.map((p) => p.score)).toEqual(pinned.scores);
    const count = (kind: string): number[] =>
      audit.pillars.map((p) => p.groups.flatMap((g) => g.items).filter((i) => i.kind === kind).length);
    expect(count('fail')).toEqual(pinned.fails);
    expect(count('flag')).toEqual(pinned.flags);
    const fixes: Record<number, string[]> = {};
    for (const fix of audit.fixes) if (!fix.none) fixes[fix.n] = fix.pillars;
    expect(fixes).toEqual(pinned.fixes);
    expect(audit.history).toHaveLength(pinned.history);
    expect(audit.back.map((b) => b.heading)).toEqual(pinned.back);
    const files = audit.back.find((b) => b.heading.startsWith('Files Audited'))?.files;
    expect(files?.groups.reduce((total, g) => total + g.entries.length, 0)).toBe(pinned.fileEntries);

    const review = composeUiReview(input) as ComposedUiReview;
    expect(review).not.toBeNull();
    expect(review.pillars.find((p) => p.n === review.initialPillar)?.name).toBe(pinned.initial);
    expect(review.intro.title).toBe(pinned.title);
    expect(review.verdict.line).toBe(pinned.verdict);
    expect(`${review.intro.audited}|${review.intro.phase}|${review.intro.fixCount}`).toBe(pinned.facts);
  });

  it('degrades, never throws, on an empty, malformed or pathological body', async () => {
    const { extractUiReview } = await import('../../src/planning-repo/handlers/ui-review-audit.ts');
    for (const body of ['', '\u0000\u0001', '| | |\n|---|\n', '## Pillar Scores\n\n| 1. x | y |', '```\n## Pillar Scores']) {
      expect(() => extractUiReview(body)).not.toThrow();
    }
    const started = performance.now();
    extractUiReview(`${'.'.repeat(200_000)}\n${'/'.repeat(500_000)}\n${'a/b.ts '.repeat(40_000)}`);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
