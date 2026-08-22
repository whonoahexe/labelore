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

export interface FsCapabilities {
  watch: boolean;
  write: boolean;
}

export interface PlanningFilesystem {
  readonly capabilities: FsCapabilities;
  list(relDir: string): Promise<DirEntry[]>;
  read(relPath: string): Promise<FileRead>;
  exists(relPath: string): Promise<boolean>;
  /** Not implemented by anybody in v1. Declared so a future watcher can be added without a signature change. */
  watch?(relPath: string, onChange: (event: unknown) => void): () => void;
  /** Not implemented by anybody in v1. Declared so future write-back can be added without a signature change. */
  write?(relPath: string, content: string): Promise<void>;
}
