// Phase 06 standing guard (D-05, TEST-01, TEST-04, Pitfall 14): no test file may skip itself, run
// conditionally, reach another project on this machine, or carry an absolute millisecond budget.
// The scan names the constructs it forbids, so it sits in its own exemption list.
//
// Skip members are matched on comment-blanked text (a comment may talk about them); real-path
// patterns on raw text (a comment naming a real checkout is still a leak). The scan is a function of
// a root folder and relative paths so planted controls run the same code on a mkdtemp folder.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { blankComments, walkSource } from './helpers/source-scan';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Exemption {
  path: string;
  reason: string;
}
/** Frozen: growing this list is a decision, not an edit. */
const EXEMPTIONS: Exemption[] = [
  { path: 'test/no-skips.test.ts', reason: 'names the constructs and paths it forbids' },
  { path: 'test/web/shell-contract.test.ts', reason: 'names path patterns the built shell must never reference' },
  { path: 'test/server/remote-source.test.ts', reason: 'the generous 3,000 ms hang detector for a fake ssh, kept on purpose' },
  { path: 'test/helpers/growth.test.ts', reason: 'tests the growth harness against timed workloads' },
];

type Kind = 'skip-member' | 'disguised-skip' | 'real-path' | 'absolute-budget';
interface Finding {
  path: string;
  kind: Kind;
  detail: string;
  line: number;
}

const SKIP_MEMBER =
  /(?<![\w.$])(?:it|test|describe)(?:\.[A-Za-z]+)*\.(?:skip|todo|only|fixme|skipIf|runIf)\b/g;
const DISGUISED_SKIP =
  /\bif\s*\(\s*!\s*(?:[\w$]+\.)*existsSync\s*\([^)]*\)\s*\)\s*(?:\{\s*)?return\s*[;}]/g;
const REAL_PATH_PATTERNS: [string, RegExp][] = [
  ['home-directory call', /\bhomedir\s*\(/g],
  ['absolute home path', /\/home\/[^/\s'"`]+\/(?:Work|codebases)\b/g],
  ['tilde path into Work', /~\/Work\b/g],
  ['private Work segment', /Work\/(?:Ibis|Cinedise|Sideby)\b/gi],
  ['old real-checkout constant', /\b(?:STUDIO_PORTAL_ROOT|SP_PLANNING|SP_ROOT)\b/g],
];
const TIMING_SOURCE = /\b(?:performance\.now|Date\.now|bestOf)\s*\(/;
const BUDGET_TAIL = /^\s*\.\s*toBeLessThan(?:OrEqual)?\s*\(\s*\d[\d_.]*\s*\)/;

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Returns the text between the parenthesis at `open` and its match, and the index just after it. */
function balanced(text: string, open: number): { inner: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return { inner: text.slice(open + 1, i), end: i + 1 };
  }
  return null;
}

/** Variables assigned (directly or through one more hop) from a performance.now / Date.now expression. */
function timingVariables(region: string): Set<string> {
  const timed = new Set<string>();
  const assign = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g;
  for (let pass = 0; pass < 3; pass++) {
    for (const m of region.matchAll(assign)) {
      const rhs = m[2];
      if (TIMING_SOURCE.test(rhs) || [...timed].some((v) => new RegExp(`\\b${v.replace(/\$/g, '\\$')}\\b`).test(rhs))) {
        timed.add(m[1]);
      }
    }
  }
  return timed;
}

function absoluteBudgets(blanked: string): { index: number; detail: string }[] {
  const out: { index: number; detail: string }[] = [];
  for (const m of blanked.matchAll(/\bexpect\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const subject = balanced(blanked, open);
    if (!subject || !BUDGET_TAIL.test(blanked.slice(subject.end))) continue;
    const inline = TIMING_SOURCE.test(subject.inner);
    let viaVariable = false;
    if (!inline && /^\s*[A-Za-z_$][\w$]*\s*$/.test(subject.inner)) {
      const before = blanked.slice(0, m.index!);
      const testStart = Math.max(before.lastIndexOf('\n  it('), before.lastIndexOf('\n    it('), before.lastIndexOf('\nit('), before.lastIndexOf('test('));
      viaVariable = timingVariables(before.slice(Math.max(testStart, 0))).has(subject.inner.trim());
    }
    if (inline || viaVariable) out.push({ index: m.index!, detail: `expect(${subject.inner.trim()}) against a numeric literal` });
  }
  return out;
}

/** Scans one file's text. Exposed to the planted controls through scanFiles. */
function scanText(path: string, raw: string): Finding[] {
  const findings: Finding[] = [];
  const blanked = blankComments(raw);
  const add = (kind: Kind, detail: string, index: number, text: string) =>
    findings.push({ path, kind, detail, line: lineOf(text, index) });

  for (const m of blanked.matchAll(SKIP_MEMBER)) add('skip-member', m[0], m.index!, blanked);
  for (const m of blanked.matchAll(DISGUISED_SKIP)) add('disguised-skip', m[0], m.index!, blanked);
  for (const [name, pattern] of REAL_PATH_PATTERNS) {
    for (const m of raw.matchAll(pattern)) add('real-path', `${name}: ${m[0]}`, m.index!, raw);
  }
  for (const b of absoluteBudgets(blanked)) add('absolute-budget', b.detail, b.index, blanked);
  return findings;
}

function scanFiles(root: string, paths: string[]): Finding[] {
  return paths.flatMap((rel) => scanText(rel, readFileSync(join(root, rel), 'utf8')));
}

const testFiles = [...walkSource(['test'], ['.ts']), 'playwright.config.ts'];
const findings = scanFiles(REPO_ROOT, testFiles);
const planted: string[] = [];
afterAll(() => {
  for (const dir of planted) rmSync(dir, { recursive: true, force: true });
});

describe('no-skips and real-path guard (D-05, TEST-01, TEST-04)', () => {
  it('scans a non-empty set of test files including the Playwright config', () => {
    expect(testFiles.length).toBeGreaterThan(50);
    expect(testFiles).toContain('test/no-skips.test.ts');
    expect(testFiles).toContain('playwright.config.ts');
  });

  it('keeps the exemption list frozen at four entries', () => {
    expect(EXEMPTIONS).toHaveLength(4);
    expect(EXEMPTIONS.every((e) => e.reason.length > 0)).toBe(true);
  });

  it('finds no skip, disguised skip, real path or absolute budget outside the exemptions', () => {
    const exempt = new Set(EXEMPTIONS.map((e) => e.path));
    const offenders = findings.filter((f) => !exempt.has(f.path));
    expect(offenders.map((f) => `${f.path}:${f.line} ${f.kind} ${f.detail}`)).toEqual([]);
  });

  it('has no stale exemption: every entry still produces at least one finding', () => {
    for (const e of EXEMPTIONS) {
      expect(findings.filter((f) => f.path === e.path).length, `exemption ${e.path}`).toBeGreaterThan(0);
    }
  });

  describe('planted control', () => {
    function plant(files: Record<string, string>): { root: string; paths: string[] } {
      const root = mkdtempSync(join(tmpdir(), 'labelore-skips-'));
      planted.push(root);
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, rel)), { recursive: true });
        writeFileSync(join(root, rel), text, 'utf8');
      }
      return { root, paths: Object.keys(files) };
    }
    const reported = (text: string, kind: Kind): number => {
      const { root, paths } = plant({ 'test/planted.test.ts': text });
      return scanFiles(root, paths).filter((f) => f.kind === kind).length;
    };

    const MEMBERS = [
      'it.skip', 'it.todo', 'it.only', 'it.skipIf', 'it.runIf', 'it.concurrent.skip', 'it.concurrent.only',
      'test.skip', 'test.todo', 'test.only', 'test.fixme', 'test.skipIf', 'test.runIf',
      'test.describe.skip', 'test.describe.only', 'test.describe.fixme',
      'describe.skip', 'describe.todo', 'describe.only', 'describe.skipIf', 'describe.runIf',
    ];
    it.each(MEMBERS)('reports %s, called or not', (member) => {
      expect(reported(`${member}('x', () => {});\n`, 'skip-member')).toBe(1);
      expect(reported(`const f = ${member};\n`, 'skip-member')).toBe(1);
    });

    it('does not report a skip member inside a comment or an unrelated identifier', () => {
      const text = "// it.skip('x')\n/* test.only */\nconst commit = { only: 1 };\nconst subtest = x.only;\nit('fine', () => {});\n";
      expect(reported(text, 'skip-member')).toBe(0);
    });

    it('reports a disguised skip: an early return on a missing file', () => {
      expect(reported("it('x', () => {\n  if (!existsSync(path)) return;\n});\n", 'disguised-skip')).toBe(1);
      expect(reported("it('x', () => {\n  if (!fs.existsSync(path)) { return; }\n});\n", 'disguised-skip')).toBe(1);
      expect(reported("it('x', () => {\n  if (existsSync(path)) return;\n});\n", 'disguised-skip')).toBe(0);
      expect(reported('function walk(dir) {\n  if (!existsSync(dir)) return [];\n}\n', 'disguised-skip')).toBe(0);
    });

    const REAL = {
      homedir: "const h = homedir();\n",
      'absolute home path': "const p = '/home/someone/Work/thing';\n",
      codebases: "const p = '/home/someone/codebases/thing';\n",
      'tilde path': "const p = '~/Work/thing';\n",
      'private Work segment': "const p = 'Work/Ibis/x';\n",
      'private Work segment (Cinedise)': "const p = 'Work/Cinedise/x';\n",
      'private Work segment (Sideby)': "const p = 'Work/Sideby/x';\n",
      'old constant': 'const r = STUDIO_PORTAL_ROOT;\n',
      'old planning constant': 'const r = SP_PLANNING;\n',
    };
    it.each(Object.entries(REAL))('reports a real path: %s', (_name, text) => {
      expect(reported(text, 'real-path')).toBeGreaterThanOrEqual(1);
    });

    it('reports an absolute budget on a measured time, inline and through a variable', () => {
      const inlineLess = "it('x', () => {\n  expect(performance.now() - t0).toBeLessThan(500);\n});\n";
      const inlineLessEq = "it('x', () => {\n  expect(Date.now() - t0).toBeLessThanOrEqual(500);\n});\n";
      const varLess = "it('x', () => {\n  const t0 = performance.now();\n  const elapsed = performance.now() - t0;\n  expect(elapsed).toBeLessThan(500);\n});\n";
      const varLessEq = "it('x', () => {\n  const t0 = Date.now();\n  const elapsed = Date.now() - t0;\n  expect(elapsed).toBeLessThanOrEqual(1_000);\n});\n";
      const viaBestOf = "it('x', () => {\n  const best = bestOf(() => work(), 3);\n  expect(best).toBeLessThan(2);\n});\n";
      for (const text of [inlineLess, inlineLessEq, varLess, varLessEq, viaBestOf]) {
        expect(reported(text, 'absolute-budget')).toBe(1);
      }
    });

    it('does not report a budget that is relative, non-timing or a non-numeric limit', () => {
      const text =
        "it('x', () => {\n  const t0 = performance.now();\n  const elapsed = performance.now() - t0;\n  expect(elapsed).toBeLessThan(GROWTH_LIMIT);\n  expect(items.length).toBeLessThan(5);\n});\n";
      expect(reported(text, 'absolute-budget')).toBe(0);
    });
  });
});
