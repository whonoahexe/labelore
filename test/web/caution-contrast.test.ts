// Pins the WCAG contrast of the CONTEXT brief's `--caution` amber tone (quick-260923-lju,
// docs/design-language.md § Tones) — same idiom as focus-ring-contrast.test.ts: recompute contrast
// from the tokens themselves, so a later change to --caution, --background or --card re-fails here
// instead of silently regressing legibility.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { toMermaidColor } from '../../src/web/pages/mermaid-theme.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** The top-level token block for `selectorLine` that declares `--caution`. */
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
    if (/--caution:/.test(block)) return block;
  }
  throw new Error(`no ${selectorLine} token block declares --caution`);
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

describe('--caution contrast (docs/design-language.md § Tones)', () => {
  it('declares --caution and --caution-border, and status-chip[data-tone=caution] uses them', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/--caution:\s*oklch/);
    expect(css).toMatch(/--caution-border:\s*color-mix/);
    expect(css).toMatch(/\.status-chip\[data-tone='caution'\]\s*\{[^}]*var\(--caution-border\)/s);
    expect(css).toMatch(/\.status-chip\[data-tone='caution'\]\s*\{[^}]*var\(--caution\)/s);
  });

  for (const [theme, selector] of [
    ['light', ':root {'],
    ['dark', '.dark {'],
  ] as const) {
    it(`keeps the ${theme} --caution at or above 4.5:1 against both --background and --card`, async () => {
      const css = await source('src/web/styles/globals.css');
      const block = tokenBlock(css, selector);
      const caution = toMermaidColor(token(block, 'caution'));
      expect(caution).toMatch(/^#[0-9a-f]{6}$/);
      for (const ground of ['background', 'card']) {
        expect(contrast(caution, toMermaidColor(token(block, ground)))).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
