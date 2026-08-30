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

  it('flattens both plan-section shells to a single hairline top rule', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocks(css, '.plan-section {');
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      expect(block).not.toMatch(/^\s*(border|border-left|border-right|border-bottom|background)\s*:/m);
      expect(block).toContain('border-top: 1px solid var(--border)');
      expect(block).toContain('min-width: 0;');
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
});
