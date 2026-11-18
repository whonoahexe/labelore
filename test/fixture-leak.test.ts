// Standing leak guard (TEST-03, quick-261116-r41): no private project name, host, tool tell or
// private-looking file name may live in a fixture (scope A), a test source (scope B) or the app
// source and every other tracked file (scope C).
// The private names and hosts live in the gitignored `.leak-names.local.json` at the repo root, shaped
// {"words": [...], "hosts": [...]} (quick-261116-r41, superseding D-08's committed list), so the public
// repository never names what the guard forbids. The file is read through test/helpers/private-names.ts,
// shared with the no-skips guard. When that file is absent (a fresh clone, CI) the word
// and host scans run over empty lists by design and no test is skipped; the tool-tell, private-prefix
// file-name, scope-anchor and ignore-rule checks and the planted controls still run everywhere.
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
import { lineOf, wordRegex } from '../scripts/lib/leak-scan.mjs';
import { localPrivateNames, NAMES_FILE, readPrivateNames, type PrivateNames } from './helpers/private-names.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The real deny list, or empty lists when the local file is absent. */
const LOCAL_NAMES: PrivateNames = localPrivateNames(REPO_ROOT);

// The next two are public tool names and a file-name rule, not private names, so they stay in the
// source and keep guarding a fresh clone.
/** Public tool and vendor names that mark copied private infrastructure inside fixture/test text. */
const TOOL_TELLS = ['seagate', 'sandisk', 'smartctl', 'rclone'];
/** File names that follow a private prefix: sp, dd or sb followed by a digit or a hyphen. */
const PRIVATE_PREFIX = /^(?:sp|dd|sb)[0-9-]/i;

type Kind = 'word' | 'host' | 'tool' | 'name';

/** An exemption covers only findings of its own kind in its path (`/**` suffix means a prefix). */
interface Exemption {
  path: string;
  kind: Kind;
  reason: string;
}

/** The one test source that must hold the public tool-tell list to forbid it: exempt for one kind, with a reason. */
const SOURCE_EXEMPTIONS: Exemption[] = [
  { path: 'test/fixture-leak.test.ts', kind: 'tool', reason: 'holds the public tool-tell list and plants it' },
];

type Scope = 'fixture' | 'test' | 'source';
interface Finding {
  path: string;
  scope: Scope;
  kind: Kind;
  term: string;
  line: number;
}

const FIXTURE_PREFIXES = ['fixtures/', 'test/fixtures/', 'test/__golden__/', 'test/rendering/fixtures/', 'test/helpers/'];
const ANCHORS: Record<Scope, string[]> = {
  fixture: ['fixtures/README.md'],
  test: ['test/fixture-leak.test.ts'],
  source: ['src/server/index.ts', 'index.html'],
};

function scopeOf(rel: string): Scope {
  if (FIXTURE_PREFIXES.some((prefix) => rel.startsWith(prefix))) return 'fixture';
  if (rel.startsWith('test/') || rel === 'playwright.config.ts') return 'test';
  return 'source';
}

/** Scans root-relative `paths` under `root`. Paths absent on disk are filtered out (not an early
 * return); files whose first 8,000 bytes hold a NUL byte are binary (git's own rule) and skipped. */
function scanFiles(root: string, paths: string[], names: PrivateNames): Finding[] {
  const findings: Finding[] = [];
  for (const rel of paths.filter((p) => existsSync(join(root, p)))) {
    const scope = scopeOf(rel);
    const add = (kind: Kind, term: string, line: number) => findings.push({ path: rel, scope, kind, term, line });

    const segments = rel.split('/');
    for (const word of names.words) {
      if (segments.some((segment) => wordRegex(word, 'i').test(segment))) add('name', word, 0);
    }
    if (PRIVATE_PREFIX.test(segments[segments.length - 1])) add('name', 'private-prefix', 0);

    const buffer = readFileSync(join(root, rel));
    if (buffer.subarray(0, 8000).includes(0)) continue;
    const text = buffer.toString('utf8');
    const terms: [Kind, string[]][] = [
      ['word', names.words],
      ['host', names.hosts],
      // Scope C skips tool tells: src/rendering/ascii-graph.ts uses a public tool name as a working
      // word in its external-node classifier, which is behaviour, not a leak.
      ...(scope === 'source' ? [] : ([['tool', TOOL_TELLS]] as [Kind, string[]][])),
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
function covers(e: Exemption, f: Finding): boolean {
  return e.kind === f.kind && exemptionMatches(e.path, f.path);
}
function sourceExempt(f: Finding): boolean {
  return f.scope === 'test' && SOURCE_EXEMPTIONS.some((e) => covers(e, f));
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

/** Invented names for the planted controls: they stand in for the private list, which a clone lacks. */
const MADE_UP: PrivateNames = {
  words: ['zorblax', 'quenfrum', 'vexmoor-hall', 'tralmint', 'snodwick', 'plimthorp', 'ardvelk', 'omrixel', 'bexquill', 'fyrnwold'],
  hosts: ['gruvnet42'],
};
const TERM_KIND: [Kind, (names: PrivateNames) => string[]][] = [
  ['word', (names) => names.words],
  ['host', (names) => names.hosts],
  ['tool', () => TOOL_TELLS],
];
const EMPTY: PrivateNames = { words: [], hosts: [] };

describe('fixture, test-source and app-source leak guard (TEST-03, quick-261116-r41)', () => {
  const tracked = trackedFiles();
  const findings = scanFiles(REPO_ROOT, tracked, LOCAL_NAMES);
  const planted: string[] = [];
  afterAll(() => {
    for (const dir of planted) rmSync(dir, { recursive: true, force: true });
  });

  it('keeps every exemption list frozen at its decided length', () => {
    expect(SOURCE_EXEMPTIONS).toHaveLength(1);
    expect(SOURCE_EXEMPTIONS.every((e) => e.reason.length > 0)).toBe(true);
  });

  it('has each scope anchor in git file list, so an empty list cannot pass', () => {
    for (const [scope, anchors] of Object.entries(ANCHORS)) {
      for (const anchor of anchors) expect(tracked, `${scope} anchor ${anchor}`).toContain(anchor);
    }
  });

  it('loads a non-empty word list exactly when the local names file exists', () => {
    expect(LOCAL_NAMES.words.length > 0).toBe(existsSync(join(REPO_ROOT, NAMES_FILE)));
  });

  it('keeps the local names file ignored and out of the tracked list', () => {
    expect(() => execFileSync('git', ['check-ignore', '-q', NAMES_FILE], { cwd: REPO_ROOT })).not.toThrow();
    expect(tracked).not.toContain(NAMES_FILE);
  });

  it('finds no private word, host, tool tell or file name in the fixtures', () => {
    const offenders = findings.filter((f) => f.scope === 'fixture');
    expect(offenders.map(describeFinding)).toEqual([]);
  });

  it('finds no private word, host, tool tell or file name in the test sources', () => {
    const offenders = findings.filter((f) => f.scope === 'test' && !sourceExempt(f));
    expect(offenders.map(describeFinding)).toEqual([]);
  });

  it('finds no private word, host or file name anywhere else git would commit, the app source included', () => {
    const offenders = findings.filter((f) => f.scope === 'source');
    expect(offenders.map(describeFinding)).toEqual([]);
  });

  it('has no stale exemption: an entry covers a finding exactly when its kind has terms to find', () => {
    const terms = (kind: Kind) => TERM_KIND.find(([k]) => k === kind)![1](LOCAL_NAMES);
    for (const e of SOURCE_EXEMPTIONS) {
      const hits = findings.filter((f) => covers(e, f));
      expect(hits.length > 0, `exemption ${e.path} (${e.kind})`).toBe(terms(e.kind).length > 0);
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
      const [spacedWord] = MADE_UP.words.filter((word) => word.includes('-'));
      const spaced = spacedWord.replace('-', ' ');
      const files: Record<string, string> = {};
      MADE_UP.words.forEach((word, i) => {
        files[`fixtures/word-${i}.md`] = `A line that mentions ${word} plainly.\n`;
      });
      files['fixtures/spaced.md'] = `The ${spaced} checkout lives somewhere.\n`;
      files['test/spaced-upper.md'] = `See ${spaced.toUpperCase()} for details.\n`;
      files['fixtures/host.md'] = `ssh to ${MADE_UP.hosts[0]} now\n`;
      files['test/tool.md'] = 'smartctl output pasted here\n';
      files['test/sp01-REVIEW.md'] = 'harmless body\n';
      files['test/clean.ts'] = 'const nodeId = 1;\n';
      files['src/comment.ts'] = `// the ${MADE_UP.words[0]} checkout drifted this heading\nexport const a = 1;\n`;
      files['src/host.ts'] = `// reachable at ${MADE_UP.hosts[0]}\nexport const b = 2;\n`;
      files['src/tool.ts'] = '/** classifies rclone mounts as external */\nexport const c = /rclone/;\n';
      const root = plant(files);
      const found = scanFiles(root, Object.keys(files), MADE_UP);
      const byPath = (p: string) => found.filter((f) => f.path === p);

      MADE_UP.words.forEach((word, i) => {
        expect(byPath(`fixtures/word-${i}.md`).map((f) => f.term)).toContain(word);
      });
      expect(byPath('fixtures/spaced.md').map((f) => f.term)).toContain(spacedWord);
      expect(byPath('test/spaced-upper.md').map((f) => f.term)).toContain(spacedWord);
      expect(byPath('fixtures/host.md').map((f) => f.kind)).toContain('host');
      expect(byPath('test/tool.md').map((f) => f.kind)).toContain('tool');
      expect(byPath('test/sp01-REVIEW.md').map((f) => f.kind)).toContain('name');
      expect(byPath('test/clean.ts')).toEqual([]);
      expect(byPath('src/comment.ts').map((f) => [f.scope, f.kind, f.term])).toEqual([['source', 'word', MADE_UP.words[0]]]);
      expect(byPath('src/host.ts').map((f) => [f.scope, f.kind])).toEqual([['source', 'host']]);
      expect(byPath('src/tool.ts')).toEqual([]);
      const moved = plant({ 'test/tool-copy.ts': files['src/tool.ts'] });
      expect(scanFiles(moved, ['test/tool-copy.ts'], MADE_UP).map((f) => f.kind)).toEqual(['tool']);
    });

    it('still reports a tool tell and a private file name when the name lists are empty', () => {
      const files = { 'test/tool.md': 'smartctl output pasted here\n', 'test/dd01-NOTES.md': 'harmless body\n' };
      const root = plant(files);
      const found = scanFiles(root, Object.keys(files), EMPTY);
      expect(found.map((f) => [f.path, f.kind])).toEqual([
        ['test/tool.md', 'tool'],
        ['test/dd01-NOTES.md', 'name'],
      ]);
    });

    it('reports every name in the local list when planted into a fixture file', () => {
      const names = [...LOCAL_NAMES.words.map((term) => ['word', term] as const), ...LOCAL_NAMES.hosts.map((term) => ['host', term] as const)];
      const files: Record<string, string> = {};
      names.forEach(([, term], i) => {
        files[`fixtures/local-${i}.md`] = `A line that mentions ${term} plainly.\n`;
      });
      const root = plant(files);
      const found = scanFiles(root, Object.keys(files), LOCAL_NAMES);
      names.forEach(([kind, term], i) => {
        expect(found.filter((f) => f.path === `fixtures/local-${i}.md`).map((f) => [f.kind, f.term])).toContainEqual([kind, term]);
      });
    });

    it('throws on a malformed names file', () => {
      const root = plant({
        'bad-words.json': '{"words": "not-a-list", "hosts": []}\n',
        'bad-host.json': '{"words": [], "hosts": [""]}\n',
        'good.json': '{"words": ["a-b"], "hosts": ["h"]}\n',
      });
      expect(() => readPrivateNames(join(root, 'bad-words.json'))).toThrow(NAMES_FILE);
      expect(() => readPrivateNames(join(root, 'bad-host.json'))).toThrow(NAMES_FILE);
      expect(readPrivateNames(join(root, 'good.json'))).toEqual({ words: ['a-b'], hosts: ['h'] });
    });

    it('skips a binary file and a listed path that is absent', () => {
      const root = plant({});
      mkdirSync(join(root, 'fixtures'));
      writeFileSync(join(root, 'fixtures/font.bin'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(MADE_UP.words[0])]));
      expect(scanFiles(root, ['fixtures/font.bin', 'fixtures/gone.md'], MADE_UP)).toEqual([]);
    });
  });
});
