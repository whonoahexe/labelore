import { describe, expect, it } from 'vitest';
import {
  composeView,
  outlineEntriesOf,
  INTRODUCTION_LABEL,
  REMAINDER_ID,
  REMAINDER_LABEL,
  type ViewInput,
  type ViewManifest,
} from '../../src/web/views/manifest.ts';
import { resolveView } from '../../src/web/views/manifests.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

const groups: DocumentSectionGroup[] = [
  { id: null, heading: null, html: '<p>Intro</p>' },
  { id: 'topic-a', heading: 'Topic A', html: '<h2>Topic A</h2><p>a</p>' },
  { id: 'topic-b', heading: 'Topic B', html: '<h2>Topic B</h2><p>b</p>' },
  { id: 'notes', heading: 'Notes', html: '<h2>Notes</h2><p>n</p>' },
];

const input: ViewInput = {
  kind: 'test-kind',
  frontmatter: {},
  structured: { facts: ['x', 'y'] },
  groups,
  planSegments: [],
};

const manifest: ViewManifest = {
  kind: 'test-kind',
  lead: 'lead copy',
  promote: [
    {
      type: 'data',
      id: 'missing',
      label: 'Missing data',
      component: 'fact-list',
      select: () => null,
    },
    {
      type: 'section',
      heading: 'Topic A',
      label: 'Topic A promoted',
    },
    {
      type: 'data',
      id: 'facts',
      label: 'Facts',
      component: 'fact-list',
      select: (viewInput) => viewInput.structured.facts,
      consumes: (group) => group.heading === 'Topic B',
    },
  ],
};

describe('composeView', () => {
  it('emits blocks in manifest promote order, skipping a data entry whose select returns null', () => {
    const composed = composeView(manifest, input);
    expect(composed.blocks).toHaveLength(2);
    expect(composed.blocks[0]).toMatchObject({
      id: 'view-block-1',
      label: 'Topic A promoted',
      kind: 'section',
    });
    expect(composed.blocks[1]).toMatchObject({
      id: 'view-block-2',
      label: 'Facts',
      kind: 'data',
      data: ['x', 'y'],
    });
  });

  it("removes exactly the groups `consumes` marks, leaving the rest for the remainder in the document's own order", () => {
    const composed = composeView(manifest, input);
    expect(composed.remainder.map((group) => group.heading)).toEqual([INTRODUCTION_LABEL, 'Notes']);
  });

  it('labels the leading (no-heading) remainder group "Introduction"', () => {
    const composed = composeView(manifest, input);
    expect(composed.remainder[0]).toMatchObject({ id: null, heading: INTRODUCTION_LABEL });
  });

  it('is a no-op composition (no blocks, everything remains) against an empty promote list', () => {
    const empty: ViewManifest = { kind: 'test-kind', lead: '', promote: [] };
    const composed = composeView(empty, input);
    expect(composed.blocks).toEqual([]);
    expect(composed.remainder).toHaveLength(4);
  });
});

describe('outlineEntriesOf', () => {
  it('appends exactly one remainder entry, after the promoted blocks, when the remainder is non-empty', () => {
    const composed = composeView(manifest, input);
    const entries = outlineEntriesOf(composed);
    expect(entries).toEqual([
      { id: 'view-block-1', label: 'Topic A promoted' },
      { id: 'view-block-2', label: 'Facts' },
      { id: REMAINDER_ID, label: REMAINDER_LABEL },
    ]);
  });

  it('omits the remainder entry entirely when every group was consumed', () => {
    const fullManifest: ViewManifest = {
      kind: 'test-kind',
      lead: '',
      promote: [{ type: 'section', heading: /.*/, all: true }],
    };
    // Drop the null-heading leading group — it never matches a heading-based `section` entry —
    // so every remaining group is promoted and the remainder is genuinely empty.
    const fullInput: ViewInput = { ...input, groups: groups.slice(1) };
    const composed = composeView(fullManifest, fullInput);
    expect(composed.remainder).toEqual([]);
    expect(outlineEntriesOf(composed).some((entry) => entry.id === REMAINDER_ID)).toBe(false);
  });
});

describe('resolveView', () => {
  it('resolves the registered discussion-log manifest', () => {
    const resolved = resolveView('discussion-log');
    expect(resolved.recognized).toBe(true);
    expect(resolved.manifest?.kind).toBe('discussion-log');
  });

  it('returns { manifest: null, recognized: false } for a kind with no registered manifest', () => {
    const resolved = resolveView('nope');
    expect(resolved.recognized).toBe(false);
    expect(resolved.manifest).toBeNull();
  });
});
