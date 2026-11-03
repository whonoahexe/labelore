// PROJECT.md — named sections (What This Is / Core Value / Requirements / Context / Constraints /
// Key Decisions / Evolution) plus the Key Decisions table, which is the closest thing to a
// project-wide decision log outside per-phase D-NN ids (and is NOT ID-keyed at this level).
//
// Phase 9 (09-08, sketch 041 B): `structured.project` carries what the project page's strip and margin
// need - the current milestone and its goal. Every scan walks lines with `indexOf`, caps the lines it
// reads and every string it returns (T-09-16), so a 100,000-line file or a 200,000-character line costs
// the same as a small one. The extraction is guarded by its own try/catch: a throw omits only `project`, and
// `sections` and `keyDecisions` survive.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, parseMarkdownTable } from './markdown-sections.ts';
import type { MarkdownSection } from './markdown-sections.ts';

/** The current milestone: the heading's label, its leading version token and the `**Goal:**` line. */
export interface ProjectMilestone {
  label: string;
  version: string | null;
  goal: string | null;
}

/** The project page's structured projection of PROJECT.md. */
export interface ProjectStructure {
  milestone: ProjectMilestone | null;
}

/** Longest string any field carries. */
const MAX_TEXT = 600;
/** Most lines read from any one section. */
const MAX_LINES = 600;
/** Most characters of one line that are ever looked at. */
const MAX_LINE_CHARS = 2400;
/** Most sections searched for a heading. */
const MAX_HEADINGS = 400;

function cap(text: string): string {
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT).trimEnd() : text;
}

/** At most `maxLines` lines of `text`, each cut to `MAX_LINE_CHARS`, found with indexOf (never a whole-text split). */
function firstLines(text: string, maxLines: number): string[] {
  const lines: string[] = [];
  let from = 0;
  while (lines.length < maxLines && from <= text.length) {
    let to = text.indexOf('\n', from);
    if (to < 0) to = text.length;
    lines.push(text.slice(from, Math.min(to, from + MAX_LINE_CHARS)));
    from = to + 1;
  }
  return lines;
}

function findSection(sections: MarkdownSection[], name: string): MarkdownSection | undefined {
  const limit = Math.min(sections.length, MAX_HEADINGS);
  for (let i = 0; i < limit; i += 1) {
    if (sections[i].heading.trim().toLowerCase().startsWith(name)) return sections[i];
  }
  return undefined;
}

/** The label's leading `vX.Y` token, or null. */
function versionOf(label: string): string | null {
  const head = label.split(' ', 1)[0];
  if (head.length < 2 || (head[0] !== 'v' && head[0] !== 'V')) return null;
  for (let i = 1; i < head.length; i += 1) {
    const code = head.charCodeAt(i);
    const digit = code >= 48 && code <= 57;
    if (!digit && head[i] !== '.') return null;
  }
  const token = head.endsWith('.') ? head.slice(0, -1) : head;
  return token.length >= 2 ? token : null;
}

function milestoneOf(sections: MarkdownSection[]): ProjectMilestone | null {
  const section = findSection(sections, 'current milestone');
  if (!section) return null;
  const colon = section.heading.indexOf(':');
  const label = colon < 0 ? '' : cap(section.heading.slice(colon + 1).trim());
  let goal: string | null = null;
  const lines = firstLines(section.body, MAX_LINES);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('**Goal:**')) continue;
    const parts = [line.slice('**Goal:**'.length).trim()];
    for (let next = i + 1; next < lines.length; next += 1) {
      const wrapped = lines[next].trim();
      if (wrapped === '' || wrapped.startsWith('**') || wrapped.startsWith('#') || wrapped.startsWith('- ')) break;
      parts.push(wrapped);
      if (parts.join(' ').length > MAX_TEXT) break;
    }
    const joined = cap(parts.join(' ').trim());
    goal = joined === '' ? null : joined;
    break;
  }
  return { label, version: versionOf(label), goal };
}

export function extractProject(sections: MarkdownSection[]): ProjectStructure {
  return { milestone: milestoneOf(sections) };
}

export const ProjectHandler: ArtifactHandler = {
  kind: 'project',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'PROJECT.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const sections = splitSections(fm.body);
    const keyDecisionsSection = sections.find((s) => /key decisions/i.test(s.heading));
    let project: ProjectStructure | undefined;
    try {
      project = extractProject(sections);
    } catch {
      project = undefined;
    }

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        sections,
        keyDecisions: keyDecisionsSection ? parseMarkdownTable(keyDecisionsSection.body) : [],
        ...(project === undefined ? {} : { project }),
      },
    };
  },
};
