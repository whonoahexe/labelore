// quick-261001-qk6: composeUiSpec, built from literal ViewInput objects and from the real
// extractions (test/ui-spec-contract.test.ts covers the server extractor; the narrow e2e spec
// covers the page end to end), plus the static markup of the view.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { extractUiSpec } from '../../src/planning-repo/handlers/ui-spec-contract.ts';
import type { UiSpecContract } from '../../src/planning-repo/handlers/ui-spec-contract.ts';
import { UiSpecHandler } from '../../src/planning-repo/handlers/ui-spec.ts';
import { composeUiSpec, safeColor } from '../../src/web/views/ui-spec.ts';
import type { ComposedUiSpec } from '../../src/web/views/ui-spec.ts';
import { UiSpecIntroMeta, UiSpecView } from '../../src/web/views/ui-spec-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';

const LB03 = new URL(
  '../../.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-UI-SPEC.md',
  import.meta.url,
);
const LB05 = new URL(
  '../../.planning/milestones/v1.1-phases/05-per-type-document-views/05-UI-SPEC.md',
  import.meta.url,
);
const DENSE = new URL('../../fixtures/dense/.planning/phases/01-identity-slice/01-UI-SPEC.md', import.meta.url);
const SP04 = `${SP_PLANNING}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md`;
const HAVE_SP = existsSync(SP_PLANNING);

function inputOf(uiSpec: unknown, overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'ui-spec',
    frontmatter: {},
    structured: { uiSpec },
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

function contractOf(path: URL | string): UiSpecContract {
  return extractUiSpec(readFileSync(path, 'utf8'));
}

function compose(path: URL | string, overrides: Partial<ViewInput> = {}): ComposedUiSpec {
  const composed = composeUiSpec(inputOf(contractOf(path), overrides));
  expect(composed).not.toBeNull();
  return composed as ComposedUiSpec;
}

function render(spec: ComposedUiSpec): string {
  return renderToStaticMarkup(createElement(UiSpecView, { spec, onShowSource: () => {}, title: 'Doc' }));
}

function renderCover(spec: ComposedUiSpec): string {
  return renderToStaticMarkup(createElement(UiSpecIntroMeta, { intro: spec.intro }));
}

describe('safeColor', () => {
  it('accepts hex and oklch values', () => {
    for (const ok of ['#0a0a0a', '#fff', '#FFFFFFAA', 'oklch(0.205 0 0)', 'oklch(70% 0.1 30 / 50%)', 'oklch(none 0 0)']) {
      expect(safeColor(ok), ok).toBe(ok);
    }
  });

  it('rejects everything else', () => {
    for (const bad of [
      'red',
      'url(x)',
      '#fff;background:url(x)',
      'oklch(1 0 0) url(x)',
      'var(--primary)',
      'expression(1)',
      '#12',
      '#12345',
      'oklch()',
      'oklch(1 0 0; x)',
      `oklch(${'0 '.repeat(40)})`,
      '',
    ]) {
      expect(safeColor(bad), bad).toBeNull();
    }
    expect(safeColor(null)).toBeNull();
    expect(safeColor(undefined)).toBeNull();
  });
});

describe.runIf(HAVE_SP)('composeUiSpec — studio-portal v1.0/04', () => {
  const headings = [
    { id: 'layout', text: 'Layout', depth: 2 },
    { id: 'motion-reduced-motion-contract', text: 'Motion & Reduced-Motion Contract', depth: 2 },
    { id: 'screen-reader-live-region-contract', text: 'Screen-Reader / Live-Region Contract', depth: 2 },
    { id: 'copywriting-contract', text: 'Copywriting Contract', depth: 2 },
    { id: 'checker-sign-off', text: 'Checker Sign-Off', depth: 2 },
    { id: 'ui-considerations', text: 'UI Considerations', depth: 2 },
  ];

  it('the cover: eyebrow, title, a complete-toned sign-off, Created, no Status', () => {
    const spec = compose(SP04, { headings });
    expect(spec.intro.eyebrow).toBe('UI design contract · Phase 04');
    expect(spec.intro.title).toBe('Tier to tier transfers');
    expect(spec.intro.signoff?.label).toBe('Signed off 6/6');
    expect(spec.intro.signoff?.tone).toBe('complete');
    expect(spec.intro.signoff?.dims).toHaveLength(6);
    expect(spec.intro.signoff?.dims.every((d) => d.verdict === 'PASS' && d.tone === 'complete')).toBe(true);
    expect(spec.intro.signoff?.approval).toMatch(/^APPROVED/);
    expect(spec.intro.created).toBe('2026-07-24');
    expect(spec.intro.status).toBeNull();
  });

  it('numbers the three chapters and counts 57 / 6 / 0 / 15 over 10 elements', () => {
    const spec = compose(SP04, { headings });
    expect(spec.chapters.map((c) => `${c.number} ${c.title}`)).toEqual([
      '01 Design system',
      '02 UI considerations',
      '03 Registry safety',
    ]);
    const uic = spec.considerations;
    expect(uic?.counts).toEqual({ covered: 57, backstop: 6, unresolved: 0, dismissed: 15 });
    expect(uic?.total).toBe(78);
    expect(uic?.elements).toHaveLength(10);
    expect(uic?.needs).toHaveLength(6);
    expect(uic?.needs.every((n) => n.status === 'backstop' && n.tone === 'in-flight')).toBe(true);
    expect(uic?.coverage).toMatch(/^78 applicable/);
  });

  it('lists the phase-specific chapters and the copywriting contract as source-only, with heading ids', () => {
    const spec = compose(SP04, { headings });
    const labels = spec.sourceOnly.map((e) => e.label);
    expect(labels.slice(0, 5)).toEqual([
      'Layout',
      'Motion & Reduced-Motion Contract',
      'Screen-Reader / Live-Region Contract',
      'Copywriting Contract',
      "Checker's notes",
    ]);
    expect(labels).toContain('How coverage was probed');
    expect(labels).toContain('UI Considerations lift rule');
    expect(labels).toContain('Status vocabulary');
    expect(labels).toContain('Scope note');
    expect(labels).toContain('Generator note');
    expect(labels[labels.length - 1]).toBe('Frontmatter');
    const byLabel = Object.fromEntries(spec.sourceOnly.map((e) => [e.label, e.targetId]));
    expect(byLabel.Layout).toBe('layout');
    expect(byLabel['Copywriting Contract']).toBe('copywriting-contract');
    expect(byLabel["Checker's notes"]).toBe('checker-sign-off');
    expect(byLabel['UI Considerations lift rule']).toBe('ui-considerations');
    expect(byLabel.Frontmatter).toBeNull();
  });

  it('end to end: handler -> composer -> a matrix of 10 element rows with data-cell buttons and no raw HTML', () => {
    const content = readFileSync(SP04, 'utf8');
    const ref: ArtifactRef = {
      path: '.planning/milestones/v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md',
      kind: 'ui-spec',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const parsed = UiSpecHandler.parse(raw, ref);
    const composed = composeUiSpec(inputOf((parsed.structured as { uiSpec: unknown }).uiSpec));
    expect(composed).not.toBeNull();
    const html = render(composed as ComposedUiSpec);
    expect((html.match(/<tbody><tr>/g) ?? []).length).toBe(1);
    expect((html.match(/<th scope="row"/g) ?? []).length).toBe(10);
    expect(html).toMatch(/data-cell="E6\|[a-z-]+"/);
    expect(html).toContain('Click a square to read how that state is handled');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('dangerously');
  });
});

describe('composeUiSpec — labels, status and degrade', () => {
  it('lb v1.0/03: a flagged sign-off is in-flight', () => {
    const spec = compose(LB03);
    expect(spec.intro.signoff?.label).toBe('Sign-off 6/7 · 1 flag');
    expect(spec.intro.signoff?.tone).toBe('in-flight');
    expect(spec.intro.eyebrow).toBe('UI design contract · Phase 3');
    expect(spec.intro.title).toBe('Search browsing traceability');
    expect(spec.intro.status).toBeNull();
  });

  it('lb v1.1/05: not run is quiet and the draft status shows', () => {
    const spec = compose(LB05);
    expect(spec.intro.signoff?.label).toBe('Sign-off not run');
    expect(spec.intro.signoff?.tone).toBe('quiet');
    expect(spec.intro.status).toBe('draft');
    expect(spec.intro.created).toBe('2026-09-20');
    expect(spec.intro.signoff?.dims.every((d) => d.verdict === 'Not run')).toBe(true);
  });

  it('a BLOCK dimension gives the missing tone', () => {
    const contract = extractUiSpec(
      '---\nphase: 1\nstatus: draft\n---\n# T\n\n## Checker Sign-Off\n\n- [x] Dimension 1 Copywriting: **BLOCK** — nope\n- [x] Dimension 2 Visuals: PASS\n\n**Approval:** blocked\n',
    );
    const spec = composeUiSpec(inputOf(contract));
    expect(spec?.intro.signoff?.label).toBe('Sign-off · 1 blocked');
    expect(spec?.intro.signoff?.tone).toBe('missing');
    expect(spec?.intro.signoff?.dims[0].glyph).toBe('✗');
  });

  it('composes to null when there is no uiSpec or none of the recognised sections', () => {
    expect(composeUiSpec(inputOf(undefined))).toBeNull();
    expect(composeUiSpec(inputOf(null))).toBeNull();
    expect(composeUiSpec(inputOf('nope'))).toBeNull();
    expect(composeUiSpec(inputOf(extractUiSpec('# Title\n\n## Layout\n\nwords\n\n## Notes\n\nmore\n')))).toBeNull();
    expect(composeUiSpec(inputOf({}))).toBeNull();
  });

  it('the fixture keeps chapter 02 with only the author’s count and renders no matrix', () => {
    const spec = compose(DENSE);
    expect(spec.chapters.map((c) => c.number + c.title)).toEqual(['01Design system', '02UI considerations', '03Registry safety']);
    expect(spec.considerations?.total).toBe(0);
    expect(spec.considerations?.coverage).toBe('none applicable (fixture)');
    const html = render(spec);
    expect(html).toContain('none applicable (fixture)');
    expect(html).not.toContain('view-ui-spec-matrix');
  });

  it('the cover chip is a dialog trigger carrying the tone; Created and Status read as written', () => {
    const html = renderCover(compose(LB05));
    expect(html).toContain('data-tone="quiet"');
    expect(html).toContain('Sign-off not run');
    expect(html).toContain('Created <b>2026-09-20</b>');
    expect(html).toContain('Status <b>draft</b>');
  });
});
