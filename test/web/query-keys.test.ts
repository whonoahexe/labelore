// Standing scans over src/web that keep every page scoped to its own project (PLAT-08, T-08-37).
// Plain text and regex over source with comments blanked, the idiom of test/helpers/source-scan.ts. Three rules:
//   1. A react-query key, or a cache read or write, is never built from an array literal: every key comes
//      from src/web/query-keys.ts (projectKey / projectsKey), so every project key starts with the slug.
//   2. A string or template literal that starts with /api/ lives only in src/web/api.ts, so a request
//      cannot name a project's data without going through projectUrl.
//   3. TanStack Query's previous-data option is never used: it would show one project's data under
//      another project's address while the next one loads.
// Each rule has a planted positive control: the same scanner runs over a temporary tree, must report a
// violating file and must not report a clean one.
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { copyPathText, realPathMap } from '../../src/web/components/copy-path-button.tsx';
import { splitScope } from '../../src/web/project-path.ts';
import { projectKey, projectWideKey } from '../../src/web/query-keys.ts';
import { blankComments, callArguments, walkSource } from '../helpers/source-scan.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const WEB_DIR = 'src/web';
const KEY_FACTORY = 'src/web/query-keys.ts';
const API_MODULE = 'src/web/api.ts';

// The two forbidden identifiers are built from parts so this file stays clean under its own scan.
const PREVIOUS_DATA_OPTION = ['placeholder', 'Data'].join('');
const PREVIOUS_DATA_HELPER = ['keepPrevious', 'Data'].join('');

const CACHE_CALLS = [
  'setQueryData',
  'getQueryData',
  'getQueryState',
  'setQueriesData',
  'getQueriesData',
  'ensureQueryData',
  'fetchQuery',
  'prefetchQuery',
  'invalidateQueries',
  'refetchQueries',
  'removeQueries',
  'cancelQueries',
  'resetQueries',
  'isFetching',
];

interface Rule {
  name: string;
  /** The one file allowed to hold what the rule forbids. */
  exempt: string | null;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    name: 'a query or mutation key built from an array literal',
    exempt: KEY_FACTORY,
    pattern: new RegExp(`\\b(?:query|mutation)Key\\s*:\\s*\\[|\\b(?:${CACHE_CALLS.join('|')})\\(\\s*\\[`),
  },
  {
    name: 'a string or template literal starting with /api/',
    exempt: API_MODULE,
    pattern: /[`'"]\/api\//,
  },
  {
    name: 'a previous-data option',
    exempt: null,
    pattern: new RegExp(`\\b(?:${PREVIOUS_DATA_OPTION}|${PREVIOUS_DATA_HELPER})\\b`),
  },
];

/** Every .ts and .tsx file under `<root>/src/web`, as paths relative to `root`. */
function webFiles(root: string): string[] {
  const fromRepo = relative(REPO_ROOT, join(root, WEB_DIR));
  return walkSource([fromRepo], ['.ts', '.tsx']).map((rel) => relative(root, resolve(REPO_ROOT, rel)).split('\\').join('/'));
}

/** `file: line` for every line of a src/web file that one rule forbids there. */
async function violations(root: string, rule: Rule): Promise<string[]> {
  const found: string[] = [];
  for (const file of webFiles(root)) {
    if (file === rule.exempt) continue;
    const text = blankComments(await readFile(join(root, file), 'utf8'));
    text.split('\n').forEach((line, index) => {
      if (rule.pattern.test(line)) found.push(`${file}:${index + 1}`);
    });
  }
  return found;
}

describe('the real src/web tree', () => {
  it('finds the files it is meant to scan, including the two exempt ones', () => {
    const files = webFiles(REPO_ROOT);
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(KEY_FACTORY);
    expect(files).toContain(API_MODULE);
  });

  it.each(RULES)('holds $name nowhere outside its one file', async (rule) => {
    expect(await violations(REPO_ROOT, rule)).toEqual([]);
  });
});

describe('planted positive controls', () => {
  const planted: string[] = [];

  afterAll(async () => {
    for (const dir of planted) await rm(dir, { recursive: true, force: true });
  });

  async function plant(files: Record<string, string>): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'labelore-query-keys-'));
    planted.push(root);
    for (const [rel, text] of Object.entries(files)) {
      await mkdir(dirname(join(root, rel)), { recursive: true });
      await writeFile(join(root, rel), text);
    }
    return root;
  }

  const [keyRule, apiRule, previousRule] = RULES;

  it('reports an array-literal key and cache access, and not a factory-built one', async () => {
    const root = await plant({
      'src/web/bad-query.tsx': "export const a = useQuery({ queryKey: ['sketches'], queryFn: f });\n",
      'src/web/bad-write.ts': "client.setQueryData(['presentation'], value);\n",
      'src/web/bad-invalidate.ts': "client.invalidateQueries({ queryKey: ['project', slug] });\n",
      'src/web/bad-mutation.ts': "useMutation({ mutationKey: ['refresh'], mutationFn: f });\n",
      'src/web/clean.tsx': "export const a = useQuery({ queryKey: projectKey(slug, 'sketches'), queryFn: f });\n",
      'src/web/commented.ts': "// queryKey: ['sketches'] is what the scan forbids\n",
      [KEY_FACTORY]: "export const projectsKey = ['projects'] as const;\nconst k = { queryKey: ['project'] };\n",
    });
    expect(await violations(root, keyRule)).toEqual([
      'src/web/bad-invalidate.ts:1',
      'src/web/bad-mutation.ts:1',
      'src/web/bad-query.tsx:1',
      'src/web/bad-write.ts:1',
    ]);
  });

  it('reports an /api/ literal outside api.ts, in any quote style, and not a comment or a project-relative path', async () => {
    const root = await plant({
      'src/web/bad-single.ts': "const a = fetch('/api/projects');\n",
      'src/web/bad-double.ts': 'const a = fetch("/api/projects");\n',
      'src/web/bad-template.ts': 'const a = fetch(`/api/projects/${slug}/roadmap`);\n',
      'src/web/clean.ts': "const a = projectUrl(slug, '/roadmap');\n// '/api/projects' only in a comment\n",
      [API_MODULE]: "export const x = '/api/projects';\n",
    });
    expect(await violations(root, apiRule)).toEqual([
      'src/web/bad-double.ts:1',
      'src/web/bad-single.ts:1',
      'src/web/bad-template.ts:1',
    ]);
  });

  it('reports the previous-data option and its helper, and not other query options', async () => {
    const root = await plant({
      'src/web/bad-option.tsx': `useQuery({ ${PREVIOUS_DATA_OPTION}: (previous) => previous });\n`,
      'src/web/bad-helper.tsx': `import { ${PREVIOUS_DATA_HELPER} } from '@tanstack/react-query';\n`,
      'src/web/clean.tsx': 'useQuery({ queryKey: projectKey(slug, "x"), staleTime: 0 });\n',
    });
    expect(await violations(root, previousRule)).toEqual(['src/web/bad-helper.tsx:1', 'src/web/bad-option.tsx:1']);
  });

  it('exempts only the factory file and the api module, never a same-named file elsewhere', async () => {
    const root = await plant({
      'src/web/pages/query-keys.ts': "const k = { queryKey: ['x'] };\n",
      'src/web/components/api.ts': "const a = '/api/x';\n",
    });
    expect(await violations(root, keyRule)).toEqual(['src/web/pages/query-keys.ts:1']);
    expect(await violations(root, apiRule)).toEqual(['src/web/components/api.ts:1']);
  });
});

// Phase 11, T-11-48: inside a workstream the scope is part of every key, so one workstream's data never renders
// under another's address, and a flat project's keys are exactly what they were.
describe('workstream scopes in query keys', () => {
  it('gives a flat project the key it always had', () => {
    expect(projectKey('brinkwater', null, 'presentation')).toEqual(['project', 'brinkwater', 'presentation']);
    expect(projectKey('brinkwater', null)).toEqual(['project', 'brinkwater']);
  });

  it('gives two scopes of one project, and the flat project, three different keys', () => {
    const flat = projectKey('brinkwater', null, 'presentation');
    const intake = projectKey('brinkwater', 'intake', 'presentation');
    const ledger = projectKey('brinkwater', 'ledger', 'presentation');
    expect(intake).toEqual(['project', 'brinkwater', 'ws', 'intake', 'presentation']);
    expect(new Set([flat, intake, ledger].map((key) => JSON.stringify(key))).size).toBe(3);
  });

  it('never lets a scope name collide with a flat key shape', () => {
    // A workstream called 'presentation' is still under 'ws', so it cannot read the flat presentation.
    expect(projectKey('p', 'presentation', 'x')).not.toEqual(projectKey('p', null, 'presentation', 'x'));
  });

  it('refreshes and forgets every scope of one project and nothing of another', async () => {
    const client = new QueryClient();
    client.setQueryData(projectKey('brinkwater', null, 'presentation'), 1);
    client.setQueryData(projectKey('brinkwater', 'intake', 'presentation'), 2);
    client.setQueryData(projectKey('brinkwater', 'ledger', 'roadmap'), 3);
    client.setQueryData(projectKey('shapes', null, 'presentation'), 4);
    await client.invalidateQueries({ queryKey: projectWideKey('brinkwater') });
    const stale = (key: readonly unknown[]): boolean => client.getQueryState(key)?.isInvalidated === true;
    expect(stale(projectKey('brinkwater', null, 'presentation'))).toBe(true);
    expect(stale(projectKey('brinkwater', 'intake', 'presentation'))).toBe(true);
    expect(stale(projectKey('brinkwater', 'ledger', 'roadmap'))).toBe(true);
    expect(stale(projectKey('shapes', null, 'presentation'))).toBe(false);
  });

  it('peels the scope the keys are built from', () => {
    expect(splitScope('/workstreams/intake/roadmap').scope).toBe('intake');
    expect(splitScope('/roadmap').scope).toBeNull();
  });

  it('passes the scope to every projectKey call in src/web', () => {
    const offenders: string[] = [];
    for (const file of webFiles(REPO_ROOT)) {
      if (file === KEY_FACTORY) continue;
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
      callArguments(source, 'projectKey').forEach((args, index) => {
        const arg = args[1];
        // The one flat-on-purpose key: the router's un-prefixed legacy branch resolves against flat pages.
        if (arg === 'scope' || (arg === 'null' && file === 'src/web/app-router.tsx')) return;
        offenders.push(`${file}:projectKey#${index}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('reports a key built without the scope', () => {
    const planted = [
      "const a = projectKey(slug, 'presentation');",
      "const b = projectKey(slug, scope, 'presentation');",
      'const c = projectWideKey(slug);',
    ].join('\n');
    expect(callArguments(planted, 'projectKey')).toEqual([
      ['slug', "'presentation'"],
      ['slug', 'scope', "'presentation'"],
    ]);
  });
});

describe('copy-path names the real file', () => {
  const artifacts = [
    { path: '.planning/ROADMAP.md', realPath: '.planning/workstreams/intake/ROADMAP.md' },
    { path: '.planning/PROJECT.md', realPath: '.planning/PROJECT.md' },
    { path: '.planning/STATE.md' },
  ];

  it('copies realPath when the artifact has one, and path when it has not', () => {
    const map = realPathMap(artifacts);
    expect(copyPathText('.planning/ROADMAP.md', map)).toBe('.planning/workstreams/intake/ROADMAP.md');
    expect(copyPathText('.planning/STATE.md', map)).toBe('.planning/STATE.md');
    expect(copyPathText('.planning/elsewhere.md', map)).toBe('.planning/elsewhere.md');
  });

  it('prefers a realPath handed to the button over the map', () => {
    expect(copyPathText('.planning/ROADMAP.md', realPathMap(artifacts), '.planning/x.md')).toBe('.planning/x.md');
  });

  it('is the identity for a flat project, whose artifacts carry no realPath', () => {
    expect(realPathMap([{ path: '.planning/ROADMAP.md' }]).size).toBe(0);
    expect(copyPathText('.planning/ROADMAP.md', realPathMap([]))).toBe('.planning/ROADMAP.md');
  });
});
