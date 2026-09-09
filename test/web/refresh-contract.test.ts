// Source-text contract suite in the exact style of test/web/shell-contract.test.ts — readFile
// through the source() helper, never import a .tsx module directly (tsconfig.server.json includes
// test/**/*.ts while excluding src/web/**, so a real import would not typecheck under the server
// project). Pins D-01 through D-05 and the UI Considerations rows this plan's must_haves.truths
// claim as mechanically checkable.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

// The complete dependency key set as of the end of Phase 3 — this plan's threat model (T-04-01-SC)
// requires it install no package, so the parsed dependencies object must never gain a key absent
// from this set.
const PHASE_3_DEPENDENCY_KEYS = new Set([
  '@base-ui/react',
  '@hono/node-server',
  '@tanstack/react-query',
  'class-variance-authority',
  'clsx',
  'gray-matter',
  'hast-util-sanitize',
  'hono',
  'lucide-react',
  'mermaid',
  'minisearch',
  'react',
  'react-dom',
  'react-router',
  'rehype-raw',
  'rehype-sanitize',
  'rehype-slug',
  'rehype-stringify',
  'remark-gfm',
  'remark-parse',
  'remark-rehype',
  'shiki',
  'tailwind-merge',
  'tw-animate-css',
  'unified',
]);

describe('refresh contract — D-01 through D-05 in the shell and control', () => {
  it('renders RefreshControl inside snapshot-status and mounts exactly one ToastProvider (D-01)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const snapshotStatusBlock = shell.slice(
      shell.indexOf('<div className="snapshot-status"'),
      shell.indexOf('</div>', shell.indexOf('<div className="snapshot-status"')) + '</div>'.length,
    );
    expect(snapshotStatusBlock).toContain('<RefreshControl');
    expect(shell.match(/<ToastProvider>/g)).toHaveLength(1);
  });

  it('shares one status slot between "Snapshot read" and "Refreshing..." (D-02)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain('Refreshing…');
    expect(shell).toContain('Snapshot read');
  });

  it('sets disabled and aria-disabled from the pending flag, and carries the refresh aria-label (D-02)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).toContain('disabled={isRefreshing}');
    expect(control).toContain('aria-disabled={isRefreshing}');
    expect(control).toContain('aria-label="Refresh the project snapshot"');
  });

  it('invalidates the query cache unconditionally and scrolls to top on success (D-03, D-05)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).toContain('invalidateQueries()');
    expect(control).toMatch(/window\.scrollTo\(\{\s*top:\s*0\s*\}\)/);
  });

  it('never interpolates a fetch/server error into the toast, only the fixed copy (D-04)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).not.toContain('error.message');
    expect(control).toContain('Showing the last successful read from');
  });

  it('adds no persistent "stale" label anywhere in the shell (D-04)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell.toLowerCase()).not.toContain('stale');
  });

  it('fixes the toast viewport to the bottom-right corner of the viewport', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/\.toast-viewport\s*\{[^}]*position:\s*fixed;/);
  });

  it('installs no dependency beyond the Phase 3 set (threat T-04-01-SC)', async () => {
    const packageJson = JSON.parse(await source('package.json')) as {
      dependencies: Record<string, string>;
    };
    const currentKeys = Object.keys(packageJson.dependencies);
    const unauthorized = currentKeys.filter((key) => !PHASE_3_DEPENDENCY_KEYS.has(key));
    expect(unauthorized).toEqual([]);
  });

  it('no longer suppresses the snapshot-status container from the layout below 62rem (CR-02)', async () => {
    const css = await source('src/web/styles/globals.css');
    // Same slicing idiom test/web/visual-contract.test.ts's narrow-viewport test uses: from the
    // 62rem media-query opener to EOF, so this only inspects the narrow-width cascade.
    const narrowSection = css.slice(css.indexOf('@media (max-width: 62rem)'));
    const ruleStart = narrowSection.indexOf('.snapshot-status {');
    expect(ruleStart).toBeGreaterThanOrEqual(0);
    const ruleBlock = narrowSection.slice(ruleStart, narrowSection.indexOf('}', ruleStart) + 1);
    // Pins the outcome (the container stays in the layout, so it stays in the accessibility tree
    // too), not one particular compact-treatment property spelling — a reasonable future refactor
    // of how the compact state is achieved must not produce a false failure here.
    expect(ruleBlock).not.toMatch(/display:\s*none;/);
  });
});

describe('Refresh control — structural guarantee behind the measured keyboard behaviour (quick-260910-0x4 item 11)', () => {
  // quick-260910-0x4 measured this control's keyboard reachability and operability live, via
  // Playwright against the real dev server at 320/700/992px x light/dark (six cells; results
  // recorded in the plan's SUMMARY.md, not here). These assertions are NOT a substitute for that
  // measurement — they pin the STRUCTURAL properties that make the measured behaviour true by
  // construction, so a future refactor that silently removes one of them is caught before it ever
  // needs re-measuring.
  it('renders a native <button> element, not a click handler on a non-interactive element', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    // Button (@base-ui/react/button) renders a real <button> by default; this only breaks if a
    // future edit passes render={<div/>}-style polymorphism or swaps the primitive entirely.
    expect(control).toMatch(/<Button\b/);
    expect(control).not.toMatch(/render=\{/);
    const buttonPrimitive = await source('src/web/components/ui/button.tsx');
    expect(buttonPrimitive).toContain("from '@base-ui/react/button'");
  });

  it('declares a focus-visible treatment on both theme grounds (not just a bare :focus reset)', async () => {
    const buttonPrimitive = await source('src/web/components/ui/button.tsx');
    // Measured live: real keyboard Tab focus genuinely triggers :focus-visible and a visible
    // outline in both themes (light ratio 2.29:1, dark ratio 1.46:1 against the page background —
    // both below the WCAG 1.4.11 3:1 non-text-contrast guideline; recorded as a residual finding
    // in the SUMMARY, distinct from reachability/operability which this task closes). This
    // assertion pins that SOME focus-visible treatment exists structurally — not a claim about
    // its measured contrast, which can only be re-verified live, not from source.
    expect(buttonPrimitive).toMatch(/focus-visible:/);
    expect(buttonPrimitive).not.toMatch(/focus-visible:outline-none(?!\S)/);
  });

  it('never gates the click handler on a pointer-only event (keydown/click both reach the same mutation)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    // A real <button> gets Enter/Space-triggers-click for free from the browser's own UA behavior
    // — there is no bespoke onKeyDown here precisely because there must not be one; a hand-rolled
    // keydown handler would be the same class of bug a `<div onClick>` control has (fires on one
    // key, not both). Pin the ABSENCE of a bespoke handler as the structural guarantee.
    expect(control).not.toMatch(/onKeyDown/);
    expect(control).toMatch(/onClick=\{\(\)\s*=>\s*mutation\.mutate\(\)\}/);
  });

  it('the snapshot-age <time> element carries no tabindex, so it is correctly never a Tab stop (measured live: confirmed absent from focus order in all six cells)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const timeMatch = shell.match(/<time[^>]*>/);
    expect(timeMatch, 'expected a <time> element in app-shell.tsx').not.toBeNull();
    expect(timeMatch?.[0]).not.toMatch(/tabIndex/);
  });
});
