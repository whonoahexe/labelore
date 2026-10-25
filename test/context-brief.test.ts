// quick-260923-lju: extractContextBrief / firstSentence / parseBlocks, against the plan's pinned
// examples plus the T-lju-02 ReDoS growth guard. Reads the made-up Lendshed CONTEXT files (through
// fxPath, which throws on a missing file) and Labelore's own archived v1.1/05 CONTEXT as the primary
// fixtures: the same files the corpus guard (test/web/context-brief-corpus.test.ts) pins. Every pinned
// number below was counted in the Lendshed file itself (grep/awk), never copied from the extractor.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import {
  classifyDeferred,
  classifySpecific,
  extractContextBrief,
  firstSentence,
  parseBlocks,
  revisitTrigger,
  splitIdeaLead,
} from '../src/planning-repo/handlers/context-brief.ts';

const REPO_ROOT = new URL('../', import.meta.url);

async function repoBody(relativePath: string): Promise<string> {
  return await readFile(new URL(relativePath, REPO_ROOT), 'utf8');
}

/** The text of a Lendshed CONTEXT file, read through fxPath (a missing file throws, never skips). */
async function fxBody(relativeToPlanning: string): Promise<string> {
  return await readFile(fxPath(relativeToPlanning), 'utf8');
}

const FX01 = 'phases/01-member-sign-in-sessions/01-CONTEXT.md';
const FX02 = 'phases/02-roles-and-permissions/02-CONTEXT.md';
const FX03 = 'phases/03-account-admin-and-sessions/03-CONTEXT.md';
const FX04 = 'phases/04-bulk-loan-export/04-CONTEXT.md';
const LB05_PATH = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md';

describe('extractContextBrief — Lendshed phases/01 boundary', () => {
  it('parses statement, inList, outList and drift (Lendshed fixture)', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    expect(brief.boundary?.statement).toBe(
      'Members sign in to Lendshed with a username and password Lendshed itself holds, and stay signed in across server restarts and power cuts.',
    );
    expect(brief.boundary?.inList).toHaveLength(9);
    expect(brief.boundary?.inList[0]).toBe('`members` and `sessions` tables');
    expect(brief.boundary?.inList[8]).toBe('removal of the kiosk passcode');
    expect(brief.boundary?.outList).toHaveLength(4);
    expect(brief.boundary?.outList[0]).toEqual({
      text: 'Steward roles, permissions, or any per-shed gating',
      dest: 'Phase 2',
    });
    expect(brief.boundary?.outList[2].dest).toBe('Phase 3 (ADMN-03)');
    expect(brief.boundary?.drift).toBe(true);
  });

  it('parses decision bullets, reversibility and untagged decisions in source order', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    const decisions = brief.areas.flatMap((a) => a.entries).filter((e) => e.kind === 'decision');
    // 19: D-01..D-19, counted with grep on the decision bullets between the decisions tags.
    expect(decisions).toHaveLength(19);
    const d04 = decisions.find((d) => d.kind === 'decision' && d.tag === 'D-04');
    expect(d04?.kind).toBe('decision');
    if (d04?.kind === 'decision') {
      expect(d04.reversibility?.word).toBe('reversible');
      expect(d04.reversibility?.text).toContain('Phase 3 extends this rather than undoing it');
      expect(d04.detail).not.toContain('Reversibility');
    }
  });

  it('parses open questions with blocks tags', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    expect(brief.openQuestions).toHaveLength(1);
    const items = brief.openQuestions[0].items;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ tag: 'OPEN-01', blocks: ['D-09'] });
    expect(items[1]).toMatchObject({ tag: 'OPEN-02', blocks: ['D-17'] });
    expect(items[2]).toMatchObject({ tag: 'OPEN-03', blocks: [] });
  });

  it('parses a single colon-list discretion paragraph into 5 items', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    expect(brief.discretion?.items).toHaveLength(5);
    expect(brief.discretion?.lead).toHaveLength(1);
  });
});

describe('extractContextBrief — Labelore v1.1/05 prose boundary', () => {
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

describe('T-lju-02: ReDoS growth guard', () => {
  // A fixed millisecond budget flakes under parallel load and proves nothing about the shape of the cost
  // (Pitfall 11). Each hostile shape is timed at size n and at 8n with measureGrowth: a linear scanner
  // reads about 8, a quadratic one about 64, and GROWTH_LIMIT sits between them. Inputs are built in
  // make(), outside the timed region.
  const sentinel = (build: (size: number) => string, size: number): void => {
    expect(() => extractContextBrief(build(size))).not.toThrow();
  };

  const boundaryBody = (size: number): string => {
    // '**' + '`' + ', does not' + '(' repeated: unterminated bold, code and paren leads in one line.
    const k = Math.max(1, Math.floor(size / 14));
    const pathological = '**'.repeat(k) + '`'.repeat(k) + ', does not'.repeat(k) + '('.repeat(k);
    return `# Phase 1: X - Context\n\n<domain>\n## Phase Boundary\n\n${pathological}\n\n</domain>\n`;
  };

  // Every scanner the ideas path adds, fed its own worst case at once: unterminated bold leads, `if ` for
  // revisitTrigger, `Phase 1 ` for the destination scan, `D-01` for the from scan, and unbalanced `(` for
  // topLevelCutoff's depth tracking.
  const ideasBody = (size: number): string => {
    const k = Math.max(1, Math.floor(size / 16));
    const item = '**' + 'if '.repeat(k) + 'Phase 1 '.repeat(k) + 'D-01'.repeat(k) + '('.repeat(k);
    return (
      '# Phase 1: X - Context\n\n<specifics>\n## Specific Ideas\n\n' +
      item +
      '\n\n</specifics>\n\n<deferred>\n## Deferred Ideas\n\n' +
      item +
      '\n\n</deferred>\n'
    );
  };

  it('grows no faster than linearly on a 200,000-character pathological boundary line and never throws', () => {
    sentinel(boundaryBody, 200_000);
    const growth = measureGrowth({ make: boundaryBody, run: (body) => void extractContextBrief(body) });
    expect(
      growth.ratio,
      `boundary line: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });

  it('grows no faster than linearly on a ~200,000-character pathological ideas section and never throws', () => {
    sentinel(ideasBody, 200_000);
    const growth = measureGrowth({ make: ideasBody, run: (body) => void extractContextBrief(body) });
    expect(
      growth.ratio,
      `ideas section: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
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

  it('records the fence language on a tagged code block and omits it on a bare fence', () => {
    expect(parseBlocks('```ts\nconst a = 1;\n```\n')).toEqual([{ kind: 'code', text: 'const a = 1;', lang: 'ts' }]);
    expect(parseBlocks('```Text\nplain\n```\n')).toEqual([{ kind: 'code', text: 'plain', lang: 'text' }]);
    const bare = parseBlocks('```\nplain\n```\n');
    expect(bare).toEqual([{ kind: 'code', text: 'plain' }]);
    expect('lang' in bare[0]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// quick-260925-3ob Task 2: canonical references / existing code insights
// ---------------------------------------------------------------------------

const REFS_AND_CODE_DOC = `# Phase 1: Test - Context

<domain>
## Phase Boundary

A statement.

</domain>

<canonical_refs>
## Canonical References

**Read these first.**

### G1
- \`path/one.ts\` — note one

### G2
- \`path/two.ts\` — note two

</canonical_refs>

<code_context>
## Existing Code Insights

### H1
- Item one

### H2
- Item two

---

### H3
- Item three

</code_context>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision.

</decisions>
`;

const NONE_OF_THE_THREE_DOC = `# Phase 1: Test - Context

<domain>
## Phase Boundary

A statement.

</domain>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision.

</decisions>
`;

describe('extractContextBrief — canonical references and existing code insights', () => {
  it('groups canonical_refs by ### heading (untitled lead first) and code_context the same way, dropping bare "---" lines', () => {
    const brief = extractContextBrief(REFS_AND_CODE_DOC);
    expect(brief.references).toHaveLength(1);
    expect(brief.references[0].groups.map((g) => g.title)).toEqual([null, 'G1', 'G2']);
    expect(brief.codeInsights).toHaveLength(1);
    expect(brief.codeInsights[0].groups.map((g) => g.title)).toEqual(['H1', 'H2', 'H3']);

    const allBlocks = [...brief.references[0].groups, ...brief.codeInsights[0].groups].flatMap((g) => g.blocks);
    expect(allBlocks.some((b) => b.kind === 'paragraph' && b.text.trim() === '---')).toBe(false);
  });

  it('gives amendments/references/codeInsights all [] and never throws when none of the three sections are present', () => {
    expect(() => extractContextBrief(NONE_OF_THE_THREE_DOC)).not.toThrow();
    const brief = extractContextBrief(NONE_OF_THE_THREE_DOC);
    expect(brief.amendments).toEqual([]);
    expect(brief.resolved).toEqual([]);
    expect(brief.references).toEqual([]);
    expect(brief.codeInsights).toEqual([]);
  });

  it('Lendshed 02: pinned amendments/references/codeInsights shape', async () => {
    const body = await fxBody(FX02);
    const brief = extractContextBrief(body);

    expect(brief.amendments).toHaveLength(1);
    expect(brief.amendments[0].heading).toMatch(/Requirement amendments/);
    expect(brief.amendments[0].groups).toHaveLength(1);
    expect(brief.amendments[0].groups[0].title).toBeNull();
    const tableBlock = brief.amendments[0].groups[0].blocks.find((b) => b.kind === 'table');
    expect(tableBlock?.kind).toBe('table');
    // 6: the table in the amendments section has six body rows (ROLE-01, ROLE-02, ROLE-05, two PROJECT.md
    // lines and the ROADMAP.md line).
    if (tableBlock?.kind === 'table') expect(tableBlock.rows).toHaveLength(6);

    expect(brief.references).toHaveLength(1);
    expect(brief.references[0].groups.map((g) => g.title)).toEqual([
      null,
      'Milestone-level context',
      'Research that bears on this phase',
      'Phase 1 output — read before touching the sign-in seam',
      'Code this phase modifies or depends on',
      'v1.0 precedent worth reading before deciding shape',
    ]);

    expect(brief.codeInsights).toHaveLength(1);
    expect(brief.codeInsights[0].groups.map((g) => g.title)).toEqual([
      'Reusable Assets',
      'Established Patterns',
      'Integration Points',
      'Constraints this design imposes',
    ]);
  });

  it('Lendshed 03: <blocking_amendments> recognised by tag, not by heading text', async () => {
    const body = await fxBody(FX03);
    const brief = extractContextBrief(body);
    expect(brief.amendments).toHaveLength(1);
    expect(brief.amendments[0].heading).not.toMatch(/requirement amendments/i);
  });

  it('Lendshed 03: <resolved_open_question> becomes a resolved aside, not an extra', async () => {
    const body = await fxBody(FX03);
    const brief = extractContextBrief(body);
    expect(brief.resolved).toHaveLength(1);
    expect(brief.resolved[0].heading).toMatch(/already answered/);
    expect(brief.recognizedHeadings).toContain(brief.resolved[0].heading);
    expect(brief.openQuestions.some((q) => /already answered/.test(q.heading))).toBe(false);
  });

  it('recognises a settled question by heading alone, with no tag', () => {
    const doc = '## Phase Boundary\n\nScope.\n\n## ✅ Resolved open question: audit actor shape\n\nRaw TEXT, no FK.\n';
    expect(extractContextBrief(doc).resolved.map((a) => a.heading)).toEqual(['✅ Resolved open question: audit actor shape']);
  });

  it('Lendshed 04: <blocking_amendments> recognised by tag, not by heading text', async () => {
    const body = await fxBody(FX04);
    const brief = extractContextBrief(body);
    expect(brief.amendments).toHaveLength(1);
    expect(brief.amendments[0].heading).not.toMatch(/requirement amendments/i);
    // The decided-beforehand table sits in the boundary as a collapsed aside, not in amendments.
    expect(brief.boundary?.notes).toHaveLength(1);
    expect(brief.boundary?.notes[0].title).toBe('Already decided — do not re-open, do not re-research');
    const table = brief.boundary?.notes[0].blocks[0];
    expect(table?.kind).toBe('table');
    if (table?.kind === 'table') expect(table.rows).toHaveLength(9);
    expect(brief.boundary?.outList).toHaveLength(1);
    expect(brief.boundary?.extras).toHaveLength(0);
    expect(brief.openQuestions[0].items).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// quick-260925-3ug Task 1: ideas — specifics (sketch 007 C)
// ---------------------------------------------------------------------------

describe('ideas — specifics (sketch 007 C)', () => {
  describe('splitIdeaLead', () => {
    it('splits a lead ending in its own period, inside the bold span', () => {
      const { title, body } = splitIdeaLead(
        '**The CLI must be called `shedkeys`.** The user rejected the proposed `lendshed-admin` name outright and specified `shedkeys`.',
      );
      expect(title).toBe('The CLI must be called `shedkeys`.');
      expect(body).toBe(
        'The user rejected the proposed `lendshed-admin` name outright and specified `shedkeys`.',
      );
    });

    it('joins a short first sentence of the tail onto the title with no inserted space', () => {
      const { title, body } = splitIdeaLead(
        '**UI work must use the `lendshed` token set**, strictly. This held across all four v1.0 phases without drift.',
      );
      expect(title).toBe('UI work must use the `lendshed` token set, strictly.');
      expect(body).toBe('This held across all four v1.0 phases without drift.');
    });

    it('consumes an em-dash separator directly after the bold, and the colon/period separators produce the same split', () => {
      const dash = splitIdeaLead('**Live-socket teardown on sign-out** — server-side closing of an already-open socket.');
      expect(dash).toEqual({ title: 'Live-socket teardown on sign-out', body: 'server-side closing of an already-open socket.' });

      const colon = splitIdeaLead('**Live-socket teardown on sign-out**: server-side closing of an already-open socket.');
      expect(colon).toEqual(dash);

      const period = splitIdeaLead('**Live-socket teardown on sign-out**. server-side closing of an already-open socket.');
      expect(period).toEqual(dash);
    });

    it('lifts a leading parenthetical into the body only when a separator follows it', () => {
      const { title, body } = splitIdeaLead(
        "**What the `sessions` table stores for Phase 3's ADMN-05 to read** (device / user-agent, IP, login time) — offered and passed over.",
      );
      expect(title).toBe("What the `sessions` table stores for Phase 3's ADMN-05 to read");
      expect(body).toBe('device / user-agent, IP, login time — offered and passed over.');
    });

    it('gives title null for text with no leading bold, and for an unclosed bold span', () => {
      expect(splitIdeaLead('The user consistently chose the tighter, more explicit option.')).toEqual({
        title: null,
        body: 'The user consistently chose the tighter, more explicit option.',
      });
      expect(splitIdeaLead('**abc')).toEqual({ title: null, body: '**abc' });
    });
  });

  describe('classifySpecific', () => {
    it('classifies must/strictly/verbatim language as rule', () => {
      expect(classifySpecific('The CLI must be called `shedkeys`.', 'Use it verbatim.')).toBe('rule');
      expect(classifySpecific(null, 'This is a standing project rule, not a per-phase preference.')).toBe('rule');
    });

    it('classifies a recorded preference/tendency as leaning', () => {
      expect(
        classifySpecific(null, 'The user consistently chose the tighter, more explicit option when a tradeoff was presented.'),
      ).toBe('leaning');
    });

    it('classifies plain prose with no signal as note', () => {
      expect(classifySpecific(null, 'Just some text.')).toBe('note');
    });

    it('checks the title before the body, and leaning before rule', () => {
      // A leaning-flavoured title must not fall through to a rule match found only in the body.
      expect(
        classifySpecific(
          'The user consistently chose the smaller surface over the stricter one — except where lockout is at stake.',
          'This must never be read as a rule.',
        ),
      ).toBe('leaning');
    });
  });

  it('Lendshed 01: kinds rule/leaning, with pinned titles and body prefixes', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    // 2: the specifics section holds two bullets (the `shedkeys` name and the recorded preference).
    expect(brief.specifics).toHaveLength(2);
    expect(brief.specifics.map((s) => s.kind)).toEqual(['rule', 'leaning']);
    expect(brief.specifics[0].title).toBe('The CLI must be called `shedkeys`.');
    expect(brief.specifics[0].body.startsWith('The user rejected the proposed')).toBe(true);
    expect(brief.specifics[1].title).toBeNull();
    expect(brief.specifics[1].body.startsWith('The user consistently chose the tighter')).toBe(true);
  });

  it('Lendshed 03: kinds leaning/note/rule/rule/rule, with pinned titles and body prefixes', async () => {
    const body = await fxBody(FX03);
    const brief = extractContextBrief(body);
    // 5: the specifics section holds five bullets.
    expect(brief.specifics).toHaveLength(5);
    expect(brief.specifics.map((s) => s.kind)).toEqual(['leaning', 'note', 'rule', 'rule', 'rule']);
    expect(brief.specifics[0].title).toBe(
      'The steward lead leaned toward the lighter option every time, except where a lockout was possible.',
    );
    expect(brief.specifics[0].body.startsWith("This phase repeats Phase 2's recorded through-line")).toBe(true);
    expect(brief.specifics[3].title).toBe('UI work must use the Lendshed design tokens, strictly.');
    expect(brief.specifics[3].body.startsWith('Standing project rule')).toBe(true);
  });
});

describe('ideas — deferred (sketch 007 C)', () => {
  describe('revisitTrigger', () => {
    it('takes the text after the first `if`, cut at the first top-level separator', () => {
      expect(revisitTrigger('Revisit if X ever happens; note Y')).toBe('X ever happens');
    });

    it('ignores an `if` preceded by `as` or `even`', () => {
      expect(revisitTrigger('Treated as if it were a rule all along')).toBeNull();
      expect(revisitTrigger('Kept even if the cost rises later on')).toBeNull();
    });

    it('ignores an `if` inside a code span', () => {
      expect(revisitTrigger('The `if (x) return` branch stays as written.')).toBeNull();
    });

    it('returns null for a trigger under 3 words', () => {
      expect(revisitTrigger('if so')).toBeNull();
    });

    it('never reads the title — only the body', () => {
      expect(classifyDeferred('Revisit if the cost rises', 'A plain body.', null).revisit).toBeNull();
    });
  });

  describe('classifyDeferred', () => {
    it('reads carried before every other signal, with the phase it came from', () => {
      const got = classifyDeferred('A split', 'carried forward from Phase 2, declined as D-04.', '3');
      expect(got.fate).toBe('carried');
      expect(got.from).toBe('Phase 2');
    });

    it('reads out-of-scope as `out`, sourced to the all-caps markdown file', () => {
      const got = classifyDeferred(null, 'Already out of scope by REQUIREMENTS.md, restated here.', '3');
      expect(got.fate).toBe('out');
      expect(got.from).toBe('REQUIREMENTS.md');
    });

    it("reads a decision's declined options as `declined`", () => {
      expect(classifyDeferred(null, "D-06's third option, not taken.", '3').fate).toBe('declined');
      expect(classifyDeferred(null, "D-04's middle option.", '3').fate).toBe('declined');
    });

    it('reads passed-over wording as `passed`', () => {
      expect(classifyDeferred(null, 'Offered and passed over.', '1').fate).toBe('passed');
      expect(classifyDeferred(null, 'Raised as a question, not pursued.', '1').fate).toBe('passed');
    });

    it('falls back to `handed` when only a destination is present, then to `other`', () => {
      expect(classifyDeferred(null, "Left to Phase 3's ADMN-03 work.", '1').fate).toBe('handed');
      const other = classifyDeferred(null, 'Something with no recognisable outcome at all.', '1');
      expect(other).toEqual({ fate: 'other', from: null, dest: null, revisit: null });
    });

    it('never treats a `from Phase N`, or a phase at or below its own, as a destination', () => {
      expect(classifyDeferred(null, 'Carried from Phase 2 and still open.', '3').dest).toBeNull();
      expect(classifyDeferred(null, "Left to Phase 1's own work.", '3').dest).toBeNull();
    });

    it('pairs the destination with the first REQ-ID in that same sentence, skipping WR-/OPEN-', () => {
      expect(classifyDeferred(null, "Handed to Phase 3's ADMN-03 work.", '1').dest).toBe('Phase 3 · ADMN-03');
      expect(classifyDeferred(null, 'Handed to Phase 3, see WR-02.', '1').dest).toBe('Phase 3');
    });
  });

  it('Lendshed 01: 3 deferred items, pinned fate/from/dest/revisit', async () => {
    const body = await fxBody(FX01);
    const brief = extractContextBrief(body);
    // 3: the deferred section holds three bullets; fate, from and destination were read off each item's
    // own wording (a "left to Phase 3" hand-off, then two "offered and passed over" items).
    expect(brief.deferred.map((d) => [d.fate, d.from, d.dest, d.revisit])).toEqual([
      ['handed', 'D-04', 'Phase 3 · ADMN-03', null],
      ['passed', null, null, null],
      ['passed', 'D-01', 'Phase 3 · ADMN-05', null],
    ]);
    expect(brief.deferred[2].title).toBe("What the `sessions` table stores for Phase 3's ADMN-05 to read");
    expect(brief.deferred[2].body.startsWith('offered and passed over; D-01 commits to `last_seen` only')).toBe(true);
  });

  it('Lendshed 03: 8 declined, 1 out, 1 carried, with pinned revisit triggers', async () => {
    const body = await fxBody(FX03);
    const brief = extractContextBrief(body);
    // 10 items: eight options declined (from D-01, D-02, D-04, D-04, D-06, D-10, D-11, D-12), one already out
    // of scope by REQUIREMENTS.md, one carried from Phase 2; five of the declined carry an "if" trigger.
    expect(brief.deferred.map((d) => [d.fate, d.from, d.dest, d.revisit])).toEqual([
      ['declined', 'D-01', null, 'a weak steward-typed password ever causes a break-in'],
      ['declined', 'D-02', null, 'members keep asking to fix typos'],
      ['declined', 'D-04', null, null],
      ['declined', 'D-04', null, 'the silence in D-04 proves surprising'],
      ['declined', 'D-06', null, 'a departed member and a newcomer ever end up with the same handle'],
      ['declined', 'D-10', null, null],
      ['declined', 'D-11', null, 'the compound `target` format keeps breaking the renderer'],
      ['declined', 'D-12', null, null],
      ['out', 'REQUIREMENTS.md', null, null],
      ['carried', 'Phase 2', null, null],
    ]);
    // The last item's trailing parenthetical is lifted out of the title and into the body, following the
    // sketch's own stated rule.
    expect(brief.deferred[9].title).toBe('The `steward` bit split in two');
    expect(brief.deferred[9].body.startsWith('`edit_members` / `read_log` — carried over from Phase 2')).toBe(true);
  });
});
