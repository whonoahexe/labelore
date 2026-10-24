// quick-261024-o3h: the one figure renderer. Static markup (the lane-diagram.test.ts idiom); the
// hydration of server figure hosts is covered by the document-layout browser spec.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FencedCode, FencedFigure, FigureFor } from '../../src/web/components/fenced-figure.tsx';

const fixture = (name: string): string =>
  readFileSync(new URL(`../rendering/fixtures/${name}`, import.meta.url), 'utf8');
const TREE = fixture('sp-p02-roles-tree.txt');
const DIAGRAM = fixture('sp-p02-roles-diagram.txt');

describe('FencedCode', () => {
  it('renders an untagged directory tree as the clean tree', () => {
    const html = renderToStaticMarkup(createElement(FencedCode, { text: TREE }));
    expect(html).toContain('clean-tree');
    expect(html).toContain('figure-frame');
  });

  it('renders a language-tagged fence as a plain code block with the given class', () => {
    const html = renderToStaticMarkup(
      createElement(FencedCode, { text: TREE, lang: 'ts', className: 'view-todo-code' }),
    );
    expect(html).toMatch(/^<pre class="view-todo-code"><code>/);
    expect(html).not.toContain('figure-frame');
  });

  it('renders ordinary untagged code as a plain code block', () => {
    const html = renderToStaticMarkup(createElement(FencedCode, { text: 'const a = 1;' }));
    expect(html).toBe('<pre><code>const a = 1;</code></pre>');
  });
});

describe('FencedFigure', () => {
  it('frames text that is neither a diagram nor a tree as plain text', () => {
    const html = renderToStaticMarkup(
      createElement(FencedFigure, { text: 'just words', title: 'Project structure' }),
    );
    expect(html).toContain('figure-frame');
    expect(html).toContain('figure-frame-plain');
    expect(html).toContain('Project structure');
  });

  it('draws a tree as the clean tree and keeps the title', () => {
    const html = renderToStaticMarkup(
      createElement(FencedFigure, { text: TREE, title: 'Directory structure' }),
    );
    expect(html).toContain('clean-tree');
    expect(html).toContain('Directory structure');
  });
});

describe('FigureFor', () => {
  it('renders a diagram inside a figure frame', () => {
    const html = renderToStaticMarkup(createElement(FigureFor, { kind: 'diagram', text: DIAGRAM }));
    expect(html).toContain('figure-frame');
  });
});
