// NAV-11 / D-12 / D-14: the standing scan that keeps the legacy-redirect code deletable and silent.
//   1. Exactly one file under src imports src/presentation/legacy-routes.ts: src/web/route-dispatch.ts. An
//      exact allowlist, so a second importer fails and so does a stale entry. Deleting the module at v2.1
//      close then removes one file, its test, its URL helper and two dispatcher branches, nothing else.
//   2. No code under src/web speaks of a moved link ("has moved", "moved to", "old link"): the redirect is
//      silent, with no notice, banner or toast of its own.
//   3. The redirect branches of app-router.tsx render a Navigate and nothing else.
// Comments are blanked before every scan, so a comment that merely mentions the module never counts. The
// positive controls scan planted text written to a mkdtemp folder (never src/), proving each rule still bites.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { blankComments, walkSource } from '../helpers/source-scan.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const IMPORTERS_ALLOWED = ['src/web/route-dispatch.ts'];

const IMPORT_OF_LEGACY = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"][^'"]*\blegacy-routes(?:\.ts)?['"]/;
const MOVED_COPY = /has moved|moved to|old link/i;

// Reviewed, unrelated wording: a todo that was filed away reads "Moved to todos/completed/". It describes a
// file on disk, not a link. An exact list, so a stale entry fails the test as surely as a new one does.
const MOVED_COPY_ALLOWED = [{ file: 'src/web/views/todo-lifecycle.ts', phrase: 'moved to' }];

/** True when `source` (comments blanked) imports the legacy module, statically or dynamically. */
function importsLegacy(source: string): boolean {
  return IMPORT_OF_LEGACY.test(blankComments(source));
}

/** The first moved-link phrase in `source` (comments blanked), or null. */
function movedCopyIn(source: string): string | null {
  return blankComments(source).match(MOVED_COPY)?.[0] ?? null;
}

/** The text of a redirect branch: from `start` up to (not including) the first `end` after it. */
function branchBetween(source: string, start: RegExp, end: RegExp): string {
  const code = blankComments(source);
  const from = code.search(start);
  if (from < 0) return '';
  const rest = code.slice(from);
  const stop = rest.slice(1).search(end);
  return stop < 0 ? rest : rest.slice(0, stop + 1);
}

/** True when a redirect branch renders a Navigate and no notice-like element or text of its own. */
function rendersOnlyNavigate(branch: string): boolean {
  return (
    /<Navigate\b/.test(branch) &&
    !/toast|notice|banner|role=|<p[\s>]|<h[1-6][\s>]|<div[\s>]|<section[\s>]|<span[\s>]|Notice|Toast|Banner/.test(branch)
  );
}

const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

describe('legacy module isolation (D-14)', () => {
  it('is imported by src/web/route-dispatch.ts and by nothing else under src', () => {
    const importers = walkSource(['src'], ['.ts', '.tsx']).filter((file) => importsLegacy(read(file)));
    expect(importers).toEqual(IMPORTERS_ALLOWED);
  });

  it('fails on a stale allowlist entry', () => {
    expect(importsLegacy(read('src/web/route-dispatch.ts'))).toBe(true);
    expect(walkSource(['src'], ['.ts', '.tsx'])).toContain(IMPORTERS_ALLOWED[0]);
  });
});

describe('the redirect says nothing (D-12)', () => {
  it('has no moved-link copy anywhere under src/web beyond the reviewed todo-folder wording', () => {
    const findings = walkSource(['src/web'], ['.ts', '.tsx'])
      .map((file) => ({ file, phrase: movedCopyIn(read(file)) }))
      .filter((entry) => entry.phrase !== null);
    expect(findings).toEqual(MOVED_COPY_ALLOWED);
  });

  it('renders only a Navigate on the dispatcher redirect branch of app-router.tsx', () => {
    const branch = branchBetween(read('src/web/app-router.tsx'), /case 'redirect':/, /case 'not-found'/);
    expect(branch).not.toBe('');
    expect(rendersOnlyNavigate(branch)).toBe(true);
  });

  it('renders only a Navigate on the un-prefixed redirect branch of app-router.tsx', () => {
    const branch = branchBetween(
      read('src/web/app-router.tsx'),
      /outcome\.kind === 'redirect' \? \(/,
      /\) : \(/,
    );
    expect(branch).not.toBe('');
    expect(rendersOnlyNavigate(branch)).toBe(true);
  });
});

describe('positive control: planted text in a mkdtemp folder, never src/', () => {
  let plantedRoot: string | undefined;

  afterEach(async () => {
    if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    plantedRoot = undefined;
  });

  async function planted(name: string, text: string): Promise<string> {
    plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-legacy-isolation-'));
    const file = join(plantedRoot, name);
    await writeFile(file, text, 'utf8');
    return readFileSync(file, 'utf8');
  }

  it('reports a static, a side-effect and a dynamic import of the module', async () => {
    expect(importsLegacy(await planted('a.ts', `import { x } from '../presentation/legacy-routes.ts';`))).toBe(true);
    expect(importsLegacy(await planted('b.ts', `import '../presentation/legacy-routes';`))).toBe(true);
    expect(importsLegacy(await planted('c.ts', `const m = await import("./legacy-routes.ts");`))).toBe(true);
  });

  it('ignores a comment that only names the module', async () => {
    const text = `// the decoders live in legacy-routes.ts\n/* import { x } from './legacy-routes.ts'; */\nexport const ok = 1;\n`;
    expect(importsLegacy(await planted('d.ts', text))).toBe(false);
  });

  it('reports moved-link copy in a string, in JSX text and in a template literal', async () => {
    expect(movedCopyIn(await planted('e.tsx', `const m = 'This link has moved';`))).toBe('has moved');
    expect(movedCopyIn(await planted('f.tsx', `const el = <p>Moved to the new address</p>;`))).toBe('Moved to');
    expect(movedCopyIn(await planted('g.ts', 'const m = `You followed an old link`;'))).toBe('old link');
    expect(movedCopyIn(await planted('h.ts', `// the old link redirects\nexport const ok = 1;`))).toBeNull();
  });

  it('flags a redirect branch that renders a notice beside the Navigate', async () => {
    const quiet = await planted('i.tsx', `case 'redirect':\n  return <Navigate replace to={to} />;\ncase 'not-found':`);
    const noisy = await planted(
      'j.tsx',
      `case 'redirect':\n  return <><section className="notice"><p>Moved</p></section><Navigate replace to={to} /></>;\ncase 'not-found':`,
    );
    const rule = (text: string): boolean =>
      rendersOnlyNavigate(branchBetween(text, /case 'redirect':/, /case 'not-found'/));
    expect(rule(quiet)).toBe(true);
    expect(rule(noisy)).toBe(false);
  });
});
