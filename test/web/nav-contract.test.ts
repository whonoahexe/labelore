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
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { blankComments, callArguments, walkSource } from '../helpers/source-scan.ts';
import { ProjectScopeProvider, Link as ProjectLink, UnscopedLink, useProjectHref, useUnscopedProjectHref } from '../../src/web/nav.tsx';
import { splitProjectPath, splitScope, withProjectScope } from '../../src/web/project-path.ts';

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

// Phase 11, D-11: the workstream scope is the second URL position. It is peeled once (splitScope), carried by the
// prefixing module, and every request and cache key names it.
describe('the workstream scope in the nav', () => {
  it('splitScope peels /workstreams/{name} and leaves anything else alone', () => {
    expect(splitScope('/workstreams/intake/')).toEqual({ scope: 'intake', rest: '/' });
    expect(splitScope('/workstreams/intake')).toEqual({ scope: 'intake', rest: '/' });
    expect(splitScope('/workstreams/intake/roadmap')).toEqual({ scope: 'intake', rest: '/roadmap' });
    expect(splitScope('/workstreams/roadmap/phase-1')).toEqual({ scope: 'roadmap', rest: '/phase-1' });
    expect(splitScope('/workstreams')).toEqual({ scope: null, rest: '/workstreams' });
    expect(splitScope('/workstreams/')).toEqual({ scope: null, rest: '/workstreams/' });
    expect(splitScope('/roadmap')).toEqual({ scope: null, rest: '/roadmap' });
    expect(splitScope('/')).toEqual({ scope: null, rest: '/' });
    expect(splitScope('/workstreamsx/intake')).toEqual({ scope: null, rest: '/workstreamsx/intake' });
  });

  it('decodes the name once and keeps a malformed one raw', () => {
    expect(splitScope('/workstreams/a%20b/x')).toEqual({ scope: 'a b', rest: '/x' });
    expect(splitScope('/workstreams/a%2Fb/x')).toEqual({ scope: 'a/b', rest: '/x' });
    expect(splitScope('/workstreams/100%/x')).toEqual({ scope: '100%', rest: '/x' });
  });

  it('peels the scope off the part of the pathname after the slug', () => {
    const { rest } = splitProjectPath('/brinkwater/workstreams/intake/roadmap');
    expect(splitScope(rest)).toEqual({ scope: 'intake', rest: '/roadmap' });
  });

  it('withProjectScope builds /{slug}/workstreams/{name}{to} and is withProjectSlug without a scope', () => {
    expect(withProjectScope('p', 'intake', '/roadmap')).toBe('/p/workstreams/intake/roadmap');
    expect(withProjectScope('p', 'intake', '/')).toBe('/p/workstreams/intake');
    expect(withProjectScope('p', 'intake', '/search?q=a#b')).toBe('/p/workstreams/intake/search?q=a#b');
    expect(withProjectScope('p', null, '/roadmap')).toBe('/p/roadmap');
    expect(withProjectScope(null, 'intake', '/roadmap')).toBe('/roadmap');
  });

  it('keeps the name one encoded segment and the single-slash rule inside a scope (T-11-46)', () => {
    expect(withProjectScope('p', 'a/b?c#d', '/x')).toBe('/p/workstreams/a%2Fb%3Fc%23d/x');
    for (const crafted of ['//evil.example', '/\\evil.example', 'https://evil.example', 'roadmap', '']) {
      expect(withProjectScope('p', 'intake', crafted)).toBe('/p/workstreams/intake');
    }
  });

  function hrefsAt(scope: string | null): string[] {
    const inside = createElement(
      'div',
      null,
      createElement(ProjectLink, { to: '/roadmap' }),
      createElement(ProjectLink, { to: '/' }),
      createElement(UnscopedLink, { to: '/roadmap' }),
      createElement(function Hrefs() {
        return createElement(
          'span',
          { 'data-scoped': useProjectHref('/state'), 'data-unscoped': useUnscopedProjectHref('/state') },
        );
      }),
    );
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/p/anything'] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/:project/*',
            element: createElement(ProjectScopeProvider, { value: scope }, inside),
          }),
        ),
      ),
    );
    return [...html.matchAll(/(?:href|data-scoped|data-unscoped)="([^"]*)"/g)].map((match) => match[1]);
  }

  it('prefixes the scope in every hook inside a scope, and the unscoped variant skips it', () => {
    expect(hrefsAt('intake')).toEqual([
      '/p/workstreams/intake/roadmap',
      '/p/workstreams/intake',
      '/p/roadmap',
      '/p/workstreams/intake/state',
      '/p/state',
    ]);
  });

  it('leaves a flat project exactly as it was', () => {
    expect(hrefsAt(null)).toEqual(['/p/roadmap', '/p', '/p/roadmap', '/p/state', '/p/state']);
  });

  it('keeps useProjectScope and the scope prefixing in nav.tsx', () => {
    const nav = read('src/web/nav.tsx');
    for (const name of ['useProjectScope', 'ProjectScopeProvider', 'UnscopedLink', 'useUnscopedProjectHref']) {
      expect(nav).toMatch(new RegExp(`export (?:const|function) ${name}\\b`));
    }
    expect(nav).toContain('withProjectScope');
  });

  describe('every request names its scope', () => {
    /** Files that may call projectUrl or fetchPresentation without the scope: the API module itself, whose own
     * open and refresh calls are project-wide on purpose, and the key factory. */
    const API_MODULE = 'src/web/api.ts';
    /** The one router branch that resolves an un-prefixed legacy address against the opened project's flat pages. */
    const FLAT_ON_PURPOSE = ['src/web/app-router.tsx'];

    /** `file:index` of every call to `name` whose argument at `position` is not the page's `scope`. */
    function unscoped(source: string, file: string, name: string, position: number): string[] {
      return callArguments(source, name)
        .map((args, index) => ({ args, index }))
        .filter(({ args }) => {
          const arg = args[position];
          if (arg === 'scope') return false;
          return !(arg === 'null' && FLAT_ON_PURPOSE.includes(file));
        })
        .map(({ index }) => `${file}:${name}#${index}`);
    }

    it('passes the scope from useProjectScope to every projectUrl and fetchPresentation call', () => {
      const offenders = files
        .filter((file) => file !== API_MODULE && file !== 'src/web/query-keys.ts')
        .flatMap((file) => [
          ...unscoped(read(file), file, 'projectUrl', 2),
          ...unscoped(read(file), file, 'fetchPresentation', 1),
        ]);
      expect(offenders).toEqual([]);
    });

    it('lets the API module send the presentation to the scope it was given', () => {
      expect(callArguments(read(API_MODULE), 'projectUrl').map((args) => args.join(' | '))).toContain(
        "slug | '/presentation' | scope",
      );
    });

    it('reports a call that omits the scope, and passes one that carries it', async () => {
      const root = await mkdtemp(join(tmpdir(), 'labelore-nav-scope-'));
      try {
        const planted = join(root, 'planted.tsx');
        await writeFile(
          planted,
          [
            `const a = projectUrl(slug, '/roadmap');`,
            "const b = projectUrl(slug, `/search?q=${a(b, c)}`, scope);",
            `const c = fetchPresentation(slug);`,
            `const d = fetchPresentation(slug, scope);`,
            `// projectUrl(slug, '/x') in a comment is not a call`,
            `function projectUrl(slug, path, scope) {}`,
            `const e = head.projectUrl(slug);`,
          ].join('\n'),
          'utf8',
        );
        const text = readFileSync(planted, 'utf8');
        expect(unscoped(text, 'planted.tsx', 'projectUrl', 2)).toEqual(['planted.tsx:projectUrl#0']);
        expect(unscoped(text, 'planted.tsx', 'fetchPresentation', 1)).toEqual(['planted.tsx:fetchPresentation#0']);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });
});
