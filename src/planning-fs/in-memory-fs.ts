// Layer A — Map-backed implementation (D-08). Proves the PlanningFilesystem seam by construction:
// running the same fixtures through this and LocalFsPlanningFilesystem must produce byte-identical
// snapshots. Also makes permission-denied / unreadable-file hostile cases authorable without
// committing awkward files to git.
//
// This file intentionally never imports the Node filesystem module — local-fs.ts is the sole file
// under src/ that does. The real-directory-walking loader that once lived here as a static
// fromDirectory() method now lives at test/helpers/from-directory.ts, since it existed only to
// support D-08's fs-equivalence test fixture loading, not this class's own runtime behavior.
import { PathEscapeError } from './types.ts';
import type { DirEntry, FileBytes, FileRead, FsCapabilities, PlanningFilesystem } from './types.ts';

function normalizeRelPath(relPath: string): string {
  // Strip a genuine "./" prefix only — NOT a bare leading dot, which would corrupt a real
  // dotfile/dotdir name like ".planning" (a naive `/^\.\/?/ ` regex does exactly that).
  const stripped = relPath.replace(/^\.\//, '').replace(/\/+$/, '');
  return stripped === '' ? '.' : stripped;
}

function bytesOf(content: string | Uint8Array): Uint8Array {
  return typeof content === 'string' ? new Uint8Array(Buffer.from(content, 'utf8')) : content;
}

function byteLengthOf(content: string | Uint8Array): number {
  return typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
}

export class InMemoryPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };

  private readonly files: Map<string, string | Uint8Array>;
  private readonly mtimeMs: number;

  /** A file's content is text (a string) or raw bytes (a Uint8Array, for images and binaries). */
  constructor(contents: Record<string, string | Uint8Array>, mtimeMs = 0) {
    this.files = new Map(Object.entries(contents).map(([p, c]) => [normalizeRelPath(p), c]));
    this.mtimeMs = mtimeMs;
  }

  async list(relDir: string): Promise<DirEntry[]> {
    const dir = normalizeRelPath(relDir);
    const prefix = dir === '.' ? '' : `${dir}/`;
    const seen = new Map<string, DirEntry>();
    for (const [filePath, content] of this.files) {
      if (dir !== '.' && !filePath.startsWith(prefix)) continue;
      const rest = dir === '.' ? filePath : filePath.slice(prefix.length);
      if (rest === '') continue;
      const [first, ...restParts] = rest.split('/');
      const isDirectory = restParts.length > 0;
      if (!seen.has(first)) {
        seen.set(first, isDirectory ? { name: first, isDirectory } : { name: first, isDirectory, size: byteLengthOf(content) });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async read(relPath: string): Promise<FileRead> {
    const key = normalizeRelPath(relPath);
    const content = this.files.get(key);
    if (content === undefined) {
      const err = new Error(`ENOENT: no such file: ${relPath}`) as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return { content: typeof content === 'string' ? content : new TextDecoder().decode(content), mtimeMs: this.mtimeMs, size: byteLengthOf(content) };
  }

  async readHead(relPath: string, maxBytes: number): Promise<Uint8Array> {
    const key = normalizeRelPath(relPath);
    const content = this.files.get(key);
    if (content === undefined) {
      const err = new Error(`ENOENT: no such file: ${relPath}`) as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return bytesOf(content).slice(0, Math.max(0, maxBytes));
  }

  async readBytesWithin(baseRelDir: string, relPath: string): Promise<FileBytes> {
    const base = normalizeRelPath(baseRelDir);
    const key = normalizeRelPath(relPath);
    const segments = key.split('/');
    if (segments.some((s) => s === '' || s === '.' || s === '..') || !key.startsWith(`${base}/`)) {
      throw new PathEscapeError(relPath, key);
    }
    const content = this.files.get(key);
    if (content !== undefined) {
      const bytes = bytesOf(content).slice();
      return { bytes, mtimeMs: this.mtimeMs, size: bytes.length };
    }
    const prefix = `${key}/`;
    const code = [...this.files.keys()].some((p) => p.startsWith(prefix)) ? 'EISDIR' : 'ENOENT';
    const err = new Error(`${code}: ${relPath}`) as NodeJS.ErrnoException;
    err.code = code;
    throw err;
  }

  async exists(relPath: string): Promise<boolean> {
    const key = normalizeRelPath(relPath);
    if (this.files.has(key)) return true;
    // Also true for synthesized directories (a prefix of some stored file path).
    const prefix = `${key}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) return true;
    }
    return key === '.';
  }
}
