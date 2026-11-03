// Phase 9 (09-15): the coverage composer and the static markup of its page. The one-line "No external API" file
// is the normal case and opens as one quiet card; a file with neither a declaration nor a matrix composes
// nothing so the promoted-section view keeps rendering.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeCoverage } from '../../src/web/views/coverage-matrix.ts';
import { CoverageView, coverageHeaderProps } from '../../src/web/views/coverage-matrix-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { CoverageHandler } from '../../src/planning-repo/handlers/coverage.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

function inputOf(coverage: unknown): ViewInput {
  return {
    kind: 'coverage',
    frontmatter: {},
    structured: coverage === undefined ? {} : { coverage },
    groups: [],
    planSegments: [],
  };
}

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'coverage',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function composeFile(content: string, path = '.planning/phases/02-x/COVERAGE.md') {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = CoverageHandler.parse(raw, ref(path));
  return composeCoverage(inputOf((parsed.structured as Record<string, unknown>).coverage));
}

describe('composeCoverage - the one-line card', () => {
  it('opens the Lendshed one-liner on the card with the file reason', () => {
    const model = composeFile(fxRead('phases/02-roles-and-permissions/COVERAGE.md'));
    expect(model).not.toBeNull();
    expect(model?.intro).toEqual({ eyebrow: 'API coverage', title: 'API coverage' });
    expect(model?.card?.heading).toBe('No external API in this phase');
    expect(model?.card?.reason).toMatch(/^roles and permissions are stored in Lendshed's own database/);
    expect(model?.matrix).toBeNull();
  });

  it('takes the file H1 as the title and the declaration paragraph of a longer file as the reason', () => {
    const model = composeFile('# API Coverage — Phase 1\n\nNo external API integration: local only.\n\nOther notes.\n');
    expect(model?.intro.title).toBe('API Coverage — Phase 1');
    expect(model?.card?.reason).toBe('local only.');
  });

  it('is null for a file with neither a declaration nor a matrix, and for a missing projection', () => {
    expect(composeFile('# Coverage\n\nJust notes.\n')).toBeNull();
    expect(composeCoverage(inputOf(undefined))).toBeNull();
    expect(composeCoverage(inputOf('not an object'))).toBeNull();
  });

  it('composes from its own input only: alternating two inputs gives each the output it has alone', () => {
    const a = { h1: 'A', none: { reason: 'first' }, matrix: null };
    const b = { h1: null, none: { reason: 'second' }, matrix: null };
    const aloneA = composeCoverage(inputOf(a));
    const aloneB = composeCoverage(inputOf(b));
    for (let i = 0; i < 3; i += 1) {
      expect(composeCoverage(inputOf(a))).toEqual(aloneA);
      expect(composeCoverage(inputOf(b))).toEqual(aloneB);
    }
  });
});

const MATRIX_FILE = 'phases/04-bulk-loan-export/COVERAGE.md';

describe('composeCoverage - the capability matrix', () => {
  const model = composeFile(fxRead(MATRIX_FILE));

  it('summarises the Lendshed matrix and groups the rows in file order', () => {
    expect(model?.card).toBeNull();
    expect(model?.intro.title).toBe('API Coverage — Phase 4: Bulk loan export (Postwing mail relay)');
    expect(model?.matrix?.summary).toBe('3 integrated, 2 opted out');
    expect(model?.matrix?.integrated).toBe(3);
    expect(model?.matrix?.optedOut).toBe(2);
    expect(model?.matrix?.lead).toHaveLength(3);
    const groups = model?.matrix?.groups ?? [];
    expect(groups.map((g) => [g.label, g.tone, g.rows.length])).toEqual([
      ['Integrated', 'complete', 3],
      ['Opted out', 'quiet', 2],
    ]);
    expect(groups[0].rows.every((r) => r.chip === 'Integrate' && r.tone === 'complete')).toBe(true);
    expect(groups[1].rows.map((r) => [r.chip, r.tone, r.noReason])).toEqual([
      ['Opt out', 'quiet', false],
      ['Opt out', 'quiet', true],
    ]);
  });

  it('puts an unrecognised decision in a final Other group, verbatim, and keeps empty groups out', () => {
    const only = composeFile('| Capability | Decision |\n|---|---|\n| a | DEFER |\n| b | INTEGRATE |\n');
    expect(only?.matrix?.groups.map((g) => g.label)).toEqual(['Integrated', 'Other']);
    expect(only?.matrix?.groups[1].rows[0]).toMatchObject({ chip: 'DEFER', tone: 'quiet', noReason: false });
    expect(only?.matrix?.summary).toBe('1 integrated, 0 opted out');
  });

  it('draws nothing missing: no tone other than complete or quiet is composed', () => {
    const tones = new Set((model?.matrix?.groups ?? []).flatMap((g) => [g.tone, ...g.rows.map((r) => r.tone)]));
    expect([...tones].sort()).toEqual(['complete', 'quiet']);
  });

  it('is null for the Shapes "Capability | Covered by | Status" table', () => {
    const shapes = readFileSync(
      new URL('../fixtures/shapes/.planning/phases/02-glaze-recipes/COVERAGE.md', import.meta.url),
      'utf8',
    );
    expect(composeFile(shapes)).toBeNull();
  });

  it('lets the matrix win over a none paragraph', () => {
    const both = composeFile('No external API integration: x\n\n| Capability | Decision |\n|---|---|\n| a | INTEGRATE |\n');
    expect(both?.card).toBeNull();
    expect(both?.matrix?.integrated).toBe(1);
  });

  it('survives a malformed projection', () => {
    expect(composeCoverage(inputOf({ h1: null, none: null, matrix: { rows: 'x' } }))).toBeNull();
    expect(composeCoverage(inputOf({ h1: null, none: null, matrix: { rows: [null, 3, { decision: 'integrate' }] } }))?.matrix?.integrated).toBe(1);
  });

  it('renders the groups, chips and the dashed No reason given line', () => {
    if (model === null) throw new Error('expected a model');
    const html = renderToStaticMarkup(createElement(CoverageView, { model }));
    expect(html).toContain('3 integrated, 2 opted out');
    expect(html).toContain('view-coverage-bar');
    expect(html).toContain('Integrated');
    expect(html).toContain('Opted out');
    expect(html).toContain('No reason given');
    expect(html).toContain('Full coverage by default');
    expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(7);
  });
});

describe('CoverageView - the card markup', () => {
  it('renders the heading and the reason, and the header override has no lead', () => {
    const model = composeFile(fxRead('phases/02-roles-and-permissions/COVERAGE.md'));
    if (model === null) throw new Error('expected a model');
    const html = renderToStaticMarkup(createElement(CoverageView, { model }));
    expect(html).toContain('No external API in this phase');
    expect(html).toContain('view-coverage-reason');
    expect(html).toContain('quiet-state');
    expect(html).toContain('aria-hidden="true"');
    expect(coverageHeaderProps(model)).toEqual({ eyebrow: 'API coverage', title: 'API coverage', lead: null });
  });

  it('omits the reason paragraph when the file gives none', () => {
    const model = composeFile('No external API integration:\n');
    if (model === null) throw new Error('expected a model');
    const html = renderToStaticMarkup(createElement(CoverageView, { model }));
    expect(html).toContain('No external API in this phase');
    expect(html).not.toContain('view-coverage-reason');
  });
});
