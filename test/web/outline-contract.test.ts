// READ-07/D-12/D-13: contract pins for the reading-position outline and the narrow-width sticky
// disclosure. Text-scan idiom (no AST tooling), mirroring test/web/visual-contract.test.ts and
// test/web/css-source-order.test.ts — proves a declaration/import exists or a forbidden pattern
// is absent, not full visual perception (the human-check in 05-04-PLAN.md Task 2 covers that).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Extracts the raw text of the first `@media (max-width: 58rem) { ... }` block (top-level brace
 * balance, no nested at-rules expected inside it). */
function extract58remMediaBlock(css: string): string {
  const marker = '@media (max-width: 58rem)';
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const openBrace = css.indexOf('{', start);
  let depth = 0;
  let end = openBrace;
  for (let i = openBrace; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return css.slice(openBrace, end + 1);
}

function ruleBlock(css: string, selectorLine: string): string | undefined {
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== selectorLine) continue;
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '}') {
      body.push(lines[cursor]);
      cursor += 1;
    }
    return body.join('\n');
  }
  return undefined;
}

describe('outline narrow-width CSS contract (Pitfall 5 fixed)', () => {
  it('the ≤58rem media block no longer puts .document-outline into static/normal flow', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = extract58remMediaBlock(css);
    expect(block).not.toMatch(/position:\s*static/);
    expect(block).toContain('.document-outline-trigger');
  });

  it('defines exactly one base .document-outline-trigger rule with the sticky offset', async () => {
    const css = await source('src/web/styles/globals.css');
    const matches = css.match(/^\.document-outline-trigger \{/gm) ?? [];
    expect(matches).toHaveLength(1);
    const block = ruleBlock(css, '.document-outline-trigger {');
    expect(block).toBeDefined();
    expect(block).toContain('position: sticky;');
    expect(block).toContain('top: var(--space-22);');
  });

  it('the trigger label span truncates with an ellipsis', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = ruleBlock(css, '.document-outline-trigger > span {');
    expect(block).toBeDefined();
    expect(block).toContain('text-overflow: ellipsis;');
  });
});

describe('outline component contract', () => {
  it('document-outline.tsx renders the narrow trigger and Popover, with no URL side effects', async () => {
    const contents = await source('src/web/components/document-outline.tsx');
    expect(contents).toContain('@base-ui/react/popover');
    expect(contents).toContain('document-outline-trigger');
    expect(contents).toContain('On this page · ');
    expect(contents).toContain('ChevronDown');
    expect(contents).toContain('data-active=');
    expect(contents).not.toMatch(/pushState|replaceState|location\.hash|useNavigate/);
  });

  it('document-outline.tsx renders the plain overflow row and artifact-page.tsx feeds it the cap', async () => {
    const outline = await source('src/web/components/document-outline.tsx');
    expect(outline).toContain('data-overflow');
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('capOutline(');
    expect(page).toContain('OUTLINE_ENTRY_CAP');
    expect(page).toContain('omitted={omitted}');
  });

  it('use-active-section.ts tracks intersection only, with no URL side effects', async () => {
    const contents = await source('src/web/components/use-active-section.ts');
    expect(contents).toContain('IntersectionObserver');
    expect(contents).not.toMatch(/pushState|replaceState|location\.hash|useNavigate/);
  });
});

// UI-08 (Phase 12): a depth-2 row of the plan task index sits further in and carries a hairline
// on its left; depth-1 rows carry none because the marker is scoped to data-depth='2'.
describe('plan task index depth marker (UI-08)', () => {
  it('the depth-2 row indents by --space-6 and draws a 1px --border left rule', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = ruleBlock(css, ".view-plan-task-index li[data-depth='2'] {");
    expect(block).toBeDefined();
    expect(block).toContain('padding-left: var(--space-6);');
    expect(block).toContain('border-left: 1px solid var(--border);');
  });

  it('the plain row rule carries no left rule, so depth-1 rows stay unmarked', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = ruleBlock(css, '.view-plan-task-index li {');
    expect(block).toBeDefined();
    expect(block).not.toContain('border-left');
    expect(block).not.toContain('padding-left');
  });
});

/** Every rule block whose selector line names the trigger, the narrow media block's included. */
function triggerBlocks(css: string): string[] {
  const blocks: string[] = [];
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.endsWith(' {') || line.startsWith('/') || line.startsWith('*')) continue;
    if (!line.includes('.document-outline-trigger')) continue;
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

// UI-07 and UI-09 (Phase 12, 12-UI-SPEC "UI-review polish"): the narrow trigger is opaque and its
// chevron is primary, so a sticky trigger hides the text scrolling under it and reads as a control.
describe('outline trigger polish (UI-07, UI-09)', () => {
  it('the trigger paints an opaque --card surface, keeps its frame and its muted label colour', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = ruleBlock(css, '.document-outline-trigger {');
    expect(block).toBeDefined();
    expect(block).toContain('background: var(--card);');
    expect(block).toContain('border: 1px solid var(--border);');
    expect(block).toContain('color: var(--muted-foreground);');
  });

  it('no rule that targets the trigger sets a background through the translucent veil token', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = triggerBlocks(css);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    for (const block of blocks) expect(block).not.toContain('--card-veil');
  });

  it('the chevron svg takes --primary while the open state only rotates it', async () => {
    const css = await source('src/web/styles/globals.css');
    const svg = ruleBlock(css, '.document-outline-trigger svg {');
    expect(svg).toBeDefined();
    expect(svg).toContain('color: var(--primary);');
    const open = ruleBlock(css, '.document-outline-trigger[data-popup-open] svg {');
    expect(open).toBeDefined();
    expect(open).toContain('transform: rotate(180deg);');
    expect(open).not.toContain('color:');
  });
});
