// quick-261001-qk7 (QK7-09): real-corpus guards over every UAT.md in this repo's `.planning/`
// (excluding the sketches), fixtures/dense and `~/studio-portal/.planning/`, plus the sketch's
// synthetic testing doc named explicitly — the pattern-map-corpus.test.ts idiom (a missing
// studio-portal checkout skips its files). Every file must extract without throwing, compose to a
// non-null session through the real handler, and match the counts pinned below. The pinned counts
// were independently confirmed with awk over the source files (### count and `result:` values
// inside `## Tests`, `- key:` items and `###` / bullet counts inside `## Gaps…`) — never copied
// from the extractor's own output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { UatHandler } from '../../src/planning-repo/handlers/uat.ts';
import type { UatSession } from '../../src/planning-repo/handlers/uat-session.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composeUatSession } from '../../src/web/views/uat-session.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;
const SYNTHETIC = new URL('../../.planning/sketches/015-uat-page/synthetic-testing-UAT.md', import.meta.url).pathname;

function walkUat(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules') continue;
        stack.push(abs);
      } else if (entry.endsWith('-UAT.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  tests: number;
  pass: number;
  issue: number;
  blocked: number;
  skipped: number;
  pending: number;
  gaps: number;
  mode: 'items' | 'prose' | 'none';
  live: boolean;
  extras: string[];
}

const DONE: Omit<Pinned, 'tests' | 'pass'> = {
  issue: 0,
  blocked: 0,
  skipped: 0,
  pending: 0,
  gaps: 0,
  mode: 'none',
  live: false,
  extras: [],
};

/** Keyed by `<repo>:<path suffix>`. */
const PINNED: Record<string, Pinned> = {
  'SYN:synthetic': { tests: 7, pass: 0, issue: 2, blocked: 1, skipped: 1, pending: 3, gaps: 2, mode: 'items', live: true, extras: [] },
  'FX:phases/01-identity-slice/01-UAT.md': { ...DONE, tests: 2, pass: 2 },
  'LB:milestones/v1.0-phases/01-read-layer-domain-model/01-UAT.md': { ...DONE, tests: 23, pass: 23 },
  'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UAT.md': {
    ...DONE,
    tests: 16,
    pass: 16,
    gaps: 12,
    mode: 'prose',
    extras: ['Result', 'Round-1 detail (historical)', 'Gap Reconciliation — 2026-09-09', 'Notes'],
  },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-UAT.md': { ...DONE, tests: 4, pass: 4 },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-UAT.md': { ...DONE, tests: 9, pass: 9 },
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-UAT.md': { ...DONE, tests: 4, pass: 4, extras: ['Deferred Follow-Ups'] },
  'SP:milestones/v1.0-phases/03-file-browsing/03-UAT.md': { ...DONE, tests: 6, pass: 6, gaps: 6, mode: 'items' },
  'SP:phases/01-portal-owned-identity-sessions/01-UAT.md': { ...DONE, tests: 7, pass: 6, skipped: 1, extras: ['Notes'] },
  'SP:phases/02-roles-permission-enforcement/02-UAT.md': { ...DONE, tests: 3, pass: 3, gaps: 4, mode: 'prose' },
  'SP:phases/03-account-administration-session-control/03-UAT.md': { ...DONE, tests: 5, pass: 5, gaps: 1, mode: 'items' },
};

const FILES: { key: string; path: string }[] = [
  ...walkUat(REPO_PLANNING).map((path) => ({ key: `LB:${relative(REPO_PLANNING, path)}`, path })),
  ...walkUat(DENSE_PLANNING).map((path) => ({ key: `FX:${relative(DENSE_PLANNING, path)}`, path })),
  ...walkUat(SP_PLANNING).map((path) => ({ key: `SP:${relative(SP_PLANNING, path)}`, path })),
  { key: 'SYN:synthetic', path: SYNTHETIC },
];

function parse(path: string): { session: UatSession; input: ViewInput } {
  const content = readFileSync(path, 'utf8');
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-UAT.md',
    kind: 'uat',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = UatHandler.parse(raw, ref);
  const structured = parsed.structured as Record<string, unknown>;
  return {
    session: structured.uat as UatSession,
    input: {
      kind: 'uat',
      frontmatter: parsed.frontmatter as Record<string, unknown>,
      structured,
      groups: [],
      planSegments: [],
    },
  };
}

describe('UAT corpus', () => {
  it('finds the pinned documents (a missing studio-portal checkout drops its four)', () => {
    const present = new Set(FILES.map((f) => f.key));
    for (const key of Object.keys(PINNED)) {
      if (key.startsWith('SP:') && !existsSync(SP_PLANNING)) continue;
      expect(present.has(key), key).toBe(true);
    }
    // Nothing unpinned: a new UAT in the corpus must be pinned here on purpose.
    for (const file of FILES) expect(PINNED[file.key], `unpinned ${file.key}`).toBeDefined();
  });

  it.each(FILES.map((f) => [f.key, f.path] as const))('%s extracts and composes with the pinned counts', (key, path) => {
    const pinned = PINNED[key];
    expect(pinned).toBeDefined();
    const { session, input } = parse(path);
    expect(session).toBeDefined();
    expect(session.tests).toHaveLength(pinned.tests);
    const counts = { pass: 0, issue: 0, blocked: 0, skipped: 0, pending: 0 } as Record<string, number>;
    for (const test of session.tests) counts[test.result] = (counts[test.result] ?? 0) + 1;
    expect(counts.pass).toBe(pinned.pass);
    expect(counts.issue).toBe(pinned.issue);
    expect(counts.blocked).toBe(pinned.blocked);
    expect(counts.skipped).toBe(pinned.skipped);
    expect(counts.pending).toBe(pinned.pending);
    expect(session.gaps.mode).toBe(pinned.mode);
    expect(session.gaps.mode === 'items' ? session.gaps.items.length : session.gaps.cards.length).toBe(pinned.gaps);
    expect(session.extras.map((e) => e.heading)).toEqual(pinned.extras);

    const composed = composeUatSession(input);
    expect(composed).not.toBeNull();
    expect(composed?.current.live).toBe(pinned.live);
    expect(composed?.total).toBe(pinned.tests);
    expect(composed?.mismatch).toBeNull();
    expect(composed?.gaps.mode).toBe(pinned.mode === 'items' ? 'register' : pinned.mode === 'prose' ? 'cards' : 'none');
  });

  it('the dense fixture keeps the author\'s own empty-gaps line', () => {
    const dense = FILES.find((f) => f.key.startsWith('FX:'));
    expect(dense).toBeDefined();
    const { input } = parse((dense as { path: string }).path);
    expect(composeUatSession(input)?.gaps.emptyLine).toBe('None — all tests passed.');
  });
});
