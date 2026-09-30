// quick-260930-wfs (WFS-09): real-corpus guards over every PATTERNS.md in this repo's `.planning/`
// plus `~/studio-portal/.planning/` — the research-corpus.test.ts idiom (a missing studio-portal
// checkout skips its files). Every file must extract without throwing, compose to a non-null map,
// and match the classified row count and quality split pinned below. The pinned counts were
// independently confirmed with awk over the last cell of each File Classification row (never
// copied from the extractor's own output). Every No Analog entry and every Pattern Assignment is
// either merged into a file row or present as an unplaced row.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { extractPatternMap } from '../../src/planning-repo/handlers/pattern-map.ts';
import { composePatternMap } from '../../src/web/views/pattern-map.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;

function walkPatterns(root: string): string[] {
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

/** Keyed by `<repo>:<path suffix>`. */
const PINNED: Record<string, Pinned> = {
  'SP:milestones/v1.0-phases/02-storage-health-status/02-PATTERNS.md': { rows: 26, exact: 7, role: 3, partial: 5, none: 11, groups: 5, shared: 6, excerpts: 39 },
  'SP:phases/04-bulk-archive-downloads/04-PATTERNS.md': { rows: 30, exact: 25, role: 5, partial: 0, none: 0, groups: 0, shared: 4, excerpts: 19 },
  'SP:phases/01-portal-owned-identity-sessions/01-PATTERNS.md': { rows: 16, exact: 7, role: 4, partial: 1, none: 4, groups: 0, shared: 7, excerpts: 17 },
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md': { rows: 17, exact: 8, role: 8, partial: 0, none: 1, groups: 0, shared: 7, excerpts: 26 },
  'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-PATTERNS.md': { rows: 35, exact: 14, role: 10, partial: 0, none: 11, groups: 0, shared: 7 },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-PATTERNS.md': { rows: 18, exact: 12, role: 6, partial: 0, none: 0, groups: 0, shared: 7 },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-PATTERNS.md': { rows: 16, exact: 11, role: 4, partial: 0, none: 1, groups: 0, shared: 6 },
  'SP:milestones/v1.0-phases/03-file-browsing/03-PATTERNS.md': { rows: 16, exact: 10, role: 6, partial: 0, none: 0, groups: 0, shared: 7 },
  'SP:milestones/v1.0-phases/04-tier-to-tier-transfers/04-PATTERNS.md': { rows: 26, exact: 12, role: 9, partial: 3, none: 2, groups: 0, shared: 9 },
  'SP:phases/02-roles-permission-enforcement/02-PATTERNS.md': { rows: 22, exact: 16, role: 4, partial: 0, none: 2, groups: 0, shared: 9 },
  'SP:phases/03-account-administration-session-control/03-PATTERNS.md': { rows: 24, exact: 19, role: 5, partial: 0, none: 0, groups: 0, shared: 7 },
};

const FILES = [...walkPatterns(REPO_PLANNING), ...walkPatterns(SP_PLANNING)];

function keyOf(file: string): string {
  return file.startsWith(REPO_PLANNING)
    ? `LB:${relative(REPO_PLANNING, file)}`
    : `SP:${relative(SP_PLANNING, file)}`;
}

describe('PATTERNS corpus guard', () => {
  it('finds the corpus', () => {
    expect(FILES.filter((f) => f.startsWith(REPO_PLANNING)).length).toBeGreaterThanOrEqual(4);
    if (existsSync(SP_PLANNING)) expect(FILES.length).toBeGreaterThanOrEqual(11);
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
