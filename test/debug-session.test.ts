// quick-261018-j5h (sketch 023 A): the debug session body extractor - pinned against labelore's own
// resolved session, the synthetic investigating one and the four made-up Lendshed sessions, plus the
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

const LB = new URL('../.planning/debug/resolved/loading-state-regression.md', import.meta.url).pathname;
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

const lb = read(LB);
const syn = read(SYN);

describe('labelore resolved session (three causes)', () => {
  it('reads the section shape', () => {
    expect(lb.h1).toBe('Debug Session: loading-state-regression');
    expect(lb.focus.map((f) => f.key)).toEqual([
      'bug_class',
      'known_pattern_candidate',
      'hypothesis',
      'test',
      'expecting',
      'next_action',
    ]);
    expect(lb.symptoms.map((f) => f.key)).toEqual([
      'Expected behavior',
      'Actual behavior',
      'Errors',
      'Timeline',
      'Environment',
      'Reproduction',
    ]);
    expect(lb.eliminated).toHaveLength(2);
    expect(lb.resolution?.fields.map((f) => f.key)).toEqual(['root_cause', 'fix', 'verification', 'files_changed']);
    expect(lb.sections.filter((s) => s.role === 'other').map((s) => s.heading)).toEqual(['Postmortem']);
  });

  it('reads the evidence, tags and numbers', () => {
    expect(lb.evidence).toHaveLength(12);
    expect(tagCounts(lb)).toBe('2/2/0/8');
    expect(rounds(lb)).toBe(1);
    expect(numbersOf(lb, 'confirms')).toEqual([4, 6]);
    expect(numbersOf(lb, 'eliminates')).toEqual([2, 9]);
    expect(numbersOf(lb, 'finding')).toEqual([1, 3, 5, 7, 8, 10, 11, 12]);
    expect(lb.evidence[0].ts).toBe('2026-09-16 (phase 0)');
    expect(lb.evidence[0].checked).toBe('`.planning/debug/knowledge-base.md` and MemPalace availability');
  });

  it('reads the reasoning checkpoint and its four candidates', () => {
    expect(lb.reasoning?.candidates.map((c) => [c.kind, c.verdict])).toEqual([
      ['environment', null],
      ['code', null],
      ['code', null],
      ['data', null],
    ]);
  });

  it('reads the three causes with their labels, in sequence', () => {
    const causes = lb.resolution?.causes ?? [];
    expect(causes.map((c) => c.label)).toEqual(['ENVIRONMENT', 'CODE', 'STRUCTURAL / PRE-EXISTING']);
    expect(causes.every((c) => c.cut)).toBe(true);
    expect(causes[0].text.startsWith('The Cloudflare tunnel origin was running `node src/server/index.ts`')).toBe(true);
    expect(causes[0].text.endsWith("so `createApp(source, production = process.env.NODE_ENV === 'production')`…")).toBe(true);
    expect(causes[0].text.length).toBeLessThanOrEqual(200);
    expect(causes[1].text).toBe('`RouteProgress` was wired only as app-shell.tsx\'s `<Suspense fallback>`.');
    expect(causes[2].text).toBe(
      '`app-shell.tsx:47` gated the drawer trigger behind `{tree.isSuccess ? <SidebarDrawer /> : null}`, so the icon waited on a 120,265-byte `/api/tree` payload.',
    );
  });

  it('cuts the fix to its first sentence', () => {
    const fix = lb.resolution?.fix;
    expect(fix?.notApplied).toBe(false);
    expect(fix?.cut).toBe(true);
    expect(fix?.text).toBe(
      'RC2 (the real bug, and the reason the session was filed): moved the loading signal off the Suspense-mount event entirely.',
    );
  });

  it('reads six verification chips, keeping the one whose signal wraps (correction)', () => {
    const v = lb.resolution?.verification;
    expect(v?.verdict).toBe('accepted');
    expect(v?.chips).toEqual([
      { name: 'regression test fails without the fix', result: 'pass' },
      { name: 'full suite', result: 'pass' },
      { name: 'typecheck + lint', result: 'pass' },
      { name: 'behavioural acceptance in a real browser', result: 'pass' },
      { name: 'startup banner, both branches, observed at runtime', result: 'pass' },
      { name: 'outstanding, requires the user', result: 'open' },
    ]);
  });

  it('reads nine files; two paths sharing one item yield two files (correction)', () => {
    const files = lb.resolution?.files ?? [];
    expect(files.map((f) => f.path.split('/').pop())).toEqual([
      'route-chunk-store.ts',
      'route-progress.tsx',
      'app-shell.tsx',
      'app-router.tsx',
      'index.ts',
      'route-chunk-store.test.ts',
      'loading-state-contract.test.ts',
      'shell-contract.test.ts',
      'build-splitting.test.ts',
    ]);
    expect(files[0].path).toBe('src/web/components/route-chunk-store.ts');
    expect(files[7].note).toBe(files[8].note);
    expect(files[7].note).toContain('follow the shell/router edits');
  });

  it('gives every long text a value for the modal', () => {
    const rc = lb.resolution?.fields.find((f) => f.key === 'root_cause');
    expect(rc?.value.shape).toBe('blocks');
    const sym = lb.symptoms.find((f) => f.key === 'Actual behavior');
    expect(sym?.value.shape).toBe('blocks');
    if (sym?.value.shape === 'blocks') {
      const list = sym.value.blocks.find((b) => b.kind === 'list');
      expect(list && list.kind === 'list' ? [list.ordered, list.items.length] : null).toEqual([true, 4]);
    }
    const ver = lb.resolution?.fields.find((f) => f.key === 'verification');
    expect(ver?.value.shape).toBe('blocks');
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
