// Phase 06 standing guard (D-08, D-16, D-19, TEST-03): no private project name, host, tool tell or
// private-looking file name may live in a fixture, a test source or (scope C) the app source.
// The deny list is committed in plain text by decision (D-08): the guard has to name what it forbids.
//
// Every text file git would commit is scanned (git ls-files --cached --others --exclude-standard), so a
// new file is covered whatever its extension while ignored build output is not. The scan is a function
// of a root folder and root-relative paths so the planted control runs the very same code on a
// mkdtemp folder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Private project and product names. A hyphen inside a word also matches a run of whitespace, so
 * the two-word capitalised form of the reference project's name is caught too. */
const DENY_WORDS = [
  'cinedise',
  'cinedise-portal',
  'studio-portal',
  'resoundant',
  'pyedge',
  'deid',
  'sideby',
  'duet',
  'edgecan',
  'ibis',
];
/** Private host names. */
const HOST_TELLS = ['taile250fc', 'rhgpu'];
/** Public tool and vendor names that mark copied private infrastructure inside fixture/test text. */
const TOOL_TELLS = ['seagate', 'sandisk', 'smartctl', 'rclone'];
/** File names that follow a private prefix: sp, dd or sb followed by a digit or a hyphen. */
const PRIVATE_PREFIX = /^(?:sp|dd|sb)[0-9-]/i;

interface Exemption {
  path: string;
  reason: string;
}
interface FixtureExemption extends Exemption {
  /** Only this word is exempt; any other finding in the same file still fails. */
  word: string;
}

/** D-16: the three places that may still name the reference project, and only by that one word. */
const FIXTURE_EXEMPTIONS: FixtureExemption[] = [
  {
    path: 'fixtures/dense/**',
    word: 'studio-portal',
    reason: 'the made-up dense tree names the project the parser must not overfit to (D-04)',
  },
  {
    path: 'fixtures/README.md',
    word: 'studio-portal',
    reason: 'the fixtures ledger that states that rule',
  },
  {
    path: 'test/__golden__/dense.json',
    word: 'studio-portal',
    reason: 'the frozen golden of that tree (D-04)',
  },
];

/** Test sources that must name private text to forbid it: whole file exempt, each with a reason. */
const SOURCE_EXEMPTIONS: Exemption[] = [
  { path: 'test/fixture-leak.test.ts', reason: 'holds the deny list' },
  { path: 'test/no-skips.test.ts', reason: 'names the real-checkout path patterns it forbids' },
  {
    path: 'test/web/shell-contract.test.ts',
    reason: 'names the authorized reference theme in its titles and asserts the built shell never references it',
  },
];

type Scope = 'fixture' | 'test' | 'none';
type Kind = 'word' | 'host' | 'tool' | 'name';
interface Finding {
  path: string;
  scope: Scope;
  kind: Kind;
  term: string;
  line: number;
}

const FIXTURE_PREFIXES = ['fixtures/', 'test/fixtures/', 'test/__golden__/', 'test/rendering/fixtures/', 'test/helpers/'];
const ANCHORS: Record<Exclude<Scope, 'none'>, string[]> = {
  fixture: ['fixtures/README.md'],
  test: ['test/fixture-leak.test.ts'],
};

function scopeOf(rel: string): Scope {
  if (FIXTURE_PREFIXES.some((prefix) => rel.startsWith(prefix))) return 'fixture';
  if (rel.startsWith('test/') || rel === 'playwright.config.ts') return 'test';
  return 'none';
}

function wordRegex(word: string, flags: string): RegExp {
  const body = word
    .split('-')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(?:-|\\s+)');
  return new RegExp(`\\b${body}\\b`, flags);
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Scans root-relative `paths` under `root`. Paths absent on disk are filtered out (not an early
 * return); files whose first 8,000 bytes hold a NUL byte are binary (git's own rule) and skipped. */
function scanFiles(root: string, paths: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of paths.filter((p) => existsSync(join(root, p)))) {
    const scope = scopeOf(rel);
    if (scope === 'none') continue;
    const add = (kind: Kind, term: string, line: number) => findings.push({ path: rel, scope, kind, term, line });

    const segments = rel.split('/');
    for (const word of DENY_WORDS) {
      if (segments.some((segment) => wordRegex(word, 'i').test(segment))) add('name', word, 0);
    }
    if (PRIVATE_PREFIX.test(segments[segments.length - 1])) add('name', 'private-prefix', 0);

    const buffer = readFileSync(join(root, rel));
    if (buffer.subarray(0, 8000).includes(0)) continue;
    const text = buffer.toString('utf8');
    const terms: [Kind, string[]][] = [
      ['word', DENY_WORDS],
      ['host', HOST_TELLS],
      ['tool', TOOL_TELLS],
    ];
    for (const [kind, list] of terms) {
      for (const term of list) {
        const match = wordRegex(term, 'i').exec(text);
        if (match) add(kind, term, lineOf(text, match.index));
      }
    }
  }
  return findings;
}

function exemptionMatches(pattern: string, rel: string): boolean {
  return pattern.endsWith('/**') ? rel.startsWith(pattern.slice(0, -2)) : rel === pattern;
}
function fixtureExempt(f: Finding): boolean {
  return (
    f.scope === 'fixture' &&
    f.kind === 'word' &&
    FIXTURE_EXEMPTIONS.some((e) => e.word === f.term && exemptionMatches(e.path, f.path))
  );
}
function sourceExempt(f: Finding): boolean {
  return f.scope === 'test' && SOURCE_EXEMPTIONS.some((e) => e.path === f.path);
}
const describeFinding = (f: Finding) => `${f.path}${f.line ? `:${f.line}` : ''} (${f.kind} ${f.term})`;

function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return [...new Set(out.split('\0').filter(Boolean))].sort();
}

describe('fixture and test-source leak guard (D-08, D-16, TEST-03)', () => {
  const tracked = trackedFiles();
  const findings = scanFiles(REPO_ROOT, tracked);
  const planted: string[] = [];
  afterAll(() => {
    for (const dir of planted) rmSync(dir, { recursive: true, force: true });
  });

  it('keeps every exemption list frozen at its decided length', () => {
    expect(FIXTURE_EXEMPTIONS).toHaveLength(3);
    expect(FIXTURE_EXEMPTIONS.every((e) => e.word === 'studio-portal' && e.reason.length > 0)).toBe(true);
    expect(SOURCE_EXEMPTIONS).toHaveLength(3);
    expect(SOURCE_EXEMPTIONS.every((e) => e.reason.length > 0)).toBe(true);
  });

  it('has each scope anchor in git file list, so an empty list cannot pass', () => {
    for (const [scope, anchors] of Object.entries(ANCHORS)) {
      for (const anchor of anchors) expect(tracked, `${scope} anchor ${anchor}`).toContain(anchor);
    }
  });

  it('finds no private word, host, tool tell or file name in the fixtures', () => {
    const offenders = findings.filter((f) => f.scope === 'fixture' && !fixtureExempt(f));
    expect(offenders.map(describeFinding)).toEqual([]);
  });

  it('finds no private word, host, tool tell or file name in the test sources', () => {
    const offenders = findings.filter((f) => f.scope === 'test' && !sourceExempt(f));
    expect(offenders.map(describeFinding)).toEqual([]);
  });

  it('has no stale exemption: every entry still covers at least one finding', () => {
    for (const e of FIXTURE_EXEMPTIONS) {
      const hits = findings.filter((f) => fixtureExempt(f) && exemptionMatches(e.path, f.path) && f.term === e.word);
      expect(hits.length, `fixture exemption ${e.path}`).toBeGreaterThan(0);
    }
    for (const e of SOURCE_EXEMPTIONS) {
      const hits = findings.filter((f) => f.path === e.path && sourceExempt(f));
      expect(hits.length, `source exemption ${e.path}`).toBeGreaterThan(0);
    }
  });

  describe('planted control', () => {
    function plant(files: Record<string, string>): string {
      const root = mkdtempSync(join(tmpdir(), 'labelore-leak-'));
      planted.push(root);
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, rel)), { recursive: true });
        writeFileSync(join(root, rel), text, 'utf8');
      }
      return root;
    }

    it('reports every deny word, the spaced form, a host, a tool tell and a private file name, but not nodeId', () => {
      const files: Record<string, string> = {};
      DENY_WORDS.forEach((word, i) => {
        files[`fixtures/word-${i}.md`] = `A line that mentions ${word} plainly.\n`;
      });
      files['fixtures/spaced.md'] = 'The Studio Portal checkout lives somewhere.\n';
      files['test/spaced-cine.md'] = 'See Cinedise Portal for details.\n';
      files['fixtures/host.md'] = 'ssh to rhgpu now\n';
      files['test/tool.md'] = 'smartctl output pasted here\n';
      files['test/sp01-REVIEW.md'] = 'harmless body\n';
      files['test/clean.ts'] = 'const nodeId = 1;\n';
      const root = plant(files);
      const found = scanFiles(root, Object.keys(files));
      const byPath = (p: string) => found.filter((f) => f.path === p);

      DENY_WORDS.forEach((word, i) => {
        expect(byPath(`fixtures/word-${i}.md`).map((f) => f.term)).toContain(word);
      });
      expect(byPath('fixtures/spaced.md').map((f) => f.term)).toContain('studio-portal');
      expect(byPath('test/spaced-cine.md').map((f) => f.term)).toContain('cinedise-portal');
      expect(byPath('fixtures/host.md').map((f) => f.kind)).toContain('host');
      expect(byPath('test/tool.md').map((f) => f.kind)).toContain('tool');
      expect(byPath('test/sp01-REVIEW.md').map((f) => f.kind)).toContain('name');
      expect(byPath('test/clean.ts')).toEqual([]);
    });

    it('skips a binary file and a listed path that is absent', () => {
      const root = plant({});
      mkdirSync(join(root, 'fixtures'));
      writeFileSync(join(root, 'fixtures/font.bin'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from('cinedise')]));
      expect(scanFiles(root, ['fixtures/font.bin', 'fixtures/gone.md'])).toEqual([]);
    });
  });
});
