// The Codebase page's server-side join (Phase 10, 10-08, VIEW-13, sketch 042 A): what a map document's page
// needs from the other six - which of the seven documents exist and where each opens, the number each panel
// list entry shows, when the map was made (the newest per-document stamp, RESEARCH A3), the commit that
// document names, GSD's map readiness, and whether the project holds nothing but the map.
//
// Pure: it reads the cached `ProjectPresentation`, never a file, and imports nothing from Node. It builds no
// regular expression from document text and never throws on presentation data. A panel's address exists only
// when the document is in the presentation (the artifact's own key), so the page never links to a file that is
// not there. The context carries no freshness field on purpose: the commit is text only, with no comparison
// against any checkout (the read-only filesystem cannot make one, and the page does not claim a map is fresh or
// stale).
import { CODEBASE_MAP_FILES, FAST_MAP_FILES } from '../planning-repo/codebase-files.ts';
import type { CodebaseMapFile } from '../planning-repo/codebase-files.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { projectMapState } from './project-map-state.ts';

const MAP_DIR = '.planning/codebase/';

export type CodebasePanelKey =
  | 'stack'
  | 'architecture'
  | 'structure'
  | 'conventions'
  | 'testing'
  | 'integrations'
  | 'concerns';

export interface CodebasePanelDefinition {
  key: CodebasePanelKey;
  label: string;
  file: CodebaseMapFile;
}

/** The seven panels in the page's fixed order (UI-SPEC section 2), not the mapper's file order. */
export const CODEBASE_PANELS: readonly CodebasePanelDefinition[] = [
  { key: 'stack', label: 'Stack', file: 'STACK.md' },
  { key: 'architecture', label: 'Architecture', file: 'ARCHITECTURE.md' },
  { key: 'structure', label: 'Structure', file: 'STRUCTURE.md' },
  { key: 'conventions', label: 'Conventions', file: 'CONVENTIONS.md' },
  { key: 'testing', label: 'Testing', file: 'TESTING.md' },
  { key: 'integrations', label: 'Integrations', file: 'INTEGRATIONS.md' },
  { key: 'concerns', label: 'Concerns', file: 'CONCERNS.md' },
];

/** GSD's `map_readiness`: `complete` when all seven documents are present, `fast` when the four core ones are
 * (stack, integrations, architecture, structure) but not all seven, otherwise `none`. */
export type MapReadiness = 'complete' | 'fast' | 'none';

/** GSD's rule (onboard-projection.cjs), exactly: the names are the map documents' file names. */
export function mapReadiness(present: readonly string[]): MapReadiness {
  const has = new Set(present);
  if (CODEBASE_MAP_FILES.every((name) => has.has(name))) return 'complete';
  if (FAST_MAP_FILES.every((name) => has.has(name))) return 'fast';
  return 'none';
}

/** One entry of the panel list. `url` is the document's address, or null for a document the folder lacks. */
export interface CodebasePanelEntry {
  key: CodebasePanelKey;
  label: string;
  file: CodebaseMapFile;
  url: string | null;
  mapped: boolean;
  /** The number the list shows (languages plus frameworks, concerns, ...), or null until the document's lift sets it. */
  keyNumber: number | null;
  /** This document's own stamp day (YYYY-MM-DD), or null. */
  mappedAt: string | null;
}

export interface CodebaseContext {
  /** Seven entries in the page's order. */
  panels: CodebasePanelEntry[];
  mappedCount: number;
  readiness: MapReadiness;
  /** The newest stamp day among the documents (RESEARCH A3), or null when none carries one. */
  mappedAt: string | null;
  /** The commit (first seven characters) the newest-dated document names, or null. Text only. */
  commit: string | null;
  /** The panel the opened document belongs to. */
  activeKey: CodebasePanelKey;
  /** True when the project holds a map and nothing else (no roadmap, no phase). */
  mapOnly: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

interface PanelRead {
  keyNumber: number | null;
  mappedAt: string | null;
  commit: string | null;
}

/** The stamp and key number out of an artifact's `structured.codebase`, tolerating any shape. */
function readPanel(structured: unknown): PanelRead {
  const codebase = isRecord(structured) ? structured.codebase : null;
  if (!isRecord(codebase)) return { keyNumber: null, mappedAt: null, commit: null };
  const stamp = isRecord(codebase.stamp) ? codebase.stamp : null;
  const key = codebase.keyNumber;
  return {
    keyNumber: typeof key === 'number' && Number.isFinite(key) ? key : null,
    mappedAt: stamp ? stringOrNull(stamp.mappedAt) : null,
    commit: stamp ? stringOrNull(stamp.commit) : null,
  };
}

/**
 * The page context for the map document at `activePath`, or null when that path is not one of the seven.
 * The newest stamp wins "Mapped {date}" (a day compares as text); on a tie the first document in the page's
 * order that also names a commit supplies the commit chip, so a commit is never taken from a document older
 * than the date shown.
 */
export function buildCodebaseContext(
  presentation: ProjectPresentation,
  activePath: string,
): CodebaseContext | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const active = CODEBASE_PANELS.find((panel) => `${MAP_DIR}${panel.file}` === activePath);
    if (active === undefined) return null;

    const reads = new Map<CodebasePanelKey, PanelRead>();
    const panels: CodebasePanelEntry[] = CODEBASE_PANELS.map((definition) => {
      const artifact = artifacts.find((candidate) => candidate.path === `${MAP_DIR}${definition.file}`);
      if (artifact === undefined) {
        return { ...definition, url: null, mapped: false, keyNumber: null, mappedAt: null };
      }
      const read = readPanel(artifact.structured);
      reads.set(definition.key, read);
      return {
        ...definition,
        url: artifact.key,
        mapped: true,
        keyNumber: read.keyNumber,
        mappedAt: read.mappedAt,
      };
    });

    let mappedAt: string | null = null;
    for (const panel of panels) {
      if (panel.mappedAt !== null && (mappedAt === null || panel.mappedAt > mappedAt)) mappedAt = panel.mappedAt;
    }
    let commit: string | null = null;
    if (mappedAt !== null) {
      for (const panel of panels) {
        if (panel.mappedAt !== mappedAt) continue;
        const named = reads.get(panel.key)?.commit ?? null;
        if (named !== null) {
          commit = named;
          break;
        }
      }
    }

    const present = panels.filter((panel) => panel.mapped).map((panel) => panel.file);
    return {
      panels,
      mappedCount: present.length,
      readiness: mapReadiness(present),
      mappedAt,
      commit,
      activeKey: active.key,
      mapOnly: projectMapState(artifacts).mapOnly,
    };
  } catch {
    return null;
  }
}
