// NAV-09: the standing nav contract. The project slug is prefixed in one place (src/web/nav.tsx),
// so nothing else in src/web may import a router link, navigate hook or location reader straight
// from react-router, key a query on the raw location, or hand a project page URL to a bare href.
// ESLint (no-restricted-imports) catches the first at edit time; this walks every .ts/.tsx under
// src/web with comments blanked, so the contract also holds when lint is skipped.
//
// The href allowlist is exact: a site that goes stale (file gone, count changed, kind changed)
// fails, which keeps it honest. The positive control plants a file in a mkdtemp directory (never
// src/) and proves the import scan reports what it should, so a regex that silently stopped
// matching cannot pass.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { blankComments, walkSource } from '../helpers/source-scan.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const RESTRICTED = ['Link', 'NavLink', 'useNavigate', 'useLocation'];
const OWNERS = ['src/web/nav.tsx', 'src/web/app-router.tsx'];

/** The restricted names a source imports from 'react-router' (aliases resolved to the original,
 * `type` imports ignored, multi-line import lists included). */
function restrictedImports(source: string): string[] {
  const code = blankComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]react-router['"]/g)) {
    const whole = match[0];
    if (/^import\s+type\b/.test(whole)) continue;
    for (const raw of match[1].split(',')) {
      const item = raw.trim();
      if (item === '' || /^type\s/.test(item)) continue;
      const name = item.split(/\s+as\s+/)[0].trim();
      if (RESTRICTED.includes(name)) found.push(name);
    }
  }
  return found;
}

/** Whether a queryKey array in the source contains the raw router location. */
function rawLocationQueryKeys(source: string): string[] {
  const code = blankComments(source);
  return [...code.matchAll(/queryKey:\s*\[[^\]]*\blocation\.pathname\b[^\]]*\]/g)].map((m) => m[0]);
}

type HrefKind = 'hash' | 'new-tab' | 'project-href' | 'other';

/** Classifies every `href={` site in a source. */
function hrefSites(source: string): HrefKind[] {
  const code = blankComments(source);
  const kinds: HrefKind[] = [];
  for (const match of code.matchAll(/href=\{/g)) {
    const at = match.index ?? 0;
    const expression = code.slice(at + 'href={'.length, at + 'href={'.length + 80);
    const tagStart = code.lastIndexOf('<a', at);
    const tagEnd = code.indexOf('>', at);
    const tag = tagStart >= 0 && tagEnd > tagStart ? code.slice(tagStart, tagEnd) : '';
    if (expression.startsWith('`#')) kinds.push('hash');
    else if (/target="_blank"/.test(tag)) kinds.push('new-tab');
    else if (expression.startsWith('href}') && /\buseProjectHref\(/.test(code)) kinds.push('project-href');
    else kinds.push('other');
  }
  return kinds;
}

/** The three sanctioned bare-anchor sites, plus the one that reads useProjectHref. */
const HREF_ALLOWED: Array<{ file: string; kinds: HrefKind[] }> = [
  { file: 'src/web/components/document-outline.tsx', kinds: ['hash'] },
  { file: 'src/web/components/reference-preview.tsx', kinds: ['project-href'] },
  { file: 'src/web/pages/sketches-page.tsx', kinds: ['new-tab', 'new-tab'] },
  { file: 'src/web/views/research-briefing-components.tsx', kinds: ['new-tab'] },
];

const files = walkSource(['src/web'], ['.ts', '.tsx']);
const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

describe('nav contract over src/web', () => {
  it('walks the web layer', () => {
    expect(files.length).toBeGreaterThan(40);
    for (const owner of OWNERS) expect(files).toContain(owner);
  });

  it('imports Link, NavLink, useNavigate and useLocation from react-router only in nav.tsx and app-router.tsx', () => {
    const offenders = files
      .filter((file) => !OWNERS.includes(file))
      .filter((file) => restrictedImports(read(file)).length > 0);
    expect(offenders).toEqual([]);
  });

  it('keeps the slug-prefixing hooks in nav.tsx', () => {
    const nav = read('src/web/nav.tsx');
    for (const name of [
      'Link',
      'NavLink',
      'useProjectNavigate',
      'useProjectLocation',
      'useProjectPathname',
      'useProjectHref',
      'useProjectSlug',
    ]) {
      expect(nav).toMatch(new RegExp(`export (?:const|function) ${name}\\b`));
    }
  });

  it('keys no query on the raw router location', () => {
    const offenders = files.filter((file) => rawLocationQueryKeys(read(file)).length > 0);
    expect(offenders).toEqual([]);
  });

  it('writes href={...} only at the allowlisted sites, each of an allowed kind', () => {
    const live = files
      .map((file) => ({ file, kinds: hrefSites(read(file)) }))
      .filter((site) => site.kinds.length > 0);
    expect(live).toEqual(HREF_ALLOWED);
  });

  describe('positive control - planted files written to a mkdtemp directory, never src/', () => {
    let plantedRoot: string;

    afterEach(async () => {
      if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    });

    it('reports a restricted import, an alias of one and a multi-line list', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-nav-contract-'));
      const planted = join(plantedRoot, 'planted.tsx');
      await writeFile(
        planted,
        [
          `import { Link } from 'react-router';`,
          `import { NavLink as RouterNavLink, useSearchParams } from "react-router";`,
          `import {`,
          `  useNavigate,`,
          `  useLocation,`,
          `} from 'react-router';`,
        ].join('\n'),
        'utf8',
      );
      expect(restrictedImports(readFileSync(planted, 'utf8'))).toEqual([
        'Link',
        'NavLink',
        'useNavigate',
        'useLocation',
      ]);
    });

    it('does not report type imports, useSearchParams, nav.tsx imports or commented-out imports', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-nav-contract-'));
      const planted = join(plantedRoot, 'clean.tsx');
      await writeFile(
        planted,
        [
          `import { type To, useSearchParams } from 'react-router';`,
          `import type { Link } from 'react-router';`,
          `import { Link as NavLinkOk, useProjectNavigate } from '../nav.tsx';`,
          `// import { Link } from 'react-router';`,
          `/* import { useLocation } from 'react-router'; */`,
        ].join('\n'),
        'utf8',
      );
      expect(restrictedImports(readFileSync(planted, 'utf8'))).toEqual([]);
    });

    it('reports a queryKey built from location.pathname and an unclassified href', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-nav-contract-'));
      const planted = join(plantedRoot, 'keys.tsx');
      await writeFile(
        planted,
        [
          `const q = useQuery({ queryKey: ['plan-pair', location.pathname], queryFn });`,
          `const a = <a className="x" href={item.url}>open</a>;`,
          `const b = <a href={\`#\${id}\`}>jump</a>;`,
          `const c = <a href={out} target="_blank" rel="noopener noreferrer">out</a>;`,
        ].join('\n'),
        'utf8',
      );
      const text = readFileSync(planted, 'utf8');
      expect(rawLocationQueryKeys(text)).toHaveLength(1);
      expect(hrefSites(text)).toEqual(['other', 'hash', 'new-tab']);
    });
  });
});
