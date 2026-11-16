// Stylesheet-source assertions pinning the revised visual contract (02-UI-SPEC.md revision
// pass, gap-closure plan 02-12). These are region-scoped assertions against the raw CSS text —
// they prove a declaration exists or is absent, not that a reader can perceive it. The residual
// perceptual claims (nesting depth along a real DOM path, scrollbar thumb contrast, trigger
// legibility) are authored as `backstop` truths in 02-12-PLAN.md and handed to the human gate.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { dashboardSources } from '../helpers/dashboard-sources.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('revised visual contract (G-08, G-10, G-05, G-07, G-03, E9 long-text)', () => {
  it('keeps a genuinely unbreakable long line in the dense fixture so the overflow fix stays exercised', async () => {
    const fixture = await source(
      'fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md',
    );
    const longUnbrokenLine = fixture
      .split('\n')
      .some((line) => line.length >= 200 && !line.includes(' '));
    expect(longUnbrokenLine).toBe(true);
  });
});

// G2-08 (02-13-SUMMARY.md item 10): unusually long Next descriptions must keep the panel
// bounded while the complete authored text stays present in the DOM/accessible tree — only
// the visual presentation is clipped, never the underlying string.

// G2-09/G2-10 (02-13-SUMMARY.md items 2, 4): section-label color and status-chip tone must
// come from one named, theme-aware token contract rather than a conflicting later cascade or
// a page-specific override.

describe('G2-10 status-chip semantic tone contract', () => {
  it('never assigns a raw/unrecognized status-chip tone at any call site', async () => {
    const files = [
      dashboardSources(),
      ...(await Promise.all(['src/web/pages/roadmap-page.tsx', 'src/web/components/pair-switch.tsx'].map(source))),
    ];
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

describe('muted surface contrast and dead selectors (F2, F5)', () => {
  it('carries no rule for the removed Needs attention row link', async () => {
    const css = await source('src/web/styles/globals.css');
    const dashboard = dashboardSources();
    expect(css).not.toContain('.attention-action');
    expect(dashboard).not.toMatch(/<small/);
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

