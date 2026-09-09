// Layer A — Map-backed implementation (D-08). Proves the PlanningFilesystem seam by construction:
// running the same fixtures through this and LocalFsPlanningFilesystem must produce byte-identical
// snapshots. Also makes permission-denied / unreadable-file hostile cases authorable without
// committing awkward files to git.
//
// This file intentionally never imports the Node filesystem module — local-fs.ts is the sole file
// under src/ that does. The real-directory-walking loader that once lived here as a static
// fromDirectory() method now lives at test/helpers/from-directory.ts, since it existed only to
// support D-08's fs-equivalence test fixture loading, not this class's own runtime behavior.
import type { DirEntry, FileRead, FsCapabilities, PlanningFilesystem } from './types.ts';

function normalizeRelPath(relPath: string): string {
  // Strip a genuine "./" prefix only — NOT a bare leading dot, which would corrupt a real
  // dotfile/dotdir name like ".planning" (a naive `/^\.\/?/ ` regex does exactly that).
  const stripped = relPath.replace(/^\.\//, '').replace(/\/+$/, '');
  return stripped === '' ? '.' : stripped;
}

export class InMemoryPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };

  private readonly files: Map<string, string>;
  private readonly mtimeMs: number;

  constructor(contents: Record<string, string>, mtimeMs = 0) {
    this.files = new Map(Object.entries(contents).map(([p, c]) => [normalizeRelPath(p), c]));
    this.mtimeMs = mtimeMs;
  }

  async list(relDir: string): Promise<DirEntry[]> {
    const dir = normalizeRelPath(relDir);
    const prefix = dir === '.' ? '' : `${dir}/`;
    const seen = new Map<string, boolean>();
    for (const filePath of this.files.keys()) {
      if (dir !== '.' && !filePath.startsWith(prefix)) continue;
      const rest = dir === '.' ? filePath : filePath.slice(prefix.length);
      if (rest === '') continue;
      const [first, ...restParts] = rest.split('/');
      const isDirectory = restParts.length > 0;
      if (!seen.has(first)) seen.set(first, isDirectory);
    }
    return [...seen.entries()]
      .map(([name, isDirectory]) => ({ name, isDirectory }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async read(relPath: string): Promise<FileRead> {
    const key = normalizeRelPath(relPath);
    const content = this.files.get(key);
    if (content === undefined) {
      const err = new Error(`ENOENT: no such file: ${relPath}`) as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return { content, mtimeMs: this.mtimeMs, size: Buffer.byteLength(content, 'utf8') };
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
