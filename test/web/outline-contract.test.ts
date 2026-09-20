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

  it('use-active-section.ts tracks intersection only, with no URL side effects', async () => {
    const contents = await source('src/web/components/use-active-section.ts');
    expect(contents).toContain('IntersectionObserver');
    expect(contents).not.toMatch(/pushState|replaceState|location\.hash|useNavigate/);
  });
});
