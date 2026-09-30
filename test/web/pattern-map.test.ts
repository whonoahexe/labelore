// quick-260930-wfs: composePatternMap, built from literal ViewInput objects and from the real
// LB v1.1/05 and SP v1.0/02 extractions (test/pattern-map.test.ts covers the server extractor;
// the narrow e2e spec covers the page end to end), plus the static markup of the view.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { extractPatternMap } from '../../src/planning-repo/handlers/pattern-map.ts';
import { PatternsHandler } from '../../src/planning-repo/handlers/patterns.ts';
import {
  composePatternMap,
  globMatch,
  pathsOf,
  qualityOf,
  refMatches,
  shortRuleName,
} from '../../src/web/views/pattern-map.ts';
import type { ComposedPatternMap } from '../../src/web/views/pattern-map.ts';
import {
  leadCount,
  PatternIntroMeta,
  PatternMapView,
} from '../../src/web/views/pattern-map-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const LB05 = new URL(
  '../../.planning/milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md',
  import.meta.url,
);
const DENSE = new URL(
  '../../fixtures/dense/.planning/phases/01-identity-slice/01-PATTERNS.md',
  import.meta.url,
);
const SP02 = `${SP_PLANNING}/milestones/v1.0-phases/02-storage-health-status/02-PATTERNS.md`;

function inputOf(map: unknown, overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'patterns',
    frontmatter: {},
    structured: { map },
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

function mapOf(path: URL | string): unknown {
  return extractPatternMap(tryParseFrontmatter(readFileSync(path, 'utf8')).body);
}

function compose(path: URL | string, overrides: Partial<ViewInput> = {}): ComposedPatternMap {
  const composed = composePatternMap(inputOf(mapOf(path), overrides));
  expect(composed).not.toBeNull();
  return composed as ComposedPatternMap;
}

function render(composed: ComposedPatternMap): string {
  return renderToStaticMarkup(
    createElement(PatternMapView, { map: composed, onShowSource: () => {}, title: 'Doc' }),
  );
}

describe('pattern matching helpers', () => {
  it('pathsOf expands braces and strips line and symbol suffixes', () => {
    expect(pathsOf('`frontend/components/{tier-card,nav-shell}.tsx`')).toEqual([
      'frontend/components/tier-card.tsx',
      'frontend/components/nav-shell.tsx',
    ]);
    expect(pathsOf('`backend/src/a.rs::spawn` and `b/c.ts:12-30`')).toEqual([
      'backend/src/a.rs',
      'b/c.ts',
    ]);
    expect(pathsOf(null)).toEqual([]);
  });

  it('globMatch is a hand-written wildcard matcher', () => {
    expect(globMatch('backend/src/**', 'backend/src/health/mod.rs')).toBe(true);
    expect(globMatch('frontend/components/ui/*.tsx', 'frontend/components/ui/button.tsx')).toBe(
      true,
    );
    expect(globMatch('a/*.ts', 'a/b.rs')).toBe(false);
    // Adversarial input stays linear: no catastrophic backtracking.
    const started = performance.now();
    expect(globMatch('*a*a*a*a*a*a*a*a*a*b', 'a'.repeat(5_000))).toBe(false);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('refMatches ties a ref to a path by tail, directory or base name, not by a shared base name alone', () => {
    expect(refMatches('health/mod.rs', ['backend/src/health/mod.rs'])).toBe(true);
    expect(refMatches('backend/src/health/mod.rs', ['health/mod.rs'])).toBe(true);
    expect(refMatches('backend/src/health/mod.rs', ['backend/src/tiers/mod.rs'])).toBe(false);
    expect(refMatches('backend/src/health/', ['backend/src/health/smart.rs'])).toBe(true);
    expect(refMatches('mod.rs', ['backend/src/tiers/mod.rs'])).toBe(true);
    expect(refMatches('', ['a'])).toBe(false);
  });

  it('qualityOf and shortRuleName read the author wording', () => {
    expect(qualityOf('**partial — see divergence**')).toBe('partial');
    expect(qualityOf('exact (structural mirror)')).toBe('exact');
    expect(qualityOf('no analog')).toBe('none');
    expect(qualityOf('data-flow match')).toBe('role');
    expect(shortRuleName('Reject/fail identically — never leak internals')).toBe(
      'Reject/fail identically',
    );
    expect(shortRuleName('Collapsed disclosure (`<details>`)')).toBe('Collapsed disclosure');
  });
});

describe('composePatternMap — degrade', () => {
  it('returns null for a missing, malformed or row-less map', () => {
    expect(composePatternMap(inputOf(undefined))).toBeNull();
    expect(composePatternMap(inputOf('nope'))).toBeNull();
    expect(composePatternMap(inputOf({}))).toBeNull();
    expect(composePatternMap(inputOf({ classification: [] }))).toBeNull();
  });

  it('the dense fixture (no File Classification) composes to null', () => {
    expect(composePatternMap(inputOf(mapOf(DENSE)))).toBeNull();
  });

  it('an older payload with only a classification still composes', () => {
    const composed = composePatternMap(
      inputOf({
        classification: [
          {
            group: null,
            file: '`a/b.ts`',
            role: 'x',
            flow: 'y',
            analog: '`c.ts`',
            quality: 'exact',
          },
        ],
      }),
    );
    expect(composed?.rows).toHaveLength(1);
    expect(composed?.rules).toEqual([]);
    expect(composed?.backMatter).toEqual([]);
  });
});

describe('composePatternMap — LB v1.1/05', () => {
  const composed = compose(LB05);

  it('cover facts as written, counts from the classification', () => {
    expect(composed.intro.eyebrow).toBe('Pattern map · Phase 5');
    expect(composed.intro.title).toBe('Per-Type Document Views');
    expect(composed.intro.mapped).toBe('2026-09-20');
    expect(composed.intro.filesAnalyzed).toEqual({ value: '17', qualifier: '(new + modified)' });
    expect(composed.intro.analogsFound).toBe('17 / 17');
    expect(composed.intro.counts).toEqual({ exact: 8, role: 8, partial: 0, none: 1 });
    expect(composed.intro.total).toBe(17);
  });

  it('groups by path, selects the new-ground file, and leaves nothing unplaced that has a row', () => {
    expect(composed.areas.map((a) => a.label)).toContain('src/web');
    const designLanguage = composed.rows.find((r) => r.name === 'design-language.md');
    expect(designLanguage?.quality).toBe('none');
    expect(designLanguage?.tone).toBe('missing');
    expect(composed.defaultSelection).toBe(designLanguage?.id);
    expect(designLanguage?.reason).toBeTruthy();
    expect(composed.rows.find((r) => r.name === 'artifact-page.tsx')?.analogShort).toEqual({
      kind: 'itself',
    });
  });

  it('the no-analog entries and assignments that match no file stay visible as unplaced rows', () => {
    const unplaced = composed.rows.filter((r) => r.origin === 'unplaced');
    const fileCount = composed.rows.filter((r) => r.origin === 'file').length;
    expect(fileCount).toBe(17);
    for (const row of unplaced) expect(row.area).toBe('Outside the file table');
    expect(composed.areas.at(-1)?.label === 'Outside the file table' || unplaced.length === 0).toBe(
      true,
    );
  });

  it('source-only entries and back matter', () => {
    expect(composed.sourceOnly.map((e) => e.label)).toEqual([
      '26 code excerpts',
      'Line citations',
      'Data-flow labels',
      'Metadata',
    ]);
    expect(composed.backMatter).toEqual([]);
  });

  it('resolves source-only targets against the rendered headings', () => {
    const withHeadings = compose(LB05, {
      headings: [
        { id: 'file-classification', text: 'File Classification', depth: 2 },
        { id: 'pattern-assignments', text: 'Pattern Assignments', depth: 2 },
        { id: 'metadata', text: 'Metadata', depth: 2 },
      ],
    });
    expect(withHeadings.sourceOnly.map((e) => e.targetId)).toEqual([
      'pattern-assignments',
      'pattern-assignments',
      'file-classification',
      'metadata',
    ]);
  });
});

describe('composePatternMap — SP v1.0/02 (real file, when present)', () => {
  it.runIf(existsSync(SP02))('the five doc groups, collector.rs partial, the reject rule', () => {
    const composed = compose(SP02);
    expect(composed.areas.map((a) => a.label)).toEqual([
      'Backend — new modules (greenfield)',
      'Backend — modified',
      'Backend — tests & fixtures',
      'Frontend',
      'Ops artifacts',
    ]);
    const collector = composed.rows.find((r) => r.name === 'collector.rs');
    expect(collector?.quality).toBe('partial');
    expect(collector?.tone).toBe('in-flight');
    expect(collector?.qualifier).toBe('see divergence');
    expect(collector?.guidance.length).toBeGreaterThan(0);
    const reject = composed.rules.find((r) => r.name === 'Reject/fail identically');
    expect(reject?.hits.length).toBeGreaterThan(0);
    expect(composed.intro.counts).toEqual({ exact: 7, role: 3, partial: 5, none: 11 });
    expect(composed.backMatter.map((b) => b.heading)).toContain(
      'Cross-Cutting Notes for the Planner',
    );
  });
});

describe('PatternMapView static markup', () => {
  it('LB v1.1/05: 17 rows, the four source-only buttons, no code', () => {
    const html = render(compose(LB05));
    expect((html.match(/class="view-patterns-row"/g) ?? []).length).toBe(17);
    expect(html).toContain('Why nothing matches');
    expect(html).not.toContain('<pre');
    const nav = html.slice(html.indexOf('aria-label="In the source only"'));
    expect((nav.match(/<button/g) ?? []).length).toBe(4);
    expect(nav).toContain('26 code excerpts');
    expect(nav).toContain('Line citations');
    expect(nav).toContain('Data-flow labels');
    expect(nav).toContain('Metadata');
  });

  it.runIf(existsSync(SP02))(
    'SP v1.0/02: the note, six rule chips, the default panel, a closed back-matter details',
    () => {
      const html = render(compose(SP02));
      expect(html).toContain('Mapper&#x27;s note');
      const strip = html.slice(html.indexOf('House rules'), html.indexOf('view-patterns-grid'));
      expect((strip.match(/<button/g) ?? []).length).toBe(6);
      expect(html).toContain('Why nothing matches');
      expect(html).toMatch(/<details><summary>Cross-Cutting Notes for the Planner/);
      expect(html).not.toMatch(/<details open/);
      expect(html).not.toContain('<pre');
      expect(html).not.toContain('<code>fn ');
    },
  );

  it('the cover renders the facts, the four-entry meter key and the Searched line', () => {
    const composed = compose(LB05);
    const html = renderToStaticMarkup(createElement(PatternIntroMeta, { intro: composed.intro }));
    expect(html).toContain('2026-09-20');
    expect(html).toContain('17 / 17');
    expect((html.match(/<li data-quality=/g) ?? []).length).toBe(4);
    expect(html).toContain('Searched');
    expect(html).toContain('more');
  });

  it('the end-to-end handler output composes and renders', () => {
    const content = readFileSync(LB05, 'utf8');
    const ref = {
      path: '.planning/phases/05-x/05-PATTERNS.md',
      kind: 'patterns',
      location: 'phase' as const,
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const parsed = PatternsHandler.parse(
      { path: ref.path, content, mtimeMs: 0, size: content.length },
      ref,
    );
    const composed = composePatternMap({
      ...inputOf(null),
      structured: parsed.structured as Record<string, unknown>,
    });
    expect(composed).not.toBeNull();
    const html = render(composed as ComposedPatternMap);
    expect(
      (html.match(/data-quality="(exact|role|partial|none)"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(17);
    expect(html).not.toContain('<pre');
  });
});

describe('panel guidance lead', () => {
  it('opens on the sub-heads plus the first real block, so a warning keeps its explanation', () => {
    const p = (text: string) => ({ kind: 'paragraph' as const, text });
    expect(leadCount([])).toBe(0);
    expect(leadCount([p('plain'), p('more')])).toBe(1);
    expect(
      leadCount([p('**Warning headline**'), p('The explanation.'), p('**Do NOT copy:**')]),
    ).toBe(2);
    expect(leadCount([p('**Only a head**')])).toBe(1);
  });
});
