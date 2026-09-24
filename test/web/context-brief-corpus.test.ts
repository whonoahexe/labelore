// quick-260923-lju (LJU-07, C-1): real-corpus guards over every CONTEXT.md in this repo's
// `.planning/` plus `~/studio-portal/.planning/` (19 files total) — the discussion-log-corpus.test.ts
// idiom (it.runIf(existsSync(...)) for studio-portal fixtures, always-on for this repo's own).
// Every pinned count below was independently confirmed against the source file (grep -c
// '^- \*\*D-[0-9]' for decision counts, direct reading for open/notes counts) before being pinned
// here — never copied from the extractor's own output.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { extractContextBrief, topSections, type ContextBrief } from '../../src/planning-repo/handlers/context-brief.ts';
import { composeContextBrief } from '../../src/web/views/context-brief.ts';

const REPO_ROOT = new URL('../../', import.meta.url);
const SP_ROOT = '/home/cinedise/studio-portal/.planning';

async function repoBody(relativePath: string): Promise<string> {
  return await readFile(new URL(relativePath, REPO_ROOT), 'utf8');
}

interface CorpusCase {
  label: string;
  path: string;
  isRepoFile: boolean;
  decisions: number;
  notes: number;
  open: number;
  /** Requirement-amendments sections (`<blocking_amendments>` tag or "Requirement amendments"
   * heading) — quick-260925-3ob. Confirmed per file with `grep -c '^<blocking_amendments>'`
   * before pinning. */
  amendments: number;
}

const CASES: CorpusCase[] = [
  { label: 'SP v1.0/01', path: `${SP_ROOT}/milestones/v1.0-phases/01-identity-persistence-foundation/01-CONTEXT.md`, isRepoFile: false, decisions: 11, notes: 0, open: 0, amendments: 0 },
  { label: 'SP v1.0/02', path: `${SP_ROOT}/milestones/v1.0-phases/02-storage-health-status/02-CONTEXT.md`, isRepoFile: false, decisions: 24, notes: 1, open: 0, amendments: 0 },
  { label: 'SP v1.0/03', path: `${SP_ROOT}/milestones/v1.0-phases/03-file-browsing/03-CONTEXT.md`, isRepoFile: false, decisions: 16, notes: 0, open: 0, amendments: 0 },
  { label: 'SP v1.0/04', path: `${SP_ROOT}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-CONTEXT.md`, isRepoFile: false, decisions: 26, notes: 0, open: 0, amendments: 0 },
  { label: 'SP 01', path: `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-CONTEXT.md`, isRepoFile: false, decisions: 19, notes: 0, open: 3, amendments: 0 },
  { label: 'SP 02', path: `${SP_ROOT}/phases/02-roles-permission-enforcement/02-CONTEXT.md`, isRepoFile: false, decisions: 21, notes: 0, open: 0, amendments: 1 },
  { label: 'SP 03', path: `${SP_ROOT}/phases/03-account-administration-session-control/03-CONTEXT.md`, isRepoFile: false, decisions: 16, notes: 0, open: 0, amendments: 1 },
  { label: 'SP 04', path: `${SP_ROOT}/phases/04-bulk-archive-downloads/04-CONTEXT.md`, isRepoFile: false, decisions: 14, notes: 0, open: 3, amendments: 1 },
  { label: 'SP quick 2pr', path: `${SP_ROOT}/quick/260803-2pr-we-should-implement-right-click-context-/260803-2pr-CONTEXT.md`, isRepoFile: false, decisions: 9, notes: 10, open: 0, amendments: 0 },
  { label: 'LB v1.0/01', path: '.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-CONTEXT.md', isRepoFile: true, decisions: 16, notes: 0, open: 0, amendments: 0 },
  { label: 'LB v1.0/02', path: '.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-CONTEXT.md', isRepoFile: true, decisions: 17, notes: 0, open: 0, amendments: 0 },
  { label: 'LB v1.0/03', path: '.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-CONTEXT.md', isRepoFile: true, decisions: 16, notes: 0, open: 0, amendments: 0 },
  { label: 'LB v1.0/04', path: '.planning/milestones/v1.0-phases/04-portability-degradation-hardening/04-CONTEXT.md', isRepoFile: true, decisions: 17, notes: 0, open: 0, amendments: 0 },
  { label: 'LB v1.1/05', path: '.planning/milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md', isRepoFile: true, decisions: 15, notes: 0, open: 0, amendments: 0 },
  { label: 'lfi', path: '.planning/milestones/v1.1-quick/260912-lfi-scroll-to-blocker-in-project-state-from-/260912-lfi-CONTEXT.md', isRepoFile: true, decisions: 6, notes: 0, open: 0, amendments: 0 },
  { label: 'oae', path: '.planning/milestones/v1.1-quick/260912-oae-revamp-progress-panel-to-show-phase-and-/260912-oae-CONTEXT.md', isRepoFile: true, decisions: 9, notes: 0, open: 0, amendments: 0 },
  { label: 'o2o', path: '.planning/milestones/v1.1-quick/260916-o2o-remove-all-the-loading-state-text-keep-t/260916-o2o-CONTEXT.md', isRepoFile: true, decisions: 6, notes: 0, open: 0, amendments: 0 },
  { label: 'ns4', path: '.planning/milestones/v1.1-quick/260917-ns4-redesign-the-traceability-page-s-ui-ux-c/260917-ns4-CONTEXT.md', isRepoFile: true, decisions: 3, notes: 0, open: 0, amendments: 0 },
  { label: 'jxp', path: '.planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/260923-jxp-CONTEXT.md', isRepoFile: true, decisions: 15, notes: 0, open: 0, amendments: 0 },
];

async function loadBody(testCase: CorpusCase): Promise<string> {
  return testCase.isRepoFile ? await repoBody(testCase.path) : await readFile(testCase.path, 'utf8');
}

/** CONTEXT.md carries no YAML frontmatter (context.ts's own module comment) — the raw file
 * content IS the body `extractContextBrief` reads, the same string `ContextHandler.parse` hands
 * it via `fm.body` after `tryParseFrontmatter` finds nothing to strip. */
function briefOf(rawContent: string): ContextBrief {
  return extractContextBrief(rawContent);
}

describe('CONTEXT brief corpus guard (19 files)', () => {
  for (const testCase of CASES) {
    const runner = testCase.isRepoFile ? it : it.runIf(existsSync(testCase.path));

    runner(`${testCase.label}: composeContextBrief is non-null`, async () => {
      const body = await loadBody(testCase);
      const brief = briefOf(body);
      const composed = composeContextBrief({
        kind: 'context',
        frontmatter: {},
        structured: { brief },
        groups: [],
        planSegments: [],
      });
      expect(composed).not.toBeNull();
    });

    runner(`${testCase.label}: pinned decision/note/open/amendments counts`, async () => {
      const body = await loadBody(testCase);
      const brief = briefOf(body);
      const decisionCount = brief.areas.reduce(
        (sum, a) => sum + a.entries.filter((e) => e.kind === 'decision').length,
        0,
      );
      const noteCount = brief.areas.reduce((sum, a) => sum + a.entries.filter((e) => e.kind === 'note').length, 0);
      const openCount = brief.openQuestions.reduce((sum, s) => sum + s.items.length, 0);
      expect(decisionCount, `${testCase.label} decision count`).toBe(testCase.decisions);
      expect(noteCount, `${testCase.label} note count`).toBe(testCase.notes);
      expect(openCount, `${testCase.label} open count`).toBe(testCase.open);
      expect(brief.amendments.length, `${testCase.label} amendments count`).toBe(testCase.amendments);
    });

    runner(`${testCase.label}: nothing dropped (word-coverage guard)`, async () => {
      const body = await loadBody(testCase);
      const brief = briefOf(body);

      // Collect every 4+ letter word from the boundary/decisions/open-questions/specifics/deferred
      // source sections (stripped of markdown punctuation), then assert each appears somewhere in
      // the brief's own concatenated strings.
      const sourceWords = new Set<string>();
      collectSourceSections(body).forEach((section) => collect(section, sourceWords));

      const briefText = concatenateBriefStrings(brief);
      const briefWords = new Set<string>();
      collect(briefText, briefWords);

      const missing = [...sourceWords].filter((w) => !briefWords.has(w));
      // A handful of structural/markdown-syntax words unavoidably live only in raw source
      // (heading labels already accounted for via recognizedHeadings, table pipes, etc.) — the
      // guard's job is catching wholesale-dropped prose, not exact-set equality, so a small
      // allowance keeps this from being a brittle byte-count match while still catching real loss.
      expect(missing.length, `${testCase.label} missing words: ${missing.slice(0, 40).join(', ')}`).toBeLessThan(
        Math.max(5, Math.ceil(sourceWords.size * 0.03)),
      );
    });

    runner(`${testCase.label}: aside prose not dropped`, async () => {
      const body = await loadBody(testCase);
      const brief = briefOf(body);

      // Every 4+ letter word from the canonical-references / existing-code-insights sections, plus
      // every amendments section's own body (quick-260925-3ob) — the brief now claims these
      // instead of deferring them to Source, so they get the same word-coverage guard.
      const amendmentsHeadings = new Set(brief.amendments.map((a) => a.heading));
      const sourceWords = new Set<string>();
      for (const section of topSections(body)) {
        if (
          /^canonical references/i.test(section.heading) ||
          /^existing code insights/i.test(section.heading) ||
          amendmentsHeadings.has(section.heading)
        ) {
          collect(section.body, sourceWords);
        }
      }

      const asideWords = new Set<string>();
      collect(concatenateAsideStrings(brief), asideWords);

      const missing = [...sourceWords].filter((w) => !asideWords.has(w));
      expect(missing.length, `${testCase.label} missing aside words: ${missing.slice(0, 40).join(', ')}`).toBeLessThan(
        Math.max(5, Math.ceil(sourceWords.size * 0.03)),
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Word-coverage helpers
// ---------------------------------------------------------------------------

/** Every 4+ letter word in `text` (stripped of markdown punctuation), lowercased, into `into`. */
function collect(text: string, into: Set<string>): void {
  const stripped = text.replace(/[`*_#|<>[\]()]/g, ' ');
  for (const match of stripped.matchAll(/[A-Za-z]{4,}/g)) {
    into.add(match[0].toLowerCase());
  }
}

function collectSourceSections(body: string): string[] {
  // Re-derive the same five source-section bodies the brief draws from — domain/decisions/
  // open_questions/specifics/deferred — via the shared line-scanning primitives, so this guard
  // reads the same regions the extractor does (never the whole document, which would also count
  // canonical-refs/code-insights/amendments prose — those are covered by the separate "aside prose
  // not dropped" guard below, since the brief now surfaces them as back-matter rows instead of
  // deferring them to Source).
  const out: string[] = [];
  for (const section of topSections(body)) {
    if (/^(phase|task) boundary/i.test(section.heading) || /^implementation decisions/i.test(section.heading)) {
      out.push(section.body);
    }
    if (/^specific ideas/i.test(section.heading) || /^deferred ideas/i.test(section.heading)) {
      out.push(section.body);
    }
    if (/^open questions?\b/i.test(section.heading)) out.push(section.body);
  }
  // Tag-wrapped domain/decisions/specifics/deferred content is already covered by the heading
  // scan above (every corpus file's `##` heading sits inside the matching tag) — the tag lines
  // themselves carry no prose.
  return out;
}

function concatenateBriefStrings(brief: ContextBrief): string {
  const parts: string[] = [];
  const pushBlocks = (blocks: { kind: string; text?: string; items?: string[]; rows?: Record<string, string>[] }[]): void => {
    for (const block of blocks) {
      if (block.kind === 'paragraph' || block.kind === 'code') parts.push(block.text ?? '');
      if (block.kind === 'list') parts.push((block.items ?? []).join(' '));
      if (block.kind === 'table') parts.push((block.rows ?? []).map((r) => Object.values(r).join(' ')).join(' '));
    }
  };
  if (brief.boundary) {
    parts.push(brief.boundary.statement ?? '', brief.boundary.statementRest, brief.boundary.outSource ?? '');
    parts.push(...brief.boundary.inList);
    parts.push(...brief.boundary.outList.map((i) => `${i.text} ${i.dest ?? ''}`));
    pushBlocks(brief.boundary.blocks);
    for (const note of brief.boundary.notes) {
      parts.push(note.title ?? '');
      pushBlocks(note.blocks);
    }
    for (const extra of brief.boundary.extras) {
      parts.push(extra.title ?? '');
      pushBlocks(extra.blocks);
    }
  }
  pushBlocks(brief.decisionsPreamble);
  for (const area of brief.areas) {
    parts.push(area.title);
    for (const entry of area.entries) {
      if (entry.kind === 'note') parts.push(entry.text);
      else {
        parts.push(entry.summary, entry.detail, entry.reversibility?.text ?? '');
      }
    }
  }
  for (const source of brief.openQuestions) {
    parts.push(source.heading);
    pushBlocks(source.lead);
    for (const item of source.items) parts.push(item.summary, item.detail);
  }
  if (brief.discretion) {
    pushBlocks(brief.discretion.lead);
    parts.push(...brief.discretion.items);
    pushBlocks(brief.discretion.trailer);
  }
  for (const item of [...brief.specifics, ...brief.deferred]) {
    parts.push(item.title ?? '', item.body);
  }
  return parts.join(' ');
}

/** Every aside's group titles plus paragraph/code text, list items and table cell values, across
 * amendments, references and codeInsights (quick-260925-3ob) — the same block-flattening shape
 * `concatenateBriefStrings` uses, applied to the three back-matter aside arrays instead. */
function concatenateAsideStrings(brief: ContextBrief): string {
  const parts: string[] = [];
  const pushBlocks = (blocks: { kind: string; text?: string; items?: string[]; rows?: Record<string, string>[] }[]): void => {
    for (const block of blocks) {
      if (block.kind === 'paragraph' || block.kind === 'code') parts.push(block.text ?? '');
      if (block.kind === 'list') parts.push((block.items ?? []).join(' '));
      if (block.kind === 'table') parts.push((block.rows ?? []).map((r) => Object.values(r).join(' ')).join(' '));
    }
  };
  for (const aside of [...brief.amendments, ...brief.references, ...brief.codeInsights]) {
    for (const group of aside.groups) {
      parts.push(group.title ?? '');
      pushBlocks(group.blocks);
    }
  }
  return parts.join(' ');
}
