// quick-261018-j5h (sketch 023 A): the debug session body extractor - pinned against the
// synthetic investigating one and the four made-up Lendshed sessions, plus the
// tolerant degrade paths and the T-j5h-02 growth guard. Every pinned value is counted in the file
// itself (headings, entries, markers), never copied from the extractor's output; the two corrections to
// the sketch's parse (a wrapped verification signal is kept, a comma-separated file item yields one file
// each) are marked where they apply.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractDebugSession, isEmptyValue } from '../src/planning-repo/handlers/debug-session.ts';
import type { DebugSessionBody } from '../src/planning-repo/handlers/debug-session.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const SYN = new URL('./fixtures/debug/search-index-goes-stale.md', import.meta.url).pathname;
const FX_DD = fxPath('debug/loan-history-picks-wrong-shed.md');
const FX_RECEIPT = fxPath('debug/receipt-email-never-sent.md');
const FX_HOLDS = fxPath('debug/reservation-holds-lost-on-reconnect.md');
const FX_DOOR = fxPath('debug/resolved/door-sensor-stops-after-wifi-drop.md');

const read = (path: string): DebugSessionBody => extractDebugSession(tryParseFrontmatter(readFileSync(path, 'utf8')).body);
const tagCounts = (r: DebugSessionBody): string =>
  (['confirms', 'eliminates', 'fix', 'finding'] as const).map((t) => r.evidence.filter((e) => e.tag === t).length).join('/');
const numbersOf = (r: DebugSessionBody, tag: string): number[] =>
  r.evidence.map((e, i) => (e.tag === tag ? i + 1 : 0)).filter(Boolean);
const rounds = (r: DebugSessionBody): number => new Set(r.evidence.map((e) => e.round)).size;

const syn = read(SYN);

// The two corrections to the sketch's parse, pinned on made-up text in the layout a resolved session writes:
// a verification signal that wraps onto a continuation line, and a files_changed item naming two paths.
describe('resolved-session corrections', () => {
  const resolved = [
    '## Resolution',
    '',
    'root_cause: |',
    '  The loan counter was decremented outside the `finally`, so a failed return never released the tool.',
    'fix: |',
    '  Moved the decrement into the `finally` of the return handler.',
    'verification:',
    '  - signal: regression test fails without the fix (mutation-checked)',
    '    result: PASS. The mutant that moves the decrement out of the `finally` is killed by 3 tests.',
    '  - signal: full suite',
    '    result: PASS. 212 tests, all green.',
    '  - signal: acceptance in a real browser (headless Chromium, against a rebuilt',
    '    bundle served on :4300)',
    '    result: PASS on both flows, with zero console errors.',
    '  - signal: outstanding, requires the steward',
    '    result: OPEN until the shed reopens.',
    'files_changed:',
    '  - src/loans/return-handler.ts (new): the guarded decrement',
    '  - src/loans/loan-counter.ts: counter reads from the handler',
    '  - test/loans/return-handler.test.ts, test/loans/loan-counter.test.ts: follow the handler edits',
    '',
  ].join('\n');

  it('keeps the verification chip whose signal wraps onto a continuation line, with its result', () => {
    const v = extractDebugSession(resolved).resolution?.verification;
    expect(v?.chips).toEqual([
      { name: 'regression test fails without the fix', result: 'pass' },
      { name: 'full suite', result: 'pass' },
      { name: 'acceptance in a real browser', result: 'pass' },
      { name: 'outstanding, requires the steward', result: 'open' },
    ]);
  });

  it('yields two files that share one item note when the item names two paths', () => {
    const files = extractDebugSession(resolved).resolution?.files ?? [];
    expect(files.map((f) => f.path.split('/').pop())).toEqual([
      'return-handler.ts',
      'loan-counter.ts',
      'return-handler.test.ts',
      'loan-counter.test.ts',
    ]);
    expect(files[0].path).toBe('src/loans/return-handler.ts');
    expect(files[2].note).toBe(files[3].note);
    expect(files[2].note).toContain('follow the handler edits');
  });
});

describe('synthetic investigating session', () => {
  it('reads the open shape', () => {
    expect(syn.focus.map((f) => f.key)).toEqual(['bug_class', 'hypothesis', 'test', 'expecting', 'next_action']);
    expect(syn.symptoms.map((f) => f.key)).toEqual(['expected', 'actual', 'errors', 'reproduction', 'started']);
    expect(syn.evidence).toHaveLength(3);
    expect(tagCounts(syn)).toBe('0/0/0/3');
    expect(syn.eliminated).toHaveLength(1);
    expect(syn.reasoning).toBeNull();
    expect(syn.sections.filter((s) => s.role === 'other')).toEqual([]);
    expect(syn.evidence[1].checked).toBe('`/api/search?q=zebrafish` response after the edit');
  });

  it('has an empty resolution: no cause, no fix, no verification, no file', () => {
    expect(syn.resolution?.fields.map((f) => f.key)).toEqual(['root_cause', 'fix', 'verification', 'files_changed']);
    expect(syn.resolution?.causes).toEqual([]);
    expect(syn.resolution?.fix).toBeNull();
    expect(syn.resolution?.verification).toBeNull();
    expect(syn.resolution?.files).toEqual([]);
  });
});

describe('Lendshed awaiting a check', () => {
  it('two evidence rounds, six verification chips', () => {
    const r = read(FX_DD);
    expect(r.focus.map((f) => f.key)).toEqual([
      'hypothesis',
      'test',
      'expecting',
      'next_action',
      'known_pattern_candidate',
      'bug_class',
      'status_now',
      'next_action',
    ]);
    expect(r.evidence).toHaveLength(13);
    expect(tagCounts(r)).toBe('3/0/1/9');
    expect(rounds(r)).toBe(2);
    expect(numbersOf(r, 'confirms')).toEqual([3, 6, 12]);
    expect(numbersOf(r, 'fix')).toEqual([11]);
    expect(r.eliminated).toHaveLength(2);
    expect(r.reasoning?.candidates.map((c) => `${c.kind} ${c.verdict}`)).toEqual([
      'code confirmed',
      'data/environment confirmed',
      'config eliminated',
      'data eliminated',
    ]);
    expect(r.resolution?.causes.map((c) => c.label)).toEqual(['CODE', 'DATA/ENVIRONMENT']);
    expect(r.resolution?.verification?.verdict).toBe('accepted');
    expect(r.resolution?.verification?.chips).toHaveLength(6);
    expect(r.resolution?.files).toHaveLength(5);
    expect(r.sections.filter((s) => s.role === 'other').map((s) => s.heading)).toEqual(['Constraints']);
  });
});

describe('the other Lendshed sessions', () => {
  it('receipt email: diagnosed, two causes, a fix not applied', () => {
    const r = read(FX_RECEIPT);
    expect(r.evidence).toHaveLength(4);
    expect(tagCounts(r)).toBe('1/1/0/2');
    expect(r.eliminated).toHaveLength(2);
    expect(r.resolution?.causes.map((c) => c.label)).toEqual(['PRIMARY', 'SECONDARY']);
    expect(r.resolution?.fix?.notApplied).toBe(true);
    expect(r.resolution?.fix?.text.startsWith('(1) In closeLoan, pass `member.email` as the recipient')).toBe(true);
    expect(r.resolution?.verification).toBeNull();
  });

  it('door sensor resolved: 15 evidence entries, three causes, eight files', () => {
    const r = read(FX_DOOR);
    expect(r.evidence).toHaveLength(15);
    expect(tagCounts(r)).toBe('2/2/2/9');
    expect(numbersOf(r, 'confirms')).toEqual([6, 14]);
    expect(numbersOf(r, 'eliminates')).toEqual([7, 9]);
    expect(numbersOf(r, 'fix')).toEqual([12, 15]);
    expect(r.eliminated).toHaveLength(3);
    expect(r.resolution?.causes.map((c) => c.label)).toEqual(['Cause 1', 'Cause 2', 'Cause 3']);
    expect(r.resolution?.fix?.text).toBe('APPLIED 2026-03-12 — Options A and C (steward decision).');
    expect(r.resolution?.verification?.chips).toHaveLength(5);
    expect(r.resolution?.files).toHaveLength(8);
    expect(r.sections.filter((s) => s.role === 'other')).toHaveLength(4);
  });

  it('reservation holds resolved over five rounds: 20 evidence entries, eleven other sections', () => {
    const r = read(FX_HOLDS);
    expect(r.evidence).toHaveLength(20);
    expect(tagCounts(r)).toBe('6/1/3/10');
    expect(rounds(r)).toBe(5);
    expect(numbersOf(r, 'confirms')).toEqual([4, 5, 6, 7, 12, 15]);
    expect(numbersOf(r, 'eliminates')).toEqual([14]);
    expect(numbersOf(r, 'fix')).toEqual([9, 10, 17]);
    expect(r.resolution?.causes.map((c) => [c.label, c.cut])).toEqual([
      ['Cause 1', true],
      ['Cause 2', true],
      ['Cause 3', false],
    ]);
    expect(r.resolution?.verification?.chips).toBeNull();
    expect(r.resolution?.verification?.text).toBe(
      'First pass verified (feed-client 0.4.0 published, desk bumped to ^0.4.0).',
    );
    expect(r.resolution?.files).toHaveLength(6);
    expect(r.sections.filter((s) => s.role === 'other')).toHaveLength(11);
  });
});

describe('degrades without throwing', () => {
  const empty: DebugSessionBody = extractDebugSession('');
  it('gives an empty model for an empty string and a frontmatter-only string', () => {
    for (const body of ['', '---\nstatus: open\n---\n', '   \n\n']) {
      const r = extractDebugSession(body);
      expect(r.focus).toEqual([]);
      expect(r.evidence).toEqual([]);
      expect(r.resolution).toBeNull();
      expect(r.reasoning).toBeNull();
    }
    expect(empty.h1).toBeNull();
  });

  it('survives odd shapes', () => {
    const shapes = [
      '## Current Focus\n```yaml\nhypothesis: x\n',
      '- timestamp: 2026-01-01\n  checked: x\n',
      '## Evidence\n\nnothing here\n',
      '## Current Focus\n\nreasoning_checkpoint:\n  hypothesis: a\n',
      '## Resolution\n\nroot_cause: 1. A one. 2. B two sentence mentioning (1) again.\nfix:\nverification:\n  - signal: no result here\nfiles_changed: []\n',
      '## Resolution\n\nroot_cause:\nfix:\nverification:\nfiles_changed:\n',
    ];
    for (const s of shapes) expect(() => extractDebugSession(s)).not.toThrow();
  });

  it('does not read headings inside fences as sections', () => {
    const r = extractDebugSession('## Current Focus\n\nhypothesis: h\n\n```\n## Resolution\nroot_cause: x\n```\n');
    expect(r.resolution).toBeNull();
    expect(r.sections.map((s) => s.heading)).toEqual(['Current Focus']);
    expect(r.focus[0].key).toBe('hypothesis');
  });

  it('keeps one cause when "(1)" is quoted later in a sentence after a real "1." marker', () => {
    const r = extractDebugSession('## Resolution\n\nroot_cause: 1. Parsing broke the header, then (1) again appeared in a quote.\n');
    expect(r.resolution?.causes).toHaveLength(1);
    expect(r.resolution?.causes[0].label).toBe('Cause 1');
  });

  it('reads a verification map with no result as no chips, and files "[]" as none', () => {
    const r = extractDebugSession('## Resolution\n\nverification: checked it by hand\nfiles_changed: []\nfix: (none yet)\n');
    expect(r.resolution?.verification?.chips).toBeNull();
    expect(r.resolution?.files).toEqual([]);
    expect(isEmptyValue('(none yet)')).toBe(true);
    expect(isEmptyValue('Nonetheless it works')).toBe(false);
  });

  it('reads key: { result } and key:/result maps as chips', () => {
    const r = extractDebugSession(
      '## Resolution\n\n- verification:\n    target_test: { result: pass, test: "x" }\n    live:\n      result: failed\n    guardrail_verdict: accepted\n',
    );
    expect(r.resolution?.verification?.verdict).toBe('accepted');
    expect(r.resolution?.verification?.chips?.map((c) => [c.name, c.result])).toEqual([
      ['Target test', 'pass'],
      ['Live', 'fail'],
    ]);
  });

  it('tags a bare timestamp line', () => {
    const r = extractDebugSession('## Evidence\n\n- timestamp: 2026-01-01 — this ELIMINATES the cache\n- timestamp: 2026-01-02 - root cause confirmed\n');
    expect(r.evidence.map((e) => [e.ts, e.tag])).toEqual([
      ['2026-01-01', 'eliminates'],
      ['2026-01-02', 'confirms'],
    ]);
    expect(r.evidence[0].text).toBe('this ELIMINATES the cache');
  });
});

describe('T-j5h-02 growth', () => {
  // A fixed millisecond budget flakes under parallel load and proves nothing about the shape of the
  // cost (Pitfall 11). Each hostile body is built in make() at size n and at 8n and timed with
  // measureGrowth: a linear scanner reads about 8, a quadratic one about 64.
  const bodyOf = (reps: number, fillerLines: number): string => {
    const hostile = '`*|[**1. **(- timestamp: signal: result: '.repeat(reps);
    const filler = `${'x'.repeat(79)}\n`;
    return `# T\n\n## Current Focus\n\nhypothesis: ${hostile}\n\n## Symptoms\n${hostile}\n\n## Evidence\n- timestamp: ${hostile}\n  checked: ${hostile}\n${'- timestamp: x\n'.repeat(500)}\n## Resolution\n\nroot_cause:\n  ${hostile}\nverification:\n  - signal: ${hostile}\nfiles_changed:\n  - ${hostile}\n${filler.repeat(fillerLines)}`;
  };
  // About size characters in all: six hostile runs of 41 characters per repeat, then 80-character filler.
  const hostileBody = (size: number): string => bodyOf(Math.max(1, Math.floor(size / 500)), Math.max(1, Math.floor(size / 320)));

  it('extracts a 1 MB body holding a 200k-character line without throwing', () => {
    const body = bodyOf(5000, 9000);
    expect(body.length).toBeGreaterThan(900_000);
    expect(() => extractDebugSession(body)).not.toThrow();
  });

  it('grows no faster than linearly on a hostile body', () => {
    const growth = measureGrowth({ make: hostileBody, run: (body) => void extractDebugSession(body) });
    expect(
      growth.ratio,
      `hostile body: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });

  const commentOpeners = (size: number): string =>
    `## Resolution\n\nroot_cause: ${'<!-- '.repeat(Math.max(1, Math.floor(size / 5)))}\nfix: ${' '.repeat(Math.max(1, Math.floor(size / 3)))}x\n${'a: b\n'.repeat(Math.max(1, Math.floor(size / 10)))}`;

  it('copes with unclosed comment openers and a long whitespace run, growing no faster than linearly', () => {
    expect(() => extractDebugSession(commentOpeners(100_000))).not.toThrow();
    const growth = measureGrowth({ make: commentOpeners, run: (body) => void extractDebugSession(body) });
    expect(
      growth.ratio,
      `comment openers: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });
});
