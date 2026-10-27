// Pins the read-only image-bytes route (Phase 7: D-08, D-09): GET /api/files?route=<an image's readable
// URL> serves that image's exact bytes with hardened headers, resolved through the route table of one
// bundle. Built over the committed Shapes fixture through the real repository.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { createApp } from '../../src/server/index.ts';
import { IMAGE_RESPONSE_HEADERS } from '../../src/server/file-bytes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const repo = new PlanningRepository(new LocalFsPlanningFilesystem(SHAPES_ROOT), SHAPES_ROOT);
await repo.load();
const app = createApp(repo, false);
const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;

const keyOf = (path: string): string => {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`Shapes fixture has no artifact at ${path}`);
  return artifact.key;
};
const bytesUrl = (key: string): string => `/api/files?route=${encodeURIComponent(key)}`;

describe('GET /api/files?route= (tracer)', () => {
  it('serves a PNG with its exact bytes, the image content type and the three security headers', async () => {
    const path = '.planning/ui-reviews/screenshots/glaze-panel.png';
    const res = await app.request(bytesUrl(keyOf(path)));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-security-policy')).toBe("sandbox; default-src 'none'; style-src 'unsafe-inline'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    for (const [name, value] of Object.entries(IMAGE_RESPONSE_HEADERS)) {
      expect(res.headers.get(name)).toBe(value);
    }
    const expected = await readFile(`${SHAPES_ROOT}/${path}`);
    expect(Buffer.from(await res.arrayBuffer()).equals(expected)).toBe(true);
  });
});
