import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import {
  extractDiscussionLog,
  extractReviewWarnings,
  parseDecisionEntries,
  projectSections,
  SECTION_PROJECTIONS,
} from '../src/planning-repo/handlers/section-projection.ts';

async function fixtureBody(): Promise<string> {
  const raw = await readFile(
    new URL('../.planning/milestones/v1.1-phases/05-per-type-document-views/05-DISCUSSION-LOG.md', import.meta.url),
    'utf8',
  );
  // The real fixture carries frontmatter-free markdown prose only (an audit-trail doc, not an
  // artifact with YAML frontmatter) — the whole file is the body `extractDiscussionLog` consumes.
  return raw;
}

async function readRepoFile(relativePath: string): Promise<string> {
  return await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

/** Slices the real Phase 5 CONTEXT.md's `<decisions>` tag body, mirroring context.ts's own
 * extractTag discipline — bounded, non-greedy, single tag name. */
function extractDecisionsTagBody(content: string): string | null {
  const m = content.match(/<decisions>([\s\S]*?)<\/decisions>/);
  return m ? m[1].trim() : null;
}

describe('extractDiscussionLog — real Phase 5 fixture (quick-260923-jxp: 15 questions, 4 topics)', () => {
  it('extracts all 15 questions across 4 topics (Claude\'s Discretion/Deferred Ideas hold no questions), each chosen question with exactly one chosen option', async () => {
    const body = await fixtureBody();
    const { questions, topics } = extractDiscussionLog(body);

    expect(questions).toHaveLength(15);
    expect(topics).toHaveLength(4);

    for (const question of questions) {
      if (question.resolution === 'chosen') {
        expect(question.chosenOption).toBeTruthy();
        expect(question.options.filter((option) => option.chosen)).toHaveLength(1);
      }
    }
  });

  it('does not list non-question sections ("Claude\'s Discretion", "Deferred Ideas") as topics at all', async () => {
    const body = await fixtureBody();
    const { topics } = extractDiscussionLog(body);
    const headings = topics.map((t) => t.heading);
    expect(headings).not.toContain("Claude's Discretion");
    expect(headings).not.toContain('Deferred Ideas');
  });

  it('captures the tolerant userChoice enrichment line for a real question', async () => {
    const body = await fixtureBody();
    const { questions } = extractDiscussionLog(body);
    const q1 = questions.find((question) => question.question.startsWith('Q1'));
    expect(q1?.userChoice).toBe('View is primary, source behind a toggle');
    expect(q1?.resolution).toBe('chosen');
  });
});

describe('extractDiscussionLog — S1 inline synthetic tables', () => {
  it('promotes the FIRST ✓ row when a table carries two (D-06, stable Array.prototype.find)', () => {
    const body = [
      '## Topic',
      '',
      '### Q1 — A question',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| First | First desc | ✓ |',
      '| Second | Second desc | ✓ |',
      '',
    ].join('\n');

    const { questions } = extractDiscussionLog(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].chosenOption).toBe('First');
    expect(questions[0].chosenIndex).toBe(1);
    expect(questions[0].options).toEqual([
      { option: 'First', description: 'First desc', chosen: true },
      { option: 'Second', description: 'Second desc', chosen: false },
    ]);
  });

  it('returns an unresolved question as resolution "open" — never dropped (JXP-05)', () => {
    const body = [
      '## Topic',
      '',
      '### Q1 — Unresolved',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| Only | Only desc | |',
      '',
    ].join('\n');

    const { questions, topics } = extractDiscussionLog(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].resolution).toBe('open');
    expect(questions[0].chosenIndex).toBeNull();
    expect(topics[0]).toMatchObject({ heading: 'Topic', questionCount: 1, resolvedCount: 0 });
  });

  it('tolerates both apostrophe spellings of the "User\'s choice" enrichment line', () => {
    const straight = [
      '## Topic',
      '',
      '### Q1 — Straight apostrophe',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      "**User's choice:** A",
      '',
    ].join('\n');
    const curly = [
      '## Topic',
      '',
      '### Q1 — Curly apostrophe',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      '**User’s choice:** A',
      '',
    ].join('\n');

    expect(extractDiscussionLog(straight).questions[0].userChoice).toBe('A');
    expect(extractDiscussionLog(curly).questions[0].userChoice).toBe('A');
  });

  it('a ✓-prefixed cell decides chosenIndex; a choice line without ✓ resolves custom with chosenIndex null', () => {
    const body = [
      '## Topic',
      '',
      '### Q1 — No ✓, but a choice line present',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | |',
      '',
      "**User's choice:** A",
      '',
    ].join('\n');
    const { questions } = extractDiscussionLog(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].resolution).toBe('custom');
    expect(questions[0].chosenIndex).toBeNull();
  });

  it('✓ (renamed) resolves chosen with qualifier "renamed" and the 1-based row as chosenIndex', () => {
    const body = [
      '## Topic',
      '',
      '### Q1 — Renamed',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | |',
      '| B | B desc | ✓ (renamed) |',
      '',
    ].join('\n');
    const { questions } = extractDiscussionLog(body);
    expect(questions[0]).toMatchObject({ resolution: 'chosen', qualifier: 'renamed', chosenIndex: 2 });
  });

  it('✓ (Claude\'s call) resolves "claude"; ✓ (superseded) resolves "chosen" with that qualifier', () => {
    const claudeBody = [
      '## Topic',
      '',
      '### Q1 — Claude call',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      "| A | A desc | ✓ (Claude's call) |",
      '',
    ].join('\n');
    const supersededBody = [
      '## Topic',
      '',
      '### Q1 — Superseded',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ (superseded) |',
      '',
    ].join('\n');
    expect(extractDiscussionLog(claudeBody).questions[0]).toMatchObject({ resolution: 'claude' });
    expect(extractDiscussionLog(supersededBody).questions[0]).toMatchObject({
      resolution: 'chosen',
      qualifier: 'superseded',
    });
  });

  it('a userChoice or chosenOption reading "you decide" resolves "claude"', () => {
    const viaChoice = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      "**User's choice:** you decide",
      '',
    ].join('\n');
    expect(extractDiscussionLog(viaChoice).questions[0].resolution).toBe('claude');

    const viaChosenOption = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| You decide | desc | ✓ |',
      '',
    ].join('\n');
    expect(extractDiscussionLog(viaChosenOption).questions[0].resolution).toBe('claude');
  });

  it('a wrapped Notes paragraph is joined into one string, stopping at the next bold-label line', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      '**Notes:** First line of the note',
      'continues here. Accepted gap: a known limitation.',
      '',
    ].join('\n');
    const { questions } = extractDiscussionLog(body);
    expect(questions[0].notes).toBe(
      'First line of the note continues here. Accepted gap: a known limitation.',
    );
  });

  it('a "###" subsection with no table makes the topic leftover (non-question ### block)', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      '### A non-question aside',
      '',
      'Some free-standing prose that is not a question.',
      '',
    ].join('\n');
    const { topics } = extractDiscussionLog(body);
    expect(topics[0]).toMatchObject({ leftover: true });
  });

  it('a preamble paragraph before the first "###" makes the topic leftover', () => {
    const body = [
      '## Topic',
      '',
      'Context presented: some prose the question below depends on.',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
    ].join('\n');
    const { topics } = extractDiscussionLog(body);
    expect(topics[0].leftover).toBe(true);
  });

  it('a fully-clean topic (heading, table, choice, notes, --- only) is not leftover', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | A desc | ✓ |',
      '',
      "**User's choice:** A",
      '**Notes:** A short note.',
      '',
      '---',
      '',
    ].join('\n');
    const { topics } = extractDiscussionLog(body);
    expect(topics[0].leftover).toBe(false);
  });
});

describe('extractDiscussionLog — S2 (table directly under ##, no ###, the canonical GSD template)', () => {
  it('gives one question titled by the ## heading', () => {
    const body = [
      '## Ticket design',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| 60s, single-use | desc | ✓ |',
      '| Stateless HMAC | desc | |',
      '',
      "**User's choice:** 60s, single-use",
      '',
    ].join('\n');
    const { questions, topics } = extractDiscussionLog(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe('Ticket design');
    expect(questions[0].topic).toBe('Ticket design');
    expect(topics).toEqual([{ heading: 'Ticket design', questionCount: 1, resolvedCount: 1, leftover: false }]);
  });
});

describe('extractDiscussionLog — S3 (bold **Q<n>:** lines)', () => {
  it('gives one question per Q line, with a table under each', () => {
    const body = [
      '## Selection & destination',
      '',
      '**Q1: How does a member select files?**',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| Checkbox | desc | ✓ |',
      '| Two-pane | desc | |',
      '',
      '**Q2: Does a selection survive navigating away?**',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| Cleared | desc | ✓ |',
      '| Persists | desc | |',
      '',
    ].join('\n');
    const { questions } = extractDiscussionLog(body);
    expect(questions.map((q) => q.question)).toEqual([
      'How does a member select files?',
      'Does a selection survive navigating away?',
    ]);
    expect(questions.every((q) => q.resolution === 'chosen')).toBe(true);
  });

  it('a table-less "**Q2: …** — **User: "you decide"**" line resolves claude, userChoice "you decide", no options', () => {
    const body = [
      '## Archive cautious mode',
      '',
      '**Q1: What replaces the dead premise?**',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | desc | |',
      '| B | desc | |',
      '',
      '**User\'s choice (free text):** *"free text answer"*',
      '',
      '**Follow-up — confirming how to record it:**',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| Settled option | settled desc | ✓ |',
      '| Other | desc | |',
      '',
      '**Q2: What does the guard concretely do?** — **User: "you decide"**',
      '**Q3: Is it visible?** — **User: "you decide"**',
      '',
      '**Notes:** Attaches to the last question.',
      '',
    ].join('\n');
    const { questions, topics } = extractDiscussionLog(body);
    expect(questions).toHaveLength(3);

    const [q1, q2, q3] = questions;
    expect(q1.resolution).toBe('custom');
    expect(q1.chosenIndex).toBeNull();
    // Markdown italics (`*"…"*`) are stripped, but the quote marks themselves stay — they are
    // part of the "words" quoting convention (CONTEXT.md's "backstage" repro).
    expect(q1.userChoice).toBe('"free text answer"');
    expect(q1.settled).toEqual({ option: 'Settled option', description: 'settled desc', prompt: 'Follow-up — confirming how to record it' });

    expect(q2).toMatchObject({ resolution: 'claude', userChoice: 'you decide', options: [] });
    expect(q3).toMatchObject({ resolution: 'claude', userChoice: 'you decide', options: [] });
    // A topic-level Notes: after the last Q attaches to that last question and is acceptable —
    // it must not flip the topic to leftover.
    expect(q3.notes).toBe('Attaches to the last question.');
    expect(topics[0].leftover).toBe(false);
  });

  it('a preamble paragraph before the first bold-Q line makes the topic leftover', () => {
    const body = [
      '## Cloud verification',
      '',
      "Context presented: rclone already hash-verifies each file as it lands.",
      '',
      '**Q1: Is verifying a visible job state?**',
      '',
      '| Option | Description | Selected |',
      '|--------|-------------|----------|',
      '| A | desc | ✓ |',
      '',
    ].join('\n');
    const { topics } = extractDiscussionLog(body);
    expect(topics[0].leftover).toBe(true);
  });
});

describe('extractDiscussionLog — timing (T-jxp-02: bounded regexes, no ReDoS)', () => {
  it('runs a 100k-character hostile single line through in under 200ms', () => {
    const hostile = `## Topic\n\n### Q1\n\n${'|'.repeat(1000)}${'*'.repeat(50000)}✓${'*'.repeat(49000)}\n`;
    const start = performance.now();
    extractDiscussionLog(hostile);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});

describe('SECTION_PROJECTIONS / projectSections', () => {
  it('registers discussion-log and review as of this plan', () => {
    expect(Object.keys(SECTION_PROJECTIONS).sort()).toEqual(['discussion-log', 'review']);
  });

  it('returns {} for a kind with no registered projection, never throwing', () => {
    expect(projectSections('research', '## Anything\n\nSome prose.')).toEqual({});
  });

  it('dispatches discussion-log through the registry', () => {
    const body = '## Topic\n\n### Q1\n\n| Option | Selected |\n|---|---|\n| A | ✓ |\n';
    const result = projectSections('discussion-log', body);
    expect(result).toHaveProperty('questions');
    expect(result).toHaveProperty('topics');
    expect(result).toHaveProperty('declinedAreas');
  });
});

describe('parseDecisionEntries — real Phase 5 CONTEXT.md <decisions> tag body', () => {
  it('yields 15 entries D-01…D-15 in order, D-01 folding its Reversibility continuation and D-06 starting with "A manifest that promotes"', async () => {
    const content = await readRepoFile('.planning/milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md');
    const tagBody = extractDecisionsTagBody(content);
    const entries = parseDecisionEntries(tagBody);

    expect(entries.map((entry) => entry.id)).toEqual(
      Array.from({ length: 15 }, (_, i) => `D-${String(i + 1).padStart(2, '0')}`),
    );
    const d01 = entries.find((entry) => entry.id === 'D-01');
    expect(d01?.text).toContain('Reversibility');
    const d06 = entries.find((entry) => entry.id === 'D-06');
    expect(d06?.text.startsWith('A manifest that promotes')).toBe(true);
  });
});

describe('parseDecisionEntries — synthetic cases', () => {
  it('returns [] for null input', () => {
    expect(parseDecisionEntries(null)).toEqual([]);
  });

  it('returns [] for empty string input', () => {
    expect(parseDecisionEntries('')).toEqual([]);
  });

  it('yields two entries when a non-decision bullet sits between two D-NN bullets', () => {
    const body = [
      '- **D-01:** First decision.',
      '- Some other bullet, not a decision.',
      '- **D-02:** Second decision.',
    ].join('\n');
    const entries = parseDecisionEntries(body);
    expect(entries).toEqual([
      { id: 'D-01', text: 'First decision.' },
      { id: 'D-02', text: 'Second decision.' },
    ]);
  });

  it('folds an indented continuation line into the preceding entry, joined by a single space', () => {
    const body = ['- **D-01:** First line of the decision.', '  Continuation line.'].join('\n');
    expect(parseDecisionEntries(body)).toEqual([
      { id: 'D-01', text: 'First line of the decision. Continuation line.' },
    ]);
  });
});

describe('extractReviewWarnings — real 01-REVIEW.md', () => {
  it('yields four entries WR-01…WR-04, with WR-04 starting with the gray-matter finding title', async () => {
    const body = await readRepoFile(
      '.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-REVIEW.md',
    );
    const { warnings } = extractReviewWarnings(body);

    expect(warnings.map((w) => w.id)).toEqual(['WR-01', 'WR-02', 'WR-03', 'WR-04']);
    expect(warnings[3].title.startsWith('`gray-matter` is a runtime dependency')).toBe(true);
  });

  it('projectSections("review", ...) returns the same shape as extractReviewWarnings', async () => {
    const body = await readRepoFile(
      '.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-REVIEW.md',
    );
    expect(projectSections('review', body)).toEqual(extractReviewWarnings(body));
  });
});

describe('extractReviewWarnings — synthetic cases', () => {
  it('returns { warnings: [] } for a body with no ## Warnings section', () => {
    expect(extractReviewWarnings('## Findings\n\nSomething else entirely.\n')).toEqual({
      warnings: [],
    });
  });

  it('returns { warnings: [] } for an empty body', () => {
    expect(extractReviewWarnings('')).toEqual({ warnings: [] });
  });
});

// ---------------------------------------------------------------------------
// quick-260923-jxp Task 2 (JXP-01, JXP-02, JXP-08): log-level meta.
// ---------------------------------------------------------------------------

describe('extractDiscussionLog — meta (date, areasDiscussed, offeredCount, declinedCount, declinedAreas)', () => {
  it('parses date and areasDiscussed from the header region; both null when absent', () => {
    const withMeta = [
      '**Date:** 2026-08-21',
      '**Areas discussed:** Fixture design, Harness shape',
      '',
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(withMeta);
    expect(meta.date).toBe('2026-08-21');
    expect(meta.areasDiscussed).toEqual(['Fixture design', 'Harness shape']);

    const withoutMeta = ['## Topic', '', '### Q1', '', '| Option | Selected |', '|---|---|', '| A | ✓ |', ''].join(
      '\n',
    );
    const bare = extractDiscussionLog(withoutMeta);
    expect(bare.date).toBeNull();
    expect(bare.areasDiscussed).toBeNull();
  });

  it('offeredCount: "All eight gray areas offered were selected for discussion." → 8', () => {
    const body = [
      '**Date:** 2026-01-01',
      'All eight gray areas offered were selected for discussion.',
      '',
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
    ].join('\n');
    expect(extractDiscussionLog(body).offeredCount).toBe(8);
  });

  it('offeredCount: "The user selected all four offered gray areas." → 4', () => {
    const body = [
      'The user selected all four offered gray areas.',
      '',
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
    ].join('\n');
    expect(extractDiscussionLog(body).offeredCount).toBe(4);
  });

  it('offeredCount: "All four offered gray areas were selected for discussion." → 4', () => {
    const body = [
      'All four offered gray areas were selected for discussion.',
      '',
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
    ].join('\n');
    expect(extractDiscussionLog(body).offeredCount).toBe(4);
  });

  it('declinedAreas shape (b): "offered ... declined: A, B, and C." split on commas + trailing and', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
      '## Deferred Ideas',
      '',
      '- Some deferred bullet.',
      '',
      '### Gray areas noticed but not raised',
      '',
      'Offered at wrap-up and declined: sidebar auto-collapse, what happens next, and a third thing. All were folded in.',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(body);
    expect(meta.declinedAreas).toEqual(['Sidebar auto-collapse', 'What happens next', 'A third thing']);
  });

  it('declinedAreas shape (c): a gray-area paragraph followed by bold-led bullets', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
      "## Claude's Discretion",
      '',
      'Two gray areas were identified during analysis, offered, and deliberately left open rather than',
      'locked — the planner decides them and records the outcome:',
      '',
      '- **Structured-extraction depth** — how deep typed handlers parse.',
      '- **Path targeting mechanics** — env var versus positional argument.',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(body);
    expect(meta.declinedAreas).toEqual(['Structured-extraction depth', 'Path targeting mechanics']);
  });

  it('declinedAreas shape (a): "Areas offered but not selected for discussion:" header line, first sentence only', () => {
    const body = [
      '**Areas offered but not selected for discussion:** Structured-extraction depth, Path targeting &',
      'startup failure contract. Both were explicitly left to the researcher.',
      '',
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(body);
    expect(meta.declinedAreas).toEqual(['Structured-extraction depth', 'Path targeting & startup failure contract']);
  });

  it('declinedCount: "<N> gray areas were ... offered ... rather than discuss them" in a non-topic section', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
      '## Open Questions Carried Forward',
      '',
      'Three gray areas were offered at the end and the user chose to proceed to context rather than discuss them.',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(body);
    expect(meta.declinedCount).toBe(3);
    // The where/whether prose isn't parsed into names, per the CONTEXT.md decision.
    expect(meta.declinedAreas).toEqual([]);
  });

  it('a look-alike ("every idea recorded as deferred is a *declined option*") produces no ghosts — no "gray area" mention', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
      '## Deferred Ideas',
      '',
      'No scope creep was raised — every idea recorded as deferred is a *declined option* from a question asked.',
      '',
      '- **Volume-splitting** — declined in favour of Range resume.',
      '',
    ].join('\n');
    const meta = extractDiscussionLog(body);
    expect(meta.declinedAreas).toEqual([]);
    expect(meta.declinedCount).toBeNull();
  });

  it('unrecognised prose yields null/[] and never throws', () => {
    const body = [
      '## Topic',
      '',
      '### Q1',
      '',
      '| Option | Selected |',
      '|---|---|',
      '| A | ✓ |',
      '',
      '## Claude\'s Discretion',
      '',
      'Nothing structured here at all, just prose about the decisions made.',
      '',
    ].join('\n');
    expect(() => extractDiscussionLog(body)).not.toThrow();
    const meta = extractDiscussionLog(body);
    expect(meta.declinedAreas).toEqual([]);
    expect(meta.declinedCount).toBeNull();
    expect(meta.offeredCount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Corpus-anchored repro (JXP-05): SP phases/01's renamed Chosen answer with the user's words.
// ---------------------------------------------------------------------------

describe('extractDiscussionLog — studio-portal repro (JXP-05)', () => {
  const reproPath =
    `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`;

  it.runIf(existsSync(reproPath))(
    'the Cutover & bootstrap admin CLI question resolves chosen, chosenIndex 1, qualifier "renamed", userChoice containing "backstage"',
    async () => {
      const body = await readFile(reproPath, 'utf8');
      const { questions } = extractDiscussionLog(body);
      const q = questions.find((question) =>
        question.question.startsWith('How does the very first account come into existence?'),
      );
      expect(q).toBeDefined();
      expect(q).toMatchObject({ resolution: 'chosen', chosenIndex: 1, qualifier: 'renamed' });
      expect(q!.userChoice).toContain('backstage');
    },
  );
});
