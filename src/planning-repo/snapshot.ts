// The single load/refresh seam a future watcher calls (Pattern 3). refresh() runs the whole pass
// and returns a NEW immutable ProjectSnapshot; it never mutates a previously returned snapshot.
// load()/refresh() never throw (D-12) — a failed target check short-circuits to a snapshot
// carrying the failing LoadStatus with project: null and an empty warnings list.
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { LoadStatus, ParsedArtifact, ProjectSnapshot } from './types.ts';
import { discover } from './discovery.ts';
import { parseWithRegistry } from './registry.ts';
import { assembleDomainModel } from './assemble.ts';
import { scanMentions } from './mentions.ts';
import { WarningCollector } from './warnings.ts';
import { loadThemeTokens } from './theme-tokens.ts';
import type { ThemeLoader } from './theme-tokens.ts';

const PLANNING_DIR = '.planning';

export class PlanningRepository {
  private snapshot: ProjectSnapshot | null = null;
  private readonly fs: PlanningFilesystem;
  private readonly rootPath: string;
  private readonly loadTheme: ThemeLoader | null;

  /** `options.loadTheme` is the project-stylesheet token loader (quick-261002-li5): it defaults to
   * the bounded read-only `loadThemeTokens`, a test can inject its own, and `null` switches the
   * enrichment off. */
  constructor(fs: PlanningFilesystem, rootPath: string, options: { loadTheme?: ThemeLoader | null } = {}) {
    this.fs = fs;
    this.rootPath = rootPath;
    this.loadTheme = options.loadTheme === undefined ? loadThemeTokens : options.loadTheme;
  }

  /** Attaches `structured.uiSpecTheme` to every artifact that carries `structured.uiSpec`, and only
   * to those, when the target project's stylesheet resolves. Returns `parsed` untouched otherwise,
   * so a project without a stylesheet produces a byte-identical snapshot. Never throws (D-12). */
  private async withUiSpecTheme(parsed: ParsedArtifact[]): Promise<ParsedArtifact[]> {
    if (!this.loadTheme) return parsed;
    const carriesUiSpec = (p: ParsedArtifact): boolean => {
      const uiSpec = p.structured?.uiSpec;
      return typeof uiSpec === 'object' && uiSpec !== null;
    };
    if (!parsed.some(carriesUiSpec)) return parsed;
    let tokens: Awaited<ReturnType<ThemeLoader>>;
    try {
      tokens = await this.loadTheme(this.fs);
    } catch {
      tokens = null;
    }
    if (!tokens) return parsed;
    return parsed.map((p) => (carriesUiSpec(p) ? { ...p, structured: { ...p.structured, uiSpecTheme: tokens } } : p));
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
    const parsedRaw = await Promise.all(refs.map((ref) => parseWithRegistry(this.fs, ref, warnings)));
    const parsed = await this.withUiSpecTheme(parsedRaw);
    // The live collector itself, not a warnings.all() snapshot taken here — resolveCrossReferences()
    // runs inside assembleDomainModel and may add a warning (e.g. a malformed plan depends_on) that
    // must be visible to the warnings.all() read below, after assembly returns.
    const project = assembleDomainModel(parsed, warnings, this.rootPath);
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
