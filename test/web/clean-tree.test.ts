// quick-260930-jzt (JZT-M2, JZT-D2, JZT-D3): CleanTree static markup against the studio-portal
// phases/02 roles tree (a verbatim fixture). CleanTree, not CleanTreeFigure, is rendered here — the
// figure wraps a Base UI Dialog, which is not needed to pin the rows.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { changedOnlySet, collapseFolderChains, parseTree } from '../../src/rendering/ascii-tree.ts';
import { CleanTree } from '../../src/web/components/clean-tree.tsx';

const ROLES_TREE = await readFile(new URL('../rendering/fixtures/sp-p02-roles-tree.txt', import.meta.url), 'utf8');

const render = (changedOnly: boolean): string =>
  renderToStaticMarkup(createElement(CleanTree, { text: ROLES_TREE, changedOnly }));

const rowsIn = (html: string): string[] => html.match(/<li class="clean-tree-row"[\s\S]*?<\/li>/g) ?? [];

describe('CleanTree (roles fixture)', () => {
  it('renders the 31 collapsed rows', () => {
    expect(rowsIn(render(false))).toHaveLength(31);
    expect(render(false).match(/class="clean-tree-row"/g)).toHaveLength(31);
  });

  it("MODIFIED rows carry an in-flight 'modified' chip", () => {
    const html = render(false);
    expect(html.match(/<span class="status-chip" data-tone="in-flight">modified<\/span>/g)).toHaveLength(12);
    expect(html).toContain('<span class="status-chip" data-tone="active">new</span>');
    expect(html).not.toMatch(/data-tone="(destructive|warning)"/);
  });

  it('folder rows carry data-dir and the merged chain reads app/admin/', () => {
    const rows = rowsIn(render(false));
    const folders = rows.filter((row) => row.includes('data-dir="true"'));
    expect(folders).toHaveLength(13);
    expect(rows.filter((row) => row.includes('app/admin/'))).toHaveLength(1);
    expect(rows.filter((row) => row.includes('data-dir="true"') && row.includes('app/admin/'))).toHaveLength(1);
  });

  it('each row indents by a --space-6 step per depth and sizes its guides to match', () => {
    const rows = rowsIn(render(false));
    expect(rows[0]).toContain('background-size:calc(var(--space-6) * 0) 100%');
    const deepest = rows.find((row) => row.includes('calc(var(--space-6) * 3)'));
    expect(deepest).toBeDefined();
    expect(deepest).toContain('padding-inline-start:calc(var(--space-6) * 3)');
  });

  it('changed only renders exactly the changed rows of the collapsed tree plus their ancestors', () => {
    const collapsed = collapseFolderChains(parseTree(ROLES_TREE));
    const keep = changedOnlySet(collapsed);
    const html = render(true);
    expect(rowsIn(html)).toHaveLength(keep.size);
    for (const index of keep) expect(html).toContain(`<span>${collapsed[index].name}</span>`);
  });
});
