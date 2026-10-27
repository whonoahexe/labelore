// Static-render contract of the Phase 7 file pages (D-08, D-09): the image page, and DocumentRoute's
// file-class branch. Rendered with renderToStaticMarkup inside a MemoryRouter over the committed Shapes
// payload, the dashboard-sections.test.ts idiom.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { fileNameOf, formatByteSize, imageBytesUrl } from '../../src/presentation/file-facts.ts';
import type { ArtifactDto, ProjectPresentation } from '../../src/server/project-presentation.ts';
import { documentCrumbsOf } from '../../src/web/pages/document-crumbs.ts';
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

const PNG = artifactAt('.planning/ui-reviews/screenshots/glaze-panel.png');

describe('ImageView (tracer)', () => {
  const markup = imageView(PNG, { kind: 'loading' });

  it('opens with the Image eyebrow, the file name as h1 and the copy-path button', () => {
    expect(markup).toContain('<p class="eyebrow">Image</p>');
    expect(markup).toContain('<h1>glaze-panel.png</h1>');
    expect(markup).toContain('aria-label="Copy file path"');
  });

  it('reads the type and size in a source-note while loading', () => {
    expect(markup).toContain(`<span class="source-note">PNG image · ${formatByteSize(PNG.sizeBytes)}</span>`);
  });

  it('holds one img in a Preview frame whose src is the bytes route', () => {
    expect(markup).toContain('<span class="figure-frame-title">Preview</span>');
    const images = markup.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(1);
    expect(images[0]).toContain(`src="${imageBytesUrl(PNG.key).replace(/&/g, '&amp;')}"`);
    expect(images[0]).toContain('alt="glaze-panel.png"');
  });
});
