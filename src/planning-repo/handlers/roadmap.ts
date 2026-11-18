// ROADMAP.md — the richest hand-authored structure. Extracts per-phase blocks (goal, depends-on,
// requirements, success criteria, plan checklist) fully; the ASCII dependency-shape diagram is
// captured verbatim and never arrow-parsed (it is confirmed free-form art, not a schema); the
// `<details>`-wrapped milestone grouping is detected by presence, keyed on its `<summary>` text; the
// phase overview checklist is read for each phase's own checkbox.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseMilestoneFileName, comparePhaseNumbers } from '../naming.ts';

export interface RoadmapPlanEntry {
  id: string;
  description: string;
  checked: boolean;
}

export interface RoadmapPhaseBlock {
  number: string;
  name: string;
  goal: string | null;
  dependsOnRaw: string | null;
  requirementIds: string[];
  successCriteria: string[];
  plans: RoadmapPlanEntry[];
  /**
   * The phase's own overview checklist line in this roadmap scope (`- [x] **Phase N: Name** ...`),
   * bold or plain, any trailing text. Null when the scope has no such line for this phase, or has two
   * that disagree.
   */
  phaseLineChecked: boolean | null;
  /**
   * The phase line's checkbox when there is one (GSD ticks it only after verification), otherwise all
   * parsed plan checkboxes checked, and null when neither exists (e.g. "Plans: TBD").
   */
  roadmapComplete: boolean | null;
}

/** The completion rule: the phase line decides when present, else the plan checkboxes, else unknown. */
export function roadmapCompleteOf(
  phaseLineChecked: boolean | null,
  plans: RoadmapPlanEntry[],
): boolean | null {
  if (phaseLineChecked !== null) return phaseLineChecked;
  return plans.length > 0 ? plans.every((p) => p.checked) : null;
}

export interface RoadmapMilestoneGroup {
  /** The <summary> text verbatim — the milestone header for this collapsed archive group. */
  summary: string;
  /** Extracted from the summary text (e.g. "v1.0" from "✅ v1.0 MVP ..."), null if unrecoverable. */
  version: string | null;
  phases: RoadmapPhaseBlock[];
}

function parseRequirementIds(raw: string): string[] {
  const stripped = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  return stripped
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface RawPhaseBlock {
  number: string;
  name: string;
  body: string;
}

/** The one definition of the phase heading grammar: `## Phase N: Name` at level 2-6, emoji prefix allowed. */
function phaseHeadingOf(line: string): { number: string; name: string } | null {
  const headingMatch = line.match(/^#{2,6}\s+(.*)$/);
  if (!headingMatch) return null;
  const phaseMatch = headingMatch[1].match(/^(?:[^\w]*\s*)?Phase\s+([\w.]+):\s*(.+)$/i);
  return phaseMatch ? { number: phaseMatch[1], name: phaseMatch[2].trim() } : null;
}

interface PhaseLineState {
  number: string;
  checked: boolean | null;
}

/**
 * Reads the overview checklist (`- [x] **Phase N: Name** ...`, bold or plain) that sits above the
 * first phase heading. Stops at that heading so a checkbox inside a phase's own body is never read
 * as a phase line. `Phase` must directly follow the checkbox, so a `v1.0 Phase 1:` archive line never
 * matches. Two lines for one number that disagree become null, deferring to the plan rule. One linear
 * pass, one anchored regex per line, no nested quantifiers (T-01-11).
 */
function extractPhaseLineStates(text: string): PhaseLineState[] {
  const states: PhaseLineState[] = [];
  for (const line of text.split('\n')) {
    if (phaseHeadingOf(line)) break;
    const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(?:\*\*)?Phase\s+([\w.]+)(?:\*\*)?\s*:/i);
    if (!m) continue;
    const checked = m[1].toLowerCase() === 'x';
    const existing = states.find((s) => comparePhaseNumbers(s.number, m[2]) === 0);
    if (!existing) states.push({ number: m[2], checked });
    else if (existing.checked !== checked) existing.checked = null;
  }
  return states;
}

/**
 * Line-scans for `### Phase N: {Name}` / `#### Phase N: {Name}` headings at any level 2–6 and
 * captures everything up to the next `Phase N:` heading as that phase's body. An interior heading
 * that does NOT match the `Phase N:` pattern (e.g. a hand-authored `#### Notes` subsection) is NOT
 * a block boundary — it is content of the current phase, same as any other line, so a phase's
 * Requirements / Success Criteria / `Plans:` fields are never silently truncated by an unrelated
 * heading appearing before them. Never a single whole-document regex (T-01-11) — one linear pass
 * over lines.
 */
function extractRawPhaseBlocks(text: string): RawPhaseBlock[] {
  const blocks: RawPhaseBlock[] = [];
  let current: { number: string; name: string; lines: string[] } | null = null;

  for (const line of text.split('\n')) {
    const heading = phaseHeadingOf(line);
    if (heading) {
      if (current) {
        blocks.push({
          number: current.number,
          name: current.name,
          body: current.lines.join('\n'),
        });
      }
      current = { number: heading.number, name: heading.name, lines: [] };
      continue;
    }
    if (current) current.lines.push(line); // non-phase heading is content of the current phase, not a boundary
  }
  if (current)
    blocks.push({ number: current.number, name: current.name, body: current.lines.join('\n') });
  return blocks;
}

function parsePhaseBlockFields(raw: RawPhaseBlock, lineStates: PhaseLineState[]): RoadmapPhaseBlock {
  const goalMatch = raw.body.match(/^\*\*Goal\*\*:\s*(.+)$/m);
  const dependsMatch = raw.body.match(/^\*\*Depends on\*\*:\s*(.+)$/m);
  const reqMatch = raw.body.match(/^\*\*Requirements\*\*:\s*(.+)$/m);
  const successCriteria = [...raw.body.matchAll(/^\s*\d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
  // GSD roadmaps have used both the early `01-01: Description` spelling and the
  // current `01-01-PLAN.md — Description` spelling. Treat the filename suffix as
  // presentation, not identity, and accept either colon or dash separators. The
  // separator+description is one optional group using [ \t]* (never \s*) around
  // it, so a bare `- [x] 04-01-PLAN.md` line (no description at all) can't have
  // its match backtrack across the newline and steal the next list item's line
  // as its own "description" — \s* matches \n, and a bare hyphen is itself a
  // valid separator, so without this guard a description-less line's optional
  // filename suffix ungreedy-backtracks into either its own trailing "-PLAN.md"
  // or, worse, the following line's leading "- ".
  const plans: RoadmapPlanEntry[] = [
    ...raw.body.matchAll(
      /^\s*-\s*\[([ xX])\]\s*(?:\*\*)?(\d+(?:\.\d+)?-\d+)(?:-PLAN)?(?:\.md)?(?:\*\*)?(?:[ \t]*(?::|[—–-])[ \t]*(.*))?$/gm,
    ),
  ].map((match) => ({
    id: match[2],
    description: (match[3] ?? '').trim(),
    checked: match[1].toLowerCase() === 'x',
  }));

  const phaseLineChecked =
    lineStates.find((s) => comparePhaseNumbers(s.number, raw.number) === 0)?.checked ?? null;

  return {
    number: raw.number,
    name: raw.name,
    goal: goalMatch ? goalMatch[1].trim() : null,
    dependsOnRaw: dependsMatch ? dependsMatch[1].trim() : null,
    requirementIds: reqMatch ? parseRequirementIds(reqMatch[1]) : [],
    successCriteria,
    plans,
    phaseLineChecked,
    roadmapComplete: roadmapCompleteOf(phaseLineChecked, plans),
  };
}

/** Captures the optional ASCII dependency-shape fenced block verbatim — never arrow-parsed. */
function extractDependencyShape(body: string): string | null {
  const m = body.match(/\*\*Dependency shape:?\*\*\s*```([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}

interface MilestoneExtraction {
  groups: RoadmapMilestoneGroup[];
  /** The body with every matched <details> block removed, so top-level phase extraction never double-counts an archived phase. */
  remainder: string;
}

function extractMilestoneGroups(body: string): MilestoneExtraction {
  const groups: RoadmapMilestoneGroup[] = [];
  let remainder = body;
  const detailsRe = /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let match: RegExpExecArray | null;
  while ((match = detailsRe.exec(body)) !== null) {
    const summaryText = match[1].trim();
    const versionMatch = summaryText.match(/v(\d+(?:\.\d+)+)/i);
    const lineStates = extractPhaseLineStates(match[2]);
    groups.push({
      summary: summaryText,
      version: versionMatch ? `v${versionMatch[1]}` : null,
      phases: extractRawPhaseBlocks(match[2]).map((raw) => parsePhaseBlockFields(raw, lineStates)),
    });
    remainder = remainder.replace(match[0], '');
  }
  return { groups, remainder };
}

/**
 * A per-milestone `milestones/vX.Y-ROADMAP.md` snapshot: same document token as the root file,
 * one directory level down. `parseMilestoneFileName` is this codebase's single grammar module for
 * milestone filenames (naming.ts) — no second regex is written here.
 */
function isMilestoneRoadmapFile(ref: ArtifactRef): boolean {
  if (ref.location !== 'milestone-root') return false;
  const parsed = parseMilestoneFileName(basename(ref.path));
  return parsed.matched && parsed.document.toUpperCase() === 'ROADMAP';
}

export const RoadmapHandler: ArtifactHandler = {
  kind: 'roadmap',
  match: (ref) =>
    (ref.location === 'root' && basename(ref.path) === 'ROADMAP.md') || isMilestoneRoadmapFile(ref),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    const { groups, remainder } = extractMilestoneGroups(fm.body);
    const lineStates = extractPhaseLineStates(remainder);
    const phases = extractRawPhaseBlocks(remainder).map((rawBlock) => parsePhaseBlockFields(rawBlock, lineStates));

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        milestoneGroups: groups,
        /** Live/current-milestone phase blocks — outside any collapsed <details> group. */
        phases,
        dependencyShape: extractDependencyShape(remainder),
      },
    };
  },
};
