// Pins Source mode's page chrome and notices (Phase 12: SRC-02, D-01, D-02, D-06, D-07): the exhaustive
// non-text and empty-file notice (UI-SPEC copy verbatim), the labelled Copy path button, the reader's early
// notice for a kind with no text, and the source-text contract on artifact-page.tsx (the toggle on every
// file, the Source header spread, the metadata and unrecognised-type gates).
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyPathButton } from '../../src/web/components/copy-path-button.tsx';
import { SourceNotice } from '../../src/web/components/source-notice.tsx';
import type { SourceNoticeKind } from '../../src/web/components/source-notice.tsx';
import {
  SourceBar,
  SourceHere,
  SourceReader,
  SourceRows,
  foldsAfterPreset,
  highlightAll,
  landingLineOf,
  presetPressed,
  sourceLinesOf,
} from '../../src/web/components/source-reader.tsx';
import { buildSourceModel, defaultFolds, foldPresetsOf, gutterOf, languageOf } from '../../src/web/source/source-model.ts';
import type { SourceModel } from '../../src/web/source/source-model.ts';

const PAGE = readFileSync(new URL('../../src/web/pages/artifact-page.tsx', import.meta.url), 'utf8');

const noticeOf = (kind: SourceNoticeKind, sizeBytes = 2048, name = 'thing.png'): string =>
  renderToStaticMarkup(
    createElement(SourceNotice, { kind, name, path: `.planning/notes/${name}`, sizeBytes, onOpenView: () => undefined }),
  );

describe('SourceNotice', () => {
  const SENTENCES: Record<Exclude<SourceNoticeKind, 'text'>, [string, string]> = {
    image: ['This is an image, so Source has no text to show.', 'View shows the picture.'],
    'image-over-cap': ['This image is over 10 MiB, so Labelore does not load it.', 'Labelore does not open it in View either.'],
    binary: ['This file is binary, so Source has no text to show.', 'Labelore does not open binary files.'],
    large: ['This file is over 1 MiB, so Labelore does not read it.', 'Open it in an editor to see its text.'],
    listed: ['This file is listed by name only, so Source has no text to show.', 'Labelore never runs or opens these files.'],
    empty: ['This file is empty.', 'There is no text to show.'],
  };

  for (const [kind, [lead, second]] of Object.entries(SENTENCES) as Array<[Exclude<SourceNoticeKind, 'text'>, [string, string]]>) {
    it(`shows the ${kind} sentence and second line in the quiet notice`, () => {
      const html = noticeOf(kind);
      expect(html).toContain(lead);
      expect(html).toContain(second);
      // Quiet tone only: the aside's own class list is exactly the shared notice plus its own name.
      expect(html).toContain('<aside class="notice source-notice" role="status">');
      expect(html).toContain('Copy path');
    });
  }

  it('offers Open View for an image only', () => {
    for (const kind of ['image', 'image-over-cap', 'binary', 'large', 'listed', 'empty'] as const) {
      expect(noticeOf(kind).includes('Open View'), kind).toBe(kind === 'image');
    }
  });

  it('never offers Copy contents', () => {
    for (const kind of ['image', 'image-over-cap', 'binary', 'large', 'listed', 'empty'] as const) {
      expect(noticeOf(kind)).not.toContain('Copy contents');
    }
  });

  it('writes the facts: type and size, the limit where there is one, and 0 bytes for an empty file', () => {
    expect(noticeOf('image', 49_357)).toContain('PNG image');
    expect(noticeOf('image', 49_357)).toContain('48.2 KB');
    expect(noticeOf('image-over-cap', 12_582_912)).toContain('10 MiB');
    expect(noticeOf('large', 2_097_152, 'dump.json')).toContain('1 MiB');
    expect(noticeOf('empty', 0, 'empty.md')).toContain('0 bytes');
    expect(noticeOf('empty', 0, 'empty.md')).toContain('Text file');
  });

  it('draws nothing for the text kind, which never reaches it', () => {
    expect(noticeOf('text')).toBe('');
  });
});

describe('CopyPathButton', () => {
  it('without a label keeps the icon button and its aria-label', () => {
    const html = renderToStaticMarkup(createElement(CopyPathButton, { path: '.planning/PROJECT.md' }));
    expect(html).toContain('aria-label="Copy file path"');
    expect(html).not.toContain('Copy path');
  });

  it('with a label shows the word and names itself by it', () => {
    const html = renderToStaticMarkup(createElement(CopyPathButton, { path: '.planning/PROJECT.md', label: 'Copy path' }));
    expect(html).toContain('aria-label="Copy path"');
    expect(html).toContain('>Copy path<');
  });

  it('copies the real path inside a workstream', () => {
    const html = renderToStaticMarkup(
      createElement(CopyPathButton, { path: '.planning/PROJECT.md', realPath: '.planning/workstreams/a/PROJECT.md', label: 'Copy path' }),
    );
    expect(html).toContain('title=".planning/workstreams/a/PROJECT.md"');
  });
});

describe('SourceReader for a file with no text', () => {
  afterEach(() => vi.unstubAllGlobals());

  function readerOf(fileClass: 'image' | 'binary' | 'large' | 'listed' | 'text', sizeBytes: number): string {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(SourceReader, {
          route: '/notes/thing',
          name: 'thing.bin',
          path: '.planning/notes/thing.bin',
          fileClass,
          sizeBytes,
          target: null,
        }),
      ),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    return html;
  }

  it('shows the binary notice and requests nothing', () => {
    expect(readerOf('binary', 40)).toContain('This file is binary, so Source has no text to show.');
  });

  it('shows the large notice and requests nothing', () => {
    expect(readerOf('large', 2_000_000)).toContain('This file is over 1 MiB, so Labelore does not read it.');
  });

  it('shows the listed notice and requests nothing', () => {
    expect(readerOf('listed', 40)).toContain('listed by name only');
  });

  it('shows the empty notice for a 0-byte text file, with Copy path only', () => {
    const html = readerOf('text', 0);
    expect(html).toContain('This file is empty.');
    expect(html).not.toContain('Copy contents');
    expect(html).not.toContain('source-bar');
  });
});

describe('artifact-page.tsx Source chrome (source-text contract)', () => {
  it('renders the View · Source toggle on every document, not only those with a designed View', () => {
    expect(PAGE).not.toContain('{viewAvailable ? <DocumentViewToggle');
    expect(PAGE).toContain('<DocumentViewToggle mode={mode} onChange={setMode} />');
  });

  it('spreads the Source header after every other header override', () => {
    const override = PAGE.indexOf('{...(headerOverride ?? {})}');
    const source = PAGE.indexOf('{...(sourceHeader ?? {})}');
    expect(override).toBeGreaterThan(0);
    expect(source).toBeGreaterThan(override);
    expect(PAGE).toContain('fileNameOf(artifact.path)');
  });

  it('draws the Document metadata disclosure and the unrecognised-type notice in View only', () => {
    expect(PAGE).toContain("{!recognized && mode === 'view' ? <UnrecognizedNotice");
    // The disclosure's own condition list opens with the mode gate (empty-state-contract pins the outer ternary).
    const disclosure = PAGE.indexOf('{panels.length > 0 ? (');
    expect(disclosure).toBeGreaterThan(0);
    expect(PAGE.slice(disclosure, disclosure + 700)).toContain("mode !== 'view' ||");
  });

  it('keeps the ArtifactReader JSX in place', () => {
    expect(PAGE).toContain('<ArtifactReader\n          title={artifact.title}');
  });
});

describe('landingLineOf', () => {
  const TEXT = '---\nname: x\n---\n\n# Title\n\n## Second part\n\ntext here\n';
  const model = buildSourceModel(TEXT, 'markdown');
  // The body starts after the frontmatter (the served text keeps it): offset 0 of the body is line 5.
  const bodyStart = TEXT.indexOf('# Title');

  it('lands a heading target with no id on line 1', () => {
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: null, seq: 1 })).toBe(1);
  });

  it('lands a rendered heading id on the line of that heading, through targetLineOf', () => {
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: 'second-part', seq: 2 })).toBe(7);
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: 'title', seq: 3 })).toBe(5);
  });

  it('lands a plan-at-N id on the line holding that body offset', () => {
    const offset = TEXT.indexOf('text here') - bodyStart;
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: `plan-at-${offset}`, seq: 4 })).toBe(9);
  });

  it('lands an id it cannot map on line 1', () => {
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: 'plan-section-3', seq: 5 })).toBe(1);
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'heading', id: 'no-such-heading', seq: 6 })).toBe(1);
  });

  it('lands a line target on its line and clamps one past the end', () => {
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'line', line: 2, select: true, seq: 7 })).toBe(2);
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'line', line: 99, select: true, seq: 8 })).toBe(9);
    expect(landingLineOf(model, TEXT, bodyStart, { kind: 'line', line: 0, select: false, seq: 9 })).toBe(1);
  });
});

describe('sourceLinesOf', () => {
  it('adds no row for a final newline and draws no trailing carriage return', () => {
    expect(sourceLinesOf('a\r\nb\r\n')).toEqual(['a', 'b']);
    expect(sourceLinesOf('a\n\nb')).toEqual(['a', '', 'b']);
    expect(sourceLinesOf('')).toEqual([]);
  });
});

describe('artifact-page.tsx Source targets (source-text contract)', () => {
  it('hands the reader a heading target from showSource and drops the old pending-id scroll', () => {
    expect(PAGE).not.toContain('pendingSourceId');
    expect(PAGE).toContain("kind: 'heading'");
    expect(PAGE).toContain('target={sourceTarget}');
  });

  it('re-opens Source from a same-page link on a new router location key, without writing the URL', () => {
    const effect = PAGE.indexOf('seenLocation');
    expect(effect).toBeGreaterThan(0);
    const body = PAGE.slice(effect, effect + 1500);
    expect(body).toContain("setMode('source')");
    expect(body).toContain('hasLineHash(');
    expect(body).toContain('hasSourceFlag(');
    // WR-06: only a flag or fragment that is new since the last location re-opens Source.
    expect(body).toContain('!hasSourceFlag(seenLocation.search)');
    expect(body).toContain('hash !== seenLocation.hash');
    expect(PAGE.match(/replaceState\(/g)?.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 12-07: the structure reader (sketch 062 E): bracket gutter, folds, presets, Wrap, Here, tones, stylesheet.
// ---------------------------------------------------------------------------------------------------------------

const CSS = readFileSync(new URL('../../src/web/styles/globals.css', import.meta.url), 'utf8');
const READER = readFileSync(new URL('../../src/web/components/source-reader.tsx', import.meta.url), 'utf8');
const PLAN_06 = readFileSync(
  new URL('../fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-06-PLAN.md', import.meta.url),
  'utf8',
);

/** The phase-12-source block of the stylesheet. */
function sourceBlock(): string {
  const start = CSS.indexOf('/* phase-12-source:start */');
  const end = CSS.indexOf('/* phase-12-source:end */');
  return CSS.slice(start, end);
}

/** Server-rendered markup without the comment markers React puts between adjacent text nodes, and with attribute entities read back. */
function plain(html: string): string {
  return html.replace(/<!-- -->/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function rowsOf(text: string, path: string, folded?: ReadonlySet<number>, masked = false): { html: string; model: SourceModel } {
  const model = buildSourceModel(text, languageOf(path));
  const html = renderToStaticMarkup(
    createElement(SourceRows, {
      model,
      gutter: gutterOf(model),
      tokens: highlightAll(model, masked),
      folded: folded ?? defaultFolds(model),
      selected: null,
      hit: null,
      onToggle: () => undefined,
    }),
  );
  return { html: plain(html), model };
}

function barOf(
  text: string,
  path: string,
  options: { folded?: ReadonlySet<number>; wrap?: boolean } = {},
): { html: string; model: SourceModel } {
  const model = buildSourceModel(text, languageOf(path));
  const html = renderToStaticMarkup(
    createElement(SourceBar, {
      model,
      folded: options.folded ?? defaultFolds(model),
      wrap: options.wrap ?? false,
      text,
      path,
      realPath: undefined,
      presets: foldPresetsOf(model),
      hereLine: 1,
      onPreset: () => undefined,
      onWrap: () => undefined,
    }),
  );
  return { html: plain(html), model };
}

const PLAN_PATH = '.planning/phases/01-member-sign-in-sessions/01-06-PLAN.md';

describe('SourceRows on a deep plan (plan-06)', () => {
  it('folds the frontmatter to its first line and a dashed chip, and the numbers jump over the run', () => {
    const { html, model } = rowsOf(PLAN_06, PLAN_PATH);
    expect(model.frontmatter).not.toBeNull();
    const to = model.frontmatter?.to ?? 0;
    expect(html).toContain('id="L1"');
    expect(html).not.toContain('id="L2"');
    expect(html).toContain(`id="L${to + 1}"`);
    expect(html).toContain(`aria-label="Unfold frontmatter · ${model.frontmatter?.keyCount} keys"`);
    expect(html).toContain(`▸ <strong>${model.frontmatter?.keyCount} keys</strong> · ${to} lines`);
    expect(html.match(/class="source-fold-chip"/g)).toHaveLength(1);
  });

  it("draws the frontmatter's toggle as a real button that says it is collapsed", () => {
    const { html } = rowsOf(PLAN_06, PLAN_PATH);
    const toggle = html.match(/<button[^>]*class="source-fold-toggle"[^>]*>/);
    expect(toggle?.[0]).toContain('aria-label="Unfold frontmatter');
    expect(toggle?.[0]).toContain('aria-expanded="false"');
    expect(toggle?.[0]).toContain('type="button"');
  });

  it('shows every frontmatter row, with Fold on the toggle, once the fold set is empty', () => {
    const { html } = rowsOf(PLAN_06, PLAN_PATH, new Set());
    expect(html).toContain('id="L2"');
    const toggle = html.match(/<button[^>]*class="source-fold-toggle"[^>]*aria-label="Fold frontmatter[^>]*>/);
    expect(toggle?.[0]).toContain('aria-expanded="true"');
    expect(html).not.toContain('source-fold-chip');
    expect(html).toContain('data-frontmatter="true"');
  });

  it('draws the task brackets: a start cell with a toggle, mid cells and an end tick per task', () => {
    const { html, model } = rowsOf(PLAN_06, PLAN_PATH);
    const tasks = model.blocks.filter((block) => block.kind === 'xml' && block.tag === 'task');
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const task of tasks) {
      expect(html).toContain(`data-block="${task.id}" data-state="start"`);
      expect(html).toContain(`data-block="${task.id}" data-state="end"`);
      expect(html).toContain(`data-block="${task.id}" data-state="mid"`);
    }
    expect(html).toContain('aria-label="Fold <task>');
  });

  it('puts the line number link, the pinned lead and the text in each row', () => {
    const { html } = rowsOf(PLAN_06, PLAN_PATH);
    expect(html).toContain('<span class="source-lead"><a class="source-line-number" href="#L1" aria-label="Line 1">1</a>');
    expect(html).toContain('<span class="source-line-text">');
  });

  it('renders file text as text only: no markup sink exists in the reader', () => {
    const html = renderToStaticMarkup(
      createElement(SourceRows, {
        model: buildSourceModel('<script>alert(1)</script> **bold** `code`\n', 'markdown'),
        gutter: [[]],
        tokens: highlightAll(buildSourceModel('<script>alert(1)</script> **bold** `code`\n', 'markdown'), false),
        folded: new Set<number>(),
        selected: null,
        hit: null,
        onToggle: () => undefined,
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(READER).not.toContain('dangerouslySetInnerHTML');
    expect(READER).not.toMatch(/\.innerHTML|insertAdjacentHTML|outerHTML/);
  });

  it('draws tones as the documented source-t-* spans', () => {
    const { html } = rowsOf('## Heading\n\n**bold** and `code`\n', '.planning/notes/x.md');
    expect(html).toContain('class="source-t-h"');
    expect(html).toContain('class="source-t-b"');
    expect(html).toContain('class="source-t-c"');
    expect(html).toContain('class="source-t-p"');
  });

  it('marks a masked value in a dashed quiet box with its title', () => {
    const { html } = rowsOf('{\n  "brave_search": "****7c2e"\n}\n', '.planning/config.json', undefined, true);
    expect(html).toContain('class="source-t-mask"');
    expect(html).toContain('title="Masked by Labelore; the file holds the real value"');
    expect(html).toContain('class="source-t-key"');
  });

  it('draws numbers and text only for a file that is not structured', () => {
    const { html } = rowsOf('plain one\nplain two\n', '.planning/notes/x.txt');
    expect(html).not.toContain('source-gutter');
    expect(html).not.toContain('source-fold-toggle');
    expect(html).toContain('>plain two<');
  });

  it('marks the selected rows with their edges and the landed row', () => {
    const model = buildSourceModel('a\nb\nc\nd\n', 'text');
    const html = renderToStaticMarkup(
      createElement(SourceRows, {
        model,
        gutter: gutterOf(model),
        tokens: highlightAll(model, false),
        folded: new Set<number>(),
        selected: { from: 2, to: 3 },
        hit: 4,
        onToggle: () => undefined,
      }),
    );
    expect(html).toMatch(/id="L2"[^>]*data-selected="true"[^>]*data-selection-edge="first"/);
    expect(html).toMatch(/id="L3"[^>]*data-selected="true"[^>]*data-selection-edge="last"/);
    expect(html).toMatch(/id="L4"[^>]*data-source-hit="true"/);
    expect(html).not.toMatch(/id="L1"[^>]*data-selected/);
  });
});

describe('SourceBar', () => {
  it('row 1 has the Fold label, the preset group and the actions; row 2 is the Here path', () => {
    const { html } = barOf(PLAN_06, PLAN_PATH);
    expect(html).toContain('<span class="source-fold-label">Fold</span>');
    expect(html).toContain('role="group" aria-label="Fold blocks"');
    expect(html).toContain('aria-label="Wrap lines"');
    expect(html).toContain('aria-label="Copy path"');
    expect(html).toContain('aria-label="Copy contents"');
    expect(html).toContain('<nav class="source-here" aria-label="Position in file">');
    expect(html.indexOf('source-tools')).toBeLessThan(html.indexOf('source-here'));
  });

  it('lists a preset only when the file holds a block of its kind, with None first', () => {
    const { model } = barOf(PLAN_06, PLAN_PATH);
    const ids = foldPresetsOf(model).map((preset) => preset.id);
    expect(ids[0]).toBe('none');
    expect(ids).toContain('frontmatter');
    expect(ids).toContain('tasks');
    expect(ids).toContain('tables');
    expect(ids).not.toContain('objects');
    const notes = barOf('# Title\n\nplain text, no tables\n', '.planning/notes/x.md').model;
    expect(foldPresetsOf(notes).map((preset) => preset.id)).not.toContain('tasks');
    expect(foldPresetsOf(notes).map((preset) => preset.id)).not.toContain('tables');
  });

  it('gives JSON files Objects instead of Tasks and Sections', () => {
    const json = '{\n  "a": {\n    "x": 1,\n    "y": 2\n  },\n  "b": {\n    "z": 3\n  }\n}\n';
    const { html, model } = barOf(json, '.planning/config.json');
    const ids = foldPresetsOf(model).map((preset) => preset.id);
    expect(ids).toContain('objects');
    expect(ids).not.toContain('tasks');
    expect(ids).not.toContain('sections');
    expect(html).toContain('>Objects<');
  });

  it('reads a preset as pressed when the fold set equals its set: the default is Frontmatter, not None', () => {
    const { html, model } = barOf(PLAN_06, PLAN_PATH);
    const presets = foldPresetsOf(model);
    const frontmatter = presets.find((preset) => preset.id === 'frontmatter');
    const none = presets.find((preset) => preset.id === 'none');
    if (!frontmatter || !none) throw new Error('presets missing');
    expect(presetPressed(model, defaultFolds(model), frontmatter)).toBe(true);
    expect(presetPressed(model, defaultFolds(model), none)).toBe(false);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Frontmatter</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>None</);
  });

  it('None empties the fold set and Tasks folds exactly the task blocks', () => {
    const { model } = barOf(PLAN_06, PLAN_PATH);
    const presets = foldPresetsOf(model);
    const none = presets.find((preset) => preset.id === 'none');
    const tasks = presets.find((preset) => preset.id === 'tasks');
    if (!none || !tasks) throw new Error('presets missing');
    expect(foldsAfterPreset(model, none).size).toBe(0);
    const folded = foldsAfterPreset(model, tasks);
    const taskIds = model.blocks.filter((block) => block.kind === 'xml' && block.tag === 'task').map((block) => block.id);
    expect([...folded].sort((a, b) => a - b)).toEqual(taskIds);
    expect(presetPressed(model, folded, tasks)).toBe(true);
    expect(presetPressed(model, new Set(), none)).toBe(true);
  });

  it('shows Wrap pressed only while wrapping, and keeps the URL out of it', () => {
    const wrapButton = (html: string): string => html.match(/<button[^>]*aria-label="Wrap lines"[^>]*>/)?.[0] ?? '';
    expect(wrapButton(barOf(PLAN_06, PLAN_PATH, { wrap: true }).html)).toContain('aria-pressed="true"');
    expect(wrapButton(barOf(PLAN_06, PLAN_PATH, { wrap: false }).html)).toContain('aria-pressed="false"');
    expect(READER).toContain("data-wrap={wrap ? 'true' : undefined}");
    expect(READER).not.toMatch(/replaceState|pushState|navigate\(/);
  });

  it("wraps the labelled copy buttons' word in source-copy-label and keeps their aria-labels", () => {
    const { html } = barOf(PLAN_06, PLAN_PATH);
    expect(html).toContain('<span class="source-copy-label">Copy path</span>');
    expect(html).toContain('<span class="source-copy-label">Copy contents</span>');
  });

  it('leaves the Fold label and presets out of a file with no block to fold', () => {
    const { html } = barOf('just\nplain text\n', '.planning/notes/x.txt');
    expect(html).not.toContain('Fold');
    expect(html).toContain('aria-label="Wrap lines"');
  });
});

describe('SourceHere', () => {
  it('names the blocks around the line as crumbs, the last one current, then the line', () => {
    const model = buildSourceModel(PLAN_06, 'markdown');
    const html = plain(renderToStaticMarkup(createElement(SourceHere, { model, line: 1 })));
    expect(html).toContain('<span class="source-here-label">Here</span>');
    expect(html).toContain('data-current="true"');
    expect(html).toContain('frontmatter · ');
    expect(html).toContain('<span class="source-here-line">L1</span>');
  });

  it('says "top of file" when no block holds the line', () => {
    const model = buildSourceModel('no blocks here\n', 'text');
    const html = renderToStaticMarkup(createElement(SourceHere, { model, line: 1 }));
    expect(html).toContain('top of file');
    expect(html).not.toContain('source-here-crumb');
  });
});

describe('SourceNotice tone', () => {
  it('is quiet for every kind: no destructive or warning modifier and no tone attribute other than quiet', () => {
    for (const kind of ['image', 'image-over-cap', 'binary', 'large', 'listed', 'empty'] as const) {
      const html = noticeOf(kind);
      // The button utilities carry `aria-invalid:border-destructive`; what matters is the notice's own classes.
      expect(html.match(/<aside[^>]*>/)?.[0], kind).not.toMatch(/destructive|warning/);
      expect(html, kind).not.toMatch(/class="[^"]*(?:^|\s)(?:destructive|warning)(?:\s|")/);
      expect(html, kind).not.toMatch(/data-tone="(?!quiet")/);
    }
  });
});

describe('the phase-12-source stylesheet block', () => {
  it('exists once, between its start and end markers', () => {
    expect(CSS.match(/phase-12-source:start/g)).toHaveLength(1);
    expect(CSS.match(/phase-12-source:end/g)).toHaveLength(1);
    expect(CSS.indexOf('phase-12-source:start')).toBeLessThan(CSS.indexOf('phase-12-source:end'));
  });

  it('declares the five sketch-local tokens once in :root, and the dark key tone in .dark', () => {
    const block = sourceBlock();
    const root = block.slice(block.indexOf(':root {'), block.indexOf('}', block.indexOf(':root {')));
    for (const token of ['--t-key', '--sel', '--veil', '--hatch', '--source-row-height']) {
      expect(root, token).toContain(`${token}:`);
      // Declared once in :root; --t-key is declared once more in .dark.
      expect(CSS.match(new RegExp(`^\\s*${token}:`, 'gm')), `${token} declared`).toHaveLength(token === '--t-key' ? 2 : 1);
    }
    expect(block).toMatch(/\.dark \{\s*--t-key: color-mix\(in oklch, var\(--primary\) 60%, var\(--foreground\)\);/);
  });

  it('sets rows in --source-row-height and uses no destructive or warning colour', () => {
    const block = sourceBlock();
    expect(block).toContain('line-height: var(--source-row-height)');
    expect(block).not.toContain('--destructive');
    expect(block).not.toMatch(/--warning|--missing|--in-flight/);
  });

  it('pins the number and gutter, draws the 1.6ch cells and the 6ch number column', () => {
    const block = sourceBlock();
    expect(block).toMatch(/\.source-lead \{[^}]*position: sticky;[^}]*left: 0;[^}]*background: var\(--background\)/);
    expect(block).toMatch(/\.source-gutter-cell \{[^}]*width: 1\.6ch/);
    expect(block).toMatch(/\.source-line-number \{[^}]*width: 6ch/);
    expect(block).toMatch(/\.source-gutter-cell\[data-state\]::before \{[^}]*border-left: 1px solid var\(--border\)/);
  });

  it('keeps the bar sticky under the shell header on a --background ground with a hairline', () => {
    expect(sourceBlock()).toMatch(
      /\.source-bar \{[^}]*position: sticky;[^}]*top: var\(--space-22\);[^}]*border-bottom: 1px solid var\(--border\);[^}]*background: var\(--background\)/,
    );
  });

  it('holds the selection, hit, hot, Here and chip rules, with the flash switched off under reduced motion', () => {
    const block = sourceBlock();
    for (const needle of [
      "data-selected='true'",
      "data-selection-edge='first'",
      "data-selection-edge='last'",
      "data-selection-edge='only'",
      "data-source-hit='true'",
      "data-hot='true'",
      '.source-here-crumb',
      "[data-current='true']",
      '.source-selection',
      '@keyframes source-hit-flash',
    ]) {
      expect(block, needle).toContain(needle);
    }
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.source-row\[data-source-hit='true'\] \{\s*animation: none;/);
    expect(block).toContain('max-width: 28ch');
  });

  it('wraps with a hanging indent and does not wrap by default', () => {
    const block = sourceBlock();
    expect(block).toMatch(/\.source-line-text \{[^}]*white-space: pre;/);
    expect(block).toMatch(/\[data-wrap='true'\] \.source-line-text \{[^}]*white-space: pre-wrap;[^}]*\}/);
    expect(block).toContain('text-indent: -2ch');
  });

  it('lays rows below the fold out lazily, in no-wrap mode', () => {
    expect(sourceBlock()).toMatch(/:not\(\[data-wrap='true'\]\) \.source-row \{[^}]*content-visibility: auto;[^}]*contain-intrinsic-size:/);
  });

  it("narrows at 42rem on the reader's own container: icon-only copy, 4ch numbers, stacked bar; 40px hit areas on touch", () => {
    const block = sourceBlock();
    expect(block).toContain('container-type: inline-size');
    expect(block).toMatch(/@container source \(max-width: 42rem\) \{[\s\S]*?\.source-copy-label \{\s*display: none;/);
    expect(block).toMatch(/@container source \(max-width: 42rem\) \{[\s\S]*?\.source-line-number \{\s*width: 4ch;/);
    expect(block).toMatch(/@media \(pointer: coarse\) \{[\s\S]*?\.source-fold-toggle::after \{[\s\S]*?width: var\(--space-10\);/);
  });

  it('draws the notice as the quiet dashed box with a 40px dashed glyph box', () => {
    const block = sourceBlock();
    expect(block).toMatch(/\.notice\.source-notice \{[^}]*border: 1px dashed var\(--muted-foreground\)/);
    expect(block).toMatch(/\.notice\.source-notice > \.source-notice-glyph \{[^}]*width: var\(--space-10\);[^}]*height: var\(--space-10\);[^}]*border: 1px dashed var\(--muted-foreground\)/);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 12-08: selection, links and the Here path (SRC-02, D-03, D-05, D-06).
// ---------------------------------------------------------------------------------------------------------------

describe('the selection chip in the Here row', () => {
  const chipOf = (range: { from: number; to: number } | null, line = 40): string => {
    const model = buildSourceModel(PLAN_06, 'markdown');
    return plain(renderToStaticMarkup(createElement(SourceHere, { model, line, selection: range })));
  };

  it('says L33 for one line and L33–L40 for a range, with Copy link and a labelled clear button', () => {
    expect(chipOf({ from: 33, to: 33 })).toContain('<span class="source-selection status-chip" data-tone="active"><span>L33</span>');
    const html = chipOf({ from: 33, to: 40 });
    expect(html).toContain('<span>L33–L40</span>');
    expect(html).toContain('class="source-selection-link">Copy link</button>');
    expect(html).toMatch(/<button[^>]*class="source-selection-clear"[^>]*aria-label="Clear selection"/);
  });

  it('gives a whole block its own range label', () => {
    expect(chipOf({ from: 88, to: 134 })).toContain('<span>L88–L134</span>');
  });

  it('draws no chip with nothing selected', () => {
    expect(chipOf(null)).not.toContain('source-selection');
  });

  it('puts the chip after the line number, inside the Position-in-file nav', () => {
    const html = chipOf({ from: 33, to: 33 });
    expect(html.indexOf('source-here-line')).toBeLessThan(html.indexOf('source-selection'));
    expect(html.indexOf('source-selection')).toBeLessThan(html.indexOf('</nav>'));
  });
});

describe('the Here path is a plain landmark', () => {
  it('is nav "Position in file" and announces nothing as it changes', () => {
    const model = buildSourceModel(PLAN_06, 'markdown');
    const html = renderToStaticMarkup(createElement(SourceHere, { model, line: 90, selection: { from: 90, to: 91 } }));
    expect(html).toContain('<nav class="source-here" aria-label="Position in file">');
    expect(html).not.toContain('aria-live');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it('follows the scroll with a passive, frame-throttled listener that is cleaned up', () => {
    expect(READER).toContain("addEventListener('scroll'");
    expect(READER).toContain('passive: true');
    expect(READER).toContain("removeEventListener('scroll'");
    expect(READER).toContain('requestAnimationFrame');
    expect(READER).toContain('cancelAnimationFrame');
    expect(READER).toContain('elementFromPoint');
    // The line is kept in state only when it changes.
    expect(READER).toContain('previous === line ? previous : line');
    // The reader reads the position; the active-section seam stays free of the URL and of the reader.
    expect(READER).not.toContain('use-active-section');
  });

  it('has no live region anywhere in the reader', () => {
    expect(READER).not.toContain('aria-live="assertive"');
    expect(READER.match(/aria-live/g)?.length).toBe(1); // the loading backstop's polite status, outside the Here path
  });

  it('names the chain around the line it is given, outermost first, the innermost current', () => {
    const model = buildSourceModel(PLAN_06, 'markdown');
    const task = model.blocks.find((block) => block.kind === 'xml' && block.tag === 'task');
    if (!task) throw new Error('plan-06 has no task');
    const html = plain(renderToStaticMarkup(createElement(SourceHere, { model, line: task.from + 1 })));
    expect(html).toContain(`<span class="source-here-line">L${task.from + 1}</span>`);
    expect(html.match(/data-current="true"/g)).toHaveLength(1);
    expect(html.indexOf('&lt;tasks&gt;') === -1 ? html.indexOf('<tasks>') : html.indexOf('&lt;tasks&gt;')).toBeGreaterThan(-1);
  });
});

describe('the reader wires selection through the selection module only', () => {
  it('runs number, bracket and clear events through selectionAfter and the URL through writeSelectionHash', () => {
    expect(READER).toContain('selectionAfter(');
    expect(READER).toContain('writeSelectionHash(');
    expect(READER).not.toMatch(/replaceState|pushState|navigate\(/);
    expect(PAGE.match(/replaceState\(/g)?.length).toBe(1);
  });

  it('selects a whole block from a click on its bracket cells, but leaves the fold toggle to fold', () => {
    expect(READER).toContain("kind: 'block'");
    expect(READER).toContain("closest('.source-fold-toggle')");
  });

  it('clears on Escape from inside the reader', () => {
    expect(READER).toContain("event.key === 'Escape'");
    expect(READER).toContain("kind: 'clear'");
  });

  it('lands headings through targetLineOf and replaces the 12-01 stand-in', () => {
    expect(READER).toContain('targetLineOf(');
    expect(READER).not.toContain('export function resolveTargetLine');
  });

  it('never makes the file text a selector or a pattern', () => {
    expect(READER).not.toContain('new RegExp(');
  });

  it('keys the body by the route and the text, so per-file state never carries across files (WR-04)', () => {
    expect(READER).toMatch(/<SourceBody\s+key=\{`\$\{route\}:\$\{textSignature\(query\.data\.text\)\}`\}/);
    const PAIR = readFileSync(new URL('../../src/web/pages/plan-pair-page.tsx', import.meta.url), 'utf8');
    expect(PAIR).toContain('<ArtifactPage key={planUrl}');
    expect(PAIR).not.toContain('key="plan"');
  });
});
