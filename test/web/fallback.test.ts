import { describe, expect, it } from 'vitest';
import {
  fallbackManifest,
  hasNestedFrontmatter,
  unrecognizedNotice,
  UNRECOGNIZED_KIND,
} from '../../src/web/views/fallback.ts';
import { resolveViewFor } from '../../src/web/views/manifests.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

function input(overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'test-kind',
    frontmatter: {},
    structured: {},
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

const headedGroups: DocumentSectionGroup[] = [
  { id: 'a', heading: 'Section A', html: '<h2>Section A</h2><p>a</p>' },
  { id: 'b', heading: 'Section B', html: '<h2>Section B</h2><p>b</p>' },
];

describe('hasNestedFrontmatter', () => {
  it('is true for a non-empty array value', () => {
    expect(hasNestedFrontmatter({ tags: ['a'] })).toBe(true);
  });

  it('is true for a plain object value', () => {
    expect(hasNestedFrontmatter({ meta: { a: 1 } })).toBe(true);
  });

  it('is false for only scalar/empty values', () => {
    expect(hasNestedFrontmatter({ title: 'x', tags: [], meta: null })).toBe(false);
  });
});

describe('fallbackManifest', () => {
  it('promotes a frontmatter fact-list then an all:true section entry when both nested frontmatter and headed groups exist', () => {
    const manifest = fallbackManifest(
      'unknown',
      input({ frontmatter: { meta: { a: 1 } }, groups: headedGroups }),
    );
    expect(manifest.kind).toBe(UNRECOGNIZED_KIND);
    expect(manifest.promote).toHaveLength(2);
    expect(manifest.promote[0]).toMatchObject({ type: 'data', component: 'fact-list' });
    expect(manifest.promote[1]).toMatchObject({ type: 'section', all: true });
  });

  it('yields promote: [] when frontmatter is flat and no group carries a heading', () => {
    const manifest = fallbackManifest(
      'unknown',
      input({
        frontmatter: { title: 'x' },
        groups: [{ id: null, heading: null, html: '<p>body</p>' }],
      }),
    );
    expect(manifest.promote).toEqual([]);
  });
});

describe('unrecognizedNotice', () => {
  it("returns the case-(a) sentence and kindLabel: null for 'unknown'", () => {
    const notice = unrecognizedNotice('unknown');
    expect(notice.lead).toContain("doesn't match a known GSD document pattern");
    expect(notice.kindLabel).toBeNull();
  });

  it("returns the case-(b) sentence with kindLabel: 'windows' for 'windows'", () => {
    const notice = unrecognizedNotice('windows');
    expect(notice.lead).toContain("doesn't yet have a dedicated view for");
    expect(notice.kindLabel).toBe('windows');
  });
});

describe('resolveViewFor', () => {
  it('recognizes a registered kind', () => {
    expect(resolveViewFor('discussion-log', input()).recognized).toBe(true);
  });

  it('falls back to the unrecognized manifest for an unregistered kind', () => {
    const resolved = resolveViewFor('windows', input());
    expect(resolved.recognized).toBe(false);
    expect(resolved.manifest.kind).toBe(UNRECOGNIZED_KIND);
  });
});
