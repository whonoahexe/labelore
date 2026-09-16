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
    expect(block).toContain('justify-self: start;');
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
    // quick-260910-jz8: migrated onto the weight scale — same 600 weight, token spelling.
    expect(linkBlock).toContain('font-weight: var(--fw-semibold);');
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
    // quick-260910-jz8: migrated onto the spacing scale — the negative hang now reads
    // `calc(-1 * var(--space-6))` (no longer a leading minus sign on the literal itself), but the
    // intent (a negative hang) is unchanged and pinned either way.
    expect(blocks[0]).toMatch(/margin-left:\s*(-|calc\(-1 \* var\(--space-)/);
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

// quick-260916-qqk: zero-space, hover-revealed scrollbar contract. Replaces the two tests above
// that pinned .artifact-document pre's now-removed per-site scrollbar rules — one consolidated
// block now covers every scroller in the app. These assertions are region-scoped source checks;
// the perceptual claims (no painted bar/gutter at rest, faint-but-grabbable on hover, both
// themes) are handed to the plan's <human-check> gate, harvested at end-of-phase.
const SCROLLBAR_REVEAL_SELECTOR =
  ':is(.tree-navigator, .document-outline, .search-dialog-results, .coverage-table-boundary, .overflow-x-auto, .table-scroll, .code-scroll, pre, table, .mermaid, .mermaid-fallback):is(:hover, :focus-within) {';

describe('zero-space, hover-revealed scrollbars (QQK-01, QQK-02, QQK-03)', () => {
  it('collapses every scroll container to zero space at rest — Firefox', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '* {');
    expect(block).toBeDefined();
    expect(block).toContain('scrollbar-width: none;');
    expect(block).toContain('scrollbar-color: var(--scrollbar-thumb) transparent;');
  });

  it('collapses every scroll container to zero space at rest — WebKit', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '::-webkit-scrollbar {');
    expect(block).toBeDefined();
    expect(block).toContain('width: var(--scrollbar-size, 0px);');
    expect(block).toContain('height: var(--scrollbar-size, 0px);');
  });

  it('reveals a thin 6px bar only on hover or focus of a bounded container', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, SCROLLBAR_REVEAL_SELECTOR);
    expect(block).toBeDefined();
    expect(block).toContain('--scrollbar-size: 6px;');
    expect(block).toContain('scrollbar-width: thin;');
  });

  it('carries thumb colour through two named tokens, never re-spelled at a usage site', async () => {
    const css = await source('src/web/styles/globals.css');
    const [root] = ruleBlocks(css, ':root {');
    expect(root).toContain(
      '--scrollbar-thumb: color-mix(in oklch, var(--muted-foreground) 30%, transparent);',
    );
    expect(root).toContain(
      '--scrollbar-thumb-strong: color-mix(in oklch, var(--muted-foreground) 55%, transparent);',
    );

    const [thumb] = ruleBlocks(css, '::-webkit-scrollbar-thumb {');
    expect(thumb).toMatch(/background:\s*var\(--scrollbar-thumb\);/);

    const [thumbHover] = ruleBlocks(css, '::-webkit-scrollbar-thumb:hover {');
    expect(thumbHover).toMatch(/background:\s*var\(--scrollbar-thumb-strong\);/);

    // Each recipe appears exactly once — its :root definition — never re-spelled at a usage site.
    const thumbRecipe = 'color-mix(in oklch, var(--muted-foreground) 30%, transparent)';
    const thumbStrongRecipe = 'color-mix(in oklch, var(--muted-foreground) 55%, transparent)';
    expect(css.split(thumbRecipe).length - 1).toBe(1);
    expect(css.split(thumbStrongRecipe).length - 1).toBe(1);
  });

  it('leaves no scrollbar declaration at any of the four legacy sites', async () => {
    const css = await source('src/web/styles/globals.css');
    for (const selector of ['html {', '.tree-navigator {', '.mermaid {', '.artifact-document pre {']) {
      for (const block of ruleBlocks(css, selector)) {
        expect(block).not.toMatch(/scrollbar/);
      }
    }
  });

  it('keeps scroll-behavior, overflow, and overscroll-behavior declarations untouched', async () => {
    const css = await source('src/web/styles/globals.css');
    const [html] = ruleBlocks(css, 'html {');
    expect(html).toContain('scroll-behavior: smooth;');

    const [treeNavigator] = ruleBlocks(css, '.tree-navigator {');
    expect(treeNavigator).toContain('overflow-y: auto;');
    expect(treeNavigator).toContain('overscroll-behavior: contain;');

    const [mermaidGroup] = ruleBlocks(css, '.mermaid {');
    expect(mermaidGroup).toContain('overflow-x: auto;');
    expect(mermaidGroup).toContain('overscroll-behavior-inline: contain;');
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

describe('header search dialog — navigating surface (03-02 Task 3, D-01; quick-260911-243 NAV-04)', () => {
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
    const [block] = ruleBlocks(css, '.search-dialog-item .search-result-path {');
    expect(block).toBeDefined();
    expect(block).toContain('direction: rtl;');
    expect(block).toContain('text-overflow: ellipsis;');
  });

  it('bounds the dropdown height with its own scroll so a long result set cannot shift the sticky header (Test 5)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.search-dialog-results {');
    expect(block).toBeDefined();
    expect(block).toMatch(/max-height:\s*min\(/);
    expect(block).toContain('overflow-y: auto;');
  });

  it('never injects corpus-derived markup into the DOM as raw HTML', async () => {
    const source_ = await source('src/web/components/search-field.tsx');
    expect(source_).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('planning-files drawer (quick-260911-vqe D-01..D-04, SB-04/SB-05)', () => {
  it('collapses the shell content region to a single full-width column, with no attribute-variant selector left (Test 1)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.shell-content {');
    expect(block).toBeDefined();
    expect(block).toContain('display: grid;');
    expect(block).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\);/);
    expect(css).not.toMatch(/\.shell-content\[/);
  });

  it('the drawer popup uses the --sidebar token family and a shadow, hover uses --sidebar-accent (Test 2)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [drawerBlock] = ruleBlocks(css, '.sidebar-drawer {');
    expect(drawerBlock).toBeDefined();
    expect(drawerBlock).toContain('position: fixed;');
    expect(drawerBlock).toContain('width: var(--drawer-width);');
    expect(drawerBlock).toContain('background: var(--sidebar);');
    expect(drawerBlock).toContain('color: var(--sidebar-foreground);');
    expect(drawerBlock).toContain('border-right: 1px solid var(--sidebar-border);');
    expect(drawerBlock).toContain('box-shadow: var(--shadow-popover);');

    const [hoverBlock] = ruleBlocks(css, 'summary.tree-node-row:hover {');
    expect(hoverBlock).toBeDefined();
    expect(hoverBlock).toContain('background: var(--sidebar-accent);');
    expect(hoverBlock).toContain('color: var(--sidebar-foreground);');
  });

  it('scrolls on its own overflow-y with no sticky positioning, slides in via a --drawer-width token and respects reduced motion (Test 3)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [treeBlock] = ruleBlocks(css, '.tree-navigator {');
    expect(treeBlock).toBeDefined();
    expect(treeBlock).toContain('overflow-y: auto;');
    expect(treeBlock).not.toContain('position: sticky;');

    expect(css).toContain('--drawer-width: min(22rem, 88vw);');

    expect(css).toMatch(
      /\.sidebar-drawer\[data-starting-style\],\s*\n\.sidebar-drawer\[data-ending-style\]\s*\{[\s\S]*translateX\(-100%\)/,
    );

    expect(css).toMatch(
      /\.sidebar-drawer,\s*\.sidebar-drawer-backdrop,\s*\.tree-chevron\s*\{\s*transition:\s*none;/,
    );
  });

  it('highlights the current-route node via --sidebar-primary, not the page-level --primary pair (Test 4)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, ".tree-node-row[data-active='true'] {");
    expect(block).toBeDefined();
    expect(block).toContain('background: var(--sidebar-primary);');
    expect(block).toContain('color: var(--sidebar-primary-foreground);');
  });

  it('truncates a long node label with an ellipsis, never wrapping it (Test 5)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.tree-node-label {');
    expect(block).toBeDefined();
    expect(block).toContain('text-overflow: ellipsis;');
    expect(block).toContain('white-space: nowrap;');
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

  it('keeps a menu area in the header grid at both the base and 62rem layouts, and never hides the tree or its trigger from 62rem onward (narrow-viewport)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [baseHeader] = ruleBlocks(css, '.shell-header {');
    expect(baseHeader).toBeDefined();
    expect(baseHeader).toContain("grid-template-areas: 'menu brand nav controls';");

    const narrowSection = css.slice(
      css.indexOf('@media (max-width: 62rem)'),
      css.indexOf('@media (max-width: 42rem)'),
    );
    expect(narrowSection).toContain("grid-template-areas: 'menu brand controls' 'nav nav nav';");

    const fromNarrow = css.slice(css.indexOf('@media (max-width: 62rem)'));
    expect(fromNarrow).not.toMatch(/\.tree-navigator\s*\{[^}]*display:\s*none;/s);
    expect(fromNarrow).not.toMatch(/\.sidebar-trigger\s*\{[^}]*display:\s*none;/s);
  });

  it('uses native details/summary for disclosure, never the headless collapsible primitive, and the drawer holds no client-side persisted state (Test 7)', async () => {
    const treeNavigator = await source('src/web/components/tree-navigator.tsx');
    expect(treeNavigator).not.toContain('@base-ui/react/collapsible');
    expect(treeNavigator).toContain('<details');
    expect(treeNavigator).not.toMatch(/localStorage|sessionStorage/);

    const sidebarDrawer = await source('src/web/components/sidebar-drawer.tsx');
    expect(sidebarDrawer).not.toMatch(/localStorage|sessionStorage/);
  });

  it('wires the drawer trigger, the base-ui Dialog and the tree body across the three files', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain('<SidebarDrawer');
    expect(shell).toContain('href="#main-content"');
    expect(shell).toMatch(/<div className="shell-outlet" id="main-content">/);

    const sidebarDrawer = await source('src/web/components/sidebar-drawer.tsx');
    expect(sidebarDrawer).toContain('<TreeNavigator');
    expect(sidebarDrawer).toContain("@base-ui/react/dialog");
    expect(sidebarDrawer).toContain('<Dialog.Portal keepMounted>');
    expect(sidebarDrawer).toContain('aria-label="Open planning files"');
    expect(sidebarDrawer).toContain('PanelLeft');
    expect(sidebarDrawer).toContain('Dialog.Title');

    const treeNavigator = await source('src/web/components/tree-navigator.tsx');
    expect(treeNavigator).toContain('export function useTreeQuery');
    expect(treeNavigator).toContain('ChevronRight');
    expect(treeNavigator).toContain('className="tree-badge"');
    expect(treeNavigator).toContain('title={node.path}');
    expect(treeNavigator).toContain("scrollIntoView({ block: 'nearest' })");
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

describe('index.html — anti-FOUC critical CSS (quick-260910-0x4 item 3, 02-REVIEW IN-02)', () => {
  it('still primes the theme class before first paint via the inline script', async () => {
    const html = await source('index.html');
    expect(html).toMatch(/<script>[\s\S]*localStorage\.getItem\('labelore-theme'\)[\s\S]*<\/script>/);
    expect(html).toContain("document.documentElement.classList.toggle('dark'");
  });

  it('still declares a ground colour, foreground colour and colour-scheme under both the light (:root) and dark (.dark) snapshot selectors', async () => {
    const html = await source('index.html');
    const rootBlock = html.match(/:root\s*\{([\s\S]*?)\n {6}\}/)?.[1] ?? '';
    expect(rootBlock).toMatch(/--background:\s*oklch/);
    expect(rootBlock).toMatch(/--foreground:\s*oklch/);
    expect(rootBlock).toMatch(/color:\s*var\(--foreground\)/);
    expect(rootBlock).toMatch(/background:\s*var\(--background\)/);
    expect(rootBlock).toMatch(/color-scheme:\s*light/);

    // `.dark`, not `:root.dark`: the snapshot must not out-specify globals.css's `.dark`
    // (focus-ring-contrast.test.ts pins that). Anchored to the 6-space selector indent so the
    // explanatory comment above the block, which names both selectors, never matches.
    const darkBlock = html.match(/\n {6}\.dark\s*\{([\s\S]*?)\n {6}\}/)?.[1] ?? '';
    expect(darkBlock).toMatch(/--background:\s*oklch/);
    expect(darkBlock).toMatch(/--foreground:\s*oklch/);
    expect(darkBlock).toMatch(/color-scheme:\s*dark/);
  });

  it('retains the pre-hydration effect blocks (box-sizing reset, body ground paint with min-width, form-control font reset)', async () => {
    const html = await source('index.html');
    expect(html).toMatch(/\*\s*\{\s*\n\s*box-sizing:\s*border-box;/);
    const bodyBlock = html.match(/\n {6}body\s*\{([\s\S]*?)\n {6}\}/)?.[1] ?? '';
    expect(bodyBlock).toMatch(/min-width:\s*320px/);
    expect(bodyBlock).toMatch(/color:\s*var\(--foreground\)/);
    expect(bodyBlock).toMatch(/background:\s*var\(--background\)/);
    expect(html).toMatch(/button,\s*\n\s*input,\s*\n\s*textarea,\s*\n\s*select\s*\{\s*\n\s*font:\s*inherit;/);
  });

  it('drops the dead component-scaffold selectors confirmed unreferenced by src/web (word-boundary className match, not substring)', async () => {
    const html = await source('index.html');
    const deadSelectors = [
      '.screen',
      '.position-card',
      '.error-card',
      '.card-heading',
      '.progress-block',
      '.progress-row',
      '.progress-track',
      '.progress-fill',
      '.metadata',
      '.status',
      '.muted',
      '.skeleton',
      '@keyframes pulse',
      '@media (max-width: 36rem)',
    ];
    for (const selector of deadSelectors) {
      expect(html, `expected ${selector} to be removed`).not.toContain(selector);
    }
  });

  it('retains the live selectors confirmed by an exact className-token match (not the substring-fuzzy grep the audit originally used)', async () => {
    const html = await source('index.html');
    expect(html).toContain('.eyebrow {');
    expect(html).toContain('.lede {');
    // Bare element selectors are always live by construction (h1/h2/strong appear throughout the
    // app) and are never candidates for this word-boundary className check.
    expect(html).toMatch(/\n {6}h1,\s*\n\s*h2\s*\{/);
    expect(html).toMatch(/\n {6}strong\s*\{/);
  });

  it('reports the true before/after line count against the measured 297-line baseline', async () => {
    const html = await source('index.html');
    // `wc -l`-equivalent count (number of newline characters), not split('\n').length — the latter
    // over-counts by one for a file ending in a trailing newline.
    const lineCount = (html.match(/\n/g) ?? []).length;
    // Recorded here as a live assertion, not just prose: the measured baseline was 297 lines: this
    // pins the post-cleanup count so a future edit that silently re-bloats the file is visible.
    // 162 after the cleanup, then 165: +3 for the comment above the dark snapshot explaining why it
    // is `.dark` and not `:root.dark` (WINDOWS.md entry 7) — a deliberate, acknowledged addition.
    // Then 167: +2 for quick-260910-jz8's --font-heading/--font-mono mirror (D-02) — one
    // declaration split into two, the second wrapping onto its own line like --font-sans above it.
    // Then 143: -24 for the same plan's colour cleanup (JZ8-03) — five dead tokens deleted from
    // each theme (--accent, --accent-foreground, --chart-1..5, --radius, --sidebar-ring) plus
    // three .dark redundancies removed (--primary-foreground, --card-foreground/--sidebar-foreground
    // folded into :root's var(--foreground) alias, --sidebar-primary/--sidebar-accent falling
    // through to :root). The named recipes and scale tokens are deliberately not mirrored here.
    expect(lineCount).toBe(143);
  });
});

describe('sub-10px micro-label family (quick-260910-0x4 item 8)', () => {
  // The five sibling selectors sharing the uppercase-micro-label convention (three at 0.62rem/
  // 9.92px, two at 0.6rem/9.6px — smaller still). Named here so the pin covers the whole family,
  // not just the one selector the audit happened to name. The former sixth sibling,
  // .tree-excluded-marker, left with the tree's exclusion marker (quick-260911-vqe D-04).
  const MICRO_LABEL_SELECTORS = [
    '.phase-facts dt {',
    '.blocked-by {',
    '.artifact-metadata > summary span {',
    '.warning-fields dt {',
    '.warning-fields-label {',
  ];

  it('declares a single shared token at or above 10px, with real headroom against rem rounding', async () => {
    const css = await source('src/web/styles/globals.css');
    const match = css.match(/--font-size-micro-label:\s*([\d.]+)rem;/);
    expect(match, 'expected --font-size-micro-label to be declared').not.toBeNull();
    const rem = Number(match?.[1]);
    // No root font-size override exists anywhere in this file (confirmed by grep at plan time and
    // re-confirmed by the test below) — the browser default 16px root applies directly, no em
    // compounding to account for.
    const computedPx = rem * 16;
    expect(computedPx).toBeGreaterThanOrEqual(10);
    // 0.625rem (exactly 10px) was explicitly rejected for having no headroom against rounding —
    // pin that the chosen value clears it with margin, not just clears the floor.
    expect(computedPx).toBeGreaterThan(10);
  });

  it('confirms no root/html/body font-size override exists, so the rem-to-px computation above is direct', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).not.toMatch(/(^|\n)\s*(html|:root|body)\s*(,[^{]*)?\{[^}]*font-size:/);
  });

  it('routes every sibling in the family through the shared token, not a literal', async () => {
    const css = await source('src/web/styles/globals.css');
    for (const selector of MICRO_LABEL_SELECTORS) {
      const block = ruleBlocks(css, selector)[0];
      expect(block, `expected a rule block for ${selector}`).toBeDefined();
      expect(block, `${selector} should use the shared token`).toMatch(
        /font-size:\s*var\(--font-size-micro-label\)/,
      );
    }
  });

  it('leaves no literal 0.6rem or 0.62rem font-size anywhere in the stylesheet (including inside media queries)', async () => {
    const css = await source('src/web/styles/globals.css');
    // Covers the whole cascade, not just the five base declarations above — a media query that
    // re-shrinks one of these selectors at a narrow width would still trip this, since it scans
    // the raw source text unconditionally rather than only the five ruleBlocks() extractions.
    expect(css).not.toMatch(/font-size:\s*0\.6rem\s*;/);
    expect(css).not.toMatch(/font-size:\s*0\.62rem\s*;/);
  });

  it('does not regress the muted-foreground colour on any sibling that used it before this change (colour untouched, contrast holds by construction)', async () => {
    const css = await source('src/web/styles/globals.css');
    const mutedForegroundSiblings = [
      '.phase-facts dt {',
      '.artifact-metadata > summary span {',
      '.warning-fields dt {',
      '.warning-fields-label {',
    ];
    for (const selector of mutedForegroundSiblings) {
      const block = ruleBlocks(css, selector)[0];
      expect(block, `${selector} should still read var(--muted-foreground)`).toMatch(
        /color:\s*var\(--muted-foreground\)/,
      );
    }
    // .blocked-by reads var(--destructive) — pre-existing and untouched by this change, which only
    // moved font-size to the shared token.
  });
});
