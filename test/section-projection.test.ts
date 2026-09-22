import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
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

describe('extractDiscussionLog — real Phase 5 fixture (12/12-audited anchor)', () => {
  it('extracts all 15 resolved questions across 6 topics, each with exactly one chosen option', async () => {
    const body = await fixtureBody();
    const { questions, topics } = extractDiscussionLog(body);

    expect(questions).toHaveLength(15);
    expect(topics).toHaveLength(6);

    for (const question of questions) {
      expect(question.chosenOption).toBeTruthy();
      expect(question.options.filter((option) => option.chosen)).toHaveLength(1);
    }
  });

  it('counts the two discussion-free topics ("Claude\'s Discretion", "Deferred Ideas") with questionCount 0', async () => {
    const body = await fixtureBody();
    const { topics } = extractDiscussionLog(body);
    const byHeading = new Map(topics.map((topic) => [topic.heading, topic]));

    expect(byHeading.get("Claude's Discretion")).toMatchObject({ questionCount: 0, resolvedCount: 0 });
    expect(byHeading.get('Deferred Ideas')).toMatchObject({ questionCount: 0, resolvedCount: 0 });
  });

  it('captures the tolerant userChoice enrichment line for a real question', async () => {
    const body = await fixtureBody();
    const { questions } = extractDiscussionLog(body);
    const q1 = questions.find((question) => question.question.startsWith('Q1'));
    expect(q1?.userChoice).toBe('View is primary, source behind a toggle');
  });
});

describe('extractDiscussionLog — inline synthetic tables', () => {
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
    expect(questions[0].options).toEqual([
      { option: 'First', description: 'First desc', chosen: true },
      { option: 'Second', description: 'Second desc', chosen: false },
    ]);
  });

  it('omits a question with no ✓ row from `questions`, but still counts it in the topic (resolvedCount 0)', () => {
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
    expect(questions).toHaveLength(0);
    expect(topics).toEqual([{ heading: 'Topic', questionCount: 1, resolvedCount: 0 }]);
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

  it('never uses the userChoice line as the resolution anchor — only the ✓ cell decides', () => {
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
    expect(extractDiscussionLog(body).questions).toHaveLength(0);
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
