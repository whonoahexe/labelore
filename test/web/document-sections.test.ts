import { describe, expect, it } from 'vitest';
import {
  groupDocumentSections,
  type SectionNode,
} from '../../src/web/views/document-sections.ts';

function node(overrides: Partial<SectionNode> & Pick<SectionNode, 'tag'>): SectionNode {
  return { id: null, text: '', html: '', ...overrides };
}

describe('groupDocumentSections', () => {
  it('opens a leading group with heading: null for content before the first boundary', () => {
    const nodes: SectionNode[] = [
      node({ tag: 'p', html: '<p>Preamble.</p>' }),
      node({ tag: 'h2', id: 'first', text: 'First', html: '<h2 id="first">First</h2>' }),
      node({ tag: 'p', html: '<p>Body.</p>' }),
    ];
    const groups = groupDocumentSections(nodes);
    expect(groups).toEqual([
      { id: null, heading: null, html: '<p>Preamble.</p>' },
      { id: 'first', heading: 'First', html: '<h2 id="first">First</h2><p>Body.</p>' },
    ]);
  });

  it('drops a blank leading group instead of emitting an empty preamble entry', () => {
    const nodes: SectionNode[] = [
      node({ tag: 'h2', id: 'first', text: 'First', html: '<h2 id="first">First</h2>' }),
      node({ tag: 'p', html: '<p>Body.</p>' }),
    ];
    const groups = groupDocumentSections(nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].heading).toBe('First');
  });

  it('starts a new group at every h2 boundary, concatenating member html in order', () => {
    const nodes: SectionNode[] = [
      node({ tag: 'h2', id: 'a', text: 'A', html: '<h2 id="a">A</h2>' }),
      node({ tag: 'p', html: '<p>a1</p>' }),
      node({ tag: 'p', html: '<p>a2</p>' }),
      node({ tag: 'h2', id: 'b', text: 'B', html: '<h2 id="b">B</h2>' }),
      node({ tag: 'p', html: '<p>b1</p>' }),
    ];
    const groups = groupDocumentSections(nodes);
    expect(groups).toEqual([
      { id: 'a', heading: 'A', html: '<h2 id="a">A</h2><p>a1</p><p>a2</p>' },
      { id: 'b', heading: 'B', html: '<h2 id="b">B</h2><p>b1</p>' },
    ]);
  });

  it('also opens a new group at a top-level plan-section boundary', () => {
    const nodes: SectionNode[] = [
      node({
        tag: 'plan-section',
        id: 'plan-section-1',
        text: 'Task 1',
        html: '<section data-plan-section>Task 1</section>',
      }),
      node({ tag: 'p', html: '<p>Task body.</p>' }),
      node({
        tag: 'plan-section',
        id: 'plan-section-2',
        text: 'Task 2',
        html: '<section data-plan-section>Task 2</section>',
      }),
    ];
    const groups = groupDocumentSections(nodes);
    expect(groups.map((g) => g.id)).toEqual(['plan-section-1', 'plan-section-2']);
    expect(groups[0].heading).toBe('Task 1');
    expect(groups[0].html).toBe('<section data-plan-section>Task 1</section><p>Task body.</p>');
  });

  it('returns an empty array for an empty node list', () => {
    expect(groupDocumentSections([])).toEqual([]);
  });
});
