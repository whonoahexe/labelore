// Pins the WCAG 1.4.11 non-text contrast of the focus ring (WINDOWS.md entry 7). The ring was
// `--ring` at 50% alpha via the base layer's `outline-ring/50`, which measured 2.36:1 light and
// 1.93:1 dark on real rendered pixels — both under the 3:1 floor. The fix makes the outline
// opaque and brightens the dark ring. These assertions recompute contrast from the tokens
// themselves, so a later change to --primary, --background, --card or --ring re-fails here
// instead of silently regressing the ring.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { toMermaidColor } from '../../src/web/pages/mermaid-theme.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** The top-level token block for `selectorLine` — the one that declares `--ring`. */
function tokenBlock(css: string, selectorLine: string): string {
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== selectorLine) continue;
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '}') {
      body.push(lines[cursor]);
      cursor += 1;
    }
    const block = body.join('\n');
    if (/--ring:/.test(block)) return block;
  }
  throw new Error(`no ${selectorLine} token block declares --ring`);
}

/** Resolves `--name` in a token block, following a single `var(--other)` indirection. */
function token(block: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
  if (!match) throw new Error(`--${name} not declared`);
  const value = match[1].trim();
  const indirect = /^var\(--([\w-]+)\)$/.exec(value);
  return indirect ? token(block, indirect[1]) : value;
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('focus ring contrast (WCAG 1.4.11, WINDOWS.md entry 7)', () => {
  it('draws the focus outline opaque — no alpha modifier on outline-ring in the base layer', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/@apply border-border outline-ring;/);
    expect(css).not.toMatch(/outline-ring\/\d+/);
  });

  for (const [theme, selector] of [
    ['light', ':root {'],
    ['dark', '.dark {'],
  ] as const) {
    it(`keeps the ${theme} ring at or above 3:1 against both the page and card grounds`, async () => {
      const block = tokenBlock(await source('src/web/styles/globals.css'), selector);
      const ring = toMermaidColor(token(block, 'ring'));
      expect(ring).toMatch(/^#[0-9a-f]{6}$/);
      for (const ground of ['background', 'card']) {
        expect(contrast(ring, toMermaidColor(token(block, ground)))).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

/** Every custom property in a token block, whitespace-normalised. */
function tokens(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out.set(match[1], match[2].replace(/\s+/g, ' ').trim());
  }
  return out;
}

// The root cause of entry 7 was not the token value — it was index.html's pre-hydration snapshot
// declaring its dark tokens under `:root.dark`, which out-specifies globals.css's `.dark` and
// silently shadowed the corrected --ring. A contrast test reading only globals.css passed while
// the rendered page still failed. These guards pin the cascade, not just a declaration.
describe('pre-hydration token snapshot in index.html', () => {
  it('never out-specifies globals.css — the dark snapshot is `.dark`, not `:root.dark`', async () => {
    const html = await source('index.html');
    expect(html).not.toMatch(/:root\.dark\s*\{/);
    expect(html).toMatch(/^\s*\.dark\s*\{/m);
  });

  for (const [theme, selector] of [
    ['light', ':root {'],
    ['dark', '.dark {'],
  ] as const) {
    it(`keeps every ${theme} snapshot token identical to globals.css`, async () => {
      const snapshot = tokens(tokenBlock(await source('index.html'), selector));
      const live = tokens(tokenBlock(await source('src/web/styles/globals.css'), selector));
      const drift = [...snapshot]
        .filter(([name, value]) => live.get(name) !== value)
        .map(([name, value]) => `--${name}: snapshot=${value} globals=${live.get(name) ?? '(undeclared)'}`);
      expect(drift).toEqual([]);
    });
  }
});
