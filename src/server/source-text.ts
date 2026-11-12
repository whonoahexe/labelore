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
// This file imports no Node module directly (the handler registry it re-matches against uses node:path).
import type { Handler } from 'hono';
import type { Artifact, ArtifactLocation } from '../domain/model.ts';
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
import { HANDLERS } from '../planning-repo/handlers/index.ts';
import type { ArtifactRef } from '../planning-repo/types.ts';
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
  /** Where a .json text stops parsing; null for a text that parses and for every other file. */
  parseError: SourceParseError | null;
}

/** Why and where a served .json text does not parse. Only a position and a closed-set reason: the parser's own
 * message can quote the input, so it is discarded (T-12-18, RESEARCH Pitfall 10). */
export interface SourceParseError {
  /** 1-based, lines being the text between newline characters; null when no position could be told. */
  line: number | null;
  /** 1-based, counted in UTF-16 code units as the parser counts; null when no position could be told. */
  column: number | null;
  reason: 'unexpected-end' | 'unexpected-character' | 'expected-value' | 'not-valid';
}

/** The frontmatter mask each masking kind applies, keyed by wire kind: user-setup reads an env-var map, seed and thread read prose. */
export const FRONTMATTER_MASK_BY_KIND: ReadonlyMap<string, MaskOptions> = new Map<string, MaskOptions>([
  ['user-setup', {}],
  ['seed', PROSE_MASK],
  ['thread', PROSE_MASK],
]);

/**
 * The kind of the handler that parsed the artifact. Handlers match on the path, location and wire kind only, so the
 * same choice the registry made is remade here. The wire kind alone can disagree with it: a quick-named
 * `<id>-USER-SETUP.md` under `milestones/` outside a `vX.Y-quick` folder is parsed (and masked) by the user-setup
 * handler but carries the wire kind `unknown`, and keyed on that it would be served raw (T-12-02).
 */
function parsingHandlerKind(artifact: { kind: string; path: string; location?: ArtifactLocation }): string | null {
  if (artifact.location === undefined) return null;
  const ref: ArtifactRef = {
    path: artifact.path,
    kind: artifact.kind,
    location: artifact.location,
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    fileClass: 'text',
    sizeBytes: 0,
  };
  return HANDLERS.find((handler) => handler.match(ref))?.kind ?? null;
}

/** The frontmatter mask for an artifact: the parsing handler's, else its wire kind's. */
function maskOptionsOf(artifact: { kind: string; path: string; location?: ArtifactLocation }): MaskOptions | undefined {
  const byHandler = parsingHandlerKind(artifact);
  return (byHandler === null ? undefined : FRONTMATTER_MASK_BY_KIND.get(byHandler)) ?? FRONTMATTER_MASK_BY_KIND.get(artifact.kind);
}

const FENCE = '---';
const BOM = '\uFEFF';

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Whether a line is exactly the frontmatter fence (a trailing carriage return is part of the line ending). */
function isFence(line: string): boolean {
  return line === FENCE || line === `${FENCE}\r`;
}

/** Every line of `text` as its indentation plus the marker (a trailing carriage return kept): the fail-closed form. */
function markEveryLine(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const content = line.endsWith('\r') ? line.slice(0, -1) : line;
      return content.slice(0, content.length - content.trimStart().length) + VALUE_NOT_SHOWN_MARK + line.slice(content.length);
    })
    .join('\n');
}

/** The shortest raw string the residual check looks for (a shorter one would match ordinary text). */
const RESIDUAL_MIN_LENGTH = 4;

/** Every string and number (as written in decimal) of a parsed frontmatter value (keys included), to the depth
 * `maskData` walks. Numbers count because the handler withholds them too (`DB_PIN : 98765432`). */
function collectStrings(value: unknown, depth: number, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value);
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    into.add(String(value));
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
/** How many values of a parsed frontmatter value are the marker, to the depth `maskData` walks. */
function countMarks(value: unknown, depth: number): number {
  if (value === VALUE_NOT_SHOWN_MARK) return 1;
  if (depth >= FRONTMATTER_DEPTH || typeof value !== 'object' || value === null || value instanceof Date) return 0;
  let count = 0;
  for (const item of Array.isArray(value) ? value : Object.values(value)) count += countMarks(item, depth + 1);
  return count;
}

function withheldValueSurvives(raw: string, maskedFrontmatter: Record<string, unknown>, maskedLines: readonly string[]): boolean {
  // A value the handler withheld in a spelling the string search below cannot know (a YAML number written as
  // `0x5F5E0FF`, `98_765_432`, `01234567`, or past 2^53): the handler then holds more markers than the masked lines do.
  const servedMarks = maskedLines.join('\n').split(VALUE_NOT_SHOWN_MARK).length - 1;
  if (countMarks(maskedFrontmatter, 0) > servedMarks) return true;
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
  artifact: Pick<Artifact, 'kind' | 'path' | 'body' | 'frontmatter'> & { location?: ArtifactLocation },
  raw: string,
): { text: string; masked: boolean } {
  if (lastSegment(artifact.path) === 'config.json') return { text: artifact.body, masked: true };
  const options = maskOptionsOf(artifact);
  if (options === undefined) return { text: raw, masked: false };
  const lines = raw.split('\n');
  // The handler's parser accepts a leading byte-order mark before the fence, so this scan must too.
  const firstLine = lines[0] ?? '';
  if (lines.length === 0 || !isFence(firstLine.startsWith(BOM) ? firstLine.slice(BOM.length) : firstLine)) {
    // Nothing to mask only when the handler kept the whole file as its body. Otherwise it read (or held back) text
    // before the body that this fence scan did not find, as with CR-only line endings, so no line before the body is
    // trusted and every one is served as the marker.
    const unprefixed = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;
    if (Object.keys(artifact.frontmatter).length === 0 && (unprefixed === artifact.body || raw === artifact.body)) {
      return { text: raw, masked: false };
    }
    const bodyAt = raw.endsWith(artifact.body) ? raw.length - artifact.body.length : raw.length;
    return { text: markEveryLine(raw.slice(0, bodyAt)) + raw.slice(bodyAt), masked: true };
  }
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

const MAX_LOCATE_DEPTH = 200;
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/**
 * The offset of the first character a strict JSON reader cannot accept (the end of the text when it stops inside a
 * value), or null when the text reads as valid or nests deeper than MAX_LOCATE_DEPTH. Only used when `JSON.parse`
 * has already failed and gave no position. Recursive descent, linear, no backtracking.
 */
function jsonErrorOffset(text: string): number | null {
  const n = text.length;
  let i = 0;
  let gaveUp = false;
  const skipBlanks = (): void => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c !== 32 && c !== 9 && c !== 10 && c !== 13) return;
      i += 1;
    }
  };
  const advance = (by: number): true => {
    i += by;
    return true;
  };
  const string = (): boolean => {
    i += 1;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        i += 1;
        return true;
      }
      if (c < 32) return false;
      if (c === 92) {
        i += 1;
        const e = text[i] ?? '';
        if (e === 'u') {
          for (let k = 1; k <= 4; k += 1) {
            if (!/[0-9a-fA-F]/.test(text[i + k] ?? '')) {
              i += k;
              return false;
            }
          }
          i += 4;
        } else if (!'"\\/bfnrt'.includes(e) || e === '') {
          return false;
        }
      }
      i += 1;
    }
    return false;
  };
  const value = (depth: number): boolean => {
    if (depth > MAX_LOCATE_DEPTH) {
      gaveUp = true;
      return false;
    }
    skipBlanks();
    const c = text[i];
    if (c === '{') {
      i += 1;
      skipBlanks();
      if (text[i] === '}') return advance(1);
      for (;;) {
        skipBlanks();
        if (text[i] !== '"' || !string()) return false;
        skipBlanks();
        if (text[i] !== ':') return false;
        i += 1;
        if (!value(depth + 1)) return false;
        skipBlanks();
        if (text[i] === ',') {
          i += 1;
          continue;
        }
        if (text[i] === '}') return advance(1);
        return false;
      }
    }
    if (c === '[') {
      i += 1;
      skipBlanks();
      if (text[i] === ']') return advance(1);
      for (;;) {
        if (!value(depth + 1)) return false;
        skipBlanks();
        if (text[i] === ',') {
          i += 1;
          continue;
        }
        if (text[i] === ']') return advance(1);
        return false;
      }
    }
    if (c === '"') return string();
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, i)) return advance(literal.length);
    }
    NUMBER.lastIndex = i;
    const number = NUMBER.exec(text);
    if (number !== null) return advance(number[0].length);
    return false;
  };
  const ok = value(0);
  if (gaveUp) return null;
  if (!ok) return i;
  skipBlanks();
  return i < n ? i : null;
}

/** The 1-based line and column of an offset: lines are split at newline characters, columns count UTF-16 units. */
function lineAndColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let at = text.indexOf('\n'); at >= 0 && at < offset; at = text.indexOf('\n', at + 1)) {
    line += 1;
    lineStart = at + 1;
  }
  return { line, column: offset - lineStart + 1 };
}

/**
 * Where a served .json text stops parsing, or null when it parses. The position is the one `JSON.parse` reports
 * (a "line L column C" pair, else an "at position N" offset); when the parser reports none, a small strict scanner
 * finds it, and when that cannot either both stay null. The reason comes from the opening words of the parser's
 * message, mapped onto a closed set; the message itself is dropped.
 */
export function parseErrorOf(text: string): SourceParseError | null {
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const pair = /\(line (\d+) column (\d+)\)/.exec(message);
    const at = /\bat position (\d+)/.exec(message);
    const offset = at?.[1] !== undefined ? Number(at[1]) : jsonErrorOffset(text);
    let line: number | null = null;
    let column: number | null = null;
    if (pair?.[1] !== undefined && pair[2] !== undefined) {
      line = Number(pair[1]);
      column = Number(pair[2]);
    } else if (offset !== null) {
      ({ line, column } = lineAndColumn(text, offset));
    }
    let reason: SourceParseError['reason'] = 'not-valid';
    if (/^(?:Unexpected end|Unterminated)/.test(message)) reason = 'unexpected-end';
    else if (offset !== null && text.slice(offset).trim() === '') reason = 'unexpected-end';
    else if (/^(?:Unexpected|Bad )/.test(message)) reason = 'unexpected-character';
    else if (/^Expected/.test(message)) reason = 'expected-value';
    return { line, column, reason };
  }
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
      const body: SourceTextResponse = {
        text,
        bodyStart: bodyStartOf(text, artifact.body),
        masked,
        parseError: artifact.path.endsWith('.json') ? parseErrorOf(text) : null,
      };
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
