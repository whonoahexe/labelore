// quick-261003-526 (V526-10): real-corpus guards over every *-VALIDATION.md in this repo's `.planning/`
// (excluding the sketches), the in-repo dense fixture and the made-up Lendshed project — keyed `LB:`
// (Labelore's own, none today), `DN:` (fixtures/dense) and `FX:` (the eight Lendshed files, read through
// fxPath, which throws on a missing file; nothing here skips or looks anywhere else on the machine). Every
// file must extract without throwing, compose to a non-null model through the real handler, and match the
// counts pinned below. The pinned counts were counted in each file itself with awk and grep (table rows
// inside the map section, ❌ cells in the File Exists column, distinct Wave cells, `- [x]` / `- [ ]` /
// plain bullets inside Wave 0 and Sign-Off, the rows of the Manual table) — never copied from the
// extractor's own output. Pins are per file, never a total over a corpus (README rule R6).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FX_PLANNING, fxPath } from '../helpers/fixture-project.ts';
import { ValidationHandler } from '../../src/planning-repo/handlers/validation.ts';
import type { ValidationStrategy } from '../../src/planning-repo/handlers/validation-strategy.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composeValidationStrategy } from '../../src/web/views/validation-strategy.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;

// Smallest corpus sizes the guard accepts (README rule R8). The Lendshed project holds eight VALIDATION
// files; a walk that finds fewer means a tree moved or the walker broke, and must fail rather than pass
// over nothing. Labelore's own `.planning/` holds no VALIDATION file today, so its minimum is zero and
// the every-file-must-be-pinned rule below is what guards growth there. Sibling plans never add a
// VALIDATION file to Lendshed, so the unpinned rule stays on for FX: too.
const MIN_FX_FILES = 8;
const MIN_DN_FILES = 1;

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
  'DN:phases/01-identity-slice/01-VALIDATION.md': {
    rows: 1, green: 1, red: 0, flaky: 0, pending: 0, none: 0, lanes: 1, toCreate: 0, template: false,
    wave0: '1 note', manual: 0, signoff: [5, 6], stamp: 'Pending',
  },
  'FX:phases/01-member-sign-in-sessions/01-VALIDATION.md': {
    rows: 9, green: 8, red: 0, flaky: 0, pending: 0, none: 1, lanes: 4, toCreate: 0, template: false,
    wave0: '7 of 7 in place', manual: 4, signoff: [0, 7], stamp: 'Pending',
  },
  'FX:phases/02-roles-and-permissions/02-VALIDATION.md': {
    rows: 15, green: 0, red: 0, flaky: 0, pending: 15, none: 0, lanes: 4, toCreate: 7, template: false,
    wave0: '0 of 7 in place', manual: 6, signoff: [6, 6], stamp: 'Pending',
  },
  'FX:phases/03-account-admin-and-sessions/03-VALIDATION.md': {
    rows: 12, green: 0, red: 0, flaky: 0, pending: 12, none: 0, lanes: 4, toCreate: 4, template: false,
    wave0: '4 notes', manual: 4, signoff: [6, 6], stamp: 'Pending',
  },
  'FX:phases/04-bulk-loan-export/04-VALIDATION.md': {
    rows: 10, green: 0, red: 0, flaky: 0, pending: 0, none: 10, lanes: 5, toCreate: 0, template: false,
    wave0: '6 notes', manual: 3, signoff: [6, 6], stamp: 'Pending',
  },
  'FX:milestones/v1.0-phases/01-member-data-foundation/01-VALIDATION.md': {
    rows: 8, green: 0, red: 0, flaky: 0, pending: 8, none: 0, lanes: 3, toCreate: 7, template: false,
    wave0: '0 of 6 in place', manual: 2, signoff: [6, 6], stamp: 'Pending',
  },
  'FX:milestones/v1.0-phases/02-shed-inventory-health/02-VALIDATION.md': {
    rows: 8, green: 4, red: 0, flaky: 0, pending: 4, none: 0, lanes: 3, toCreate: 4, template: false,
    wave0: '2 of 5 in place', manual: 3, signoff: [0, 6], stamp: 'Pending',
  },
  'FX:milestones/v1.0-phases/03-catalogue-browsing/03-VALIDATION.md': {
    rows: 1, green: 0, red: 0, flaky: 0, pending: 1, none: 0, lanes: 0, toCreate: 0, template: true,
    wave0: '0 of 3 in place', manual: 1, signoff: [0, 6], stamp: 'Pending',
  },
  'FX:milestones/v1.0-phases/04-shed-to-shed-transfers/04-VALIDATION.md': {
    rows: 1, green: 0, red: 0, flaky: 0, pending: 1, none: 0, lanes: 0, toCreate: 0, template: true,
    wave0: '0 of 3 in place', manual: 1, signoff: [0, 6], stamp: 'Pending',
  },
};

const FILES: { key: string; path: string }[] = [
  ...walkValidation(REPO_PLANNING).map((path) => ({ key: `LB:${relative(REPO_PLANNING, path)}`, path })),
  ...walkValidation(DENSE_PLANNING).map((path) => ({ key: `DN:${relative(DENSE_PLANNING, path)}`, path })),
  ...walkValidation(FX_PLANNING).map((path) => ({ key: `FX:${relative(FX_PLANNING, path).split('\\').join('/')}`, path })),
];

function parse(path: string): { strategy: ValidationStrategy; input: ViewInput } {
  const content = readFileSync(path, 'utf8');
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-VALIDATION.md',
    kind: 'validation',
    fileClass: 'text',
    sizeBytes: 0,
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
  it('finds the pinned documents and at least the minimum of each corpus', () => {
    const present = new Set(FILES.map((f) => f.key));
    for (const key of Object.keys(PINNED)) expect(present.has(key), key).toBe(true);
    expect(FILES.filter((f) => f.key.startsWith('FX:')).length).toBeGreaterThanOrEqual(MIN_FX_FILES);
    expect(FILES.filter((f) => f.key.startsWith('DN:')).length).toBeGreaterThanOrEqual(MIN_DN_FILES);
    // Every pinned FX: file resolves through fxPath too, so a moved file throws by name.
    for (const key of Object.keys(PINNED)) if (key.startsWith('FX:')) fxPath(key.slice(3));
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

  it('FX v1.0/01 reads its "planner-approved (pending execution)" approval as Pending', () => {
    const path = fxPath('milestones/v1.0-phases/01-member-data-foundation/01-VALIDATION.md');
    const composed = composeValidationStrategy(parse(path).input);
    expect(composed?.signoff?.stamp).toMatchObject({ label: 'Pending', tone: 'active' });
    expect(composed?.signoff?.stamp.approval).toContain('planner-approved');
  });
});
