// SEC-03 / D-13 / D-14 / D-15 / T-06-06 / T-06-08: the View-mode outline lists at most
// OUTLINE_ENTRY_CAP entries and closes with a plain "+N more sections" row, while every section
// of the document still renders (Pitfall 33 — cap what is listed, never what exists).
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OutlineList, type OutlineEntry } from '../../src/web/components/document-outline.tsx';
import { fallbackManifest } from '../../src/web/views/fallback.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import {
  OUTLINE_ENTRY_CAP,
  capOutline,
  composeView,
  outlineEntriesOf,
  type ViewInput,
} from '../../src/web/views/manifest.ts';

function entriesOf(count: number): OutlineEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `view-block-${index + 1}`,
    label: `Section ${index + 1}`,
  }));
}

function markupOf(count: number, omitted: number): string {
  return renderToStaticMarkup(createElement(OutlineList, { entries: entriesOf(count), omitted }));
}

function groupsOf(count: number): DocumentSectionGroup[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `heading-${index + 1}`,
    heading: `Heading ${index + 1}`,
    html: `<h2 id="heading-${index + 1}">Heading ${index + 1}</h2><p>Body ${index + 1}</p>`,
  }));
}

function viewInputOf(groups: DocumentSectionGroup[]): ViewInput {
  return { kind: 'unknown', frontmatter: {}, structured: {}, groups, planSegments: [] };
}

describe('capOutline', () => {
  it('uses the same cap of 18 as Source mode', () => {
    expect(OUTLINE_ENTRY_CAP).toBe(18);
  });

  it.each([
    [3000, 18, 2982],
    [19, 18, 1],
    [18, 18, 0],
    [17, 17, 0],
    [0, 0, 0],
  ])('%i entries list %i and omit %i', (total, listed, omitted) => {
    const result = capOutline(entriesOf(total));
    expect(result.listed).toHaveLength(listed);
    expect(result.omitted).toBe(omitted);
    expect(result.listed.length + result.omitted).toBe(total);
  });

  it('keeps the first entries, in order', () => {
    const result = capOutline(entriesOf(30));
    expect(result.listed.map((entry) => entry.id)).toEqual(
      entriesOf(OUTLINE_ENTRY_CAP).map((entry) => entry.id),
    );
  });
});

describe('a 3,000-heading document (T-06-08 — no section is hidden)', () => {
  const input = viewInputOf(groupsOf(3000));
  const composed = composeView(fallbackManifest('unknown', input), input);

  it('composes one View block per heading, so every section still renders', () => {
    expect(composed.blocks).toHaveLength(3000);
    expect(new Set(composed.blocks.map((block) => block.id)).size).toBe(3000);
  });

  it('lists 18 outline entries and counts the other 2982', () => {
    const { listed, omitted } = capOutline(outlineEntriesOf(composed));
    expect(listed).toHaveLength(18);
    expect(omitted).toBe(2982);
  });

  it('every omitted entry still names a block id that exists in the composed view', () => {
    const blockIds = new Set(composed.blocks.map((block) => block.id));
    for (const entry of outlineEntriesOf(composed)) expect(blockIds.has(entry.id)).toBe(true);
  });

  it('renders the capped list followed by the plain-text row', () => {
    const { listed, omitted } = capOutline(outlineEntriesOf(composed));
    const html = renderToStaticMarkup(createElement(OutlineList, { entries: listed, omitted }));
    expect((html.match(/<a /g) ?? []).length).toBe(18);
    expect(html.endsWith('<li data-overflow="true">+2982 more sections</li></ol>')).toBe(true);
  });
});

describe('OutlineList overflow row (D-14)', () => {
  it('is a li with no anchor, no class and no icon, reading "+2982 more sections"', () => {
    const html = markupOf(18, 2982);
    const row = html.slice(html.lastIndexOf('<li'));
    expect(row).toBe('<li data-overflow="true">+2982 more sections</li></ol>');
    expect(row).not.toContain('<a');
    expect(row).not.toContain('class');
    expect(row).not.toContain('<svg');
  });

  it('reads "+1 more section" for exactly one omitted entry', () => {
    expect(markupOf(18, 1)).toContain('<li data-overflow="true">+1 more section</li>');
  });

  it('shows no row when nothing is omitted', () => {
    const html = markupOf(18, 0);
    expect(html).not.toContain('data-overflow');
    expect((html.match(/<li /g) ?? []).length).toBe(18);
  });

  it('shows no row when the omitted prop is absent', () => {
    const html = renderToStaticMarkup(createElement(OutlineList, { entries: entriesOf(3) }));
    expect(html).not.toContain('data-overflow');
  });
});

describe('Source mode keeps its own cap (D-15)', () => {
  const page = readFileSync(new URL('../../src/web/pages/artifact-page.tsx', import.meta.url), 'utf8');

  it('slices depth-3 headings to OUTLINE_ENTRY_CAP rather than a literal', () => {
    expect(page).toContain('.slice(0, OUTLINE_ENTRY_CAP)');
    expect(page).not.toContain('slice(0, 18)');
  });

  it('passes no omitted value from the Source reader', () => {
    const start = page.indexOf('function ArtifactReader');
    const end = page.indexOf('function ViewReader');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(page.slice(start, end)).not.toContain('omitted');
  });
});
