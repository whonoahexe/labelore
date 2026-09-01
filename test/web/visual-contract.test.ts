// Stylesheet-source assertions pinning the revised visual contract (02-UI-SPEC.md revision
// pass, gap-closure plan 02-12). These are region-scoped assertions against the raw CSS text —
// they prove a declaration exists or is absent, not that a reader can perceive it. The residual
// perceptual claims (nesting depth along a real DOM path, scrollbar thumb contrast, trigger
// legibility) are authored as `backstop` truths in 02-12-PLAN.md and handed to the human gate.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Extracts every top-level rule block whose selector line matches `selectorLine` exactly. */
function ruleBlocks(css: string, selectorLine: string): string[] {
  const blocks: string[] = [];
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== selectorLine) continue;
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '}') {
      body.push(lines[cursor]);
      cursor += 1;
    }
    blocks.push(body.join('\n'));
  }
  return blocks;
}

describe('revised visual contract (G-08, G-10, G-05, G-07, G-03, E9 long-text)', () => {
  it('flattens the document canvas — no enclosing border, background fill, or shadow', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.document-canvas {');
    expect(block).toBeDefined();
    expect(block).not.toMatch(/^\s*(border|box-shadow|background)\s*:/m);
    expect(block).toContain('min-width: 0;');
    expect(block).toContain('max-width: 70rem;');
  });

  it('keeps one hairline on top-level plan sections', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.plan-section {');
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      expect(block).not.toMatch(/^\s*(border|border-left|border-right|border-bottom|background)\s*:/m);
      expect(block).toContain('border-top: 1px solid var(--border)');
      expect(block).toContain('min-width: 0;');
    }
  });

  it('removes recursive separators and horizontal inset from nested plan sections', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.plan-section .plan-section {');
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      expect(block).toContain('border-top: 0;');
      expect(block).toContain('padding-inline: 0;');
    }
  });

  it('drops the inline code border and keeps a subtle background tint', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.artifact-document :not(pre) > code {');
    expect(block).toBeDefined();
    expect(block).not.toMatch(/^\s*border\s*:/m);
    expect(block).toContain('color-mix(in oklch, var(--secondary) 70%, transparent)');
  });

  it('keeps exactly the fenced code block as the surviving Layer-1 box', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.artifact-document pre {');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks.some((block) => block.includes('border: 1px solid var(--border)'))).toBe(true);
  });

  it('declares the overflow-boundary utility applied by the four bounding components', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('.document-overflow-boundary');
    const [block] = ruleBlocks(css, '.document-overflow-boundary {');
    expect(block).toContain('min-width: 0;');
  });

  it('draws a visible cross-browser scrollbar on fenced code blocks', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('.artifact-document pre::-webkit-scrollbar {');
    expect(css).toContain('.artifact-document pre::-webkit-scrollbar-thumb {');
    expect(css).toMatch(/\.artifact-document pre::-webkit-scrollbar-thumb:hover\s*\{[\s\S]*var\(--muted-foreground\)/);
  });

  it('never wraps a fenced code line', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).not.toMatch(/^\.(?:artifact-document )?pre[^{]*\{[^}]*white-space:\s*pre-wrap/m);
    const mermaidFallback = ruleBlocks(css, '.mermaid-fallback {')[0];
    expect(mermaidFallback).toContain('white-space: pre;');
  });

  it('carries the cross-plan named fragments (attention-action, roadmap deep-link settle)', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('.attention-action');
    const [attentionAction] = ruleBlocks(css, '.attention-action {');
    expect(attentionAction).toContain('text-decoration: none;');
    const [roadmapPhase] = ruleBlocks(css, '.roadmap-phase {');
    expect(roadmapPhase).toContain('scroll-margin-top: 6rem;');
  });

  it('keeps a genuinely unbreakable long line in the dense fixture so the overflow fix stays exercised', async () => {
    const fixture = await source(
      'fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md',
    );
    const longUnbrokenLine = fixture
      .split('\n')
      .some((line) => line.length >= 200 && !line.includes(' '));
    expect(longUnbrokenLine).toBe(true);
  });

  it('gives the first table column a floor without fixing the layout', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.artifact-document table :is(th, td):first-child {');
    expect(block).toBeDefined();
    expect(block).toContain('min-width: 8ch;');
    expect(block).toContain('white-space: nowrap;');
    expect(css).not.toMatch(/^\.artifact-document table \{[^}]*table-layout:\s*fixed/m);
  });

  it('rules artifact tables horizontally only, with one weight and one color token', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.artifact-document :is(th, td) {');
    expect(block).toBeDefined();
    expect(block).not.toMatch(/^\s*border\s*:/m);
    expect(block).toContain('border-bottom: 1px solid var(--border)');
  });

  it('applies zebra striping to every table inside the artifact document', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('.artifact-document tr:nth-child(even) td');
  });

  it('uses bottom-only cell rules and zebra striping in the coverage matrix', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.coverage-table-boundary :is(th, td) {');
    expect(block).toBeDefined();
    expect(block).not.toMatch(/^\s*border\s*:/m);
    expect(block).toContain('border-bottom: 1px solid var(--border);');
    expect(css).toContain('.coverage-table-boundary tbody tr:nth-child(even) td');
  });

  it('places an attention-row provenance note in the content column', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-list > li > .source-note {');
    expect(block).toBeDefined();
    expect(block).toContain('grid-column: 2;');
    expect(block).toContain('min-width: 0;');
  });

  it('fills every status chip as a shape, with active/complete reading more clearly on', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.status-chip {');
    expect(block).toContain('color-mix(in oklch, var(--muted) 55%, transparent)');
    const [svgBlock] = ruleBlocks(css, '.status-chip svg {');
    expect(svgBlock).toContain('stroke-width: 2.25;');
    expect(css).toContain('color-mix(in oklch, var(--primary) 65%, var(--border))');
    expect(css).not.toContain('color-mix(in oklch, var(--primary) 58%, var(--border))');
  });

  it('gives a resolved reference trigger a resting appearance distinct from an authored link', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.document-reference {');
    expect(block).toBeDefined();
    expect(block).toContain('var(--muted-foreground)');
    expect(block).toContain('text-decoration-style: dotted');
    expect(block).toContain('text-underline-offset: 0.15em');
    expect(block).toContain('cursor: pointer');
    expect(block).not.toMatch(/font-weight\s*:/);
    expect(css).toMatch(/\.document-reference:hover,\s*\n\.document-reference:focus\s*\{[\s\S]*var\(--primary\)[\s\S]*solid/);
    expect(css).toContain('.document-reference:focus-visible');
    const [linkBlock] = ruleBlocks(css, '.artifact-document a {');
    expect(linkBlock).toContain('var(--primary)');
    expect(linkBlock).toContain('font-weight: 600;');
  });

  it('wraps a long unbroken outline token instead of overflowing the sticky column', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.document-outline a {');
    expect(block).toContain('overflow-wrap: anywhere;');
  });

  it('initializes Mermaid strictly with the app font and semantic root tokens', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain("securityLevel: 'strict'");
    expect(page).toContain('startOnLoad: false');
    expect(page).toContain("theme: 'base'");
    expect(page).toContain("fontFamily: rootStyle.getPropertyValue('--font-sans').trim()");
    for (const token of ['--background', '--foreground', '--secondary', '--border']) {
      expect(page).toContain(`rootStyle.getPropertyValue('${token}').trim()`);
    }
  });

  it('themes Mermaid output from app tokens and bounds SVGs proportionally', async () => {
    const css = await source('src/web/styles/globals.css');
    for (const selector of [
      '.mermaid svg {',
      '.mermaid .node :is(rect, circle, ellipse, polygon, path) {',
      '.mermaid :is(.nodeLabel, .edgeLabel, text) {',
      '.mermaid :is(.flowchart-link, .edgePath path) {',
      '.mermaid marker path {',
    ]) {
      expect(css).toContain(selector);
    }
    const [svg] = ruleBlocks(css, '.mermaid svg {');
    expect(svg).toContain('width: auto;');
    expect(svg).toContain('height: auto;');
    expect(svg).toContain('max-width: 100%;');
    expect(svg).toContain('max-height: min(70vh, 36rem);');
    expect(svg).not.toContain('min-width:');
  });

  it('keeps both valid and browser-rejected Mermaid branches reachable in the dense fixture', async () => {
    const fixture = await source(
      'fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md',
    );
    expect(fixture.match(/```mermaid/g)).toHaveLength(2);
    expect(fixture).toContain('flowchart TD\n    A[resolveIdentity] --> B[in-memory map lookup]');
    expect(fixture).toContain('flowchart TD\n    A[unterminated');

    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain("node.classList.add('mermaid-fallback')");
    expect(page).toContain("node.dataset.mermaidRejected = 'browser-parse'");
    expect(page).toContain('node.textContent = source');
  });
});

// G2-08 (02-13-SUMMARY.md item 10): unusually long Next descriptions must keep the panel
// bounded while the complete authored text stays present in the DOM/accessible tree — only
// the visual presentation is clipped, never the underlying string.
describe('G2-08 bounded Next descriptions', () => {
  it('first detects that primary and preview Next descriptions have no bounded line policy', async () => {
    const css = await source('src/web/styles/globals.css');
    const [primary] = ruleBlocks(css, '.next-primary p {');
    const [preview] = ruleBlocks(css, '.next-preview p {');
    expect(primary).toBeDefined();
    expect(preview).toBeDefined();
    expect(primary).toContain('-webkit-line-clamp: 3;');
    expect(preview).toContain('-webkit-line-clamp: 2;');
  });

  it('clamps primary descriptions at three visual lines and preview descriptions at two', async () => {
    const css = await source('src/web/styles/globals.css');
    const [primary] = ruleBlocks(css, '.next-primary p {');
    const [preview] = ruleBlocks(css, '.next-preview p {');
    for (const block of [primary, preview]) {
      expect(block).toContain('display: -webkit-box;');
      expect(block).toContain('-webkit-box-orient: vertical;');
      expect(block).toContain('overflow: hidden;');
    }
    expect(primary).toContain('-webkit-line-clamp: 3;');
    expect(preview).toContain('-webkit-line-clamp: 2;');
  });

  it('never truncates the underlying description string in the component itself', async () => {
    const page = await source('src/web/pages/dashboard-page.tsx');
    expect(page).toContain('<p>{item.description}</p>');
    expect(page).not.toMatch(/item\.description\.(slice|substring|substr)\(/);
  });
});

// G2-09/G2-10 (02-13-SUMMARY.md items 2, 4): section-label color and status-chip tone must
// come from one named, theme-aware token contract rather than a conflicting later cascade or
// a page-specific override.
describe('G2-09 section-label token contract', () => {
  it('diagnoses every .plan-section-label declaration and finds the conflicting later color', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.plan-section-label {');
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const colorDeclarations = blocks.filter((block) => /^\s*color\s*:/m.test(block));
    expect(colorDeclarations).toHaveLength(1);
    expect(colorDeclarations[0]).toContain('var(--muted-foreground)');
  });

  it('resolves top-level and nested section labels to the same muted token', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.plan-section-label {');
    for (const block of blocks) {
      expect(block).not.toContain('var(--primary)');
    }
  });
});

describe('G2-10 status-chip semantic tone contract', () => {
  it('keeps active/current and complete/exact on the primary treatment', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(
      /\.status-chip\[data-tone='active'\],\s*\n\.status-chip\[data-tone='complete'\]\s*\{[\s\S]*var\(--primary\)/,
    );
  });

  it('keeps pending/quiet/inferred on the muted treatment, distinct from active/complete', async () => {
    const css = await source('src/web/styles/globals.css');
    const [quiet] = ruleBlocks(css, ".status-chip[data-tone='quiet'] {");
    expect(quiet).toBeDefined();
    expect(quiet).toContain('var(--muted-foreground)');
    expect(quiet).not.toContain('var(--primary)');
  });

  it('assigns inferred coverage matches the quiet treatment, not the active/complete treatment', async () => {
    const page = await source('src/web/pages/plan-pair-page.tsx');
    expect(page).toMatch(
      /data-tone=\{match\.kind === 'exact' \? 'complete' : 'quiet'\}/,
    );
    expect(page).not.toMatch(/data-tone=\{match\.kind === 'exact' \? 'complete' : 'active'\}/);
  });

  it('never assigns a raw/unrecognized status-chip tone at any call site', async () => {
    const files = await Promise.all(
      ['src/web/pages/dashboard-page.tsx', 'src/web/pages/roadmap-page.tsx', 'src/web/pages/plan-pair-page.tsx'].map(
        source,
      ),
    );
    const recognizedTones = ['active', 'complete', 'quiet'];
    for (const file of files) {
      const toneLiterals = [...file.matchAll(/data-tone=(?:"([\w-]+)"|\{[^}]*'([\w-]+)'[^}]*\})/g)]
        .flatMap((match) => [match[1], match[2]])
        .filter((value): value is string => Boolean(value));
      for (const tone of toneLiterals) {
        expect(recognizedTones).toContain(tone);
      }
    }
  });
});

describe('outline-less artifact layout (G2-11)', () => {
  it('collapses the reader grid to one column when no outline renders', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, ".document-reader-layout[data-outline='false'] {");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('marks the reader layout with whether an outline is present', async () => {
    const tsx = await source('src/web/pages/artifact-page.tsx');
    expect(tsx).toMatch(/data-outline=\{outlineHeadings\(document\)\.length > 0 \? 'true' : 'false'\}/);
  });
});

describe('task-list item flow (G2-12)', () => {
  it('lays task items out as inline flow, not a fixed-column grid', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.artifact-document .task-list-item {');
    expect(blocks).toHaveLength(1);
    // A grid here strands the trailing text node in the 1rem checkbox column.
    expect(blocks[0]).not.toMatch(/display:\s*grid/);
    expect(blocks[0]).toMatch(/display:\s*block/);
    expect(blocks[0]).toMatch(/padding-left:/);
  });

  it('hangs the task checkbox into the indent', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, ".artifact-document .task-list-item > input[type='checkbox'] {");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/margin-left:\s*-/);
  });
});

describe('reference popover anchoring (F7)', () => {
  it('anchors the positioner to a measured virtual element, not the raw trigger node', async () => {
    const tsx = await source('src/web/components/reference-preview.tsx');
    // A raw Element anchor left the positioner with a 0x0 reference at the viewport origin,
    // pinning every popup to the top-left. A virtual anchor measures on demand instead.
    expect(tsx).toMatch(/getBoundingClientRect:\s*\(\)\s*=>\s*trigger\.getBoundingClientRect\(\)/);
    expect(tsx).toContain('anchor={anchor}');
    expect(tsx).not.toContain('anchor={state.trigger}');
  });
});
