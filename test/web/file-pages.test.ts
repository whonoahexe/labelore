// Static-render contract of the Phase 7 file pages (D-08, D-09, D-10): the image page, the File details
// card, DocumentRoute's file-class branches, FigureFrame's defaultFit and the drawer's file badge.
// Rendered with renderToStaticMarkup inside a MemoryRouter over the committed Shapes payload, the
// dashboard-sections.test.ts idiom.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES } from '../../src/planning-repo/file-class.ts';
import type { DrawerFileRow } from '../../src/presentation/drawer.ts';
import {
  exactByteCount,
  fileNameOf,
  formatByteSize,
  imageBytesUrl,
} from '../../src/presentation/file-facts.ts';
import type { ArtifactDto, ProjectPresentation } from '../../src/server/project-presentation.ts';
import { FigureFrame } from '../../src/web/components/figure-frame.tsx';
import { FileRow } from '../../src/web/components/planning-places.tsx';
import { documentCrumbsOf } from '../../src/web/pages/document-crumbs.ts';
import { DocumentRoute } from '../../src/web/pages/document-route.tsx';
import { FileDetailsPage } from '../../src/web/pages/file-details-page.tsx';
import type { FileDetailsVariant } from '../../src/web/pages/file-details-page.tsx';
import { ImageView } from '../../src/web/pages/image-page.tsx';
import type { ImageStatus } from '../../src/web/pages/image-page.tsx';
import { loadProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const shapes: ProjectPresentation = (await loadProject(SHAPES_ROOT)).presentation;

const artifactAt = (path: string): ArtifactDto => {
  const artifact = shapes.artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`Shapes fixture has no artifact at ${path}`);
  return artifact;
};

const render = (node: React.ReactElement): string => renderToStaticMarkup(createElement(MemoryRouter, null, node));

function imageView(artifact: ArtifactDto, status: ImageStatus): string {
  return render(
    createElement(ImageView, {
      artifact,
      crumbs: documentCrumbsOf(shapes, artifact.path, fileNameOf(artifact.path)),
      status,
      onLoad: () => undefined,
      onError: () => undefined,
    }),
  );
}

function detailsPage(artifact: ArtifactDto, variant: FileDetailsVariant): string {
  return render(createElement(FileDetailsPage, { artifact, presentation: shapes, variant }));
}

const count = (markup: string, pattern: RegExp): number => (markup.match(pattern) ?? []).length;
const textOf = (markup: string): string => markup.replace(/<[^>]*>/g, '');

const PNG = artifactAt('.planning/ui-reviews/screenshots/glaze-panel.png');
const SVG = artifactAt('.planning/ui-reviews/kiln-map.svg');
const PDF = artifactAt('.planning/phases/01-kiln-bookings/firing-sheet.pdf');
const DAT = artifactAt('.planning/notes/kiln-curve.dat');
const NOEXT = artifactAt('.planning/notes/kiln-log');
const LARGE: ArtifactDto = { ...PNG, path: '.planning/research/dump.json', key: '/research/dump', fileClass: 'large', sizeBytes: 2516582 };
const OVERCAP: ArtifactDto = { ...PNG, key: '/ui-reviews/screenshots/huge', path: '.planning/ui-reviews/screenshots/huge.png', sizeBytes: MAX_IMAGE_BYTES + 1 };

describe('ImageView', () => {
  const loading = imageView(PNG, { kind: 'loading' });

  it('opens with the Image eyebrow, the file name as h1 and the copy-path button', () => {
    expect(loading).toContain('<p class="eyebrow">Image</p>');
    expect(loading).toContain('<h1>glaze-panel.png</h1>');
    expect(loading).toContain('aria-label="Copy file path"');
  });

  it('reads the type and size in a source-note while loading, with no skeleton or spinner', () => {
    expect(loading).toContain(`<span class="source-note">PNG image · ${formatByteSize(PNG.sizeBytes)}</span>`);
    expect(loading).not.toMatch(/skeleton|spinner/i);
  });

  it('holds one img in a Preview frame whose src is the bytes route', () => {
    expect(loading).toContain('<span class="figure-frame-title">Preview</span>');
    const images = loading.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(1);
    expect(images[0]).toContain(`src="${imageBytesUrl(PNG.key).replace(/&/g, '&amp;')}"`);
    expect(images[0]).toContain('alt="glaze-panel.png"');
  });

  it('appends the dimensions once loaded', () => {
    const markup = imageView(PNG, { kind: 'loaded', width: 1, height: 1 });
    expect(markup).toContain(`${formatByteSize(PNG.sizeBytes)} · 1 × 1 px</span>`);
  });

  it('reads Dimensions unknown when the browser reports a zero dimension', () => {
    expect(imageView(PNG, { kind: 'loaded', width: 0, height: 12 })).toContain(' · Dimensions unknown</span>');
  });

  it('replaces the frame with a notice on failure and keeps the header', () => {
    const markup = imageView(PNG, { kind: 'failed' });
    expect(markup).toContain('<section class="notice render-issue" role="status">');
    expect(markup).toContain('<h2>This image could not be shown</h2>');
    expect(markup).toContain('<p>The file is listed in the project, but your browser could not display it.</p>');
    expect(markup).toContain(' · Dimensions unknown</span>');
    expect(markup).toContain('<h1>glaze-panel.png</h1>');
    expect(markup).not.toContain('<figure');
    expect(markup).not.toContain('<img');
  });

  it('opens in Fit to width: the img is data-fit and the first chip is pressed', () => {
    expect(loading).toMatch(/<img\b[^>]*data-fit="true"/);
    expect(loading).toContain('aria-pressed="true">Fit to width</button>');
  });

  it('shows only the img inside the frame body, with no link, download or new tab to the bytes', () => {
    const body = loading.match(/<div class="figure-frame-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(body?.[1]).toMatch(/^<img\b[^>]*\/?>$/);
    expect(body?.[1]).not.toMatch(/<(svg|object|iframe|embed)\b/);
    expect(loading).not.toMatch(/<(object|iframe|embed)\b/);
    expect(loading).not.toMatch(/<a\b[^>]*href="[^"]*\/api\/files/);
    expect(loading).not.toMatch(/\sdownload=|\starget=/);
  });

  it('shows an SVG as the same single img, never inline', () => {
    const markup = imageView(SVG, { kind: 'loading' });
    expect(markup).toContain('SVG image · ');
    expect(count(markup, /<img\b/g)).toBe(1);
    const body = markup.match(/<div class="figure-frame-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(body?.[1]).toMatch(/^<img\b[^>]*\/?>$/);
    expect(markup).not.toMatch(/<(object|iframe|embed)\b/);
  });
});

describe('FigureFrame defaultFit', () => {
  const frame = (props: { defaultFit?: boolean }) =>
    render(createElement(FigureFrame, { title: 'Figure', ...props, children: () => createElement('span', null, 'x') }));

  it('keeps Actual size and an unpressed first chip without the prop', () => {
    expect(frame({})).toContain('aria-pressed="false">Actual size</button>');
  });

  it('opens in Fit to width with the prop', () => {
    expect(frame({ defaultFit: true })).toContain('aria-pressed="true">Fit to width</button>');
  });
});

describe('globals.css', () => {
  it('holds exactly the two element-scoped image rules', async () => {
    const css = await readFile(new URL('../../src/web/styles/globals.css', import.meta.url), 'utf8');
    expect(css).toContain('.figure-frame-body img {\n  display: block;\n  max-width: none;\n  height: auto;\n}');
    expect(css).toContain(".figure-frame-body img[data-fit='true'] {\n  max-width: 100%;\n}");
    expect(count(css, /\.figure-frame-body img/g)).toBe(2);
  });
});

describe('FileDetailsPage', () => {
  const crumbLinks = (artifact: ArtifactDto): number =>
    documentCrumbsOf(shapes, artifact.path, fileNameOf(artifact.path)).filter((crumb) => crumb.to).length;

  it.each([
    ['firing-sheet.pdf', PDF, 'binary', 'Binary file', "Labelore does not show this file's contents.", 'PDF document'],
    ['kiln-curve.dat', DAT, 'binary', 'Binary file', "Labelore does not show this file's contents.", 'Binary file (.dat)'],
    ['kiln-log', NOEXT, 'binary', 'Binary file', "Labelore does not show this file's contents.", 'Binary file'],
    ['dump.json', LARGE, 'large', 'Large file', 'Labelore does not read text files larger than 1 MB.', 'Text file'],
    [
      'huge.png',
      OVERCAP,
      'image-over-cap',
      'Image',
      'This image is larger than 10 MB, so Labelore does not load it.',
      'PNG image',
    ],
  ] as [string, ArtifactDto, FileDetailsVariant, string, string, string][])(
    '%s opens the card with the right eyebrow, lead and Type',
    (name, artifact, variant, eyebrow, lead, type) => {
      const markup = detailsPage(artifact, variant);
      expect(markup).toContain(`<p class="eyebrow">${eyebrow}</p>`);
      expect(markup).toContain(`<h1>${name}</h1>`);
      expect(markup).toContain(`<p class="artifact-lead">${lead.replace("'", '&#x27;')}</p>`);
      expect(markup).toContain('<h2>File details</h2>');
      expect(markup).toContain('<section class="metadata-panel metadata-panel-known">');
      expect([...markup.matchAll(/<dt>([^<]*)<\/dt>/g)].map((match) => match[1])).toEqual([
        'Name',
        'Type',
        'Size',
        'Folder',
      ]);
      expect(markup).toContain(`<dt>Type</dt><dd><span class="metadata-scalar">${type}</span>`);
      expect(markup).toContain(`title="${exactByteCount(artifact.sizeBytes)}"`);
      expect(markup).toContain(
        `<span class="metadata-scalar artifact-path">${artifact.path.slice(0, artifact.path.lastIndexOf('/'))}</span>`,
      );
      expect(count(markup, /<a\b/g)).toBe(crumbLinks(artifact));
      expect(count(markup, /<button\b/g)).toBe(1);
      expect(markup).not.toContain('/api/files');
      expect(markup).not.toMatch(/<img\b|<figure\b/);
    },
  );
});

describe('DocumentRoute', () => {
  function route(url: string): string {
    const client = new QueryClient();
    client.setQueryData(['presentation'], shapes);
    return renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryRouter, null, createElement(DocumentRoute, { url })),
      ),
    );
  }

  it('opens an image on the image page and a binary on File details, never asking for the document', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const image = route(PNG.key);
      expect(image).toContain('<p class="eyebrow">Image</p>');
      expect(image).toContain('<h1>glaze-panel.png</h1>');
      const binary = route(PDF.key);
      expect(binary).toContain('<p class="eyebrow">Binary file</p>');
      expect(binary).toContain('<h2>File details</h2>');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('FileRow', () => {
  const row = (overrides: Partial<DrawerFileRow> & { path: string }): DrawerFileRow => ({
    key: overrides.path,
    label: fileNameOf(overrides.path),
    url: `/${fileNameOf(overrides.path)}`,
    warningTone: null,
    fileClass: 'text',
    sizeBytes: 0,
    ...overrides,
  });
  const renderRow = (value: DrawerFileRow, pathname = '/elsewhere'): string =>
    render(createElement(FileRow, { row: value, pathname, onNavigate: () => undefined }));

  it('marks an image with its class and a quiet badge plus a spoken twin', () => {
    const markup = renderRow(row({ path: '.planning/phases/01/kiln-floor.png', fileClass: 'image', sizeBytes: 49357 }));
    expect(markup).toContain('data-file-class="image"');
    expect(markup).toContain('<span class="places-badge" aria-hidden="true">PNG · 48.2 KB</span>');
    expect(markup).toContain('<span class="sr-only">, PNG image, 48.2 KB</span>');
  });

  it('marks a binary, a large file, a no-extension row and a long-extension row', () => {
    expect(renderRow(row({ path: '.planning/a/firing-sheet.pdf', fileClass: 'binary', sizeBytes: 2048 }))).toContain(
      'PDF · 2 KB</span>',
    );
    expect(renderRow(row({ path: '.planning/a/dump.json', fileClass: 'large', sizeBytes: 2516582 }))).toContain(
      'data-file-class="large"',
    );
    expect(renderRow(row({ path: '.planning/a/kiln-log', fileClass: 'binary', sizeBytes: 12 }))).toContain('FILE · 12 B');
    expect(renderRow(row({ path: '.planning/a/db.sqlite', fileClass: 'binary', sizeBytes: 12 }))).toContain('FILE · 12 B');
  });

  it('leaves a text row exactly as before', () => {
    const markup = renderRow(row({ path: '.planning/a/COVERAGE.md' }));
    expect(markup).not.toContain('data-file-class');
    expect(markup).not.toContain('places-badge');
  });

  it('is current while its page is open', () => {
    const value = row({ path: '.planning/a/kiln-floor.png', fileClass: 'image', sizeBytes: 10, url: '/a/kiln-floor.png' });
    const markup = renderRow(value, '/a/kiln-floor.png');
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain('aria-current="page"');
  });

  it('uses no tone for a file class', () => {
    for (const fileClass of ['image', 'binary', 'large'] as const) {
      expect(renderRow(row({ path: '.planning/a/x.bin', fileClass, sizeBytes: 5 }))).not.toContain('data-tone');
    }
    expect(textOf(renderRow(row({ path: '.planning/a/x.bin', fileClass: 'binary', sizeBytes: 5 })))).toContain('BIN · 5 B');
  });
});

describe('the page sources', () => {
  it('hold no raw HTML, frame, object, embed, inline svg, download or new-tab target', async () => {
    for (const file of ['image-page.tsx', 'file-details-page.tsx']) {
      const source = await readFile(new URL(`../../src/web/pages/${file}`, import.meta.url), 'utf8');
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(code, file).not.toMatch(/dangerouslySetInnerHTML|<iframe|<object|<embed|<svg|_blank|download=/);
    }
  });
});
