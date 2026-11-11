// The read-only raw-text route (Phase 12: D-01, D-06, D-08): GET /api/projects/:slug/source?route=<an
// artifact's readable URL> serves a text file as written, so Source mode can show it with numbered
// rows. The request text never names a path: it selects an indexed artifact through the route table of
// one bundle (captured before any await), and only that artifact's own path is read, through the
// confined, read-only PlanningFilesystem port.
//
// Two masking rules keep Source from showing what the read-time masking withholds (T-12-01, T-12-02):
// config.json is never read from disk, its Source is the handler's already-masked body; and the
// frontmatter lines of a user-setup, seed or thread file run through the same shared mask their handler
// applies to its own frontmatter.
//
// This file deliberately imports no Node module.
import type { Handler } from 'hono';
import type { Artifact } from '../domain/model.ts';
import { PathEscapeError } from '../planning-fs/types.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { MAX_TEXT_BYTES } from '../planning-repo/file-class.ts';
import { tryParseFrontmatter } from '../planning-repo/frontmatter.ts';
import {
  FRONTMATTER_DEPTH,
  PROSE_MASK,
  VALUE_NOT_SHOWN_MARK,
  maskFrontmatterLines,
} from '../planning-repo/handlers/withhold-values.ts';
import type { MaskOptions } from '../planning-repo/handlers/withhold-values.ts';
import { parseRoutePath } from '../presentation/routes.ts';
import type { ArtifactIndex } from './artifact-index.ts';

/** The wire shape of one /source response. */
export interface SourceTextResponse {
  /** The file as written (frontmatter lines included), masked where Labelore masks. */
  text: string;
  /** The offset in `text` where the body starts (0 when it cannot be told). */
  bodyStart: number;
  /** True when the text differs from the file on disk because a mask changed it. */
  masked: boolean;
}

/** The frontmatter mask each masking kind applies, keyed by wire kind: user-setup reads an env-var map, seed and thread read prose. */
export const FRONTMATTER_MASK_BY_KIND: ReadonlyMap<string, MaskOptions> = new Map<string, MaskOptions>([
  ['user-setup', {}],
  ['seed', PROSE_MASK],
  ['thread', PROSE_MASK],
]);

const FENCE = '---';

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Whether a line is exactly the frontmatter fence (a trailing carriage return is part of the line ending). */
function isFence(line: string): boolean {
  return line === FENCE || line === `${FENCE}\r`;
}

/** The shortest raw string the residual check looks for (a shorter one would match ordinary text). */
const RESIDUAL_MIN_LENGTH = 4;

/** Every string of a parsed frontmatter value (keys included), to the depth `maskData` walks. */
function collectStrings(value: unknown, depth: number, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value);
  } else if (Array.isArray(value)) {
    if (depth >= FRONTMATTER_DEPTH) return;
    for (const item of value) collectStrings(item, depth + 1, into);
  } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    if (depth >= FRONTMATTER_DEPTH) return;
    for (const [key, item] of Object.entries(value)) {
      into.add(key);
      collectStrings(item, depth + 1, into);
    }
  }
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Fail-closed residual check (T-12-17): true when a string the handler's masked frontmatter no longer holds but the
 * raw frontmatter does (four characters or longer) still reads in the masked frontmatter text, whitespace-collapsed
 * so a value folded across lines is found too. The line mask then missed a shape and the frontmatter is not served.
 */
function withheldValueSurvives(raw: string, maskedFrontmatter: Record<string, unknown>, maskedLines: readonly string[]): boolean {
  const rawStrings = new Set<string>();
  collectStrings(tryParseFrontmatter(raw).data, 0, rawStrings);
  const keptStrings = new Set<string>();
  collectStrings(maskedFrontmatter, 0, keptStrings);
  const haystack = collapseWhitespace(maskedLines.join('\n'));
  for (const candidate of rawStrings) {
    if (candidate.length < RESIDUAL_MIN_LENGTH || keptStrings.has(candidate)) continue;
    const needle = collapseWhitespace(candidate);
    if (needle.length >= RESIDUAL_MIN_LENGTH && haystack.includes(needle)) return true;
  }
  return false;
}

/**
 * The text Source serves for one artifact, from the file's raw text. config.json is served from the
 * handler's already-masked body and `raw` is ignored. For a kind in FRONTMATTER_MASK_BY_KIND the frontmatter
 * lines pass through the shared mask (`maskFrontmatterLines`, line count kept); when a string the handler
 * withheld still reads in the result, every frontmatter line is served as its indentation plus the marker.
 */
export function sourceTextOf(
  artifact: Pick<Artifact, 'kind' | 'path' | 'body' | 'frontmatter'>,
  raw: string,
): { text: string; masked: boolean } {
  if (lastSegment(artifact.path) === 'config.json') return { text: artifact.body, masked: true };
  const options = FRONTMATTER_MASK_BY_KIND.get(artifact.kind);
  if (options === undefined) return { text: raw, masked: false };
  const lines = raw.split('\n');
  if (lines.length === 0 || !isFence(lines[0] ?? '')) return { text: raw, masked: false };
  let end = 1;
  while (end < lines.length && !isFence(lines[end] ?? '')) end += 1;
  const original = lines.slice(1, end);
  const contents = original.map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  let masked = maskFrontmatterLines(contents, options);
  if (withheldValueSurvives(raw, artifact.frontmatter, masked)) {
    masked = contents.map((line) => line.slice(0, line.length - line.trimStart().length) + VALUE_NOT_SHOWN_MARK);
  }
  let changed = false;
  for (let index = 0; index < original.length; index += 1) {
    const line = original[index] ?? '';
    const next = line.endsWith('\r') ? `${masked[index] ?? ''}\r` : (masked[index] ?? '');
    if (next !== line) {
      changed = true;
      lines[index + 1] = next;
    }
  }
  return { text: changed ? lines.join('\n') : raw, masked: changed };
}

/** The offset in `text` where `body` starts: the tail match, else the first match, else 0. */
export function bodyStartOf(text: string, body: string): number {
  if (text.endsWith(body)) return text.length - body.length;
  const at = text.indexOf(body);
  return at >= 0 ? at : 0;
}

function plain(status: number, text: string, extra: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...extra },
  });
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
}

/**
 * GET and HEAD only. The bundle is captured first, before parsing and before any await, so a refresh
 * that completes during the read cannot change which artifact this request serves. Every miss is the
 * same plain 404, so a binary, an internal file and a missing file cannot be told apart.
 */
export function createSourceHandler(
  getBundle: () => { artifactIndex: ArtifactIndex },
  getFilesystem: () => PlanningFilesystem | null,
): Handler {
  return async (c) => {
    const activeDerived = getBundle();
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    const parsed = parseRoutePath(c.req.query('route') ?? '');
    if (
      !parsed.ok ||
      (parsed.route.kind !== 'document' && parsed.route.kind !== 'plan' && parsed.route.kind !== 'page')
    ) {
      return plain(404, 'Not found');
    }
    const lookup = activeDerived.artifactIndex.lookupRoute(parsed.route);
    if (!lookup.found || lookup.artifact.fileClass !== 'text') return plain(404, 'Not found');
    const artifact = lookup.artifact;
    if (artifact.sizeBytes > MAX_TEXT_BYTES) return plain(413, 'File too large');

    try {
      let raw = '';
      if (lastSegment(artifact.path) !== 'config.json') {
        const fs = getFilesystem();
        if (!fs) return plain(404, 'Not found');
        raw = (await fs.read(artifact.path)).content;
        if (new TextEncoder().encode(raw).length > MAX_TEXT_BYTES) return plain(413, 'File too large');
      }
      const { text, masked } = sourceTextOf(artifact, raw);
      const body: SourceTextResponse = { text, bodyStart: bodyStartOf(text, artifact.body), masked };
      if (c.req.method === 'HEAD') return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-cache' } });
      return c.json(body);
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
