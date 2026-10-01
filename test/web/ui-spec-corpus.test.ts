// quick-261001-qk6 (QK6-09): real-corpus guards over every UI-SPEC.md in this repo's `.planning/`,
// the dense fixture, and `~/studio-portal/.planning/` — the pattern-map-corpus.test.ts idiom (a
// missing studio-portal checkout skips its files). Every file must extract without throwing,
// compose non-null, and match the sign-off label, element count and status split pinned below. The
// considerations counts were independently confirmed with an awk scan over the Status column of
// every UI Considerations table (never copied from the extractor's own output); the sign-off labels
// and section counts come from reading the documents.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { extractUiSpec } from '../../src/planning-repo/handlers/ui-spec-contract.ts';
import { composeUiSpec } from '../../src/web/views/ui-spec.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE = new URL('../../fixtures/dense/.planning/phases/01-identity-slice/01-UI-SPEC.md', import.meta.url).pathname;

function walkUiSpecs(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules' || entry === 'worktrees') continue;
        stack.push(abs);
      } else if (entry.endsWith('-UI-SPEC.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  signoff: string;
  tone: string;
  status: string | null;
  created: string;
  phase: string;
  elements: number;
  rows: number;
  split: [number, number, number, number];
  scales: [number, number, number];
  registryRows: number;
  /** The `##` sections nothing claims, other than Copywriting Contract. */
  phaseChapters: number;
}

/** Keyed by `<repo>:<path suffix>`. Counts match the corpus facts confirmed at planning time. */
const PINNED: Record<string, Pinned> = {
  'SP:milestones/v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-07-24', phase: '04', elements: 10, rows: 78, split: [57, 6, 0, 15], scales: [7, 4, 4], registryRows: 1, phaseChapters: 3 },
  'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-08-29', phase: '02', elements: 15, rows: 104, split: [90, 1, 9, 4], scales: [7, 4, 4], registryRows: 2, phaseChapters: 8 },
  'SP:milestones/v1.0-phases/02-storage-health-status/02-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-07-17', phase: '2', elements: 6, rows: 39, split: [39, 0, 0, 0], scales: [7, 4, 4], registryRows: 1, phaseChapters: 3 },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-UI-SPEC.md': { signoff: 'Sign-off 6/7 · 1 flag', tone: 'in-flight', status: null, created: '2026-09-02', phase: '3', elements: 5, rows: 38, split: [32, 3, 0, 3], scales: [8, 4, 4], registryRows: 2, phaseChapters: 1 },
  'SP:phases/01-portal-owned-identity-sessions/01-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-08-03', phase: '1', elements: 4, rows: 28, split: [21, 1, 0, 6], scales: [7, 4, 4], registryRows: 2, phaseChapters: 4 },
  'FX:phases/01-identity-slice/01-UI-SPEC.md': { signoff: 'Sign-off not run', tone: 'quiet', status: 'draft', created: '2026-06-07', phase: '1', elements: 0, rows: 0, split: [0, 0, 0, 0], scales: [1, 1, 4], registryRows: 1, phaseChapters: 0 },
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-UI-SPEC.md': { signoff: 'Sign-off not run', tone: 'quiet', status: 'draft', created: '2026-09-20', phase: '5', elements: 8, rows: 53, split: [39, 0, 0, 14], scales: [6, 5, 4], registryRows: 1, phaseChapters: 4 },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-UI-SPEC.md': { signoff: 'Sign-off not run', tone: 'quiet', status: 'draft', created: '2026-09-03', phase: '4', elements: 6, rows: 21, split: [13, 2, 0, 6], scales: [8, 4, 4], registryRows: 2, phaseChapters: 1 },
  'SP:milestones/v1.0-phases/03-file-browsing/03-UI-SPEC.md': { signoff: 'Sign-off 5/6 · 1 flag', tone: 'in-flight', status: null, created: '2026-07-20', phase: '03', elements: 5, rows: 14, split: [13, 1, 0, 0], scales: [7, 4, 4], registryRows: 1, phaseChapters: 0 },
  'SP:phases/02-roles-permission-enforcement/02-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-08-08', phase: '2', elements: 8, rows: 34, split: [18, 2, 0, 14], scales: [7, 4, 4], registryRows: 2, phaseChapters: 4 },
  'SP:phases/03-account-administration-session-control/03-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: 'draft', created: '2026-08-11', phase: '3', elements: 7, rows: 42, split: [27, 7, 0, 8], scales: [7, 4, 4], registryRows: 2, phaseChapters: 9 },
  'SP:phases/04-bulk-archive-downloads/04-UI-SPEC.md': { signoff: 'Sign-off 5/6 · 1 flag', tone: 'in-flight', status: null, created: '2026-08-21', phase: '4', elements: 4, rows: 30, split: [25, 5, 0, 0], scales: [7, 4, 4], registryRows: 2, phaseChapters: 4 },
};

const FILES = [...walkUiSpecs(REPO_PLANNING), DENSE, ...walkUiSpecs(SP_PLANNING)];

function keyOf(file: string): string {
  if (file === DENSE) return 'FX:phases/01-identity-slice/01-UI-SPEC.md';
  return file.startsWith(REPO_PLANNING) ? `LB:${relative(REPO_PLANNING, file)}` : `SP:${relative(SP_PLANNING, file)}`;
}

describe('UI-SPEC corpus guard', () => {
  it('finds the corpus', () => {
    expect(FILES.filter((f) => f.startsWith(REPO_PLANNING)).length).toBeGreaterThanOrEqual(4);
    if (existsSync(SP_PLANNING)) expect(FILES.length).toBe(Object.keys(PINNED).length);
  });

  for (const file of FILES) {
    const key = keyOf(file);
    it(`${key}: extracts, composes non-null and matches the pinned facts`, () => {
      const contract = extractUiSpec(readFileSync(file, 'utf8'));
      const composed = composeUiSpec({
        kind: 'ui-spec',
        frontmatter: {},
        structured: { uiSpec: contract },
        groups: [],
        planSegments: [],
      });
      expect(composed).not.toBeNull();
      if (!composed) return;
      const pinned = PINNED[key];
      expect(pinned, `${key} needs a pinned entry`).toBeDefined();

      expect(composed.intro.signoff?.label).toBe(pinned.signoff);
      expect(composed.intro.signoff?.tone).toBe(pinned.tone);
      expect(composed.intro.status).toBe(pinned.status);
      expect(composed.intro.created).toBe(pinned.created);
      expect(composed.intro.eyebrow).toBe(`UI design contract · Phase ${pinned.phase}`);
      expect(composed.intro.title.length).toBeGreaterThan(0);

      const uic = composed.considerations;
      expect(uic?.elements).toHaveLength(pinned.elements);
      expect(uic?.total).toBe(pinned.rows);
      expect(uic ? [uic.counts.covered, uic.counts.backstop, uic.counts.unresolved, uic.counts.dismissed] : null).toEqual(
        pinned.split,
      );
      // Every row sits in a cell: placing a multi-category row in several cells only adds.
      const placed = uic?.elements.reduce((n, e) => n + Object.values(e.cells).reduce((m, c) => m + c.rows.length, 0), 0) ?? 0;
      expect(placed).toBeGreaterThanOrEqual(pinned.rows);

      expect([composed.spacing?.count, composed.typography?.count, composed.colour?.roles.length]).toEqual(pinned.scales);
      expect(contract.registry?.rows).toHaveLength(pinned.registryRows);

      const unclaimed = contract.sections.filter((s) => !s.claimed).map((s) => s.heading);
      const phaseChapters = unclaimed.filter((h) => !h.toLowerCase().startsWith('copywriting contract'));
      expect(phaseChapters).toHaveLength(pinned.phaseChapters);
      // Nothing dropped silently: each of them is a source-only entry.
      expect(composed.sourceOnly.length).toBeGreaterThanOrEqual(pinned.phaseChapters);
      expect(composed.sourceOnly[composed.sourceOnly.length - 1].label).toBe('Frontmatter');
    });
  }

  it('a body with none of the recognised sections composes to null', () => {
    const contract = extractUiSpec('# Phase 9\n\n## Layout\n\nwords\n');
    expect(
      composeUiSpec({ kind: 'ui-spec', frontmatter: {}, structured: { uiSpec: contract }, groups: [], planSegments: [] }),
    ).toBeNull();
  });
});
