// Phase 7 tracer (DATA-08, D-10, D-11): the made-up Shapes project on disk, through the real
// filesystem port, discovery, the registry, the domain model, /api/presentation and /api/search.
// A PNG is listed as an image with its size and an empty body and is never read or indexed; GSD's own
// bookkeeping file at the root is absent from the payload and recorded once as an exclusion.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import type { FileRead } from '../src/planning-fs/types.ts';
import { INTERNAL_EXCLUSION_REASON } from '../src/planning-repo/file-class.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { createApp } from '../src/server/index.ts';
import type { ProjectPresentation } from '../src/server/project-presentation.ts';
import { SHAPES_ROOT, shapesPath } from './helpers/shapes-project.ts';

/** A real filesystem port that records every read() path: proof that non-text refs are never read. */
class SpyLocalFs extends LocalFsPlanningFilesystem {
  readonly reads: string[] = [];
  override async read(relPath: string): Promise<FileRead> {
    this.reads.push(relPath);
    return super.read(relPath);
  }
}

const PNG_PATH = '.planning/phases/01-kiln-bookings/kiln-floor.png';

async function openShapes() {
  const fs = new SpyLocalFs(SHAPES_ROOT);
  const repo = new PlanningRepository(fs, SHAPES_ROOT);
  const snapshot = await repo.load();
  const app = createApp({ getSnapshot: () => snapshot, planningFilesystem: () => fs }, true, '.');
  // The search index is built off the request path; one macrotask lets it finish.
  await new Promise<void>((resolve) => setImmediate(resolve));
  return { fs, app };
}

async function presentationOf(app: ReturnType<typeof createApp>): Promise<ProjectPresentation> {
  const response = await app.request('/api/presentation');
  expect(response.status).toBe(200);
  return (await response.json()) as ProjectPresentation;
}

describe('recognition tracer: one PNG and one internal state.json, disk to payload and search', () => {
  it('lists the PNG as an image with its on-disk size, an empty body and its file name as the title', async () => {
    const { app } = await openShapes();
    const presentation = await presentationOf(app);
    const png = presentation.artifacts.find((artifact) => artifact.path === PNG_PATH);
    expect(png).toBeDefined();
    expect(png?.fileClass).toBe('image');
    expect(png?.sizeBytes).toBe(readFileSync(shapesPath('phases/01-kiln-bookings/kiln-floor.png')).length);
    expect(png?.bodyLength).toBe(0);
    expect(png?.title).toBe('kiln-floor.png');
  });

  it('never passes the PNG to read()', async () => {
    const { fs } = await openShapes();
    expect(fs.reads).not.toContain(PNG_PATH);
    expect(fs.reads.length).toBeGreaterThan(0);
  });

  it('keeps root state.json out of the payload and records it once as an exclusion', async () => {
    const { app } = await openShapes();
    const presentation = await presentationOf(app);
    expect(presentation.artifacts.some((artifact) => artifact.path === '.planning/state.json')).toBe(false);
    const matching = presentation.exclusions.filter((exclusion) => exclusion.path === '.planning/state.json');
    expect(matching).toEqual([{ path: '.planning/state.json', reason: INTERNAL_EXCLUSION_REASON }]);
  });

  it('never indexes the PNG: a search for its name finds no .png hit, while a text word still hits', async () => {
    const { app } = await openShapes();
    const png = await app.request('/api/search?q=kiln-floor');
    const pngBody = (await png.json()) as { status: string; results: { path: string }[] };
    expect(pngBody.status).toBe('ready');
    expect(pngBody.results.some((hit) => hit.path.endsWith('.png'))).toBe(false);

    const control = await app.request('/api/search?q=whiteboard');
    const controlBody = (await control.json()) as { status: string; results: { path: string }[] };
    expect(controlBody.status).toBe('ready');
    expect(controlBody.results.map((hit) => hit.path)).toContain('.planning/phases/01-kiln-bookings/01-CONTEXT.md');
  });
});

describe('recognition classes across the Shapes project', () => {
  it('classes the PDF stub and both NUL stubs as binary, the SVG and the second PNG as images', async () => {
    const { app } = await openShapes();
    const { artifacts } = await presentationOf(app);
    const classOf = (path: string) => artifacts.find((artifact) => artifact.path === path)?.fileClass;
    expect(classOf('.planning/phases/01-kiln-bookings/firing-sheet.pdf')).toBe('binary');
    expect(classOf('.planning/notes/kiln-curve.dat')).toBe('binary');
    expect(classOf('.planning/notes/kiln-log')).toBe('binary');
    expect(classOf('.planning/ui-reviews/kiln-map.svg')).toBe('image');
    expect(classOf('.planning/ui-reviews/screenshots/glaze-panel.png')).toBe('image');
    for (const path of ['firing-sheet.pdf', 'kiln-curve.dat', 'kiln-log', 'kiln-map.svg', 'glaze-panel.png']) {
      const artifact = artifacts.find((entry) => entry.path.endsWith(`/${path}`));
      expect(artifact?.bodyLength, path).toBe(0);
    }
  });

  it('returns no hit for a word that only appears inside the SVG script', async () => {
    const { app } = await openShapes();
    const response = await app.request('/api/search?q=kilnsprite');
    const body = (await response.json()) as { status: string; total: number; results: unknown[] };
    expect(body.status).toBe('ready');
    expect(body.total).toBe(0);
    expect(body.results).toEqual([]);
  });

  it('keeps every internal fixture path out of the payload and records each once as an exclusion', async () => {
    const { app } = await openShapes();
    const presentation = await presentationOf(app);
    const internalRoots = [
      '.planning/state.json',
      '.planning/milestone.lock',
      '.planning/estimation-calibration.json',
      '.planning/tmp',
      '.planning/async-jobs',
    ];
    for (const root of internalRoots) {
      expect(presentation.exclusions.filter((exclusion) => exclusion.path === root), root).toEqual([
        { path: root, reason: INTERNAL_EXCLUSION_REASON },
      ]);
      expect(presentation.artifacts.some((artifact) => artifact.path === root || artifact.path.startsWith(`${root}/`)), root).toBe(false);
    }
    expect(presentation.exclusions.some((exclusion) => exclusion.path.startsWith('.planning/tmp/'))).toBe(false);
    expect(presentation.exclusions.some((exclusion) => exclusion.path.startsWith('.planning/async-jobs/'))).toBe(false);
  });

  it('keeps config.json in the index and a state.json one level down as a visible text artifact', async () => {
    const { app } = await openShapes();
    const { artifacts } = await presentationOf(app);
    const config = artifacts.find((artifact) => artifact.path === '.planning/config.json');
    expect(config?.kind).toBe('config');
    expect(config?.fileClass).toBe('text');
    const sketchState = artifacts.find((artifact) => artifact.path === '.planning/sketches/001-shelf-board/state.json');
    expect(sketchState?.fileClass).toBe('text');
    expect(sketchState?.bodyLength).toBeGreaterThan(0);
  });
});
