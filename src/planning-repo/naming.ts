// GSD's filename and directory grammar — transcribed from gsd-core's own runtime parsing code,
// never reverse-engineered from examples. This is the ONE module every filename/directory regex
// in this codebase lives in (DATA-02's "single grammar module" rule) — discovery.ts is the only
// caller, and callers dispatch on the RESULT of these functions, never on file content.
//
// Every regex below is cited to the gsd-core source file and exported symbol it was transcribed
// from, per the phase's traceability rule.

export type PhaseNamingMode = 'sequential' | 'custom';

export interface PhaseDirNameMatch {
  matched: true;
  projectCode: string | null;
  /** Phase number kept exactly as written in the directory name — never reformatted, never parsed as an int. */
  number: string;
  slug: string;
  /** false in custom mode: `number` is an arbitrary uppercase string, not numerically orderable. */
  numeric: boolean;
}
export interface NameNoMatch {
  matched: false;
}
export type PhaseDirNameResult = PhaseDirNameMatch | NameNoMatch;

// gsd-core/bin/lib/phase-id.cjs, PHASE_NUMBER_TOKEN_SOURCE:
//   const PHASE_NUMBER_TOKEN_SOURCE = '\\d+[A-Z]?(?:\\.\\d+)*';
// Matches: 1, 01, 12, 12A, 2.1, 3.2.1 — digits, an optional single-letter variant suffix, and
// optional dotted sub-phase segments (decimal phases for urgent insertions).
const PHASE_NUMBER_TOKEN_SOURCE = '\\d+[A-Z]?(?:\\.\\d+)*';

// gsd-core/bin/lib/phase-id.cjs, PROJECT_CODE_PREFIX_CAPTURE_RE_I:
//   const PROJECT_CODE_PREFIX_CAPTURE_RE_I = /^([A-Z][A-Z0-9_]*)-(\d.*)/i;
// A project code is an uppercase-leading alphanumeric/underscore token immediately followed by a
// hyphen and a digit. Opt-in via config.project_code; neither sampled project uses it.
const PROJECT_CODE_SOURCE = '[A-Z][A-Z0-9_]*';

// gsd-core/bin/lib/phase.cjs (cmdPhaseAdd) — full phase directory name assembly, sequential mode
// (config.phase_naming === "sequential", the default and only mode observed in both real
// projects sampled by GSD-DOMAIN.md's research):
//   dirName = `${prefix}${String(newPhaseId).padStart(2, '0')}-${slug}`
// Recommended parser regex (GSD-DOMAIN.md "Naming Conventions and Parsing Rules" § Phase
// directory naming): ^(?:([A-Z][A-Z0-9_]*)-)?(\d+[A-Z]?(?:\.\d+)*)-(.+)$
const SEQUENTIAL_PHASE_DIR_RE = new RegExp(`^(?:(${PROJECT_CODE_SOURCE})-)?(${PHASE_NUMBER_TOKEN_SOURCE})-(.+)$`);

// gsd-core/bin/lib/phase.cjs (cmdPhaseAdd) custom mode:
//   dirName = `${prefix}${customId || slug.toUpperCase()}-${slug}`
// customId is an arbitrary uppercase string minted via --id; no numeric ordering applies.
const CUSTOM_PHASE_DIR_RE = new RegExp(`^(?:(${PROJECT_CODE_SOURCE})-)?([A-Z0-9_]+)-(.+)$`);

/**
 * Parses a `phases/` directory basename into project code, phase number, and slug.
 *
 * `mode` mirrors `config.json`'s `phase_naming` key (default `'sequential'` when the key is
 * absent — the default and only mode GSD-DOMAIN.md's research observed in real projects).
 * In `'custom'` mode the phase id is an arbitrary uppercase string, not a number — the result's
 * `numeric` flag reflects this so callers never attempt numeric ordering on a custom id.
 */
export function parsePhaseDirName(dirName: string, mode: PhaseNamingMode = 'sequential'): PhaseDirNameResult {
  if (mode === 'custom') {
    const m = dirName.match(CUSTOM_PHASE_DIR_RE);
    if (!m) return { matched: false };
    return { matched: true, projectCode: m[1] ?? null, number: m[2], slug: m[3], numeric: false };
  }
  const m = dirName.match(SEQUENTIAL_PHASE_DIR_RE);
  if (!m) return { matched: false };
  return { matched: true, projectCode: m[1] ?? null, number: m[2], slug: m[3], numeric: true };
}

export interface PlanFileNameMatch {
  matched: true;
  phase: string;
  plan: string;
  kind: 'plan' | 'summary';
}
export type PlanFileNameResult = PlanFileNameMatch | NameNoMatch;

// GSD-DOMAIN.md "Plan/artifact file naming inside a phase directory", transcribed from the
// on-disk convention `gsd-core` itself relies on (confirmed against `roadmap analyze` output):
//   ^(\d+[A-Z]?(?:\.\d+)*)-(\d{2,})-(PLAN|SUMMARY)\.md$
const PLAN_FILE_RE = new RegExp(`^(${PHASE_NUMBER_TOKEN_SOURCE})-(\\d{2,})-(PLAN|SUMMARY)\\.md$`);

export function parsePlanFileName(fileName: string): PlanFileNameResult {
  const m = fileName.match(PLAN_FILE_RE);
  if (!m) return { matched: false };
  return { matched: true, phase: m[1], plan: m[2], kind: m[3] === 'PLAN' ? 'plan' : 'summary' };
}

export interface PhaseArtifactNameMatch {
  matched: true;
  phase: string;
  /** Open token — CONTEXT, RESEARCH, VALIDATION, an unrecognized ad-hoc name like ROUTE-INVENTORY, ... */
  artifact: string;
}
export type PhaseArtifactNameResult = PhaseArtifactNameMatch | NameNoMatch;

// GSD-DOMAIN.md "Plan/artifact file naming inside a phase directory", second pattern —
// deliberately permissive on the artifact token; GSD does not enumerate a closed set at the
// filesystem level:
//   ^(\d+[A-Z]?(?:\.\d+)*)-([A-Z][A-Z-]*)\.md$
const PHASE_ARTIFACT_RE = new RegExp(`^(${PHASE_NUMBER_TOKEN_SOURCE})-([A-Z][A-Z-]*)\\.md$`);

export function parsePhaseArtifactName(fileName: string): PhaseArtifactNameResult {
  const m = fileName.match(PHASE_ARTIFACT_RE);
  if (!m) return { matched: false };
  return { matched: true, phase: m[1], artifact: m[2] };
}

export interface QuickDirNameMatch {
  matched: true;
  /** YYMMDD, as written — not Y2.1K-safe past 2099, but that is GSD's own choice. */
  date: string;
  /** Base-36, 2-second-resolution time-of-day encoding — opaque; never decoded into a clock time. */
  timeToken: string;
  slug: string;
}
export type QuickDirNameResult = QuickDirNameMatch | NameNoMatch;

// gsd-core/bin/lib/init.cjs, cmdInitQuick — the literal generation code:
//   dateStr = yy+mm+dd
//   timeEncoded = timeBlocks.toString(36).padStart(3, '0')
//   quickId = `${dateStr}-${timeEncoded}`
//   dirName = `${quickId}-${slug}`
// Recommended parser regex (GSD-DOMAIN.md): ^(\d{6})-([0-9a-z]{3})-(.+)$
const QUICK_DIR_RE = /^(\d{6})-([0-9a-z]{3})-(.+)$/;

export function parseQuickDirName(dirName: string): QuickDirNameResult {
  const m = dirName.match(QUICK_DIR_RE);
  if (!m) return { matched: false };
  return { matched: true, date: m[1], timeToken: m[2], slug: m[3] };
}

export interface MilestoneFileNameMatch {
  matched: true;
  /** e.g. 'v1.0' — the version segment, verbatim. */
  version: string;
  /** e.g. 'ROADMAP', 'REQUIREMENTS', 'MILESTONE-AUDIT' — open token, `.md` stripped. */
  document: string;
}
export type MilestoneFileNameResult = MilestoneFileNameMatch | NameNoMatch;

// gsd-core/bin/lib/artifacts.cjs, CANONICAL_PATTERNS: /^v\d+\.\d+(?:\.\d+)?-.*\.md$/i
// GSD-DOMAIN.md "Milestone archive naming": ^v(\d+)\.(\d+)(?:\.(\d+))?-(.+)$
const MILESTONE_FILE_RE = /^(v\d+\.\d+(?:\.\d+)?)-(.+)\.md$/i;

export function parseMilestoneFileName(fileName: string): MilestoneFileNameResult {
  const m = fileName.match(MILESTONE_FILE_RE);
  if (!m) return { matched: false };
  return { matched: true, version: m[1], document: m[2] };
}

export interface MilestonePhasesDirMatch {
  matched: true;
  version: string;
}
export type MilestonePhasesDirResult = MilestonePhasesDirMatch | NameNoMatch;

// GSD-DOMAIN.md "Milestone archive naming": milestones/vX.Y-phases/NN-slug/...
const MILESTONE_PHASES_DIR_RE = /^(v\d+\.\d+(?:\.\d+)?)-phases$/i;

export function parseMilestonePhasesDirName(dirName: string): MilestonePhasesDirResult {
  const m = dirName.match(MILESTONE_PHASES_DIR_RE);
  if (!m) return { matched: false };
  return { matched: true, version: m[1] };
}

interface ParsedPhaseNumber {
  base: number;
  letter: string | null;
  decParts: number[];
}

function parsePhaseNumberForCompare(raw: string): ParsedPhaseNumber {
  // Mirrors PHASE_NUMBER_TOKEN_SOURCE's own shape: digits, optional single letter, optional
  // dotted decimal continuation. A non-numeric (custom-mode) id sorts as base 0 with no
  // letter/decParts — comparePhaseNumbers is documented as operating on sequential-mode numbers.
  const m = raw.match(/^(\d+)([A-Z]?)((?:\.\d+)*)$/);
  if (!m) return { base: 0, letter: null, decParts: [] };
  const decParts = m[3] ? m[3].slice(1).split('.').map((p) => parseInt(p, 10)) : [];
  return { base: parseInt(m[1], 10), letter: m[2] || null, decParts };
}

/**
 * Dotted-numeric ordering for phase-number strings, with a trailing letter suffix as a tiebreak —
 * so `2.1` sorts between `2` and `3`, and `10` sorts after `9` (never lexicographically, which
 * would put `10` before `2`).
 */
export function comparePhaseNumbers(a: string, b: string): number {
  const pa = parsePhaseNumberForCompare(a);
  const pb = parsePhaseNumberForCompare(b);

  if (pa.base !== pb.base) return pa.base - pb.base;

  // No sub-phase sorts before having one, at the same base (2 before 2.1).
  if (pa.decParts.length === 0 && pb.decParts.length > 0) return -1;
  if (pb.decParts.length === 0 && pa.decParts.length > 0) return 1;

  const maxLen = Math.max(pa.decParts.length, pb.decParts.length);
  for (let i = 0; i < maxLen; i++) {
    const av = pa.decParts[i] ?? 0;
    const bv = pb.decParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }

  // Letter suffix is the final tiebreak: no letter sorts before any letter, then alphabetical.
  if (pa.letter === pb.letter) return 0;
  if (pa.letter === null) return -1;
  if (pb.letter === null) return 1;
  return pa.letter < pb.letter ? -1 : 1;
}

// gsd-core/bin/lib/artifacts.cjs, CANONICAL_EXACT — exact-match canonical file names at
// .planning/ root.
const CANONICAL_EXACT = new Set([
  'PROJECT.md',
  'ROADMAP.md',
  'STATE.md',
  'REQUIREMENTS.md',
  'MILESTONES.md',
  'BACKLOG.md',
  'LEARNINGS.md',
  'THREADS.md',
  'config.json',
  'CLAUDE.md',
  'RETROSPECTIVE.md',
  'WINDOWS.md',
  'STATE-ARCHIVE.md',
  'milestone.lock',
]);

// gsd-core/bin/lib/artifacts.cjs, CANONICAL_PATTERNS — pattern-match canonical file names.
const CANONICAL_PATTERNS = [/^v\d+\.\d+(?:\.\d+)?-MILESTONE-AUDIT\.md$/i, /^v\d+\.\d+(?:\.\d+)?-.*\.md$/i];

/**
 * True if `filename` (basename only) matches a canonical `.planning/` root artifact — either an
 * exact name or a known version-stamped pattern. Transcribed from `artifacts.cjs`'s
 * `isCanonicalPlanningFile`, the single ground truth for "is this canonical" that cannot drift
 * from GSD's own runtime behavior.
 */
export function isCanonicalRootFile(name: string): boolean {
  if (CANONICAL_EXACT.has(name)) return true;
  return CANONICAL_PATTERNS.some((p) => p.test(name));
}
