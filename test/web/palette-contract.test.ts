// Phase 13, 13-05: the quick-jump palette host as a static contract. There is no browser here (the browser half
// is test/helpers/shoot-pages.ts --jump). The row bodies are static renders of PaletteRowBody, because the Dialog
// renders its portal only on the client; source reads pin what a render cannot show.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { JumpRow } from '../../src/presentation/jump.ts';
import type { ProjectListEntry } from '../../src/presentation/project-list.ts';
import type { PaletteRow } from '../../src/web/palette/palette-model.ts';
import { PaletteRowBody } from '../../src/web/components/search-field.tsx';
import { consumeMainFocusRequest, requestMainFocusOnNextMount } from '../../src/web/components/main-focus.ts';

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function jump(overrides: Partial<JumpRow>): PaletteRow {
  const row: JumpRow = {
    key: 'row',
    kind: 'decision',
    id: 'D-12',
    title: 'Retry window',
    subtitle: 'Phase 5 · CONTEXT',
    url: '/v1/phase-5/context',
    anchor: 'decision-d-12',
    chips: [],
    artifactKind: null,
    phaseKey: null,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
    ...overrides,
  };
  return { type: 'jump', key: row.key, row };
}

function project(overrides: Partial<ProjectListEntry> = {}): ProjectListEntry {
  return {
    slug: 'kilnrow',
    name: 'Kilnrow',
    kind: 'local',
    target: '/srv/work/kilnrow',
    displayPath: '~/work/kilnrow',
    state: 'ready',
    reason: null,
    pathChecked: null,
    lastOpened: null,
    sessionOnly: false,
    ...overrides,
  };
}

function render(row: PaletteRow): string {
  return renderToStaticMarkup(createElement(PaletteRowBody, { row }));
}

describe('PaletteRowBody (UI-SPEC row anatomy)', () => {
  it('an Exact ID row prints the Hash icon, the id and title, the path line and an Exact chip in the complete tone', () => {
    const html = render(jump({ chips: [{ label: 'Exact', tone: 'complete' }] }));
    expect(html).toContain('lucide-hash');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<span class="palette-row-id">D-12</span>');
    expect(html).toContain('Retry window');
    expect(html).toContain('Phase 5 · CONTEXT');
    expect(html).toMatch(/<span class="status-chip" data-tone="complete">Exact<\/span>/);
  });

  it('a phase chip on another phase\'s row is in the quiet tone', () => {
    const html = render(jump({ chips: [{ label: 'Phase 3', tone: 'quiet' }] }));
    expect(html).toMatch(/<span class="status-chip" data-tone="quiet">Phase 3<\/span>/);
  });

  it('a content row\'s snippet marks its highlight ranges as mark elements around text', () => {
    const html = render(
      jump({
        kind: 'content',
        id: null,
        title: 'Notes',
        anchor: null,
        artifactKind: 'context',
        snippet: { text: 'retry the session cleanly', highlights: [{ start: 0, end: 5 }, { start: 10, end: 17 }], bodyOffset: 0, anchor: null },
      }),
    );
    expect(html).toContain('lucide-text-search');
    expect(html).toContain('<span class="palette-row-snippet"><mark>retry</mark> the <mark>session</mark> cleanly</span>');
    expect(html).toMatch(/data-tone="quiet">Context<\/span>/);
  });

  it('shows a title, a path and a snippet holding markup as text, never as elements', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = render(
      jump({
        title: hostile,
        subtitle: hostile,
        snippet: { text: hostile, highlights: [], bodyOffset: 0, anchor: null },
      }),
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('a file row prints the kind chip from humanizeKind in the quiet tone, and a page row prints Page', () => {
    const file = render(
      jump({ kind: 'file', id: null, title: 'Plan 1', anchor: null, artifactKind: 'plan', subtitle: '.planning/phases/01/01-01-PLAN.md' }),
    );
    expect(file).toContain('lucide-file-text');
    expect(file).toMatch(/<span class="status-chip" data-tone="quiet">Plan<\/span>/);
    const summary = render(jump({ kind: 'file', id: null, anchor: null, artifactKind: 'summary' }));
    expect(summary).toMatch(/data-tone="quiet">Summary<\/span>/);
    const page = render(
      jump({ kind: 'page', id: null, title: 'Roadmap', subtitle: '/roadmap', anchor: null, chips: [{ label: 'Page', tone: 'quiet' }] }),
    );
    expect(page).toContain('lucide-panels-top-left');
    expect(page).toMatch(/<span class="status-chip" data-tone="quiet">Page<\/span>/);
  });

  it('puts the full path in the path span\'s title attribute and highlights inside it as marks', () => {
    const path = '.planning/phases/05-session-hardening/05-CONTEXT.md';
    const html = render(jump({ kind: 'file', id: null, anchor: null, artifactKind: 'context', subtitle: path, subtitleHighlights: [{ start: 20, end: 27 }] }));
    expect(html).toContain(`<span class="palette-row-path" title="${path}"><bdi>`);
    expect(html).toContain('<mark>session</mark>');
  });

  it('a Recent row, a Key page row and the See all row print their own icons', () => {
    expect(render({ type: 'recent', key: 'r', title: 'Roadmap', path: '/roadmap' })).toContain('lucide-clock');
    expect(render({ type: 'key-page', key: 'k', title: 'Dashboard', path: '/' })).toContain('lucide-panels-top-left');
    const all = render({ type: 'see-all', key: 's', query: 'retry', href: '/search?q=retry' });
    expect(all).toContain('lucide-search');
    expect(all).toContain('See all results for &quot;retry&quot;');
  });
});

describe('PaletteRowBody for a project row', () => {
  it('reads like the switcher row: the shared path icon, the name, the display path in mono with the target in title', () => {
    const html = render({ type: 'project', key: 'p', entry: project(), current: false });
    expect(html).toContain('lucide-folder');
    expect(html).toContain('<span class="palette-row-title" title="Kilnrow">Kilnrow</span>');
    expect(html).toContain('<span class="palette-row-path" title="~/work/kilnrow"><bdi>~/work/kilnrow</bdi></span>');
    expect(html).not.toContain('Current');
    expect(html).not.toContain('destructive');
  });

  it('draws a server icon for an ssh target', () => {
    const html = render({ type: 'project', key: 'p', entry: project({ kind: 'ssh', target: 'ssh://box/home/me/kilnrow', displayPath: 'ssh://box/home/me/kilnrow' }), current: false });
    expect(html).toContain('lucide-server');
  });

  it('marks the open project with a Check and a screen-reader Current', () => {
    const html = render({ type: 'project', key: 'p', entry: project(), current: true });
    expect(html).toContain('lucide-check');
    expect(html).toContain('<span class="sr-only">Current</span>');
  });

  it('a loading project says Opening… quietly; an unavailable one says Unavailable (missing) and gives the reason', () => {
    const loading = render({ type: 'project', key: 'p', entry: project({ state: 'loading' }), current: false });
    expect(loading).toMatch(/data-tone="quiet"><svg[^>]*lucide-loader[^>]*>.*<\/svg>Opening…<\/span>/);
    const missing = render({
      type: 'project',
      key: 'p',
      entry: project({ state: 'unavailable', reason: 'The folder is gone.' }),
      current: false,
    });
    expect(missing).toMatch(/<span class="status-chip" data-tone="missing">Unavailable<\/span>/);
    expect(missing).toContain('<span class="source-note">The folder is gone.</span>');
    expect(missing).not.toContain('data-tone="destructive"');
  });

  it('shows a name that looks like markup as text', () => {
    const html = render({
      type: 'project',
      key: 'p',
      entry: project({ name: '<script>alert(1)</script>', reason: null }),
      current: false,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('palette CSS', () => {
  const css = source('src/web/styles/globals.css');

  function blocks(selector: string): string[] {
    const found: string[] = [];
    const pattern = /([^{}]+)\{([^{}]*)\}/g;
    for (const match of css.matchAll(pattern)) {
      const selectors = match[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((part) => part.trim());
      if (selectors.includes(selector)) found.push(match[2]);
    }
    return found;
  }

  it('truncates a path from the head with an ellipsis, keeping the file name visible', () => {
    const [block] = blocks('.palette-row-path');
    expect(block).toBeDefined();
    expect(block).toContain('direction: rtl;');
    expect(block).toContain('text-overflow: ellipsis;');
  });

  it('scrolls the list inside the shipped results height', () => {
    // The scrollbar rule also lists this class inside :is(...); the sizing rule is the one with a max-height.
    const block = blocks('.search-dialog-results').find((candidate) => candidate.includes('max-height'));
    expect(block).toBeDefined();
    expect(block).toMatch(/max-height:\s*min\(/);
    expect(block).toContain('overflow-y: auto;');
  });
});

describe('the shared main-focus request (D-15, NAV-13)', () => {
  it('is false with no request, true once after a request, then false again', () => {
    expect(consumeMainFocusRequest()).toBe(false);
    requestMainFocusOnNextMount();
    expect(consumeMainFocusRequest()).toBe(true);
    expect(consumeMainFocusRequest()).toBe(false);
  });

  it('a second request before the consume still reads as one', () => {
    requestMainFocusOnNextMount();
    requestMainFocusOnNextMount();
    expect(consumeMainFocusRequest()).toBe(true);
    expect(consumeMainFocusRequest()).toBe(false);
  });
});

