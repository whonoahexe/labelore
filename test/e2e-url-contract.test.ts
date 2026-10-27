// NAV-09 / T-07-12: the standing scan that keeps raw URLs out of the browser specs. Every address a
// spec opens comes from app-url.ts (projectUrl or artifactUrl, directly or through a file-local
// wrapper that calls one), so the specs follow the server's URL grammar instead of pinning one. The
// scan reads each test/e2e/*.spec.ts with comments blanked and reports three rules:
//   goto       a page.goto( argument that is not an await projectUrl/artifactUrl call, or a variable
//              assigned from one (or from a local function whose body calls one)
//   fragment   an old encoded fragment (a~, m~, p~) or ?doc=summary anywhere in the code
//   url-file   a toHaveURL( pattern that names a file extension (.md, .json)
// The planted positive control writes a violating spec to a mkdtemp folder (never test/e2e) and proves
// each rule reports, so a regex that silently stopped matching cannot pass.
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { blankComments } from './helpers/source-scan.ts';

const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), 'e2e');

type Rule = 'goto' | 'fragment' | 'url-file';

interface Violation {
  rule: Rule;
  detail: string;
}

const HELPERS = ['projectUrl', 'artifactUrl'];

/** The text inside the parentheses that open at `open` (the index of '('), or null when unbalanced. */
function balanced(code: string, open: number): string | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (quote !== null) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return code.slice(open + 1, i);
  }
  return null;
}

function callsHelper(text: string, helpers: string[]): boolean {
  return helpers.some((name) => new RegExp(`\\bawait\\s+${name}\\(`).test(text));
}

/** Names of the file-local top-level functions whose body calls projectUrl or artifactUrl. A
 * top-level function ends at the first closing brace in column 0. */
function wrapperNames(code: string): string[] {
  const names: string[] = [];
  for (const match of code.matchAll(/^(?:async\s+)?function\s+(\w+)\s*\(/gm)) {
    const close = code.indexOf('\n}', match.index);
    const body = code.slice(match.index, close < 0 ? code.length : close);
    if (HELPERS.some((name) => new RegExp(`\\b${name}\\(`).test(body))) names.push(match[1]!);
  }
  return names;
}

/** True when `name` is assigned (or destructured) in the file from an await of an accepted call. */
function assignedFromHelper(code: string, name: string, accepted: string[]): boolean {
  const target = `(?:\\{[^}]*\\b${name}\\b[^}]*\\}|${name})`;
  const pattern = new RegExp(`\\b(?:const|let)\\s+${target}\\s*=\\s*await\\s+(\\w+)\\(`, 'g');
  for (const match of code.matchAll(pattern)) {
    if (accepted.includes(match[1]!)) return true;
  }
  return false;
}

function scanSpec(source: string): Violation[] {
  const code = blankComments(source);
  const violations: Violation[] = [];
  const accepted = [...HELPERS, ...wrapperNames(code)];

  for (const match of code.matchAll(/\bpage\.goto\(/g)) {
    const argument = balanced(code, match.index + match[0].length - 1)?.trim() ?? '';
    const direct = callsHelper(argument, HELPERS) && /^await\s+\w+\(/.test(argument);
    const identifier = /^\w+$/.test(argument) && assignedFromHelper(code, argument, accepted);
    if (!direct && !identifier) violations.push({ rule: 'goto', detail: `page.goto(${argument})` });
  }

  for (const fragment of ['a~', 'm~', 'p~', '?doc=summary']) {
    if (code.includes(fragment)) violations.push({ rule: 'fragment', detail: fragment });
  }

  for (const match of code.matchAll(/\btoHaveURL\(/g)) {
    const argument = balanced(code, match.index + match[0].length - 1) ?? '';
    if (/\.(?:md|json)\b/.test(argument)) violations.push({ rule: 'url-file', detail: argument.trim() });
  }

  return violations;
}

async function specFiles(): Promise<string[]> {
  return (await readdir(E2E_DIR)).filter((name) => name.endsWith('.spec.ts')).sort();
}

describe('browser spec URL contract', () => {
  const folders: string[] = [];
  afterEach(async () => {
    await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
  });

  it('scans the spec files', async () => {
    expect((await specFiles()).length).toBeGreaterThanOrEqual(20);
  });

  it('finds no raw address, old fragment or file-named URL pattern in any spec', async () => {
    const report: string[] = [];
    for (const name of await specFiles()) {
      const source = await readFile(join(E2E_DIR, name), 'utf8');
      for (const violation of scanSpec(source)) report.push(`${name}: ${violation.rule}: ${violation.detail}`);
    }
    expect(report).toEqual([]);
  });

  it('accepts the shapes the specs are meant to use', () => {
    const source = [
      "import { artifactUrl, projectUrl } from './app-url.ts';",
      'async function resolveThing(base: string) { return artifactUrl(base, "x"); }',
      'async function t(page, base) {',
      '  const a = await artifactUrl(base, "p");',
      '  const { b, path } = await resolveThing(base);',
      '  await page.goto(a);',
      '  await page.goto(b);',
      "  await page.goto(await projectUrl(base, '/roadmap'));",
      '  await expect(page).toHaveURL(exactUrl(a));',
      '  await expect(page).toHaveURL(/open=stack/);',
      '}',
    ].join('\n');
    expect(scanSpec(source)).toEqual([]);
  });

  it('reports every rule on a planted spec', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'labelore-url-contract-'));
    folders.push(folder);
    const planted = join(folder, 'planted.spec.ts');
    await writeFile(
      planted,
      [
        'async function t(page, base) {',
        "  await page.goto('/roadmap');",
        '  await page.goto(`${base}/x`);',
        '  const raw = `${base}/y`;',
        '  await page.goto(raw);',
        "  await page.goto('/m~abc');",
        "  await page.goto('/summary?doc=summary');",
        '  await expect(page).toHaveURL(/01-REVIEW-FIX\\.md/);',
        '  await expect(page).toHaveURL(new RegExp(`${base}/data.json`));',
        '}',
      ].join('\n'),
    );
    const violations = scanSpec(await readFile(planted, 'utf8'));
    const count = (rule: Rule) => violations.filter((violation) => violation.rule === rule).length;
    expect(count('goto')).toBe(5);
    expect(count('fragment')).toBe(2);
    expect(count('url-file')).toBe(2);
  });

  it('ignores a violation that only appears in a comment', () => {
    expect(scanSpec("// await page.goto('/x'); m~ ?doc=summary\n/* toHaveURL(/a.md/) */")).toEqual([]);
  });
});
