// The file-class policy, decided before any read (Phase 7: D-09, D-10, D-11). One module owns it so
// discovery, the registry, the search index and the presentation payload all agree on what a file is.
// No node imports: the policy sees names, sizes and a bounded head of bytes handed to it by the
// filesystem port, never the filesystem itself.
import type { FileClass } from '../domain/model.ts';

export type { FileClass };

/** Text above this many bytes is class `large`: never read, never indexed. Exactly this size is text. */
export const MAX_TEXT_BYTES = 1_048_576;

/** How many head bytes the NUL sniff looks at (git's rule); nothing past this window is read. */
export const SNIFF_BYTES = 8_000;

/** The largest image the web will draw inline; larger images get the info card. */
export const MAX_IMAGE_BYTES = 10_485_760;

/** Extensions listed as images: never read, never indexed. */
export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg']);

/** Extensions that are binary without looking inside: never read, never indexed. */
export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  'pdf', 'zip', 'gz', 'tgz', 'tar', '7z', 'rar',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'mov', 'webm', 'wav', 'ogg',
  'wasm', 'sqlite', 'db', 'exe', 'dll', 'so', 'dylib', 'bin', 'jar', 'class', 'pyc', 'psd',
]);

/** Extensions read as text without a sniff (still subject to the size cap). */
export const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  'md', 'markdown', 'txt', 'json', 'jsonl', 'yaml', 'yml', 'toml', 'csv', 'tsv',
  'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'sh', 'py', 'xml', 'log', 'ini', 'cfg',
]);

/** The lowercased text after the last dot, or null for no extension or a leading-dot-only name. */
export function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

/** True when the extension alone does not decide the class, so the head must be sniffed (D-09). */
export function needsHeadSniff(name: string): boolean {
  const ext = extensionOf(name);
  if (ext === null) return true;
  return !IMAGE_EXTENSIONS.has(ext) && !BINARY_EXTENSIONS.has(ext) && !TEXT_EXTENSIONS.has(ext);
}

/**
 * Decides a file's class from its name, size and (optional) head bytes. Order: image extension, then
 * binary extension, then - only for a name whose extension decides nothing - a NUL byte inside the
 * first SNIFF_BYTES bytes of the head makes it binary, then a size above MAX_TEXT_BYTES makes it large,
 * else text. A zero-byte file is text (or an image/binary by its extension), never binary.
 */
export function classifyFile(input: { name: string; size: number | undefined; head: Uint8Array | undefined }): FileClass {
  const ext = extensionOf(input.name);
  if (ext !== null && IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (ext !== null && BINARY_EXTENSIONS.has(ext)) return 'binary';
  if (input.head !== undefined && needsHeadSniff(input.name) && input.head.subarray(0, SNIFF_BYTES).includes(0)) return 'binary';
  if (input.size !== undefined && input.size > MAX_TEXT_BYTES) return 'large';
  return 'text';
}

/** What discovery records for each internal file or folder (D-11). */
export const INTERNAL_EXCLUSION_REASON = 'GSD internal file, kept out of the index (D-11)';

// GSD's own bookkeeping directly under `.planning/` (D-11). Each name is cited to the GSD 1.18 file that
// writes it. Exact, byte-equal names, and root-only: a file with the same name deeper in the tree is user
// content (a sketch's state.json) and stays visible.
const ROOT_INTERNAL_FILES: ReadonlySet<string> = new Set([
  'state.json', // bin/lib/artifacts.cjs CANONICAL_EXACT
  'skill-manifest.json', // bin/lib/artifacts.cjs CANONICAL_EXACT, bin/lib/init.cjs
  'estimation-calibration.json', // bin/lib/estimate-cli.cjs (executor token samples); planner assumption A4, reversible
  'milestone.lock', // bin/lib/planning-document.cjs
  'STATE.md.lock', // bin/lib/artifacts.cjs
  '.WINDOWS.lock', // bin/lib/broken-windows.cjs
  'WAITING.json', // bin/gsd-tools.cjs
  'agent-history.json', // workflows/execute-plan.md, workflows/resume-project.md
  'current-agent-id.txt', // workflows/execute-plan.md, bin/lib/init.cjs
  'active-workstream', // references/workstream-flag.md
  '.gsd-trace.jsonl', // bin/lib/observability/logger.cjs
  '.mempalace-stage', // commands/gsd/mempalace-capture.md
  '.active-skill', // workflows/import.md
  'STATE.md.bak', // workflows/pr-branch.md
]);

// Whole subtrees GSD writes scratch data into: tmp/ (agent result JSON), async-jobs/
// (workflows/resume-project.md), logs/ (references/universal-anti-patterns.md).
const ROOT_INTERNAL_DIRS: ReadonlySet<string> = new Set(['tmp', 'async-jobs', 'logs']);

/** Root files GSD prefixes `.gsd-` (.gsd-ws-arg, .gsd-allow-shrink, .gsd-outgoing-milestone, ...). */
const GSD_ROOT_PREFIX = '.gsd-';

/** A lock or temp file at any depth (`WINDOWS.md.<pid>.tmp`): the suffix is case-insensitive. */
const LOCK_OR_TMP_SUFFIX = /\.(lock|tmp)$/i;

/**
 * True when a path under `.planning/` is GSD bookkeeping rather than user content (D-11). Position-scoped:
 * the name sets apply only to the root, and only the lock/tmp suffix rule applies at any depth. config.json,
 * HANDOFF.json and .continue-here.md are deliberately never internal.
 */
export function isInternalPath(relUnderPlanning: string, isDirectory: boolean): boolean {
  const segments = relUnderPlanning.split('/');
  const name = segments[segments.length - 1];
  if (segments.length === 1) {
    if (isDirectory) return ROOT_INTERNAL_DIRS.has(name);
    if (ROOT_INTERNAL_FILES.has(name) || name.startsWith(GSD_ROOT_PREFIX)) return true;
  }
  return !isDirectory && LOCK_OR_TMP_SUFFIX.test(name);
}
