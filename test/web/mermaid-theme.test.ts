import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { toMermaidColor } from '../../src/web/pages/mermaid-theme.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Parses a hex color string into its three channel values. */
function hexChannels(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`not a hex color: ${hex}`);
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

describe('toMermaidColor', () => {
  it('converts pure white', () => {
    expect(toMermaidColor('oklch(1 0 0)')).toBe('#ffffff');
  });

  it('converts pure black', () => {
    expect(toMermaidColor('oklch(0 0 0)')).toBe('#000000');
  });

  it('converts the light --border token', () => {
    expect(toMermaidColor('oklch(0.922 0 0)')).toBe('#e5e5e5');
  });

  it('converts the dark --card token', () => {
    expect(toMermaidColor('oklch(0.205 0 0)')).toBe('#171717');
  });

  it('preserves an alpha channel as an rgba() form', () => {
    const result = toMermaidColor('oklch(1 0 0 / 10%)');
    expect(result).toMatch(/^rgba\(255,\s*255,\s*255,\s*0\.1\)$/);
  });

  it('converts the light --secondary token within tolerance', () => {
    const result = toMermaidColor('oklch(0.967 0.001 286.375)');
    const [r, g, b] = hexChannels(result);
    const [er, eg, eb] = hexChannels('#f4f4f5');
    expect(Math.abs(r - er)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - eg)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - eb)).toBeLessThanOrEqual(2);
  });

  it('converts the dark --secondary token within tolerance', () => {
    const result = toMermaidColor('oklch(0.274 0.006 286.033)');
    const [r, g, b] = hexChannels(result);
    const [er, eg, eb] = hexChannels('#27272a');
    expect(Math.abs(r - er)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - eg)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - eb)).toBeLessThanOrEqual(2);
  });

  it('parses percentage lightness the same as a bare fraction', () => {
    expect(toMermaidColor('oklch(96.7% 0.001 286.375)')).toBe(
      toMermaidColor('oklch(0.967 0.001 286.375)'),
    );
  });

  it('parses a deg-suffixed hue the same as a bare number', () => {
    expect(toMermaidColor('oklch(0.967 0.001 286.375deg)')).toBe(
      toMermaidColor('oklch(0.967 0.001 286.375)'),
    );
  });

  it('parses a numeric alpha the same as its percentage equivalent', () => {
    expect(toMermaidColor('oklch(1 0 0 / 0.1)')).toBe(toMermaidColor('oklch(1 0 0 / 10%)'));
  });

  it('returns a non-oklch hex input unchanged', () => {
    expect(toMermaidColor('#abcdef')).toBe('#abcdef');
  });

  it('returns a non-oklch rgb() input unchanged', () => {
    expect(toMermaidColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
  });

  it('returns an empty string unchanged', () => {
    expect(toMermaidColor('')).toBe('');
  });

  it('returns an unterminated oklch() call unchanged rather than throwing', () => {
    expect(() => toMermaidColor('oklch(')).not.toThrow();
    expect(toMermaidColor('oklch(')).toBe('oklch(');
  });

  it('returns a malformed oklch() body unchanged rather than throwing', () => {
    expect(() => toMermaidColor('oklch(nope)')).not.toThrow();
    expect(toMermaidColor('oklch(nope)')).toBe('oklch(nope)');
  });
});

describe('percentage components (WR-01)', () => {
  it('maps 100% chroma to 0.4, not 1.0', () => {
    // CSS Color 4 gives chroma its own reference range. Treating 100% as 1.0 oversaturates by
    // 2.5x, so oklch(0.7 50% 150) must equal oklch(0.7 0.2 150).
    expect(toMermaidColor('oklch(0.7 50% 150)')).toBe(toMermaidColor('oklch(0.7 0.2 150)'));
    expect(toMermaidColor('oklch(0.7 100% 150)')).toBe(toMermaidColor('oklch(0.7 0.4 150)'));
  });

  it('still maps 100% lightness and alpha to 1', () => {
    expect(toMermaidColor('oklch(100% 0 0)')).toBe(toMermaidColor('oklch(1 0 0)'));
    expect(toMermaidColor('oklch(0.5 0 0 / 100%)')).toBe(toMermaidColor('oklch(0.5 0 0)'));
  });
});

describe('mermaid initialization site — source-level contract (quick-260910-0x4 item 9)', () => {
  // Extracts the `themeVariables: { ... }` object literal's raw source text from
  // artifact-page.tsx's mermaid.initialize() call — a plain-text region extraction, matching the
  // pattern test/web/visual-contract.test.ts already uses for stylesheet rule blocks.
  async function extractThemeVariablesBlock(): Promise<string> {
    const page = await source('src/web/pages/artifact-page.tsx');
    const start = page.indexOf('themeVariables: {');
    expect(start, 'expected a themeVariables: { block in artifact-page.tsx').toBeGreaterThan(-1);
    const openBraceIndex = page.indexOf('{', start);
    let depth = 0;
    let cursor = openBraceIndex;
    for (; cursor < page.length; cursor += 1) {
      if (page[cursor] === '{') depth += 1;
      else if (page[cursor] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    return page.slice(openBraceIndex, cursor + 1);
  }

  it('covers the full named palette: node fill/border, cluster fill/border, secondary/tertiary colours, edge colour, edge-label background, cluster/node text colour, note colours, and font size', async () => {
    const block = await extractThemeVariablesBlock();
    const requiredKeys = [
      'background',
      'primaryColor',
      'primaryTextColor',
      'primaryBorderColor',
      'secondaryColor',
      'tertiaryColor',
      'tertiaryTextColor',
      'lineColor',
      'nodeBkg',
      'nodeBorder',
      'nodeTextColor',
      'clusterBkg',
      'clusterBorder',
      'edgeLabelBackground',
      'noteBkgColor',
      'noteTextColor',
      'noteBorderColor',
      'fontSize',
    ];
    for (const key of requiredKeys) {
      expect(block, `expected themeVariables to declare ${key}`).toMatch(new RegExp(`\\b${key}:`));
    }
  });

  it('routes every themeVariables value through toMermaidColor() — the single conversion seam, never a second one', async () => {
    const block = await extractThemeVariablesBlock();
    // Every `key: <expression>,` pair's expression must itself be a toMermaidColor(...) call —
    // proves no entry hands mermaid a raw, unconverted property value. fontSize is included
    // deliberately: it isn't a colour, but toMermaidColor() returns non-oklch input unchanged, so
    // wrapping it costs nothing and keeps the "every value flows through the converter" contract
    // literal rather than color-only.
    const entries = [...block.matchAll(/(\w+):\s*(toMermaidColor\([^)]*\)|[^,\n]+),?/g)];
    expect(entries.length).toBeGreaterThanOrEqual(18);
    for (const [, key, expr] of entries) {
      expect(expr.trim(), `${key} should be wrapped in toMermaidColor(...)`).toMatch(
        /^toMermaidColor\(/,
      );
    }
    // Confirms this test isn't accidentally matching zero entries and passing vacuously — a second
    // conversion helper anywhere in this file would be a seam violation.
    expect((block.match(/toMermaidColor\(/g) ?? []).length).toBeGreaterThanOrEqual(18);
    const converterNames = new Set(
      [...block.matchAll(/(\w+)\(rootStyle\.getPropertyValue|(\w+)\(bodyFontSize\)/g)].flatMap(
        (m) => [m[1], m[2]].filter((x): x is string => Boolean(x)),
      ),
    );
    expect(converterNames).toEqual(new Set(['toMermaidColor']));
  });

  it('seeds node fill from --card, not --secondary (the 02-13 root-cause fix)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toMatch(/primaryColor:\s*toMermaidColor\(rootStyle\.getPropertyValue\('--card'\)/);
    expect(page).toMatch(/nodeBkg:\s*toMermaidColor\(rootStyle\.getPropertyValue\('--card'\)/);
    // --secondary is still read (for secondaryColor, its actual namesake concept), just no longer
    // as the node-fill seed.
    expect(page).toMatch(
      /secondaryColor:\s*toMermaidColor\(rootStyle\.getPropertyValue\('--secondary'\)/,
    );
  });

  it('keeps securityLevel strict and the dynamic import', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toMatch(/securityLevel:\s*'strict'/);
    expect(page).toMatch(/import\(\s*'mermaid'\s*\)/);
  });

  it('keeps both lower fallback rungs reachable: the colourless base-options retry, and the per-node readable-source fallback', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    // Rung 2: on a themeVariables initialize() failure, retry with baseOptions alone (no colours).
    const initSection = page.slice(page.indexOf('const chunk = import'), page.indexOf('chunk.catch'));
    expect(initSection).toMatch(/catch\s*\{[\s\S]*?mermaid\.initialize\(baseOptions\)/);
    // Rung 3: per-node, a parse/run failure restores the readable source text rather than leaving
    // a broken node.
    expect(initSection).toMatch(/node\.textContent\s*=\s*source/);
    expect(initSection).toMatch(/mermaid-fallback/);
  });
});
