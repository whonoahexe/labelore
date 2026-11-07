// Layer A - the workstream scope adapter (D-09, VIEW-20; RESEARCH Pattern 7). A ScopedPlanningFilesystem
// wraps the PARENT port and presents `.planning/workstreams/{name}/` as the scope's own `.planning/`:
// the four names GSD's migration moves (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/) come from the
// workstream folder, a name the workstream folder also holds (its own config.json, quick/) wins over the
// root's, and everything else is the shared root file. The root `workstreams/` folder and the root
// leftovers of the moved names are hidden, so a half-migrated root never leaks into a scope.
//
// It is read-only by construction: it has no write or watch member, and every read delegates to the
// parent port, so the parent's containment (symlink and base-directory confinement) applies unchanged.
// It imports no Node module; the pipeline above it (discovery, assembly, every handler) never learns
// that a scope exists.
import { PathEscapeError } from './types.ts';
import type { DirEntry, FileBytes, FileRead, FsCapabilities, PlanningFilesystem } from './types.ts';

const PLANNING_DIR = '.planning';
const WORKSTREAMS_DIR = 'workstreams';
/** The names a workstream carries instead of the root (what GSD's workstream migration moves). */
const MOVED: ReadonlySet<string> = new Set(['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'phases']);
/** GSD's own workstream-name grammar. */
const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** True for a name GSD would accept for a workstream and that cannot climb out of its folder. The
 * reserved word `none` is the active pointer's "no workstream" value, so it is never a name. */
export function isValidScopeName(name: unknown): name is string {
  return typeof name === 'string' && name !== 'none' && name.length <= 128 && NAME_PATTERN.test(name) && !name.includes('..');
}

function enoent(relPath: string): NodeJS.ErrnoException {
  const err = new Error(`ENOENT: no such file: ${relPath}`) as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

function normalize(relPath: string): string {
  const stripped = relPath.replace(/^\.\//, '').replace(/\/+$/, '');
  return stripped === '' ? '.' : stripped;
}

type Target =
  | { kind: 'passthrough'; real: string }
  /** Always the workstream copy (a moved name). */
  | { kind: 'workstream'; real: string; root: string }
  /** The workstream copy when it exists, else the root file. */
  | { kind: 'either'; real: string; root: string }
  /** Not part of any scope (the root workstreams/ folder). */
  | { kind: 'hidden' };

export class ScopedPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };
  readonly name: string;
  private readonly parent: PlanningFilesystem;
  private readonly base: string;
  /** Where each virtual path the adapter listed or read really lives; realPathOf's exact answers. */
  private readonly origins = new Map<string, string>();
  readHead?: (relPath: string, maxBytes: number) => Promise<Uint8Array>;
  readBytesWithin?: (baseRelDir: string, relPath: string) => Promise<FileBytes>;

  /** `name` must already be validated; anything else throws, so no path is ever built from it. */
  constructor(parent: PlanningFilesystem, name: string) {
    if (!isValidScopeName(name)) throw new Error('ScopedPlanningFilesystem: invalid workstream name');
    this.parent = parent;
    this.name = name;
    this.base = `${PLANNING_DIR}/${WORKSTREAMS_DIR}/${name}`;
    if (parent.readHead) {
      const readHead = parent.readHead.bind(parent);
      this.readHead = async (relPath, maxBytes) => readHead(await this.resolveFile(relPath), maxBytes);
    }
    if (parent.readBytesWithin) {
      const readBytesWithin = parent.readBytesWithin.bind(parent);
      this.readBytesWithin = async (baseRelDir, relPath) =>
        readBytesWithin(await this.resolveFile(baseRelDir), await this.resolveFile(relPath));
    }
  }

  private targetOf(relPath: string): Target {
    const rel = normalize(relPath);
    const segments = rel.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
      if (rel === '.') return { kind: 'passthrough', real: rel };
      throw new PathEscapeError(relPath, rel);
    }
    if (segments[0] !== PLANNING_DIR || segments.length === 1) return { kind: 'passthrough', real: rel };
    const first = segments[1];
    if (first === WORKSTREAMS_DIR) return { kind: 'hidden' };
    const under = segments.slice(1).join('/');
    if (MOVED.has(first)) return { kind: 'workstream', real: `${this.base}/${under}`, root: rel };
    return { kind: 'either', real: `${this.base}/${under}`, root: rel };
  }

  /** The real path a read of `relPath` resolves to; throws ENOENT for a hidden or moved-and-missing path. */
  private async resolveFile(relPath: string): Promise<string> {
    const target = this.targetOf(relPath);
    switch (target.kind) {
      case 'passthrough':
        return target.real;
      case 'hidden':
        throw enoent(relPath);
      case 'workstream':
        this.origins.set(normalize(relPath), target.real);
        return target.real;
      case 'either': {
        const real = (await this.parent.exists(target.real)) ? target.real : target.root;
        this.origins.set(normalize(relPath), real);
        return real;
      }
    }
  }

  async read(relPath: string): Promise<FileRead> {
    return this.parent.read(await this.resolveFile(relPath));
  }

  async exists(relPath: string): Promise<boolean> {
    const rel = normalize(relPath);
    if (rel === PLANNING_DIR) return this.parent.exists(PLANNING_DIR);
    let target: Target;
    try {
      target = this.targetOf(relPath);
    } catch {
      return false;
    }
    if (target.kind === 'hidden') return false;
    if (target.kind === 'either') {
      return (await this.parent.exists(target.real)) || (await this.parent.exists(target.root));
    }
    return this.parent.exists(target.real);
  }

  async list(relDir: string): Promise<DirEntry[]> {
    const rel = normalize(relDir);
    if (rel === PLANNING_DIR) return this.listPlanning();
    const target = this.targetOf(relDir);
    if (target.kind === 'hidden') throw enoent(relDir);
    if (target.kind === 'passthrough') return this.parent.list(target.real);
    if (target.kind === 'workstream') {
      const entries = await this.parent.list(target.real);
      this.recordChildren(rel, entries, target.real);
      return entries;
    }
    // A name the workstream folder may share with the root: merge the two listings, workstream entries first.
    const mine = (await this.parent.exists(target.real)) ? await this.parent.list(target.real) : null;
    const shared = (await this.parent.exists(target.root)) ? await this.parent.list(target.root) : null;
    if (mine === null && shared === null) return this.parent.list(target.root);
    return this.merge(rel, mine ?? [], target.real, shared ?? [], target.root);
  }

  /** `.planning/` itself: the workstream's entries over the root's, with the root's workstreams/ folder
   * and the root copies of the moved names hidden. */
  private async listPlanning(): Promise<DirEntry[]> {
    const rootEntries = (await this.parent.list(PLANNING_DIR)).filter(
      (entry) => entry.name !== WORKSTREAMS_DIR && !MOVED.has(entry.name),
    );
    const mine = (await this.parent.exists(this.base))
      ? (await this.parent.list(this.base)).filter((entry) => entry.name !== WORKSTREAMS_DIR)
      : [];
    return this.merge(PLANNING_DIR, mine, this.base, rootEntries, PLANNING_DIR);
  }

  private merge(
    virtualDir: string,
    mine: DirEntry[],
    mineDir: string,
    shared: DirEntry[],
    sharedDir: string,
  ): DirEntry[] {
    const byName = new Map<string, DirEntry>();
    for (const entry of shared) {
      byName.set(entry.name, entry);
      this.origins.set(`${virtualDir}/${entry.name}`, `${sharedDir}/${entry.name}`);
    }
    for (const entry of mine) {
      byName.set(entry.name, entry);
      this.origins.set(`${virtualDir}/${entry.name}`, `${mineDir}/${entry.name}`);
    }
    return [...byName.values()];
  }

  private recordChildren(virtualDir: string, entries: DirEntry[], realDir: string): void {
    for (const entry of entries) this.origins.set(`${virtualDir}/${entry.name}`, `${realDir}/${entry.name}`);
  }

  /**
   * The real path of a scope path, relative to the project root. Exact for every path the adapter has
   * listed or read (discovery lists and reads every artifact it finds); for a path it has not seen it
   * follows the static rule: a moved name lives in the workstream folder, anything else is the root's.
   */
  realPathOf(relPath: string): string {
    const rel = normalize(relPath);
    const seen = this.origins.get(rel);
    if (seen !== undefined) return seen;
    let target: Target;
    try {
      target = this.targetOf(relPath);
    } catch {
      return rel;
    }
    if (target.kind === 'workstream') return target.real;
    if (target.kind === 'either') return target.root;
    if (target.kind === 'hidden') return rel;
    return target.real;
  }
}
