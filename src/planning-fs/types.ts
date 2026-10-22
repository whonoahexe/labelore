// Layer A — the filesystem boundary (DATA-01). Every layer above this one depends only on this
// interface, never on a concrete implementation. All paths crossing this interface are relative
// to the project root and use forward slashes.

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

export interface FileRead {
  content: string;
  mtimeMs: number;
  size: number;
}

/** The raw bytes of one file, as returned by `PlanningFilesystem.readBytesWithin`. */
export interface FileBytes {
  bytes: Uint8Array;
  mtimeMs: number;
  size: number;
}

/** Thrown when a resolved read/list target lies outside the canonicalized project root, or (for
 * `readBytesWithin`) outside the canonical base directory the read was confined to. */
export class PathEscapeError extends Error {
  readonly relPath: string;
  readonly resolvedTarget: string;

  constructor(relPath: string, resolvedTarget: string) {
    super(`Path escapes project root: ${relPath} resolved to ${resolvedTarget}`);
    this.name = 'PathEscapeError';
    this.relPath = relPath;
    this.resolvedTarget = resolvedTarget;
  }
}

export interface FsCapabilities {
  watch: boolean;
  write: boolean;
}

export interface PlanningFilesystem {
  readonly capabilities: FsCapabilities;
  list(relDir: string): Promise<DirEntry[]>;
  read(relPath: string): Promise<FileRead>;
  exists(relPath: string): Promise<boolean>;
  /**
   * Reads the raw bytes of one regular file, confined to a base directory. Both paths are
   * project-root-relative. The read succeeds only when the file's canonical path lies strictly
   * inside the canonical `baseRelDir`, which must itself lie inside the project root; otherwise it
   * throws PathEscapeError. A directory throws an error whose `code` is 'EISDIR', and a missing path
   * throws the underlying fs error (code 'ENOENT'). It never writes. Optional, like `watch?` and
   * `write?`, so test doubles that implement the interface keep compiling.
   */
  readBytesWithin?(baseRelDir: string, relPath: string): Promise<FileBytes>;
  /** Not implemented by anybody in v1. Declared so a future watcher can be added without a signature change. */
  watch?(relPath: string, onChange: (event: unknown) => void): () => void;
  /** Not implemented by anybody in v1. Declared so future write-back can be added without a signature change. */
  write?(relPath: string, content: string): Promise<void>;
}
