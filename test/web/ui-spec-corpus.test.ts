// quick-261001-qk6 (QK6-09): corpus guards over the in-repo dense fixture's UI-SPEC.md (keyed DN:) and
// every one in the made-up Lendshed project (keyed FX:, walked through FX_PLANNING; a missing fixture
// throws, nothing skips). Every file must extract
// without throwing, compose non-null, and match the sign-off label, element count and status split
// pinned below. The considerations counts were independently confirmed with an awk scan over the
// Status column of every UI Considerations table (never copied from the extractor's own output); the
// Lendshed pins are recounted in the made-up files themselves.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FX_PLANNING } from '../helpers/fixture-project.ts';
import { extractUiSpec } from '../../src/planning-repo/handlers/ui-spec-contract.ts';
import { composeUiSpec } from '../../src/web/views/ui-spec.ts';

const DENSE = new URL('../../fixtures/dense/.planning/phases/01-identity-slice/01-UI-SPEC.md', import.meta.url).pathname;

function walkUiSpecs(root: string): string[] {
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

/** Keyed by `<corpus>:<path suffix>` — DN: the dense fixture, FX: Lendshed. */
const PINNED: Record<string, Pinned> = {
  'DN:phases/01-identity-slice/01-UI-SPEC.md': { signoff: 'Sign-off not run', tone: 'quiet', status: 'draft', created: '2026-06-07', phase: '1', elements: 0, rows: 0, split: [0, 0, 0, 0], scales: [1, 1, 4], registryRows: 1, phaseChapters: 0 },
  'FX:phases/01-member-sign-in-sessions/01-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-03-25', phase: '1', elements: 3, rows: 22, split: [16, 1, 1, 4], scales: [6, 4, 4], registryRows: 2, phaseChapters: 3 },
  'FX:phases/02-roles-and-permissions/02-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-03-29', phase: '2', elements: 4, rows: 27, split: [21, 2, 0, 4], scales: [7, 4, 4], registryRows: 2, phaseChapters: 3 },
  'FX:phases/03-account-admin-and-sessions/03-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: 'draft', created: '2026-04-03', phase: '3', elements: 5, rows: 35, split: [29, 3, 0, 3], scales: [7, 4, 4], registryRows: 2, phaseChapters: 8 },
  'FX:phases/04-bulk-loan-export/04-UI-SPEC.md': { signoff: 'Sign-off 5/6 · 1 flag', tone: 'in-flight', status: null, created: '2026-04-10', phase: '4', elements: 4, rows: 30, split: [25, 5, 0, 0], scales: [6, 4, 4], registryRows: 2, phaseChapters: 4 },
  'FX:milestones/v1.0-phases/02-shed-inventory-health/02-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-02-02', phase: '2', elements: 5, rows: 36, split: [36, 0, 0, 0], scales: [7, 4, 4], registryRows: 1, phaseChapters: 3 },
  'FX:milestones/v1.0-phases/03-catalogue-browsing/03-UI-SPEC.md': { signoff: 'Sign-off 5/6 · 1 flag', tone: 'in-flight', status: null, created: '2026-02-16', phase: '03', elements: 4, rows: 12, split: [11, 1, 0, 0], scales: [6, 4, 4], registryRows: 2, phaseChapters: 0 },
  'FX:milestones/v1.0-phases/04-shed-to-shed-transfers/04-UI-SPEC.md': { signoff: 'Signed off 6/6', tone: 'complete', status: null, created: '2026-03-05', phase: '04', elements: 6, rows: 45, split: [31, 3, 0, 11], scales: [6, 4, 4], registryRows: 1, phaseChapters: 3 },
};

const FX_FILES = walkUiSpecs(FX_PLANNING);
const FILES = [DENSE, ...FX_FILES];

function keyOf(file: string): string {
  if (file === DENSE) return 'DN:phases/01-identity-slice/01-UI-SPEC.md';
  return `FX:${relative(FX_PLANNING, file)}`;
}

describe('UI-SPEC corpus guard', () => {
  it('finds the corpus', () => {
    expect(FX_FILES.length).toBeGreaterThanOrEqual(7);
  });

  it('pins every file it walks and finds every file it pins', () => {
    const found = new Set(FILES.map(keyOf));
    for (const key of found) expect(PINNED[key], `${key} needs a pinned entry`).toBeDefined();
    for (const key of Object.keys(PINNED)) expect(found.has(key), `${key} is pinned but was not found`).toBe(true);
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
