// Source-text contract suite in the exact style of test/web/shell-contract.test.ts — readFile
// through the source() helper, never import a .tsx module directly (tsconfig.server.json includes
// test/**/*.ts while excluding src/web/**, so a real import would not typecheck under the server
// project). Pins D-01 through D-05 and the UI Considerations rows this plan's must_haves.truths
// claim as mechanically checkable.
//
// quick-260911-243 merged RefreshControl into SnapshotStatus (NAV-05): every guarantee below now
// reads src/web/components/snapshot-status.tsx in place of the deleted refresh-control.tsx.
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
  it('renders SnapshotStatus inside .shell-controls and mounts exactly one ToastProvider (D-01)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const controlsBlock = shell.slice(
      shell.indexOf('<div className="shell-controls">'),
      shell.indexOf('</div>', shell.indexOf('<div className="shell-controls">')) + '</div>'.length,
    );
    expect(controlsBlock).toContain('<SnapshotStatus');
    expect(shell.match(/<ToastProvider>/g)).toHaveLength(1);
  });

  it('shares one status slot between "Snapshot read" and "Refreshing..." (D-02)', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).toContain('Refreshing…');
    expect(status).toContain('Snapshot read');
  });

  it('sets disabled and aria-disabled from the pending flag, and carries the refresh aria-label (D-02)', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).toContain('disabled={isRefreshing}');
    expect(status).toContain('aria-disabled={isRefreshing}');
    expect(status).toContain('aria-label="Refresh the project snapshot"');
  });

  it('invalidates the query cache unconditionally and scrolls to top on success (D-03, D-05)', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).toContain('invalidateQueries()');
    expect(status).toMatch(/window\.scrollTo\(\{\s*top:\s*0\s*\}\)/);
  });

  it('never interpolates a fetch/server error into the toast, only the fixed copy (D-04)', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).not.toContain('error.message');
    expect(status).toContain('Showing the last successful read from');
  });

  it('adds no persistent "stale" label anywhere in the shell (D-04)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(shell.toLowerCase()).not.toContain('stale');
    expect(status.toLowerCase()).not.toContain('stale');
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

  // CR-02 (quick-260911-243 revision): originally anchored on the first `.snapshot-status {` rule
  // after the 62rem media query, which would grow fragile once the pill's selectors moved and
  // multiplied. Now scans every rule anywhere in the stylesheet whose selector contains
  // `.snapshot-`, media queries included, and asserts none declares display: none — the pill must
  // stay in the accessibility tree at every width.
  it('never suppresses any .snapshot- selector from the layout at any width (CR-02)', async () => {
    const css = await source('src/web/styles/globals.css');
    const lines = css.split('\n');
    const snapshotSelectorLineIndexes: number[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed.includes('.snapshot-') && trimmed.endsWith('{')) {
        snapshotSelectorLineIndexes.push(index);
      }
    }
    expect(snapshotSelectorLineIndexes.length).toBeGreaterThan(0);
    for (const startIndex of snapshotSelectorLineIndexes) {
      let cursor = startIndex + 1;
      const body: string[] = [];
      while (cursor < lines.length && lines[cursor].trim() !== '}') {
        body.push(lines[cursor]);
        cursor += 1;
      }
      expect(body.join('\n')).not.toMatch(/display:\s*none;/);
    }
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
    const status = await source('src/web/components/snapshot-status.tsx');
    // Button (@base-ui/react/button) renders a real <button> by default; this only breaks if a
    // future edit passes render={<div/>}-style polymorphism or swaps the primitive entirely.
    expect(status).toMatch(/<Button\b/);
    expect(status).not.toMatch(/render=\{/);
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
    const status = await source('src/web/components/snapshot-status.tsx');
    // A real <button> gets Enter/Space-triggers-click for free from the browser's own UA behavior
    // — there is no bespoke onKeyDown here precisely because there must not be one; a hand-rolled
    // keydown handler would be the same class of bug a `<div onClick>` control has (fires on one
    // key, not both). Pin the ABSENCE of a bespoke handler as the structural guarantee.
    expect(status).not.toMatch(/onKeyDown/);
    expect(status).toMatch(/onClick=\{\(\)\s*=>\s*mutation\.mutate\(\)\}/);
  });

  it('the snapshot-age <time> element carries no tabindex, so it is correctly never a Tab stop (measured live: confirmed absent from focus order in all six cells)', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    const timeMatch = status.match(/<time[^>]*>/);
    expect(timeMatch, 'expected a <time> element in snapshot-status.tsx').not.toBeNull();
    expect(timeMatch?.[0]).not.toMatch(/tabIndex/);
  });
});
