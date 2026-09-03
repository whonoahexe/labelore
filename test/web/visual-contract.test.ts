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

describe('nested prose measure and wrapping (F3, F4)', () => {
  it('caps prose measure by descendant match so plan-nested paragraphs are covered', async () => {
    const css = await source('src/web/styles/globals.css');
    // The child combinator missed everything a plan nests inside .plan-section.
    expect(css).not.toMatch(/\.artifact-document > :is\(p, ul, ol, blockquote\) \{/);
    const blocks = ruleBlocks(
      css,
      '.artifact-document :is(p, ul, ol, blockquote):not(table *):not(pre *):not(.mermaid *) {',
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/max-width:\s*76ch/);
  });

  it('breaks unbroken .planning paths in prose without touching code blocks', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.artifact-document :is(p, li, dd, blockquote):not(pre *) {');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe('muted surface contrast and dead selectors (F2, F5)', () => {
  it('lifts discrepancy-callout prose off the shared muted token', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.discrepancy-callout p {');
    expect(blocks).toHaveLength(1);
    // Bare --muted-foreground measured 4.11:1 in light against this callout's tinted ground.
    expect(blocks[0]).not.toMatch(/color:\s*var\(--muted-foreground\)\s*;/);
    expect(blocks[0]).toMatch(/color-mix\(in oklch, var\(--muted-foreground\).*var\(--foreground\)\)/);
  });

  it('carries no attention-list rule for an element the dashboard never renders', async () => {
    const css = await source('src/web/styles/globals.css');
    const dashboard = await source('src/web/pages/dashboard-page.tsx');
    expect(css).not.toContain('.attention-list small');
    expect(dashboard).not.toMatch(/<small/);
  });
});

describe('code scrollbar and table striping (F6, F9)', () => {
  it('draws a thin code scrollbar that strengthens once the block is engaged', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.artifact-document pre::-webkit-scrollbar {')[0]).toMatch(
      /height:\s*6px/,
    );
    expect(ruleBlocks(css, '.artifact-document pre::-webkit-scrollbar-track {')[0]).toMatch(
      /background:\s*transparent/,
    );
    // --border alone resolves to oklch(1 0 0 / 10%) in dark, which is effectively invisible.
    expect(ruleBlocks(css, '.artifact-document pre::-webkit-scrollbar-thumb {')[0]).toMatch(
      /var\(--muted-foreground\)/,
    );
    expect(css).toContain('.artifact-document pre:focus-within::-webkit-scrollbar-thumb');
  });

  it('drives both zebra rules from one declared per-theme source', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.artifact-document tr:nth-child(even) td {')[0]).toMatch(
      /background:\s*var\(--table-zebra\)/,
    );
    expect(
      ruleBlocks(css, '.coverage-table-boundary tbody tr:nth-child(even) td {')[0],
    ).toMatch(/background:\s*var\(--table-zebra\)/);
    // Declared for both grounds, so neither theme falls back to the other's stripe.
    expect(css).toMatch(/:root \{\n {2}--table-zebra:/);
    expect(css).toMatch(/\.dark \{\n {2}--table-zebra:/);
  });
});

describe('header search dropdown — navigating surface (03-02 Task 3, D-01)', () => {
  it('bounds the rendered rows by a named constant, not a magic-number slice (Test 1)', async () => {
    const source_ = await source('src/web/components/search-field.tsx');
    expect(source_).toMatch(/const DROPDOWN_LIMIT = 8;/);
    expect(source_).toMatch(/\.slice\(0, DROPDOWN_LIMIT\)/);
    expect(source_).not.toMatch(/\.slice\(0,\s*8\)/);
  });

  it('pluralizes the footer copy between the one-result and many-result forms (Test 2)', async () => {
    const source_ = await source('src/web/components/search-field.tsx');
    expect(source_).toMatch(/total === 1 \? 'result' : 'results'/);
    expect(source_).toContain('See all {total}');
  });

  it('builds the footer link from presentationRoutePatterns.search plus an encoded query, never a literal /search?q= string (Test 3)', async () => {
    const source_ = await source('src/web/components/search-field.tsx');
    expect(source_).toContain('presentationRoutePatterns.search}?q=${encodeURIComponent(trimmed)}');
    expect(source_).not.toMatch(/['"]\/search\?q=/);
  });

  it('truncates the dropdown path from the head via CSS, keeping the filename tail visible (Test 4)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.search-dropdown-item .search-result-path {');
    expect(block).toBeDefined();
    expect(block).toContain('direction: rtl;');
    expect(block).toContain('text-overflow: ellipsis;');
  });

  it('bounds the dropdown height with its own scroll so a long result set cannot shift the sticky header (Test 5)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.search-dropdown {');
    expect(block).toBeDefined();
    expect(block).toMatch(/max-height:\s*min\(/);
    expect(block).toContain('overflow-y: auto;');
  });

  it('never injects corpus-derived markup into the DOM as raw HTML', async () => {
    const source_ = await source('src/web/components/search-field.tsx');
    expect(source_).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('persistent tree sidebar (03-03 Task 2, D-09/D-10/D-12)', () => {
  it('declares a two-column grid whose first track is the sidebar, collapsing to one track when absent (Test 1)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.shell-content {');
    expect(block).toBeDefined();
    expect(block).toContain('display: grid;');
    expect(block).toMatch(/grid-template-columns:\s*minmax\(14rem, 18rem\) minmax\(0, 1fr\);/);

    const [absentBlock] = ruleBlocks(css, ".shell-content[data-sidebar='absent'] {");
    expect(absentBlock).toBeDefined();
    expect(absentBlock).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\);/);
  });

  it('consumes the --sidebar, --sidebar-border, and --sidebar-accent token family rather than generic tokens (Test 2)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [trackBlock] = ruleBlocks(css, '.tree-navigator {');
    expect(trackBlock).toBeDefined();
    expect(trackBlock).toContain('background: var(--sidebar);');
    expect(trackBlock).toContain('border-right: 1px solid var(--sidebar-border);');

    const [hoverBlock] = ruleBlocks(css, 'summary.tree-node-row:hover {');
    expect(hoverBlock).toBeDefined();
    expect(hoverBlock).toContain('background: var(--sidebar-accent);');
  });

  it('is sticky, bounded in height, and scrolls on its own overflow-y (Test 3)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.tree-navigator {');
    expect(block).toBeDefined();
    expect(block).toContain('position: sticky;');
    expect(block).toMatch(/height:\s*calc\(100vh - var\(--shell-header-height, 0px\)\);/);
    expect(block).toContain('overflow-y: auto;');
  });

  it('highlights the current-route node via --sidebar-primary, not the page-level --primary pair (Test 4)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, ".tree-node-row[data-active='true'] {");
    expect(block).toBeDefined();
    expect(block).toContain('background: var(--sidebar-primary);');
    expect(block).toContain('color: var(--sidebar-primary-foreground);');
  });

  it('wraps long node labels via overflow-wrap: anywhere inside the track (Test 5)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.tree-node-row {');
    expect(block).toBeDefined();
    expect(block).toContain('overflow-wrap: anywhere;');
  });

  it('keeps the existing document-reader and page-stack width rules intact after the shell restructure (Test 6)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [readerBlock] = ruleBlocks(css, '.document-reader-layout {');
    expect(readerBlock).toBeDefined();
    expect(readerBlock).toMatch(/grid-template-columns:\s*minmax\(10rem, 14rem\) minmax\(0, 1fr\);/);
    const [pageStackBlock] = ruleBlocks(css, '.page-stack {');
    expect(pageStackBlock).toBeDefined();
    expect(pageStackBlock).toContain('width: min(80rem, 100%);');
  });

  it('collapses the sidebar out of the layout entirely at the narrow shell breakpoint, not just squeezing it (narrow-viewport)', async () => {
    const css = await source('src/web/styles/globals.css');
    const narrowSection = css.slice(css.indexOf('@media (max-width: 62rem)'));
    expect(narrowSection).toMatch(/\.tree-navigator\s*\{\s*display:\s*none;/);
  });

  it('uses native details/summary for disclosure, never the headless collapsible primitive (Test 7)', async () => {
    const treeNavigator = await source('src/web/components/tree-navigator.tsx');
    expect(treeNavigator).not.toContain('@base-ui/react/collapsible');
    expect(treeNavigator).toContain('<details');
    expect(treeNavigator).not.toMatch(/localStorage|sessionStorage/);
  });

  it('renders the sidebar inside the shell content region while the skip link still targets main content only', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain('<TreeNavigator');
    expect(shell).toContain('href="#main-content"');
    expect(shell).toMatch(/<div className="shell-outlet" id="main-content">/);
  });
});

describe('traceability filters and disagreement markers (03-04 Task 3, D-13/D-14/D-15)', () => {
  it('reuses .status-chip for the destructive marker tone, referencing the destructive token rather than a literal colour', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, ".status-chip[data-tone='destructive'] {");
    expect(block).toBeDefined();
    expect(block).toContain('var(--destructive)');
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/\brgb\(/);
  });

  it('gives the active status filter button the primary treatment, distinct from its resting state', async () => {
    const css = await source('src/web/styles/globals.css');
    const [restingBlock] = ruleBlocks(css, '.trace-filter-button {');
    expect(restingBlock).toBeDefined();
    expect(restingBlock).not.toContain('var(--primary)');

    const [activeBlock] = ruleBlocks(css, ".trace-filter-button[data-active='true'] {");
    expect(activeBlock).toBeDefined();
    expect(activeBlock).toContain('var(--primary)');
  });

  it('declares the filter row and status-filter group', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.trace-filters {')[0]).toBeDefined();
    expect(ruleBlocks(css, '.trace-status-filters {')[0]).toBeDefined();
  });

  it('the page re-exports a pure filter predicate rather than filtering via URL search params', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('matchesTraceabilityFilter');
    expect(page).not.toMatch(/\?filter=|searchParams/);

    const filterModule = await source('src/web/pages/traceability-filter.ts');
    expect(filterModule).toContain('export function matchesTraceabilityFilter');
  });

  it('uses the exact chip labels authored in the UI-SPEC Copywriting Contract', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('Uncovered');
    expect(page).toContain('Status mismatch');
    expect(page).toContain('Unresolved');
  });
});
