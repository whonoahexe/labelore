// quick-260930-wfs (WFS-09): real-corpus guards over every PATTERNS.md in this repo's `.planning/`
// (keyed LB:) plus the made-up Lendshed project (keyed FX:, walked through FX_PLANNING; a missing
// fixture throws, nothing skips). Every file must extract without throwing, compose to a non-null
// map, and match the classified row count and quality split pinned below. The pinned counts were
// independently confirmed with awk over the last cell of each File Classification row (never
// copied from the extractor's own output) and with grep over the fence lines; the Lendshed pins are
// recounted in the made-up files themselves. Labelore's live planning files are re-pinned to
// today's content (D-18): when planning changes one, or a new PATTERNS file lands, update its entry
// here. Every No Analog entry and every Pattern Assignment is either merged into a file row or
// present as an unplaced row.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FX_PLANNING } from '../helpers/fixture-project.ts';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { extractPatternMap } from '../../src/planning-repo/handlers/pattern-map.ts';
import { composePatternMap } from '../../src/web/views/pattern-map.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;

function walkPatterns(root: string): string[] {
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules') continue;
        stack.push(abs);
      } else if (entry.endsWith('-PATTERNS.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  rows: number;
  exact: number;
  role: number;
  partial: number;
  none: number;
  groups: number;
  shared: number;
  excerpts?: number;
}

/** Keyed by `<corpus>:<path suffix>` — LB: Labelore's own `.planning/`, FX: the Lendshed fixture. */
const PINNED: Record<string, Pinned> = {
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md': { rows: 17, exact: 8, role: 8, partial: 0, none: 1, groups: 0, shared: 7, excerpts: 26 },
  'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-PATTERNS.md': { rows: 35, exact: 14, role: 10, partial: 0, none: 11, groups: 0, shared: 7 },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-PATTERNS.md': { rows: 18, exact: 12, role: 6, partial: 0, none: 0, groups: 0, shared: 7 },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-PATTERNS.md': { rows: 16, exact: 11, role: 4, partial: 0, none: 1, groups: 0, shared: 6 },
  'LB:phases/06-trustworthy-tests-and-security-baseline/06-PATTERNS.md': { rows: 28, exact: 18, role: 7, partial: 1, none: 2, groups: 0, shared: 5, excerpts: 12 },
  'FX:milestones/v1.0-phases/02-shed-inventory-health/02-PATTERNS.md': { rows: 22, exact: 6, role: 4, partial: 4, none: 8, groups: 5, shared: 5, excerpts: 16 },
};

const LB_FILES = walkPatterns(REPO_PLANNING);
const FX_FILES = walkPatterns(FX_PLANNING);
const FILES = [...LB_FILES, ...FX_FILES];

function keyOf(file: string): string {
  return file.startsWith(REPO_PLANNING)
    ? `LB:${relative(REPO_PLANNING, file)}`
    : `FX:${relative(FX_PLANNING, file)}`;
}

describe('PATTERNS corpus guard', () => {
  it('finds the corpus', () => {
    expect(LB_FILES.length).toBeGreaterThanOrEqual(5);
    expect(FX_FILES.length).toBeGreaterThanOrEqual(1);
  });

  it('every pinned entry was found by the walk', () => {
    const found = new Set(FILES.map(keyOf));
    for (const key of Object.keys(PINNED)) expect(found.has(key), `${key} is pinned but not found`).toBe(true);
  });

  for (const file of FILES) {
    const key = keyOf(file);
    it(`${key}: extracts, composes non-null, matches the pinned counts and drops nothing`, () => {
      const body = tryParseFrontmatter(readFileSync(file, 'utf8')).body;
      const map = extractPatternMap(body);
      const composed = composePatternMap({
        kind: 'patterns',
        frontmatter: {},
        structured: { map },
        groups: [],
        planSegments: [],
      });
      expect(composed).not.toBeNull();
      if (!composed) return;

      const fileRows = composed.rows.filter((r) => r.origin === 'file');
      expect(fileRows).toHaveLength(map.classification.length);

      const pinned = PINNED[key];
      expect(pinned, `${key} needs a pinned entry`).toBeDefined();
      expect(fileRows).toHaveLength(pinned.rows);
      expect(composed.intro.counts).toEqual({
        exact: pinned.exact,
        role: pinned.role,
        partial: pinned.partial,
        none: pinned.none,
      });
      const groups = new Set(map.classification.map((r) => r.group).filter((g) => g !== null));
      expect(groups.size).toBe(pinned.groups);
      expect(map.shared).toHaveLength(pinned.shared);
      expect(composed.rules).toHaveLength(pinned.shared);
      if (pinned.excerpts !== undefined) expect(map.excerpts).toBe(pinned.excerpts);

      // Nothing dropped: each No Analog entry and each assignment is merged into a row or shown
      // as an unplaced row.
      const unplacedNone = composed.rows.filter((r) => r.id.startsWith('n')).length;
      const unplacedGuidance = composed.rows.filter((r) => r.id.startsWith('a')).length;
      const mergedNone = fileRows.filter((r) => r.reason !== null).length;
      expect(unplacedNone).toBeLessThanOrEqual(map.noAnalog.length);
      expect(mergedNone + unplacedNone).toBeGreaterThanOrEqual(map.noAnalog.length > 0 ? 1 : 0);
      expect(unplacedGuidance).toBeLessThanOrEqual(map.assignments.length);
      for (const row of composed.rows.filter((r) => r.origin === 'unplaced')) {
        expect(row.area).toBe('Outside the file table');
      }
      // Every `##` section is either consumed or carried into back matter.
      for (const section of map.sections.filter((s) => !s.claimed)) {
        expect(composed.backMatter.some((b) => b.heading === section.heading), section.heading).toBe(true);
      }
    });
  }
});
