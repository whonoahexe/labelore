// ROADMAP.md — the richest hand-authored structure. Extracts per-phase blocks (goal, depends-on,
// requirements, success criteria, plan checklist) fully; the ASCII dependency-shape diagram is
// captured verbatim and never arrow-parsed (it is confirmed free-form art, not a schema); the
// `<details>`-wrapped milestone grouping is detected by presence, keyed on its `<summary>` text.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';

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
  /** All parsed plan checkboxes checked, per ROADMAP.md's own syntax. Null when no plan checklist could be read (e.g. "Plans: TBD"). */
  roadmapComplete: boolean | null;
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
    const headingMatch = line.match(/^#{2,6}\s+(.*)$/);
    if (headingMatch) {
      const phaseMatch = headingMatch[1].match(/^(?:[^\w]*\s*)?Phase\s+([\w.]+):\s*(.+)$/i);
      if (phaseMatch) {
        if (current) {
          blocks.push({
            number: current.number,
            name: current.name,
            body: current.lines.join('\n'),
          });
        }
        current = { number: phaseMatch[1], name: phaseMatch[2].trim(), lines: [] };
      } else if (current) {
        current.lines.push(line); // non-phase heading is content of the current phase, not a boundary
      }
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current)
    blocks.push({ number: current.number, name: current.name, body: current.lines.join('\n') });
  return blocks;
}

function parsePhaseBlockFields(raw: RawPhaseBlock): RoadmapPhaseBlock {
  const goalMatch = raw.body.match(/^\*\*Goal\*\*:\s*(.+)$/m);
  const dependsMatch = raw.body.match(/^\*\*Depends on\*\*:\s*(.+)$/m);
  const reqMatch = raw.body.match(/^\*\*Requirements\*\*:\s*(.+)$/m);
  const successCriteria = [...raw.body.matchAll(/^\s*\d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
  // GSD roadmaps have used both the early `01-01: Description` spelling and the
  // current `01-01-PLAN.md — Description` spelling. Treat the filename suffix as
  // presentation, not identity, and accept either colon or dash separators.
  const plans: RoadmapPlanEntry[] = [
    ...raw.body.matchAll(
      /^\s*-\s*\[([ xX])\]\s*(?:\*\*)?(\d+(?:\.\d+)?-\d+)(?:-PLAN)?(?:\.md)?(?:\*\*)?\s*(?::|[—–-])\s*(.*)$/gm,
    ),
  ].map((match) => ({
    id: match[2],
    description: match[3].trim(),
    checked: match[1].toLowerCase() === 'x',
  }));

  return {
    number: raw.number,
    name: raw.name,
    goal: goalMatch ? goalMatch[1].trim() : null,
    dependsOnRaw: dependsMatch ? dependsMatch[1].trim() : null,
    requirementIds: reqMatch ? parseRequirementIds(reqMatch[1]) : [],
    successCriteria,
    plans,
    roadmapComplete: plans.length > 0 ? plans.every((p) => p.checked) : null,
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
    groups.push({
      summary: summaryText,
      version: versionMatch ? `v${versionMatch[1]}` : null,
      phases: extractRawPhaseBlocks(match[2]).map(parsePhaseBlockFields),
    });
    remainder = remainder.replace(match[0], '');
  }
  return { groups, remainder };
}

export const RoadmapHandler: ArtifactHandler = {
  kind: 'roadmap',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'ROADMAP.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    const { groups, remainder } = extractMilestoneGroups(fm.body);
    const phases = extractRawPhaseBlocks(remainder).map(parsePhaseBlockFields);

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
