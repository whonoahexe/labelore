// quick-260923-lju: extractContextBrief / firstSentence / parseBlocks, against the plan's pinned
// examples plus the T-lju-02 ReDoS timing guard. Uses the real SP phases/01 and LB v1.1/05 CONTEXT
// bodies (read from disk) as the primary fixtures — the same files the corpus guard (Task 2) pins.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { extractContextBrief, firstSentence, parseBlocks } from '../src/planning-repo/handlers/context-brief.ts';

const REPO_ROOT = new URL('../', import.meta.url);
const SP_ROOT = '/home/cinedise/studio-portal/.planning';

async function repoBody(relativePath: string): Promise<string> {
  return await readFile(new URL(relativePath, REPO_ROOT), 'utf8');
}

const SP01_PATH = `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-CONTEXT.md`;
const LB05_PATH = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md';

describe('extractContextBrief — SP phases/01 boundary', () => {
  it.runIf(existsSync(SP01_PATH))('parses statement, inList, outList and drift', async () => {
    const body = await readFile(SP01_PATH, 'utf8');
    const brief = extractContextBrief(body);
    expect(brief.boundary?.statement).toBe(
      'Members sign in to the portal with a username and password the portal itself holds, and stay signed in across backend restarts and power cuts.',
    );
    expect(brief.boundary?.inList).toHaveLength(9);
    expect(brief.boundary?.inList[0]).toBe('`users` and `sessions` tables');
    expect(brief.boundary?.inList[8]).toBe('removal of the Access policy');
    expect(brief.boundary?.outList).toHaveLength(4);
    expect(brief.boundary?.outList[0]).toEqual({
      text: 'Roles, permissions, or any per-tier gating',
      dest: 'Phase 2',
    });
    expect(brief.boundary?.outList[2].dest).toBe('Phase 3 (ADMIN-03)');
    expect(brief.boundary?.drift).toBe(true);
  });

  it.runIf(existsSync(SP01_PATH))('parses decision bullets, reversibility and untagged decisions in source order', async () => {
    const body = await readFile(SP01_PATH, 'utf8');
    const brief = extractContextBrief(body);
    const decisions = brief.areas.flatMap((a) => a.entries).filter((e) => e.kind === 'decision');
    expect(decisions).toHaveLength(19);
    const d04 = decisions.find((d) => d.kind === 'decision' && d.tag === 'D-04');
    expect(d04?.kind).toBe('decision');
    if (d04?.kind === 'decision') {
      expect(d04.reversibility?.word).toBe('reversible');
      expect(d04.reversibility?.text).toContain('Phase 3 extends this rather than undoing it');
      expect(d04.detail).not.toContain('Reversibility');
    }
  });

  it.runIf(existsSync(SP01_PATH))('parses open questions with blocks tags', async () => {
    const body = await readFile(SP01_PATH, 'utf8');
    const brief = extractContextBrief(body);
    expect(brief.openQuestions).toHaveLength(1);
    const items = brief.openQuestions[0].items;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ tag: 'OPEN-01', blocks: ['D-09'] });
    expect(items[1]).toMatchObject({ tag: 'OPEN-02', blocks: ['D-17'] });
    expect(items[2]).toMatchObject({ tag: 'OPEN-03', blocks: [] });
  });

  it.runIf(existsSync(SP01_PATH))('parses a single colon-list discretion paragraph into 5 items', async () => {
    const body = await readFile(SP01_PATH, 'utf8');
    const brief = extractContextBrief(body);
    expect(brief.discretion?.items).toHaveLength(5);
    expect(brief.discretion?.lead).toHaveLength(1);
  });
});

describe('extractContextBrief — LB v1.1/05 prose boundary', () => {
  it('splits a multi-clause "This phase does not…" paragraph into 4 verbatim items', async () => {
    const body = await repoBody(LB05_PATH);
    const brief = extractContextBrief(body);
    expect(brief.boundary?.outFromProse).toBe(true);
    expect(brief.boundary?.outList.map((i) => i.text)).toEqual([
      'add a purpose/category taxonomy (rejected 2026-09-20)',
      'adopt `gsd-tools query`',
      'rewrite the dashboard, roadmap, traceability or search pages — they are the reference this conforms to',
      'add plan-vs-outcome deviation pairing (READ-08), backlinks (BACK-01), faceted search (FIND-06) or file watching (PLAT-01)',
    ]);
    expect(brief.boundary?.outSource).toContain('This phase does not add a purpose/category taxonomy');
  });

  it('keeps a single-sentence multi-item "does not" paragraph as ONE item when it has under 2 boundaries', async () => {
    const [items] = [
      extractContextBrief(
        '# Phase 2: X - Context\n\n<domain>\n## Phase Boundary\n\nThis phase does not add search, ranking, or a rich dependency-graph canvas. Those remain later or future capabilities.\n\n</domain>\n',
      ).boundary!.outList,
    ];
    expect(items).toHaveLength(1);
  });
});

describe('firstSentence', () => {
  it('never ends inside a code span', () => {
    const [head, rest] = firstSentence('See `a.b.c` for details. More text.');
    expect(head).toBe('See `a.b.c` for details.');
    expect(rest).toBe('More text.');
  });

  it('skips e.g./i.e./etc./vs./cf. abbreviations', () => {
    const [head] = firstSentence('It uses tools, e.g. hammers and saws, before finishing.');
    expect(head).toBe('It uses tools, e.g. hammers and saws, before finishing.');
  });

  it('ends right after a closing ** when inside an odd bold count', () => {
    const [head, rest] = firstSentence('This is **bold text.** More here.');
    expect(head).toBe('This is **bold text.**');
    expect(rest).toBe('More here.');
  });

  it('returns the whole text with an empty remainder when no boundary is found', () => {
    const [head, rest] = firstSentence('No terminal punctuation here');
    expect(head).toBe('No terminal punctuation here');
    expect(rest).toBe('');
  });
});

describe('T-lju-02: ReDoS timing guard', () => {
  it('finishes a 200,000-character pathological boundary line under 250ms and never throws', () => {
    const pathological = '**'.repeat(2000) + '`'.repeat(2000) + ', does not'.repeat(2000) + '('.repeat(2000);
    const body = `# Phase 1: X - Context\n\n<domain>\n## Phase Boundary\n\n${pathological}\n\n</domain>\n`;
    const start = Date.now();
    expect(() => extractContextBrief(body)).not.toThrow();
    expect(Date.now() - start).toBeLessThan(250);
  });
});

describe('parseBlocks', () => {
  it('splits a paragraph, a list and a table into distinct blocks', () => {
    const blocks = parseBlocks('A paragraph.\n\n- item one\n- item two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'list', 'table']);
  });

  it('falls back to a paragraph for a malformed pipe run (no valid separator row)', () => {
    const blocks = parseBlocks('| A | B |\n| C | D |\n');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('paragraph');
  });
});
