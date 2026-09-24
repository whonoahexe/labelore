import { describe, expect, it } from 'vitest';
import type { RenderedDocument } from '../../src/rendering/markdown.ts';
import { dropLeadingTitle, splitPhaseTitle } from '../../src/web/pages/document-title.ts';

function doc(overrides: Partial<RenderedDocument> = {}): RenderedDocument {
  return {
    html:
      '<h1 id="cinedise-portal">Cinedise Portal<button type="button" class="heading-copy" data-heading-id="cinedise-portal">#</button></h1>\n' +
      '<h2 id="what-this-is">What This Is</h2>\n<p>Body.</p>',
    headings: [
      { id: 'cinedise-portal', depth: 1, text: 'Cinedise Portal' },
      { id: 'what-this-is', depth: 2, text: 'What This Is' },
    ],
    warnings: [],
    empty: false,
    ...overrides,
  };
}

describe('dropLeadingTitle', () => {
  it('removes a leading H1 that repeats the title, from both the html and the outline headings', () => {
    const result = dropLeadingTitle(doc(), 'Cinedise Portal');
    expect(result.html.startsWith('<h2 id="what-this-is">')).toBe(true);
    expect(result.html).not.toContain('<h1');
    expect(result.headings.map((h) => h.id)).toEqual(['what-this-is']);
  });

  it('tolerates surrounding whitespace in the title', () => {
    expect(dropLeadingTitle(doc(), '  Cinedise Portal ').html).not.toContain('<h1');
  });

  it('keeps the H1 when the title says something different (a frontmatter title)', () => {
    const original = doc();
    expect(dropLeadingTitle(original, 'Something else')).toBe(original);
  });

  it('keeps the document unchanged when the first heading is not an H1', () => {
    const original = doc({
      headings: [{ id: 'what-this-is', depth: 2, text: 'Cinedise Portal' }],
    });
    expect(dropLeadingTitle(original, 'Cinedise Portal')).toBe(original);
  });

  it('keeps the document unchanged when the html does not open with that heading', () => {
    const original = doc({ html: '<p>Preamble.</p>\n' + doc().html });
    expect(dropLeadingTitle(original, 'Cinedise Portal')).toBe(original);
  });

  it('is a no-op for a document with no headings', () => {
    const original = doc({ html: '<p>Just text.</p>', headings: [] });
    expect(dropLeadingTitle(original, 'Anything')).toBe(original);
  });
});

describe('splitPhaseTitle', () => {
  it('moves the phase out and drops the kind suffix', () => {
    expect(
      splitPhaseTitle('Phase 1: Portal-Owned Identity & Sessions - Discussion Log', 'Discussion log'),
    ).toEqual({ phase: 'Phase 1', title: 'Portal-Owned Identity & Sessions' });
  });

  it('keeps a suffix that is not the kind', () => {
    expect(splitPhaseTitle('Phase 2.1: Search - Notes', 'Discussion log')).toEqual({
      phase: 'Phase 2.1',
      title: 'Search - Notes',
    });
  });

  it('leaves a title without the phase prefix unchanged', () => {
    expect(splitPhaseTitle('Discussion Log', 'Discussion log')).toEqual({
      phase: null,
      title: 'Discussion Log',
    });
  });
});
