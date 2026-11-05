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

// --- the concern entries the panel and the head share -----------------------------------------------------

/** The Security section's key: it leads every list of concern counts (UI-SPEC sections 2 and 3). */
export const SECURITY_KEY = 'security-considerations';

/** The template heading of each known concern section, for a section the document lacks (shown as 0). */
export const CONCERN_LABELS: ReadonlyMap<string, string> = new Map([
  ['tech-debt', 'Tech Debt'],
  ['known-bugs', 'Known Bugs'],
  [SECURITY_KEY, 'Security Considerations'],
  ['performance-bottlenecks', 'Performance Bottlenecks'],
  ['fragile-areas', 'Fragile Areas'],
  ['scaling-limits', 'Scaling Limits'],
  ['dependencies-at-risk', 'Dependencies at Risk'],
  ['missing-critical-features', 'Missing Critical Features'],
  ['test-coverage-gaps', 'Test Coverage Gaps'],
]);

export interface ConcernEntry {
  /** The known section key, or null for a section the template does not have. */
  key: string | null;
  heading: string;
  count: number;
}

export interface ConcernEntries {
  total: number;
  /** Security first, then the rest in document order, then each known section the document lacks as 0. */
  entries: ConcernEntry[];
}

/** A concern section with the concerns the lift kept for it (10-12): the same order and counts the head reads. */
export interface ConcernSectionEntry extends ConcernEntry {
  items: unknown[];
}

export interface ConcernSections {
  total: number;
  entries: ConcernSectionEntry[];
}

/** The per-section counts and items out of a `structured.codebase.concerns` lift, tolerating any shape; null when
 * the lift holds no section. One rule for the Concerns panel and the head: Security first, a missing known
 * section a zero, the total the lift's own (else the sum). */
export function concernSections(concerns: unknown): ConcernSections | null {
  if (!isRecord(concerns)) return null;
  const entries: ConcernSectionEntry[] = (Array.isArray(concerns.sections) ? concerns.sections : [])
    .filter(isRecord)
    .flatMap((section) => {
      const heading = typeof section.heading === 'string' ? section.heading.trim() : '';
      const count = section.count;
      if (heading === '' || typeof count !== 'number' || !Number.isFinite(count) || count < 0) return [];
      return [
        {
          key: typeof section.key === 'string' ? section.key : null,
          heading,
          count,
          items: Array.isArray(section.items) ? section.items : [],
        },
      ];
    });
  const seen = new Set(entries.map((entry) => entry.key));
  for (const key of Array.isArray(concerns.missing) ? concerns.missing : []) {
    if (typeof key !== 'string' || seen.has(key)) continue;
    const heading = CONCERN_LABELS.get(key);
    if (heading !== undefined) entries.push({ key, heading, count: 0, items: [] });
  }
  if (entries.length === 0) return null;
  const ordered = [
    ...entries.filter((entry) => entry.key === SECURITY_KEY),
    ...entries.filter((entry) => entry.key !== SECURITY_KEY),
  ];
  const sum = entries.reduce((total, entry) => total + entry.count, 0);
  const total = typeof concerns.total === 'number' && Number.isFinite(concerns.total) ? concerns.total : sum;
  return { total, entries: ordered };
}

/** The per-section counts alone, for the head. */
export function concernEntries(concerns: unknown): ConcernEntries | null {
  const found = concernSections(concerns);
  if (found === null) return null;
  return { total: found.total, entries: found.entries.map(({ key, heading, count }) => ({ key, heading, count })) };
}

// --- the next step -----------------------------------------------------------------------------------------

/** GSD's suggested next command and why (D-06). Both strings are constants: no file text ever reaches one,
 * which is what makes the Copy command button safe (T-10-17). */
export interface NextStep {
  command: string;
  reason: string;
}

export const COMMAND_MAP_CODEBASE = '/gsd-map-codebase';
export const COMMAND_INGEST_DOCS = '/gsd-ingest-docs';
export const COMMAND_NEW_PROJECT = '/gsd-new-project';

const STEP_FAST: NextStep = Object.freeze({
  command: COMMAND_MAP_CODEBASE,
  reason: 'Finish the map. A fast map is enough to look around, but project setup needs the complete one.',
});
const STEP_PARTIAL: NextStep = Object.freeze({
  command: COMMAND_MAP_CODEBASE,
  reason:
    'This map is partial. Some of the seven documents are missing, so map the codebase before setting the project up.',
});
const STEP_INGEST: NextStep = Object.freeze({
  command: COMMAND_INGEST_DOCS,
  reason: 'Existing decision or spec documents were found. Import them before setting the project up.',
});
const STEP_NEW_PROJECT: NextStep = Object.freeze({
  command: COMMAND_NEW_PROJECT,
  reason: 'The map is complete. Next, set the project up.',
});

/** The four steps there are (UI-SPEC section 3); `nextStep` only ever returns one of these. The `--fast` form
 * of the map command is never one of them (D-06). */
export const NEXT_STEPS: readonly NextStep[] = Object.freeze([STEP_FAST, STEP_PARTIAL, STEP_INGEST, STEP_NEW_PROJECT]);

/**
 * onboard-projection's rules as UI-SPEC section 3 narrows them: a fast or partial map goes back to
 * `/gsd-map-codebase` with its own reason; only a complete map moves on, to `/gsd-ingest-docs` when decision or
 * spec documents are visible in `.planning/` and `/gsd-new-project` otherwise. "The map is complete" is thus
 * never shown for a fast or partial map. An unrecognised readiness falls to the partial step.
 */
export function nextStep(readiness: MapReadiness, hasDocCandidates: boolean): NextStep {
  if (readiness === 'complete') return hasDocCandidates ? STEP_INGEST : STEP_NEW_PROJECT;
  if (readiness === 'fast') return STEP_FAST;
  return STEP_PARTIAL;
}

const PLANNING_PREFIX = '.planning/';
const DOC_SEGMENTS: ReadonlySet<string> = new Set(['adr', 'adrs', 'prd', 'prds', 'spec', 'specs', 'rfc', 'rfcs']);
const DOC_TOKENS: readonly string[] = ['adr', 'prd', 'spec', 'rfc'];

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

/** GSD's `(^|[-_ ])(ADR|PRD|SPEC|RFC)([-_ ]|\.)`, case-insensitive, as a character scan over a lower-cased name. */
function hasDocToken(lower: string): boolean {
  for (const token of DOC_TOKENS) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(token, from);
      if (at < 0) break;
      const before = at === 0 ? '-' : lower[at - 1];
      const after = lower[at + token.length];
      if ((before === '-' || before === '_' || before === ' ') && (after === '-' || after === '_' || after === ' ' || after === '.')) {
        return true;
      }
      from = at + 1;
    }
  }
  return false;
}

/** GSD's `^\d{4}[-_].+\.md$` over a lower-cased name that already ends in `.md`. */
function startsWithYearSeparator(lower: string): boolean {
  if (lower.length < 4 + 1 + 1 + 3) return false;
  for (let i = 0; i < 4; i += 1) if (!isDigit(lower[i])) return false;
  return lower[4] === '-' || lower[4] === '_';
}

/** A phase's own `NN-SPEC.md` (digits and dots, then `-spec.md`): an ordinary GSD file, not an imported document. */
function isPhaseSpecName(lower: string): boolean {
  const suffix = '-spec.md';
  if (!lower.endsWith(suffix) || lower.length === suffix.length) return false;
  for (const ch of lower.slice(0, lower.length - suffix.length)) if (!isDigit(ch) && ch !== '.') return false;
  return true;
}

function isPlanningDocPath(path: string): boolean {
  if (!path.startsWith(PLANNING_PREFIX)) return false;
  const segments = path.slice(PLANNING_PREFIX.length).split('/');
  if (segments[0] === 'codebase') return false;
  const lower = (segments[segments.length - 1] ?? '').toLowerCase();
  if (!lower.endsWith('.md') || lower === 'requirements.md' || isPhaseSpecName(lower)) return false;
  if (segments.slice(0, -1).some((segment) => DOC_SEGMENTS.has(segment.toLowerCase()))) return true;
  return hasDocToken(lower) || startsWithYearSeparator(lower);
}

/**
 * Whether ADR, PRD, SPEC or RFC documents are visible in the target's `.planning/` outside `codebase/`
 * (UI-SPEC open item 2, RESEARCH A6). GSD's own name and segment rules, mirrored over markdown Labelore can
 * see: a name holding ADR, PRD, SPEC or RFC as a whole token, a name starting with four digits and a
 * separator, or a directory segment adr, adrs, prd, prds, spec, specs, rfc or rfcs. `REQUIREMENTS.md` and a
 * phase's `NN-SPEC.md` are ordinary GSD files and do not count. Character scans only: no regular expression
 * is built from, or run over, file text.
 */
export function hasPlanningDocCandidates(artifacts: readonly { path: string }[]): boolean {
  return artifacts.some((artifact) => typeof artifact.path === 'string' && isPlanningDocPath(artifact.path));
}

// --- the map-only head --------------------------------------------------------------------------------------

export interface CodebaseHeadChip {
  name: string;
  version: string | null;
  /** The Stack lift's group (primary, secondary, runtime, core, testing, build-dev). */
  group: string;
}

export interface CodebaseHeadStack {
  languages: CodebaseHeadChip[];
  runtime: CodebaseHeadChip[];
  frameworks: CodebaseHeadChip[];
}

/** What the "Mapped, not started" head needs from the map's documents: the Stack lift's chips and the
 * Concerns lift's counts (nothing new is parsed for the head). Set only for a map-only project. */
export interface CodebaseHead {
  stack: CodebaseHeadStack | null;
  concerns: ConcernEntries | null;
  /** GSD's suggested next command and its reason line (D-06). */
  nextStep: NextStep;
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
  /** The map-only head's content, or null for a project with a roadmap (D-05). */
  head: CodebaseHead | null;
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

function chipsOf(value: unknown): CodebaseHeadChip[] {
  return (Array.isArray(value) ? value : []).filter(isRecord).flatMap((chip) => {
    const name = typeof chip.name === 'string' ? chip.name.trim() : '';
    if (name === '') return [];
    return [{ name, version: stringOrNull(chip.version), group: typeof chip.group === 'string' ? chip.group : '' }];
  });
}

/** The head's Stack chips out of the Stack artifact's lift, or null when it carries none. */
function readHeadStack(structured: unknown): CodebaseHeadStack | null {
  const codebase = isRecord(structured) ? structured.codebase : null;
  const stack = isRecord(codebase) && isRecord(codebase.stack) ? codebase.stack : null;
  if (stack === null) return null;
  const read = {
    languages: chipsOf(stack.languages),
    runtime: chipsOf(stack.runtime),
    frameworks: chipsOf(stack.frameworks),
  };
  return read.languages.length + read.runtime.length + read.frameworks.length > 0 ? read : null;
}

function readHeadConcerns(structured: unknown): ConcernEntries | null {
  const codebase = isRecord(structured) ? structured.codebase : null;
  return isRecord(codebase) ? concernEntries(codebase.concerns) : null;
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
    const mapOnly = projectMapState(artifacts).mapOnly;
    const stackArtifact = artifacts.find((candidate) => candidate.path === `${MAP_DIR}STACK.md`);
    const concernsArtifact = artifacts.find((candidate) => candidate.path === `${MAP_DIR}CONCERNS.md`);
    return {
      panels,
      mappedCount: present.length,
      readiness: mapReadiness(present),
      mappedAt,
      commit,
      activeKey: active.key,
      mapOnly,
      head: mapOnly
        ? {
            stack: stackArtifact === undefined ? null : readHeadStack(stackArtifact.structured),
            concerns: concernsArtifact === undefined ? null : readHeadConcerns(concernsArtifact.structured),
            nextStep: nextStep(mapReadiness(present), hasPlanningDocCandidates(artifacts)),
          }
        : null,
    };
  } catch {
    return null;
  }
}
