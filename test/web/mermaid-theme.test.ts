import { describe, expect, it } from 'vitest';
import { toMermaidColor } from '../../src/web/pages/mermaid-theme.ts';

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
