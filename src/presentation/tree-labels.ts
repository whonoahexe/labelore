// Pure label, badge and lifecycle-rank rules for tree nodes (quick-260911-vqe D-02/D-03). No DOM,
// no node:* imports, no React — this module only splits, cases and ranks strings, reusing the
// grammar parsers already in planning-repo/naming.ts. It adds no filename regex of its own; a
// split on separators (hyphen/underscore/whitespace, or the last '.') is not a grammar regex.
import {
  parsePhaseDirName,
  parsePlanFileName,
  parsePhaseArtifactName,
  parseQuickDirName,
  parseQuickArtifactName,
  parseMilestoneFileName,
  parseMilestonePhasesDirName,
} from '../planning-repo/naming.ts';
// Type-only import: erased at compile time, so tree.ts's value-level import of this module's
// exports never creates a runtime cycle.
import type { TreeNode, TreeLocation } from './tree.ts';

/** D-02: the tree's group eyebrows, in sentence case — the CSS uppercases them visually, matching
 * the nav tabs' own text-transform. */
export const GROUP_LABELS: Record<TreeLocation, string> = {
  root: 'Project',
  phase: 'Phases',
  'archived-phase': 'Archived phases',
  quick: 'Quick tasks',
  'milestone-root': 'Milestones',
  research: 'Research',
  other: 'Other',
};

// A small, closed set of tokens that read better upper-cased than sentence-cased — GSD's own
// artifact vocabulary (UAT, UI-SPEC, AI-SPEC) plus common short acronyms this corpus's filenames
// are likely to carry (API keys, JSON, ADR, PRD, CLI).
const ACRONYMS = new Set(['UAT', 'UI', 'AI', 'API', 'JSON', 'ADR', 'PRD', 'CLI']);

/** Splits `token` on runs of hyphen/underscore/whitespace, lowercases each word, upper-cases a
 * word whose upper-cased form is a known acronym, and capitalises only the first (non-acronym)
 * word. An input with no words (empty, or only separators) is returned unchanged. */
export function sentenceCase(token: string): string {
  const words = token
    .split(/[-_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
  if (words.length === 0) return token;
  return words
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join(' ');
}

/** Null for a `.md` name or a name with no extension, otherwise the extension upper-cased
 * ('STATE.json' gives 'JSON'). Used only to disambiguate same-label siblings after sorting. */
export function formatSuffix(segment: string): string | null {
  const lastDot = segment.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const extension = segment.slice(lastDot + 1);
  if (extension.length === 0) return null;
  if (extension.toLowerCase() === 'md') return null;
  return extension.toUpperCase();
}

function genericDirectoryLabel(segment: string): { label: string; badge: string | null } {
  return { label: sentenceCase(segment), badge: null };
}

function genericFileLabel(segment: string): { label: string; badge: string | null } {
  // A dotfile with no other dot ('.gitignore') drops the leading dot before sentence-casing.
  if (segment.startsWith('.') && segment.indexOf('.', 1) === -1) {
    return { label: sentenceCase(segment.slice(1)), badge: null };
  }
  const lastDot = segment.lastIndexOf('.');
  if (lastDot <= 0) return { label: sentenceCase(segment), badge: null };
  const base = segment.slice(0, lastDot);
  const extension = segment.slice(lastDot + 1).toLowerCase();
  if (extension === 'md' || extension === 'json') return { label: sentenceCase(base), badge: null };
  return { label: `${sentenceCase(base)} ${extension}`, badge: null };
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** A quick task's `YYMMDD` date, rendered as a short badge ('260615' gives 'Jun 15'). The
 * month/day digits are recovered by string slicing, never Date or locale APIs — an out-of-range
 * month gives a null badge rather than throwing or wrapping. */
function shortQuickDate(date: string): string | null {
  const monthDigits = date.slice(2, 4);
  const dayDigits = date.slice(4, 6);
  const monthIndex = Number(monthDigits) - 1;
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  const day = String(Number(dayDigits));
  return `${MONTH_NAMES[monthIndex]} ${day}`;
}

function lastSegment(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

/** D-02: derives the readable label and small mono badge for a directory or file node. `phase` is
 * non-null only for the directory that IS a known phase's own directory (its name/number come
 * straight from the owning PhaseDto), and is otherwise consulted for nothing. */
export function labelOf(
  node: Pick<TreeNode, 'location' | 'nodeType' | 'path'>,
  phase: { name: string; number: string } | null,
): { label: string; badge: string | null } {
  const segment = lastSegment(node.path);

  if (node.nodeType === 'directory') {
    if (node.location === 'phase' || node.location === 'archived-phase') {
      if (phase) return { label: phase.name, badge: phase.number };
      const wrapper = parseMilestonePhasesDirName(segment);
      if (wrapper.matched) return { label: wrapper.version, badge: null };
      const phaseDir = parsePhaseDirName(segment);
      if (phaseDir.matched) return { label: sentenceCase(phaseDir.slug), badge: phaseDir.number };
      return genericDirectoryLabel(segment);
    }
    if (node.location === 'quick') {
      const quickDir = parseQuickDirName(segment);
      if (quickDir.matched) {
        return { label: sentenceCase(quickDir.slug), badge: shortQuickDate(quickDir.date) };
      }
      return genericDirectoryLabel(segment);
    }
    return genericDirectoryLabel(segment);
  }

  // node.nodeType === 'file'
  if (node.location === 'phase' || node.location === 'archived-phase') {
    const plan = parsePlanFileName(segment);
    if (plan.matched) {
      return { label: `${plan.kind === 'plan' ? 'Plan' : 'Summary'} ${plan.plan}`, badge: null };
    }
    const artifact = parsePhaseArtifactName(segment);
    if (artifact.matched) return { label: sentenceCase(artifact.artifact), badge: null };
    return genericFileLabel(segment);
  }
  if (node.location === 'quick') {
    const artifact = parseQuickArtifactName(segment);
    if (artifact.matched) return { label: sentenceCase(artifact.artifact), badge: null };
    return genericFileLabel(segment);
  }
  if (node.location === 'root' || node.location === 'milestone-root') {
    const milestone = parseMilestoneFileName(segment);
    if (milestone.matched) return { label: sentenceCase(milestone.document), badge: milestone.version };
    return genericFileLabel(segment);
  }
  return genericFileLabel(segment);
}

// D-03 lifecycle ordering tables. Each list's array index IS its rank; an unlisted token falls
// through to the caller's "unknown" rank, per rankOf's own per-location fallback below.
const PRE_PLAN_ARTIFACT_ORDER = [
  'CONTEXT', 'DISCUSSION-LOG', 'SPEC', 'AI-SPEC', 'UI-SPEC', 'RESEARCH', 'PATTERNS', 'COST-MODEL', 'VALIDATION',
];
const POST_PLAN_ARTIFACT_ORDER = ['REVIEW', 'REVIEW-FIX', 'VERIFICATION', 'SECURITY', 'UAT', 'LEARNINGS'];
const ROOT_FILE_ORDER = [
  'PROJECT.md', 'ROADMAP.md', 'REQUIREMENTS.md', 'STATE.md', 'MILESTONES.md', 'BACKLOG.md',
  'LEARNINGS.md', 'RETROSPECTIVE.md',
];
const RESEARCH_FILE_ORDER = ['SUMMARY.md', 'STACK.md', 'FEATURES.md', 'ARCHITECTURE.md', 'PITFALLS.md'];
const MILESTONE_DOC_ORDER: Record<string, number> = { ROADMAP: 0, REQUIREMENTS: 1, 'MILESTONE-AUDIT': 2 };
const QUICK_FILE_ORDER: Record<string, number> = { CONTEXT: 0, PLAN: 1, SUMMARY: 2, VERIFICATION: 3 };

/** Dotted-numeric version key ('v1.0' -> 1_000_000, 'v2.0' -> 2_000_000), computed by splitting on
 * '.' rather than a second regex — no grammar parser owns version comparison, so this stays a
 * plain arithmetic helper local to ranking. */
function versionKeyOf(version: string): number {
  const [major, minor, patch] = version
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number(part) || 0);
  return (major ?? 0) * 1_000_000 + (minor ?? 0) * 1_000 + (patch ?? 0);
}

/** D-03: a node's lifecycle sort rank — lower sorts first. The caller (tree.ts's sortChildren)
 * breaks ties on the raw path segment, never the readable label, so chronology never depends on
 * word choice. */
export function rankOf(node: Pick<TreeNode, 'location' | 'nodeType' | 'path'>): number {
  const segment = lastSegment(node.path);

  if (node.nodeType === 'file' && (node.location === 'phase' || node.location === 'archived-phase')) {
    const plan = parsePlanFileName(segment);
    if (plan.matched) {
      const planNumber = Number(plan.plan);
      return 1000 + planNumber * 2 + (plan.kind === 'summary' ? 1 : 0);
    }
    const artifact = parsePhaseArtifactName(segment);
    if (artifact.matched) {
      const preIndex = PRE_PLAN_ARTIFACT_ORDER.indexOf(artifact.artifact);
      if (preIndex !== -1) return preIndex;
      const postIndex = POST_PLAN_ARTIFACT_ORDER.indexOf(artifact.artifact);
      if (postIndex !== -1) return 1_000_000 + postIndex;
    }
    return 2_000_000;
  }

  if (node.nodeType === 'file' && node.location === 'root') {
    const rootIndex = ROOT_FILE_ORDER.indexOf(segment);
    if (rootIndex !== -1) return rootIndex;
    return segment.toLowerCase().endsWith('.md') ? 100 : 200;
  }

  if (node.nodeType === 'file' && node.location === 'research') {
    const index = RESEARCH_FILE_ORDER.indexOf(segment);
    return index !== -1 ? index : 100;
  }

  if (node.nodeType === 'file' && node.location === 'milestone-root') {
    const milestone = parseMilestoneFileName(segment);
    if (!milestone.matched) return Number.MAX_SAFE_INTEGER;
    const docIndex = MILESTONE_DOC_ORDER[milestone.document] ?? 3;
    return -(versionKeyOf(milestone.version) * 10) + docIndex;
  }

  if (node.nodeType === 'directory' && node.location === 'quick') {
    const quickDir = parseQuickDirName(segment);
    if (!quickDir.matched) return 1;
    return -(Number(quickDir.date) * 46_656 + parseInt(quickDir.timeToken, 36));
  }

  if (node.nodeType === 'file' && node.location === 'quick') {
    const artifact = parseQuickArtifactName(segment);
    if (!artifact.matched) return 100;
    return QUICK_FILE_ORDER[artifact.artifact] ?? 100;
  }

  if (node.nodeType === 'directory' && node.location === 'archived-phase') {
    const wrapper = parseMilestonePhasesDirName(segment);
    return wrapper.matched ? versionKeyOf(wrapper.version) : 0;
  }

  return 0;
}
