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

/** The lowercased text after the last dot, or null for no extension or a leading-dot-only name. */
export function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

/** Decides a file's class from its name, size and (optional) head bytes. */
export function classifyFile(input: { name: string; size: number | undefined; head: Uint8Array | undefined }): FileClass {
  const ext = extensionOf(input.name);
  if (ext !== null && IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'text';
}

/** What discovery records for each internal file or folder (D-11). */
export const INTERNAL_EXCLUSION_REASON = 'GSD internal file, kept out of the index (D-11)';

const ROOT_INTERNAL_FILES: ReadonlySet<string> = new Set(['state.json', 'milestone.lock']);

/** True when a path under `.planning/` is GSD bookkeeping rather than user content. Position-scoped. */
export function isInternalPath(relUnderPlanning: string, isDirectory: boolean): boolean {
  void isDirectory;
  const segments = relUnderPlanning.split('/');
  return segments.length === 1 && ROOT_INTERNAL_FILES.has(segments[0]);
}
