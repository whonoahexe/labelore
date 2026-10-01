// quick-261001-qk7 (QK7-01, QK7-09): extractUatSession over the sketch's synthetic testing doc, real
// corpus documents (a missing studio-portal checkout skips its files), degenerate input and the
// T-qk7-01 timing guard. The corpus pins live in test/web/uat-session-corpus.test.ts.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { extractUatSession } from '../src/planning-repo/handlers/uat-session.ts';
import type { UatSession } from '../src/planning-repo/handlers/uat-session.ts';

const SYN = new URL('../.planning/sketches/015-uat-page/synthetic-testing-UAT.md', import.meta.url);
const LB02 = new URL(
  '../.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UAT.md',
  import.meta.url,
);
const SP103 = `${SP_PLANNING}/milestones/v1.0-phases/03-file-browsing/03-UAT.md`;
const SP2 = `${SP_PLANNING}/phases/02-roles-permission-enforcement/02-UAT.md`;

function sessionOf(path: URL | string): UatSession {
  return extractUatSession(tryParseFrontmatter(readFileSync(path, 'utf8')).body);
}

describe('extractUatSession — the synthetic testing doc', () => {
  const session = sessionOf(SYN);

  it('reads the seven tests with their results and fields', () => {
    expect(session.tests.map((t) => t.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(session.tests.map((t) => t.result)).toEqual([
      'issue',
      'issue',
      'blocked',
      'skipped',
      'pending',
      'pending',
      'pending',
    ]);
    const blocked = session.tests[2];
    const fields = Object.fromEntries(blocked.fields.map((f) => [f.key, f.value]));
    expect(fields.blocked_by).toBe('third-party');
    expect(fields.reason).toBe(
      'Cloudflare tunnel is rate-limiting large downloads this morning; retry after the window resets',
    );
    expect(session.tests[4].resultRaw).toBe('[pending]');
  });

  it('reads the live current test with its block-scalar expected text', () => {
    expect(session.current).toMatchObject({
      number: '5',
      name: 'Browsing a genuinely unreachable tier',
      awaiting: 'user response',
      fromSection: 'Current Test',
    });
    expect(session.current?.expected.split('\n')).toHaveLength(4);
    expect(session.current?.expected).toContain('Vault is unreachable right now');
    expect(session.currentLine).toBeNull();
  });

  it('reads the Summary, the gap items and the comments', () => {
    expect(session.summary).toEqual({
      total: '7',
      passed: '0',
      issues: '2',
      pending: '3',
      skipped: '1',
      blocked: '1',
    });
    expect(session.gaps.mode).toBe('items');
    expect(session.gaps.items).toHaveLength(2);
    const [first, second] = session.gaps.items;
    expect(first.artifacts).toEqual([
      { path: 'frontend/components/browse-pane.tsx', issue: 'line 88 uses router.replace for folder navigation' },
      { path: 'frontend/lib/use-browse.ts', issue: 'openFolder() mirrors the replace call into the query cache key' },
    ]);
    expect(first.missing).toHaveLength(2);
    expect(first.values.debug_session).toBe('.planning/debug/back-skips-parent.md');
    expect(first.values.test).toBe('1');
    expect(first.values.severity).toBe('major');
    expect(second.values.root_cause).toBe('');
    expect(second.artifacts).toEqual([]);
    expect(second.missing).toEqual([]);
    expect(session.commentCount).toBe(2);
    expect(session.extras).toEqual([]);
    expect(session.sections.every((s) => s.claimed)).toBe(true);
  });
});

describe('extractUatSession — real documents', () => {
  it.runIf(existsSync(SP103))('studio-portal v1.0/03: six resolved YAML gaps with their resolution fields', () => {
    const session = sessionOf(SP103);
    expect(session.tests).toHaveLength(6);
    expect(session.tests.every((t) => t.result === 'pass')).toBe(true);
    expect(session.gaps.mode).toBe('items');
    expect(session.gaps.items).toHaveLength(6);
    expect(session.gaps.items.every((g) => g.values.status === 'resolved')).toBe(true);
    const first = session.gaps.items[0];
    expect(first.values.resolved_by).toBeTruthy();
    expect(first.values.fix).toBeTruthy();
    expect(first.values.fix_deployed).toBeTruthy();
    expect(first.artifacts.map((a) => a.path)).toContain('backend/src/lib.rs:82');
  });

  it('labelore v1.0/02: prose gap cards (one with a code block), four extras, the Result line', () => {
    const session = sessionOf(LB02);
    expect(session.tests).toHaveLength(16);
    expect(session.gaps.mode).toBe('prose');
    expect(session.gaps.cards).toHaveLength(12);
    expect(session.gaps.cards[0].title?.startsWith('G-01 —')).toBe(true);
    expect(session.gaps.cards.some((c) => c.blocks.some((b) => b.kind === 'code'))).toBe(true);
    expect(session.extras.map((e) => e.heading)).toEqual([
      'Result',
      'Round-1 detail (historical)',
      'Gap Reconciliation — 2026-09-09',
      'Notes',
    ]);
    expect(session.currentLine).toBe('Gate **not approved**. Plan 02-09 stays open.');
    expect(session.testsNote.length).toBeGreaterThan(0);
  });

  it.runIf(existsSync(SP2))('studio-portal phases/02: the current test comes from Resolution; four bullet cards', () => {
    const session = sessionOf(SP2);
    expect(session.currentLine?.startsWith('none')).toBe(true);
    expect(session.current?.fromSection).toBe('Resolution');
    expect(session.tests).toHaveLength(3);
    expect(session.gaps.mode).toBe('prose');
    expect(session.gaps.cards).toHaveLength(4);
    expect(session.gaps.cards.every((c) => c.title === null)).toBe(true);
    expect(session.gaps.lead).toContain('Carried forward as real');
    expect(session.summary?.accepted).toBe('2');
  });
});

describe('extractUatSession — degenerate input', () => {
  it('an empty body yields zero tests without throwing', () => {
    const session = extractUatSession('');
    expect(session.tests).toEqual([]);
    expect(session.current).toBeNull();
    expect(session.gaps.mode).toBe('none');
  });

  it('survives an unclosed fence and a Tests heading with no fields', () => {
    const body = [
      '## Tests',
      '',
      '### 1. No fields here',
      '',
      '### 2. Fenced',
      'expected: |',
      '  ```yaml',
      '  result: pass',
      'result: issue',
      '',
    ].join('\n');
    const session = extractUatSession(body);
    expect(session.tests).toHaveLength(2);
    expect(session.tests[0].fields).toEqual([]);
    expect(session.tests[0].result).toBe('other');
  });

  it('survives a Gaps block with an unterminated quote and orphan indented lines', () => {
    const body = [
      '## Gaps',
      '',
      '      issue: orphan before any item',
      '- truth: "an unterminated quote',
      '  status: failed',
      '      issue: orphan six-space line',
      '    - stray list line',
      '',
    ].join('\n');
    const session = extractUatSession(body);
    expect(session.gaps.mode).toBe('items');
    expect(session.gaps.items).toHaveLength(1);
    // Orphan lines fold into the key they follow, as in the sketch's parse.
    expect(session.gaps.items[0].values.status.startsWith('failed')).toBe(true);
  });

  it('keeps key-looking lines inside a fenced block with the field they belong to', () => {
    const body = [
      '## Tests',
      '',
      '### 1. Fence',
      'expected: |',
      '  Run this:',
      '  ```',
      'result: pass',
      '  ```',
      'result: pass',
    ].join('\n');
    const test = extractUatSession(body).tests[0];
    expect(test.fields.map((f) => f.key)).toEqual(['expected', 'result']);
    expect(test.fields[0].value).toContain('result: pass');
  });

  it('a 1 MB body with one 200,000-character line extracts in under 250 ms', () => {
    const line = 'x'.repeat(200_000);
    const filler = 'expected: something plain\nresult: pass\n'.repeat(15_000);
    const body = `## Tests\n\n### 1. Big\nexpected: ${line}\nresult: pass\n\n${filler}\n## Gaps\n\n- truth: ${line}\n  status: failed\n`;
    expect(body.length).toBeGreaterThan(700_000);
    const started = performance.now();
    const session = extractUatSession(body);
    expect(performance.now() - started).toBeLessThan(250);
    expect(session.tests).toHaveLength(1);
  });

  it('removes comments by a linear scan and counts them; an unterminated one is left alone', () => {
    const session = extractUatSession('<!-- a -->\n## Tests\n<!-- b\nmulti -->\n### 1. T\nresult: pass\n<!-- open');
    expect(session.commentCount).toBe(2);
    expect(session.tests).toHaveLength(1);
  });
});
