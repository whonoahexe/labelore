// Phase 9 (09-15): the coverage composer and the static markup of its page. The one-line "No external API" file
// is the normal case and opens as one quiet card; a file with neither a declaration nor a matrix composes
// nothing so the promoted-section view keeps rendering.
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
