// 11-32 (VIEW-20, D-11; sketch 056 C, the inside screen): the header scope chip as a static contract. The trigger is a
// static render of ScopeChip over a QueryClient seeded with Brinkwater's real inventory; the popup is a static render
// of ScopeChipPanel, because Base UI mounts a popover's portal only on the client (the browser half is
// test/e2e/workstreams.spec.ts). Source reads pin what a render cannot show. Expected strings are the UI-SPEC's.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { buildScopeChipModel } from '../../src/presentation/workstream-index.ts';
import { flatInventory, readWorkstreamInventory } from '../../src/server/workstreams.ts';
import type { WorkstreamInventory } from '../../src/server/workstreams.ts';
import { ScopeChip, ScopeChipPanel } from '../../src/web/components/scope-chip.tsx';
import { projectKey } from '../../src/web/query-keys.ts';
import { planningFiles } from '../helpers/fixture-project.ts';

const BRINKWATER = fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

let inventory: WorkstreamInventory;
beforeAll(async () => {
  inventory = await readWorkstreamInventory(new InMemoryPlanningFilesystem(planningFiles(BRINKWATER)));
});

/** Renders `node` where the router's :project parameter is `brinkwater`, as inside the project route. */
function inProject(node: React.ReactElement, seeded: WorkstreamInventory | null, scope = 'intake'): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seeded !== null) client.setQueryData(projectKey('brinkwater', scope, 'workstreams'), seeded);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: [`/brinkwater/workstreams/${scope}/`] },
        createElement(Routes, null, createElement(Route, { path: '/:project/*', element: node })),
      ),
    ),
  );
}

describe('the scope chip trigger', () => {
  it('is a button named "Workstream: intake", a popup opener, closed, reading "ws: intake"', () => {
    const markup = inProject(createElement(ScopeChip, { scope: 'intake' }), inventory);
    expect(markup).toContain('<button');
    expect(markup).toContain('aria-label="Workstream: intake"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('class="scope-chip"');
    expect(markup).toContain('ws:');
    expect(markup).toContain('<span class="scope-chip-name">intake</span>');
    // The list is closed, so none of it is in the markup.
    expect(markup).not.toContain('scope-chip-popup');
    expect(markup).not.toContain('scope-chip-row');
  });

  it('still shows its name while the inventory is on its way', () => {
    const markup = inProject(createElement(ScopeChip, { scope: 'ledger' }), null, 'ledger');
    expect(markup).toContain('aria-label="Workstream: ledger"');
    expect(markup).toContain('<span class="scope-chip-name">ledger</span>');
  });

  it('renders a name that looks like markup as text only (T-11-49)', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const markup = inProject(createElement(ScopeChip, { scope: hostile }), null, hostile);
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('is neutral: no accent colour on the trigger, a foreground rule, a 40px target when narrow or coarse', () => {
    const css = source('src/web/styles/globals.css');
    const block = (selector: string): string => {
      const start = css.indexOf(`\n${selector} {`);
      expect(start).toBeGreaterThan(-1);
      return css.slice(start, css.indexOf('\n}', start));
    };
    const trigger = block('.scope-chip');
    expect(trigger).toContain('border: 1px solid var(--foreground)');
    expect(trigger).not.toMatch(/--primary|--accent|--in-flight|--complete/);
    for (const selector of ['.scope-chip:hover,\n.scope-chip[aria-expanded=\'true\']', '.scope-chip-key', '.scope-chip-active', '.scope-chip-row']) {
      const start = css.indexOf(`\n${selector} {`);
      expect(start, selector).toBeGreaterThan(-1);
      expect(css.slice(start, css.indexOf('\n}', start)), selector).not.toMatch(/--primary|--accent/);
    }
    // One rule gives the trigger the 40px token when the screen is narrow or coarse.
    expect(css).toMatch(/@media \(max-width: 42rem\), \(pointer: coarse\) \{\s*\.scope-chip \{\s*min-height: var\(--space-10\);/);
  });
});

describe('the scope chip list over Brinkwater', () => {
  const panel = (scope = 'intake'): string =>
    inProject(createElement(ScopeChipPanel, { model: buildScopeChipModel(inventory, scope) }), null, scope);

  it('lists the three workstreams and All workstreams, as links in a navigation landmark', () => {
    const markup = panel();
    expect(markup).toContain('<nav aria-label="Workstreams">');
    expect(markup.match(/<a /g)).toHaveLength(4);
    for (const name of ['intake', 'ledger', 'notices']) expect(markup).toContain(`>${name}</span>`);
    expect(markup).toContain('>All workstreams</span>');
    expect(markup).toContain('The workstream index');
  });

  it('marks the open workstream aria-current="page", and only it', () => {
    expect(panel('intake').match(/aria-current="page"/g)).toHaveLength(1);
    const ledger = panel('ledger');
    expect(ledger.match(/aria-current="page"/g)).toHaveLength(1);
    expect(ledger).toMatch(/href="\/brinkwater\/workstreams\/ledger\/"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/brinkwater\/workstreams\/ledger\/"/);
  });

  it('links each row to its workstream and All workstreams to the project root, unscoped', () => {
    const markup = panel();
    expect(markup).toContain('href="/brinkwater/workstreams/intake/"');
    expect(markup).toContain('href="/brinkwater/workstreams/ledger/"');
    expect(markup).toContain('href="/brinkwater/workstreams/notices/"');
    // From inside a scope the way out is never /brinkwater/workstreams/intake/workstreams/...
    expect(markup).not.toMatch(/workstreams\/[^"/]+\/workstreams/);
    expect(markup).toContain('href="/brinkwater"');
  });

  it('writes each row\'s line as the contract does', () => {
    const model = buildScopeChipModel(inventory, 'intake');
    expect(model.rows.map((row) => [row.name, row.sub])).toEqual([
      ['intake', expect.stringMatching(/^Phase 2 · \S/)],
      ['ledger', expect.stringMatching(/^Phase 4 · \S/)],
      ['notices', 'Not started · no roadmap'],
    ]);
    const markup = panel();
    expect(markup).toContain('Not started · no roadmap');
  });

  it('shows the Active mark on the workstream the pointer names, and only there', () => {
    const markup = panel('ledger');
    expect(markup.match(/scope-chip-active/g)).toHaveLength(1);
    expect(buildScopeChipModel(inventory, 'ledger').rows.map((row) => row.active)).toEqual([true, false, false]);
    const none = buildScopeChipModel({ ...inventory, active: { name: null, state: 'absent' } }, 'ledger');
    expect(none.rows.some((row) => row.active)).toBe(false);
    const stale = buildScopeChipModel({ ...inventory, active: { name: 'gone', state: 'stale' } }, 'ledger');
    expect(stale.rows.some((row) => row.active)).toBe(false);
  });

  it('draws each status square in the index\'s tones: quiet for no roadmap, in-flight for an unfinished one', () => {
    const rows = buildScopeChipModel(inventory, 'intake').rows;
    expect(rows.find((row) => row.name === 'notices')?.tone).toBe('quiet');
    expect(rows.find((row) => row.name === 'intake')?.tone).toBe('in-flight');
    expect(panel()).toContain('data-tone="quiet"');
  });

  it('keeps a hostile workstream name as text and encodes it as one path segment (T-11-49, T-11-46)', () => {
    const hostile = 'a<img src=x onerror=alert(1)>';
    const entries = [{ ...inventory.entries[0], name: hostile }];
    const markup = inProject(
      createElement(ScopeChipPanel, { model: buildScopeChipModel({ ...flatInventory(), mode: 'workstreams', entries }, hostile) }),
      null,
      hostile,
    );
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(markup).toContain(`href="/brinkwater/workstreams/${encodeURIComponent(hostile)}/"`);
  });

  it('leaves out an entry that is a file: it has no scope to switch to', () => {
    const file = { ...inventory.entries[0], name: 'stray.md', kind: 'file' as const };
    const model = buildScopeChipModel({ ...inventory, entries: [...inventory.entries, file] }, 'intake');
    expect(model.rows.map((row) => row.name)).toEqual(['intake', 'ledger', 'notices']);
  });

  it('gives only All workstreams when the inventory is not in', () => {
    expect(buildScopeChipModel(undefined, 'intake').rows).toEqual([]);
  });
});

describe('the scope chip in the shell', () => {
  it('is rendered by the shell beside the project switcher only when a scope is open', () => {
    const shell = source('src/web/components/app-shell.tsx');
    expect(shell).toMatch(/scope !== null \? <ScopeChip scope=\{scope\} \/> : null/);
    expect(shell.indexOf('<ProjectSwitcher')).toBeLessThan(shell.indexOf('<ScopeChip'));
  });

  it('builds no markup from text and takes every address from the nav helpers', () => {
    const chip = source('src/web/components/scope-chip.tsx');
    expect(chip).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
    expect(chip).toContain('UnscopedLink');
    expect(chip).toContain('aria-haspopup');
  });
});
