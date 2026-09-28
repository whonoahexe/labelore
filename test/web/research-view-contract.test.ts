// quick-260929-3x3 (H-1, H-2, T-3x3-01): source-text contract for the RESEARCH briefing, in the
// view-page-contract idiom (readFile + regex, no AST tooling). Only design-language tones and theme
// tokens colour document content; nothing renders raw HTML; the figure components stay
// research-agnostic; and the additive CSS block is one contiguous, guarded region.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const FIGURE_FILES = [
  'src/rendering/ascii-lift.ts',
  'src/rendering/ascii-tree.ts',
  'src/web/components/figure-frame.tsx',
  'src/web/components/lifted-diagram.tsx',
  'src/web/components/clean-tree.tsx',
];

describe('research view contract', () => {
  it('no research or figure component uses the raw-HTML injection prop', async () => {
    for (const file of ['src/web/views/research-briefing-components.tsx', ...FIGURE_FILES]) {
      expect(await source(file), file).not.toContain(RAW_HTML_PROP);
    }
  });

  it('never writes a literal active data-tone or a parse-degradation tone in the research components', async () => {
    const components = await source('src/web/views/research-briefing-components.tsx');
    expect(components).not.toMatch(/data-tone="active"/);
    expect(components).not.toMatch(/data-tone="(destructive|warning)"/);
    expect(components).not.toMatch(/data-tone=\{?['"](destructive|warning)['"]/);
    // NEW chips in the tree pick their tone through a dynamic expression.
    const tree = await source('src/web/components/clean-tree.tsx');
    expect(tree).toContain('data-tone={BADGE_TONE[row.badge]}');
    expect(tree).not.toMatch(/data-tone="active"/);
  });

  it('the figure models and components import nothing research-specific', async () => {
    for (const file of FIGURE_FILES) {
      expect(await source(file), file).not.toMatch(/from '[^']*research/);
    }
  });

  it('the manifest declares the briefing hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('briefing: composeResearchBriefing');
    expect(manifests).toMatch(/kind: 'research'[\s\S]*promote: \[/);
  });

  it('the 3x3 CSS block exists exactly once and holds no parse-degradation token, raw colour or radius', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-260929-3x3:start').length - 1).toBe(1);
    expect(css.split('quick-260929-3x3:end').length - 1).toBe(1);
    const start = css.indexOf('/* quick-260929-3x3:start */');
    const end = css.indexOf('/* quick-260929-3x3:end */');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(block).not.toMatch(/--destructive|--warning/);
    expect(block).not.toMatch(/\boklch\(|\brgb\(|\bhsl\(/);
    expect(block).not.toMatch(/:[^;{}]*#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/radius\s*:/);
    expect(block).not.toMatch(/color-mix\(/);
  });
});
