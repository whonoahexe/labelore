// Stylesheet-source assertions pinning the requirement-pagination selector arrangement — kept out
// of the already-dirty visual-contract.test.ts (quick-260916-vjt). Proves the requirement controls
// were added by grouping into the dashboard's existing attention-pagination rule set (no new
// declaration, no new value) rather than by duplicating a parallel block, and that roadmap-page.tsx
// actually renders the three class names these selectors target.
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

describe('requirement-pagination shares the dashboard pagination rule set (VJT-02)', () => {
  it('groups .requirement-pagination onto the base attention-pagination rule', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-pagination,');
    expect(block).toBeDefined();
    expect(block).toContain('.requirement-pagination {');
  });

  it('groups .requirement-pagination-actions onto the actions rule', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-pagination-actions,');
    expect(block).toBeDefined();
    expect(block).toContain('.requirement-pagination-actions {');
  });

  it('groups .requirement-page-status onto the status rule', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-page-status,');
    expect(block).toBeDefined();
    expect(block).toContain('.requirement-page-status {');
  });

  it('groups .requirement-pagination button onto the button rule, carrying border/background/color forward', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-pagination button,');
    expect(block).toBeDefined();
    expect(block).toContain('.requirement-pagination button {');
    expect(block).toMatch(/border:\s*1px solid var\(--border\);/);
    expect(block).toMatch(/background:\s*var\(--card\);/);
    expect(block).toMatch(/color:\s*var\(--foreground\);/);
  });

  it('groups the hover, disabled, and svg button states', async () => {
    const css = await source('src/web/styles/globals.css');
    const [hoverBlock] = ruleBlocks(css, '.attention-pagination button:hover:not(:disabled),');
    expect(hoverBlock).toBeDefined();
    expect(hoverBlock).toContain('.requirement-pagination button:hover:not(:disabled) {');

    const [disabledBlock] = ruleBlocks(css, '.attention-pagination button:disabled,');
    expect(disabledBlock).toBeDefined();
    expect(disabledBlock).toContain('.requirement-pagination button:disabled {');

    const [svgBlock] = ruleBlocks(css, '.attention-pagination button svg,');
    expect(svgBlock).toBeDefined();
    expect(svgBlock).toContain('.requirement-pagination button svg {');
  });

  it('groups the narrow-viewport media-query override', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.attention-pagination,');
    // ruleBlocks matches the first block by exact selector-line text; both the base rule and the
    // media-query override share that selector line, so assert there are two occurrences.
    const occurrences = css.split('.attention-pagination,').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    expect(block).toBeDefined();
  });

  it('roadmap-page.tsx renders all three requirement-pagination class names', async () => {
    const contents = await source('src/web/pages/roadmap-page.tsx');
    expect(contents).toContain('className="requirement-pagination"');
    expect(contents).toContain('className="requirement-pagination-actions"');
    expect(contents).toContain('className="requirement-page-status"');
  });
});
