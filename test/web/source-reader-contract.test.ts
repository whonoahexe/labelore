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
import { SourceReader, resolveTargetLine, sourceLinesOf } from '../../src/web/components/source-reader.tsx';

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

describe('resolveTargetLine', () => {
  const TEXT = 'one\ntwo\nthree\n';

  it('lands a heading target with no id on line 1', () => {
    expect(resolveTargetLine(TEXT, 0, { kind: 'heading', id: null, seq: 1 })).toBe(1);
  });

  it('lands a heading id on line 1 until the heading-to-line mapper arrives', () => {
    expect(resolveTargetLine(TEXT, 0, { kind: 'heading', id: 'some-heading', seq: 2 })).toBe(1);
  });

  it('lands a line target on its line and clamps one past the end', () => {
    expect(resolveTargetLine(TEXT, 0, { kind: 'line', line: 2, select: true, seq: 3 })).toBe(2);
    expect(resolveTargetLine(TEXT, 0, { kind: 'line', line: 99, select: true, seq: 4 })).toBe(3);
    expect(resolveTargetLine(TEXT, 0, { kind: 'line', line: 0, select: false, seq: 5 })).toBe(1);
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
    const effect = PAGE.indexOf('seenLocationKey');
    expect(effect).toBeGreaterThan(0);
    const body = PAGE.slice(effect, effect + 1500);
    expect(body).toContain("setMode('source')");
    expect(body).toContain('hasLineHash(');
    expect(body).toContain('hasSourceFlag(');
    expect(PAGE.match(/replaceState\(/g)?.length).toBe(1);
  });
});
