// The read-only sketch file route (todo 001, quick-261023-4wn): serves a target project's
// .planning/sketches/ tree at <project API>/sketch-files/<folder>/ so Labelore can replace the ad-hoc
// python file server. The route lives inside the project API (PLAT-08, SEC-05), so the request guard's
// Host check covers it and the runtime is the one the request's own slug resolved. Containment is the whole point: a request is served only when the file's canonical path
// lies under .planning/sketches/ (enforced by PlanningFilesystem.readBytesWithin), there is no
// directory listing, and only GET and HEAD are accepted.
//
// Sketches are author-controlled HTML and scripts. The page shows them in an iframe sandboxed to
// scripts only; so that a sketch opened full size in its own tab is an opaque origin too (and cannot
// call /api/* with the app's origin), EVERY sketch file response - success, redirect or error -
// carries `Content-Security-Policy: sandbox allow-scripts`.
//
// This file deliberately imports no Node module: the path work is plain string logic on forward
// slashes, and every read goes through the PlanningFilesystem boundary.
import type { Context, MiddlewareHandler } from 'hono';
import { PathEscapeError } from '../planning-fs/types.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';

export const SKETCHES_RELDIR = '.planning/sketches';
/** The path segment, inside a project API, under which sketch files are served. */
export const SKETCH_FILES_SEGMENT = '/sketch-files/';

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': 'sandbox allow-scripts',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-cache',
};

export type SketchRequestPath =
  | { ok: true; relPath: string; directoryRequest: boolean }
  | { ok: false; status: 403 | 404 };

/** Turns a raw request pathname into a project-relative path under .planning/sketches/, or refuses it.
 * `prefix` is the raw URL prefix the sketch files are served under (the project API's mount prefix
 * plus SKETCH_FILES_SEGMENT); a pathname outside it is a 404. */
export function sketchRequestPath(pathname: string, prefix: string): SketchRequestPath {
  if (!pathname.startsWith(prefix)) return { ok: false, status: 404 };
  const parts = pathname.slice(prefix.length).split('/');
  const directoryRequest = parts[parts.length - 1] === '';
  const raw = directoryRequest ? parts.slice(0, -1) : parts;
  const segments: string[] = [];
  for (const part of raw) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(part);
    } catch {
      return { ok: false, status: 403 };
    }
    if (
      decoded === '' ||
      decoded.startsWith('.') ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('\u0000')
    ) {
      return { ok: false, status: 403 };
    }
    segments.push(decoded);
  }
  if (directoryRequest) segments.push('index.html');
  return { ok: true, relPath: [SKETCHES_RELDIR, ...segments].join('/'), directoryRequest };
}

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

/** The content type for a file name, by lowercase extension; unknown types are octet-stream. */
export function sketchContentType(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return 'application/octet-stream';
  return CONTENT_TYPES[fileName.slice(dot + 1).toLowerCase()] ?? 'application/octet-stream';
}

/** Sketches built by GSD's sketch tool share a fixed bottom-right `#sketch-tools` panel (doc, theme
 * and width switches) that covers the content it switches. Served HTML that contains it gets this
 * stylesheet, which folds the panel to a small tab until it is hovered or a control inside it has
 * focus, and lays it out as labelled sections: a row label over each button group, segmented
 * buttons, and the doc switch as a scrolling list. The controls stay in the DOM and in tab order,
 * and the file on disk is never changed. */
export const SKETCH_TOOLS_STYLE = `<style data-labelore="sketch-tools">
:root #sketch-tools{opacity:1!important;border-radius:0!important;width:min(23rem,calc(100vw - 24px));max-width:none!important;max-height:calc(100vh - 24px);overflow:auto;padding:0!important;gap:0!important;background:var(--card,#161616)!important;color:var(--foreground,#f5f5f5)!important;border:1px solid var(--border,#333);box-shadow:0 12px 32px rgb(0 0 0/.35);font-family:var(--font-sans,system-ui,sans-serif)!important}
:root #sketch-tools::before{content:"Sketch options";display:block;padding:10px 14px;border-bottom:1px solid var(--border,#333);font:600 11px/16px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase}
:root #sketch-tools:not(:hover):not(:focus-within){width:auto;max-width:10.5rem!important;max-height:38px;overflow:hidden;cursor:default}
:root #sketch-tools>div{display:flex;flex-wrap:wrap;gap:0;align-items:center;padding:10px 14px 12px;color:var(--muted-foreground,#a3a3a3);font:10px/14px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase}
:root #sketch-tools>div+div{border-top:1px solid var(--border,#333)}
:root #sketch-tools>div::after{content:"";flex-basis:100%;height:7px}
:root #sketch-tools>div>*{order:1}
:root #sketch-tools button{margin:0 -1px 0 0;border-radius:0;padding:5px 10px;border:1px solid var(--border,#333);background:transparent;color:var(--foreground,#f5f5f5);font:12px/16px var(--font-sans,system-ui,sans-serif);letter-spacing:0;text-transform:none;cursor:pointer}
:root #sketch-tools button:hover{background:color-mix(in oklch,var(--foreground,#fff) 8%,transparent)}
:root #sketch-tools button.on{position:relative;border-color:var(--primary,#c2410c);background:var(--primary,#c2410c);color:var(--primary-foreground,#fff)}
:root #doc-btns{display:flex;flex-direction:column;flex-basis:100%;max-height:min(16rem,40vh);overflow:auto}
:root #doc-btns button{margin:0 0 -1px;padding:7px 10px;text-align:left}
:root #doc-btns button.on{border-color:var(--border,#333);background:color-mix(in oklch,var(--primary,#c2410c) 14%,transparent);box-shadow:inset 3px 0 0 var(--primary,#c2410c);color:var(--foreground,#f5f5f5)}
</style>`;

/** Adds SKETCH_TOOLS_STYLE to sketch HTML that has the tools panel; any other HTML is returned as is. */
export function withSketchToolsStyle(html: string): string {
  if (!html.includes('id="sketch-tools"')) return html;
  const head = html.search(/<\/head>/i);
  return head < 0 ? SKETCH_TOOLS_STYLE + html : html.slice(0, head) + SKETCH_TOOLS_STYLE + html.slice(head);
}

function plain(status: number, text: string, extra: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra },
  });
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
}

/** `getFilesystem` and `prefixOf` are read per request, so each request serves its own project's
 * sketches under its own raw mount prefix. */
export function createSketchFileMiddleware(
  getFilesystem: (c: Context) => PlanningFilesystem | null,
  prefixOf: (c: Context) => string,
): MiddlewareHandler {
  return async (c) => {
    const url = new URL(c.req.url);

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    const parsed = sketchRequestPath(url.pathname, prefixOf(c));
    if (!parsed.ok) return plain(parsed.status, parsed.status === 403 ? 'Forbidden' : 'Not found');

    const fs = getFilesystem(c);
    if (!fs || !fs.readBytesWithin) return plain(404, 'Not found');

    try {
      const { bytes } = await fs.readBytesWithin(SKETCHES_RELDIR, parsed.relPath);
      const type = sketchContentType(parsed.relPath.slice(parsed.relPath.lastIndexOf('/') + 1));
      const headers: Record<string, string> = { ...SECURITY_HEADERS, 'Content-Type': type };
      // A sandboxed (opaque-origin) document loads fonts in CORS mode, so font responses - and only
      // those - allow any origin. Font bytes carry no planning text.
      if (type.startsWith('font/')) headers['Access-Control-Allow-Origin'] = '*';
      if (type.startsWith('text/html')) {
        const html = withSketchToolsStyle(new TextDecoder().decode(bytes));
        return new Response(html, { status: 200, headers });
      }
      return new Response(new Uint8Array(bytes), { status: 200, headers });
    } catch (error) {
      if (error instanceof PathEscapeError) return plain(403, 'Forbidden');
      const code = errorCode(error);
      if (code === 'EISDIR') {
        if (parsed.directoryRequest) return plain(404, 'Not found');
        // Built from the validated raw pathname (already starting with the sketch prefix), never from
        // decoded segments, so it is always a same-origin path.
        return new Response(null, {
          status: 308,
          headers: { ...SECURITY_HEADERS, Location: `${url.pathname}/${url.search}` },
        });
      }
      if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP' || code === 'EINVAL') {
        return plain(404, 'Not found');
      }
      if (code === 'EACCES' || code === 'EPERM') return plain(403, 'Forbidden');
      return plain(500, 'Read failed');
    }
  };
}
