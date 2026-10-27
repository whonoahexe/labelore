// The read-only image-bytes route (Phase 7: D-08): GET /api/files?route=<an image's readable URL> serves
// that image's exact bytes so the image page can show it in an img element. Images only (D-09): a
// binary, a large file, a text file, an internal file and an unknown address all answer the same 404.
// The request text never names a path: it selects an indexed artifact through the route table of one
// bundle, and only that artifact's own path is read, through PlanningFilesystem.readBytesWithin
// confined to .planning.
//
// Images can be hostile (an SVG may carry a script), so every response from this route carries
// `Content-Security-Policy: sandbox ...` and nosniff: an image opened directly is an opaque,
// script-less document.
//
// This file deliberately imports no Node module.
import type { Handler } from 'hono';
import { PathEscapeError } from '../planning-fs/types.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { MAX_IMAGE_BYTES, extensionOf } from '../planning-repo/file-class.ts';
import { parseRoutePath } from '../presentation/routes.ts';
import type { ArtifactIndex } from './artifact-index.ts';

export const IMAGE_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-cache',
};

/** The content type of each image extension: exactly the IMAGE_EXTENSIONS of file-class.ts. */
export const IMAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

/** The image content type for a file name, by lowercase extension; null when it is not an image. */
export function imageContentType(name: string): string | null {
  const ext = extensionOf(name);
  return ext === null ? null : (IMAGE_CONTENT_TYPES[ext] ?? null);
}

function plain(status: number, text: string, extra: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: { ...IMAGE_RESPONSE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra },
  });
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
}

/**
 * GET and HEAD only. The bundle is captured first, before parsing and before any await, so a refresh
 * that completes during the read cannot change which artifact this request serves. Every miss is the
 * same plain 404, so a binary, an internal file and a missing file cannot be told apart (D-09, D-11).
 * The post-read length check is what makes the cap hold for a file that grew after it was indexed.
 */
export function createFileBytesHandler(
  getBundle: () => { artifactIndex: ArtifactIndex },
  getFilesystem: () => PlanningFilesystem | null,
): Handler {
  return async (c) => {
    const activeDerived = getBundle();
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    const parsed = parseRoutePath(c.req.query('route') ?? '');
    if (!parsed.ok || parsed.route.kind !== 'document') return plain(404, 'Not found');
    const lookup = activeDerived.artifactIndex.lookupRoute(parsed.route);
    if (!lookup.found || lookup.artifact.fileClass !== 'image') return plain(404, 'Not found');
    const artifact = lookup.artifact;
    const type = imageContentType(artifact.path.slice(artifact.path.lastIndexOf('/') + 1));
    if (type === null) return plain(404, 'Not found');
    if (artifact.sizeBytes > MAX_IMAGE_BYTES) return plain(413, 'Image too large');

    const fs = getFilesystem();
    if (!fs || !fs.readBytesWithin) return plain(404, 'Not found');
    try {
      const { bytes } = await fs.readBytesWithin('.planning', artifact.path);
      if (bytes.length > MAX_IMAGE_BYTES) return plain(413, 'Image too large');
      const headers = { ...IMAGE_RESPONSE_HEADERS, 'Content-Type': type };
      if (c.req.method === 'HEAD') return new Response(null, { status: 200, headers });
      return new Response(new Uint8Array(bytes), { status: 200, headers });
    } catch (error) {
      if (error instanceof PathEscapeError) return plain(403, 'Forbidden');
      const code = errorCode(error);
      if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP' || code === 'EINVAL') {
        return plain(404, 'Not found');
      }
      if (code === 'EACCES' || code === 'EPERM') return plain(403, 'Forbidden');
      return plain(500, 'Read failed');
    }
  };
}
