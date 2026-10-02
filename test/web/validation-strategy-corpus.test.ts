// quick-261003-526 (V526-10): real-corpus guards over every *-VALIDATION.md in this repo's
// `.planning/` (excluding the sketches), fixtures/dense and `~/studio-portal/.planning/` — the
// uat-session-corpus.test.ts idiom (a missing studio-portal checkout skips its files). Every file
// must extract without throwing, compose to a non-null model through the real handler, and match
// the counts pinned below. The pinned counts were independently confirmed with awk and grep over
// the source files (table rows inside the map section, ❌ cells in the File Exists column, distinct
// Wave cells, `- [x]` / `- [ ]` / plain bullets inside Wave 0 and Sign-Off, the rows of the Manual
// table) — never copied from the extractor's own output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { ValidationHandler } from '../../src/planning-repo/handlers/validation.ts';
import type { ValidationStrategy } from '../../src/planning-repo/handlers/validation-strategy.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composeValidationStrategy } from '../../src/web/views/validation-strategy.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;

function walkValidation(root: string): string[] {
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
      } else if (entry.endsWith('-VALIDATION.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  rows: number;
  green: number;
  red: number;
  flaky: number;
  pending: number;
  none: number;
  lanes: number;
  toCreate: number;
  template: boolean;
  wave0: string;
  manual: number;
  signoff: [number, number];
  stamp: string;
}

const PINNED: Record<string, Pinned> = {
  'FX:phases/01-identity-slice/01-VALIDATION.md': {
    rows: 1, green: 1, red: 0, flaky: 0, pending: 0, none: 0, lanes: 1, toCreate: 0, template: false,
    wave0: '1 note', manual: 0, signoff: [5, 6], stamp: 'Pending',
  },
  'SP:phases/01-portal-owned-identity-sessions/01-VALIDATION.md': {
    rows: 13, green: 12, red: 0, flaky: 0, pending: 0, none: 1, lanes: 4, toCreate: 0, template: false,
    wave0: '10 of 10 in place', manual: 4, signoff: [0, 7], stamp: 'Pending',
  },
  'SP:phases/02-roles-permission-enforcement/02-VALIDATION.md': {
    rows: 33, green: 0, red: 0, flaky: 0, pending: 33, none: 0, lanes: 4, toCreate: 11, template: false,
    wave0: '0 of 9 in place', manual: 11, signoff: [6, 6], stamp: 'Pending',
  },
  'SP:phases/03-account-administration-session-control/03-VALIDATION.md': {
    rows: 18, green: 0, red: 0, flaky: 0, pending: 18, none: 0, lanes: 4, toCreate: 5, template: false,
    wave0: '5 notes', manual: 5, signoff: [6, 6], stamp: 'Pending',
  },
  'SP:phases/04-bulk-archive-downloads/04-VALIDATION.md': {
    rows: 15, green: 0, red: 0, flaky: 0, pending: 0, none: 15, lanes: 6, toCreate: 0, template: false,
    wave0: '8 notes', manual: 3, signoff: [6, 6], stamp: 'Pending',
  },
  'SP:milestones/v1.0-phases/01-identity-persistence-foundation/01-VALIDATION.md': {
    rows: 10, green: 0, red: 0, flaky: 0, pending: 10, none: 0, lanes: 3, toCreate: 9, template: false,
    wave0: '0 of 8 in place', manual: 2, signoff: [6, 6], stamp: 'Pending',
  },
  'SP:milestones/v1.0-phases/02-storage-health-status/02-VALIDATION.md': {
    rows: 10, green: 5, red: 0, flaky: 0, pending: 5, none: 0, lanes: 3, toCreate: 5, template: false,
    wave0: '3 of 7 in place', manual: 3, signoff: [0, 6], stamp: 'Pending',
  },
  'SP:milestones/v1.0-phases/03-file-browsing/03-VALIDATION.md': {
    rows: 1, green: 0, red: 0, flaky: 0, pending: 1, none: 0, lanes: 0, toCreate: 0, template: true,
    wave0: '0 of 3 in place', manual: 1, signoff: [0, 6], stamp: 'Pending',
  },
  'SP:milestones/v1.0-phases/04-tier-to-tier-transfers/04-VALIDATION.md': {
    rows: 1, green: 0, red: 0, flaky: 0, pending: 1, none: 0, lanes: 0, toCreate: 0, template: true,
    wave0: '0 of 3 in place', manual: 1, signoff: [0, 6], stamp: 'Pending',
  },
};

const FILES: { key: string; path: string }[] = [
  ...walkValidation(REPO_PLANNING).map((path) => ({ key: `LB:${relative(REPO_PLANNING, path)}`, path })),
  ...walkValidation(DENSE_PLANNING).map((path) => ({ key: `FX:${relative(DENSE_PLANNING, path)}`, path })),
  ...walkValidation(SP_PLANNING).map((path) => ({ key: `SP:${relative(SP_PLANNING, path)}`, path })),
];

function parse(path: string): { strategy: ValidationStrategy; input: ViewInput } {
  const content = readFileSync(path, 'utf8');
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-VALIDATION.md',
    kind: 'validation',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = ValidationHandler.parse(raw, ref);
  const structured = parsed.structured as Record<string, unknown>;
  return {
    strategy: structured.validation as ValidationStrategy,
    input: {
      kind: 'validation',
      frontmatter: parsed.frontmatter as Record<string, unknown>,
      structured,
      groups: [],
      planSegments: [],
    },
  };
}

describe('VALIDATION corpus', () => {
  it('finds the pinned documents (a missing studio-portal checkout drops its eight)', () => {
    const present = new Set(FILES.map((f) => f.key));
    for (const key of Object.keys(PINNED)) {
      if (key.startsWith('SP:') && !existsSync(SP_PLANNING)) continue;
      expect(present.has(key), key).toBe(true);
    }
    // Nothing unpinned: a new VALIDATION in the corpus must be pinned here on purpose.
    for (const file of FILES) expect(PINNED[file.key], `unpinned ${file.key}`).toBeDefined();
  });

  it.each(FILES.map((f) => [f.key, f.path] as const))('%s extracts and composes with the pinned counts', (key, path) => {
    const pinned = PINNED[key];
    expect(pinned).toBeDefined();
    const { strategy, input } = parse(path);
    expect(strategy).toBeDefined();
    expect(strategy.map?.rows).toHaveLength(pinned.rows);
    const counts: Record<string, number> = { green: 0, red: 0, flaky: 0, pending: 0, none: 0 };
    for (const row of strategy.map?.rows ?? []) counts[row.status] += 1;
    expect(counts).toEqual({
      green: pinned.green,
      red: pinned.red,
      flaky: pinned.flaky,
      pending: pinned.pending,
      none: pinned.none,
    });
    expect(strategy.map?.template).toBe(pinned.template);
    expect(strategy.map?.rows.filter((r) => r.fileKind === 'create')).toHaveLength(pinned.toCreate);
    expect(strategy.manual?.rows).toHaveLength(pinned.manual);
    expect(strategy.signoff?.items).toHaveLength(pinned.signoff[1]);
    expect(strategy.signoff?.items.filter((i) => i.checked)).toHaveLength(pinned.signoff[0]);

    const composed = composeValidationStrategy(input);
    expect(composed).not.toBeNull();
    expect(composed?.map?.lanes).toHaveLength(pinned.lanes);
    expect(composed?.map?.toCreate).toBe(pinned.template ? 0 : pinned.toCreate);
    expect(composed?.map?.template !== null).toBe(pinned.template);
    expect(composed?.wave0?.summary).toBe(pinned.wave0);
    expect(composed?.cells.human.count).toBe(pinned.manual);
    expect(composed?.cells.signoff).toMatchObject({ checked: pinned.signoff[0], total: pinned.signoff[1] });
    expect(composed?.signoff?.stamp.label).toBe(pinned.stamp);
  });

  it('SP v1.0/01 reads its "planner-approved (pending execution)" approval as Pending', () => {
    const path = `${SP_PLANNING}/milestones/v1.0-phases/01-identity-persistence-foundation/01-VALIDATION.md`;
    if (!existsSync(path)) return;
    const composed = composeValidationStrategy(parse(path).input);
    expect(composed?.signoff?.stamp).toMatchObject({ label: 'Pending', tone: 'active' });
    expect(composed?.signoff?.stamp.approval).toContain('planner-approved');
  });
});
