// The single load/refresh seam a future watcher calls (Pattern 3). refresh() runs the whole pass
// and returns a NEW immutable ProjectSnapshot; it never mutates a previously returned snapshot.
// load()/refresh() never throw (D-12) — a failed target check short-circuits to a snapshot
// carrying the failing LoadStatus with project: null and an empty warnings list.
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { LoadStatus, ProjectSnapshot } from './types.ts';
import { discover } from './discovery.ts';
import { parseWithRegistry } from './registry.ts';
import { assembleDomainModel } from './assemble.ts';
import { scanMentions } from './mentions.ts';
import { WarningCollector } from './warnings.ts';

const PLANNING_DIR = '.planning';

export class PlanningRepository {
  private snapshot: ProjectSnapshot | null = null;
  private readonly fs: PlanningFilesystem;
  private readonly rootPath: string;

  constructor(fs: PlanningFilesystem, rootPath: string) {
    this.fs = fs;
    this.rootPath = rootPath;
  }

  async load(): Promise<ProjectSnapshot> {
    return this.refresh();
  }

  private async checkTargetIsGsdProject(): Promise<LoadStatus> {
    try {
      const exists = await this.fs.exists(PLANNING_DIR);
      if (!exists) {
        return {
          status: 'not-a-gsd-project',
          pathChecked: this.rootPath,
          message: `${this.rootPath} exists but contains no .planning/ directory`,
        };
      }
      return { status: 'ok' };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'EACCES' || code === 'EPERM') {
        return {
          status: 'permission-denied',
          pathChecked: this.rootPath,
          message: `Cannot read ${this.rootPath}: permission denied`,
        };
      }
      return {
        status: 'not-a-gsd-project',
        pathChecked: this.rootPath,
        message: `${this.rootPath} could not be inspected: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async refresh(): Promise<ProjectSnapshot> {
    const loadStatus = await this.checkTargetIsGsdProject();
    const readAt = new Date().toISOString();

    if (loadStatus.status !== 'ok') {
      this.snapshot = {
        loadStatus,
        readAt,
        rootPath: this.rootPath,
        project: null,
        warnings: [],
        exclusions: [],
      };
      return this.snapshot;
    }

    const warnings = new WarningCollector();
    const { refs, exclusions } = await discover(this.fs);
    const parsed = await Promise.all(refs.map((ref) => parseWithRegistry(this.fs, ref, warnings)));
    const project = assembleDomainModel(parsed, warnings.all(), this.rootPath);
    // NAV-07 (plan 01-04, D-14): runs after handler dispatch AND after assembly, never alongside
    // discovery — scanMentions() assigns a brand-new MentionIndex every refresh, it never merges into
    // a previously returned snapshot's index.
    project.mentions = scanMentions(parsed);

    this.snapshot = {
      loadStatus,
      readAt,
      rootPath: this.rootPath,
      project,
      warnings: warnings.all(),
      exclusions,
    };
    return this.snapshot;
  }

  getSnapshot(): ProjectSnapshot {
    if (!this.snapshot) throw new Error('PlanningRepository.getSnapshot() called before load()');
    return this.snapshot;
  }
}
