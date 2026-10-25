// quick-260923-jxp (JXP-05, JXP-08): real-corpus guards. Two corpora, keyed by prefix: `LB:` for this
// repo's own archived discussion logs under `.planning/` (read from the checkout) and `FX:` for the eight
// made-up Lendshed logs (read through fxPath, which throws on a missing file; nothing here skips or looks
// anywhere else on the machine) — the review's whole premise is "no discussion log drops a question."
// Every FX question count below was counted in the file itself (grep -c on the question headings or the
// bold-Q lines) before being pinned, never copied from the extractor's own output. Pins are per file,
// never a total over a corpus (README rule R6).
import { readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FX_PLANNING, fxPath } from '../helpers/fixture-project.ts';
import {
  composeDocumentLayout,
  type ComposedDocumentLayout,
} from '../../src/web/views/layout.ts';
import { discussionLogLayout } from '../../src/web/views/layout-discussion-log.ts';
import { extractDiscussionLog } from '../../src/planning-repo/handlers/section-projection.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';

const LB_PLANNING = fileURLToPath(new URL('../../.planning', import.meta.url));

/** `LB:<path under .planning>` or `FX:<path under the Lendshed .planning>`. */
function absolutePath(key: string): string {
  if (key.startsWith('FX:')) return fxPath(key.slice(3));
  if (key.startsWith('LB:')) return join(LB_PLANNING, key.slice(3));
  throw new Error(`discussion-log-corpus: unknown corpus prefix in ${key}`);
}

async function bodyOfKey(key: string): Promise<string> {
  return await readFile(absolutePath(key), 'utf8');
}

interface LogCase {
  label: string;
  key: string;
  questionCount: number;
}

const LB_CASES: LogCase[] = [
  { label: 'LB v1.0/01', key: 'LB:milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'LB v1.0/02', key: 'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'LB v1.0/03', key: 'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'LB v1.0/04', key: 'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'LB v1.1/05', key: 'LB:milestones/v1.1-phases/05-per-type-document-views/05-DISCUSSION-LOG.md', questionCount: 15 },
];

const FX_CASES: LogCase[] = [
  // Archived v1.0 phases: four topics with an unlabeled table each (01), question headings (02, 03), and
  // bold Q lines with inline "you decide" answers (04).
  { label: 'FX v1.0/01', key: 'FX:milestones/v1.0-phases/01-member-data-foundation/01-DISCUSSION-LOG.md', questionCount: 4 },
  { label: 'FX v1.0/02', key: 'FX:milestones/v1.0-phases/02-shed-inventory-health/02-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'FX v1.0/03', key: 'FX:milestones/v1.0-phases/03-catalogue-browsing/03-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'FX v1.0/04', key: 'FX:milestones/v1.0-phases/04-shed-to-shed-transfers/04-DISCUSSION-LOG.md', questionCount: 25 },
  // Current milestone phases.
  { label: 'FX phases/01', key: 'FX:phases/01-member-sign-in-sessions/01-DISCUSSION-LOG.md', questionCount: 19 },
  { label: 'FX phases/02', key: 'FX:phases/02-roles-and-permissions/02-DISCUSSION-LOG.md', questionCount: 16 },
  { label: 'FX phases/03', key: 'FX:phases/03-account-admin-and-sessions/03-DISCUSSION-LOG.md', questionCount: 17 },
  { label: 'FX phases/04', key: 'FX:phases/04-bulk-loan-export/04-DISCUSSION-LOG.md', questionCount: 18 },
];

const CASES: LogCase[] = [...FX_CASES, ...LB_CASES];

/** Every `*-DISCUSSION-LOG.md` under a `.planning/` root, as `/`-separated paths relative to it. */
function walkLogFiles(planningRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === '.cache' || entry === 'node_modules') continue;
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (entry.endsWith('-DISCUSSION-LOG.md')) out.push(relative(planningRoot, abs).split('\\').join('/'));
    }
  };
  walk(planningRoot);
  return out;
}

// Smallest corpus sizes the guard accepts (README rule R8): at least the six Labelore logs on disk when this
// guard was converted (five archived ones plus phase 06's own), and all eight Lendshed logs. A walk that
// finds fewer means a tree moved or the walker broke, and must fail rather than pass over nothing. Sibling
// plans may add Lendshed files, so the guard never asserts that every walked file is pinned (R6).
const MIN_LB_FILES = 6;
const MIN_FX_FILES = 8;

describe('discussion-log corpus walk (LB: and FX:)', () => {
  const lbFiles = walkLogFiles(LB_PLANNING).map((rel) => `LB:${rel}`);
  const fxFiles = walkLogFiles(FX_PLANNING).map((rel) => `FX:${rel}`);

  it(`finds at least ${MIN_LB_FILES} Labelore discussion logs`, () => {
    expect(lbFiles.length).toBeGreaterThanOrEqual(MIN_LB_FILES);
  });

  it(`finds at least ${MIN_FX_FILES} Lendshed discussion logs`, () => {
    expect(fxFiles.length).toBeGreaterThanOrEqual(MIN_FX_FILES);
  });

  it('every pinned case names a file the walk found', () => {
    const found = new Set([...lbFiles, ...fxFiles]);
    const missing = CASES.filter((c) => !found.has(c.key)).map((c) => c.key);
    expect(missing).toEqual([]);
  });

  it(`pins at least ${LB_CASES.length} LB cases and ${MIN_FX_FILES} FX cases`, () => {
    expect(LB_CASES.length).toBeGreaterThanOrEqual(5);
    expect(FX_CASES.length).toBeGreaterThanOrEqual(MIN_FX_FILES);
  });
});

describe('discussion-log corpus — pinned question counts (JXP-05: no dropped question)', () => {
  for (const testCase of CASES) {
    it(`${testCase.label} yields ${testCase.questionCount} questions`, async () => {
      const body = await bodyOfKey(testCase.key);
      const { questions } = extractDiscussionLog(body);
      expect(questions).toHaveLength(testCase.questionCount);
    });
  }
});

describe('FX phases/01 repro (JXP-05): the renamed CLI question', () => {
  it('resolves chosen, chosenIndex 1, qualifier "renamed", userChoice containing "shedkeys"', async () => {
    const body = await bodyOfKey('FX:phases/01-member-sign-in-sessions/01-DISCUSSION-LOG.md');
    const { questions } = extractDiscussionLog(body);
    const q = questions.find((question) => question.question.startsWith('What brings the first sign-in account into being?'));
    expect(q).toBeDefined();
    expect(q).toMatchObject({ resolution: 'chosen', chosenIndex: 1, qualifier: 'renamed' });
    expect(q!.userChoice).toContain('shedkeys');
  });
});

// ---------------------------------------------------------------------------
// JXP-08: every cover number equals what the page renders — checked against real logs (parsed
// output plus the composed layout), not just synthetic fixtures.
// ---------------------------------------------------------------------------

function composedFor(body: string): ComposedDocumentLayout {
  const structured = extractDiscussionLog(body) as unknown as Record<string, unknown>;
  const manifest: ViewManifest = {
    kind: 'discussion-log',
    lead: 'lead.',
    promote: [],
    layout: discussionLogLayout,
  };
  const input: ViewInput = {
    kind: 'discussion-log',
    frontmatter: {},
    structured,
    groups: [],
    planSegments: [],
  };
  const composed = composeDocumentLayout(manifest, input);
  expect(composed).not.toBeNull();
  return composed!;
}

interface CoverCase {
  label: string;
  key: string;
  discussedFact: string;
}

const COVER_CASES: CoverCase[] = [
  {
    label: 'LB v1.0/01',
    key: 'LB:milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    discussedFact: '4 of 6 offered areas',
  },
  {
    label: 'LB v1.0/03',
    key: 'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md',
    discussedFact: '4 of 8 offered areas',
  },
  {
    label: 'FX phases/01',
    key: 'FX:phases/01-member-sign-in-sessions/01-DISCUSSION-LOG.md',
    discussedFact: '4 of 4 offered areas',
  },
  {
    label: 'FX phases/04',
    key: 'FX:phases/04-bulk-loan-export/04-DISCUSSION-LOG.md',
    discussedFact: '4 of 7 offered areas',
  },
  {
    label: 'FX v1.0/04',
    key: 'FX:milestones/v1.0-phases/04-shed-to-shed-transfers/04-DISCUSSION-LOG.md',
    discussedFact: '8 of 8 offered areas',
  },
];

describe('discussion-log corpus — cover numbers equal rendered counts (JXP-08)', () => {
  for (const testCase of COVER_CASES) {
    it(`${testCase.label}: headline/pills/facts match rendered chapters and items`, async () => {
      const body = await bodyOfKey(testCase.key);
      const layout = composedFor(body);

      const allItems = layout.chapters.flatMap((c) => c.items ?? []);
      const notOpenCount = allItems.filter((item) => item.state?.label !== 'Open').length;
      expect(layout.cover.headline?.value).toBe(String(notOpenCount));

      const topicsPill = layout.cover.pills.find((p) => p.label === 'Topic' || p.label === 'Topics');
      expect(topicsPill?.value).toBe(String(layout.chapters.length));

      const claudeCount = allItems.filter((item) => item.state?.label === 'Claude chose').length;
      const claudePill = layout.cover.pills.find((p) => p.label === 'Left to Claude');
      if (claudeCount > 0) {
        expect(claudePill?.value).toBe(String(claudeCount));
      } else {
        expect(claudePill).toBeUndefined();
      }

      const discussedFact = layout.cover.facts.find((f) => f.label === 'Discussed');
      expect(discussedFact?.value).toBe(testCase.discussedFact);
    });
  }
});

// ---------------------------------------------------------------------------
// quick-261016-2j6: synthetic case. The S4 compact `| Question | Options | Selected |` layout is an
// agent-improvised variant, not GSD's template — one table row per question.
// ---------------------------------------------------------------------------

describe('discussion-log S4 compact table — composed page (quick-261016-2j6)', () => {
  const body = [
    '# Phase 9: Widgets - Discussion Log',
    '',
    '**Date:** 2026-10-01',
    '',
    '---',
    '',
    '## Sending media',
    '',
    '| Question | Options | Selected |',
    '|---|---|---|',
    '| Multiple at once | One at a time / Album grid | Album grid |',
    '| Attach UI | One + button → OS picker / Separate camera + gallery | One + button |',
    '| After picking | Preview + optional caption / Send immediately | Preview + caption |',
    '| Max length | 5 min / No limit |  |',
    '',
  ].join('\n');

  it('renders one item per row with the picked answer and a truthful decided headline', () => {
    const layout = composedFor(body);
    expect(layout.chapters).toHaveLength(1);
    expect(layout.chapters[0].title).toBe('Sending media');
    const items = layout.chapters[0].items ?? [];
    expect(items.map((i) => i.title)).toEqual(['Multiple at once', 'Attach UI', 'After picking', 'Max length']);
    expect(items.map((i) => i.state?.label)).toEqual(['Chosen', 'Chosen', 'Chosen', 'Open']);
    expect(items[0].answerCard?.option).toMatchObject({ number: 2, title: 'Album grid' });
    expect(items[1].answerCard?.option).toMatchObject({ number: 1, title: 'One + button → OS picker' });
    expect(items[2].answerCard?.option).toMatchObject({ number: null, title: 'Preview + caption' });
    expect(items[3].answerCard ?? null).toBeNull();
    expect(layout.cover.headline?.value).toBe('3');
    expect(layout.cover.headline?.label).toBe('of 4 questions decided');
  });
});
