import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  extractDiscussionLog,
  projectSections,
  SECTION_PROJECTIONS,
} from '../src/planning-repo/handlers/section-projection.ts';

async function fixtureBody(): Promise<string> {
  const raw = await readFile(
    new URL('../.planning/phases/05-per-type-document-views/05-DISCUSSION-LOG.md', import.meta.url),
    'utf8',
  );
  // The real fixture carries frontmatter-free markdown prose only (an audit-trail doc, not an
  // artifact with YAML frontmatter) — the whole file is the body `extractDiscussionLog` consumes.
  return raw;
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
  it('registers only discussion-log in this plan', () => {
    expect(Object.keys(SECTION_PROJECTIONS)).toEqual(['discussion-log']);
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
