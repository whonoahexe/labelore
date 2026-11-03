// PROJECT.md — named sections (What This Is / Core Value / Requirements / Context / Constraints /
// Key Decisions / Evolution) plus the Key Decisions table, which is the closest thing to a
// project-wide decision log outside per-phase D-NN ids (and is NOT ID-keyed at this level).
//
// Phase 9 (09-08, sketch 041 B): `structured.project` carries what the project page's strip and margin
// need - the current milestone and its goal, the constraints, the out-of-scope names and the
// last-updated footer. Every scan walks lines with `indexOf`, caps the lines it reads, the bullets it keeps
// and every string it returns (T-09-16), so a 100,000-line file or a 200,000-character line costs the
// same as a small one. The extraction is guarded by its own try/catch: a throw omits only `project`, and
// `sections` and `keyDecisions` survive.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';
import type { MarkdownSection } from './markdown-sections.ts';

/** The current milestone: the heading's label, its leading version token and the `**Goal:**` line. */
export interface ProjectMilestone {
  label: string;
  version: string | null;
  goal: string | null;
}

/** One constraint or exclusion: the bold name (`''` when the bullet has none) and the rest of the bullet. */
export interface ProjectBullet {
  name: string;
  text: string;
}

/** How a Key Decisions row turned out: the first word of its Outcome cell, or `other` for anything else. */
export type ProjectDecisionOutcome = 'good' | 'revisit' | 'reversed' | 'pending' | 'other';

/** One Key Decisions row, in the author's order (09-09, sketch 041 B). */
export interface ProjectDecision {
  /** 1-based position in the table. */
  n: number;
  /** The Decision cell minus a trailing tag. */
  decision: string;
  /** The trailing parenthetical when it is a tag (`v2.0`, `Phase 6`, `D-01`, `quick ...`), else null. */
  tag: string | null;
  /** The tag when it names a milestone or phase (`v` + digit, or `Phase `), else null. */
  era: string | null;
  rationale: string;
  outcome: ProjectDecisionOutcome;
  /** Good / Revisit / Reversed / Pending, or null for `other`. */
  outcomeLabel: string | null;
  /** What follows the outcome word, or the whole Outcome cell for `other`. */
  note: string;
}

/** The project page's structured projection of PROJECT.md. */
export interface ProjectStructure {
  milestone: ProjectMilestone | null;
  constraints: ProjectBullet[];
  outOfScope: ProjectBullet[];
  lastUpdated: string | null;
  decisions: ProjectDecision[];
}

/** Longest string any field carries. */
const MAX_TEXT = 600;
/** Most lines read from any one section (or from the foot of the file). */
const MAX_LINES = 600;
/** Most characters of one line that are ever looked at. */
const MAX_LINE_CHARS = 2400;
/** Most bullets kept per list. */
const MAX_BULLETS = 40;
/** Most sections (or subsections) searched for a heading. */
const MAX_HEADINGS = 400;
/** Most Key Decisions rows kept (T-09-18). */
const MAX_DECISIONS = 500;

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

/** At most `maxLines` lines from the end of `text`, last line first. */
function lastLines(text: string, maxLines: number): string[] {
  const lines: string[] = [];
  let to = text.length;
  while (lines.length < maxLines && to >= 0) {
    const from = text.lastIndexOf('\n', to - 1) + 1;
    lines.push(text.slice(from, Math.min(to, from + MAX_LINE_CHARS)));
    to = from - 1;
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

/** True for characters that may separate a bold name from the rest of its bullet. */
function isSeparator(char: string): boolean {
  return char === ':' || char === '-' || char === '—' || char === '–' || char === ' ';
}

/** One bullet's `**Name**` + separator + text; a bullet with no bold name keeps `name: ''` and all its text. */
function bulletOf(raw: string): ProjectBullet | null {
  const joined = raw.replace(/\s+/g, ' ').trim();
  if (joined === '') return null;
  if (joined.startsWith('**')) {
    const close = joined.indexOf('**', 2);
    if (close > 2) {
      let name = joined.slice(2, close).trim();
      if (name.endsWith(':')) name = name.slice(0, -1).trimEnd();
      let at = close + 2;
      while (at < joined.length && isSeparator(joined[at])) at += 1;
      return { name: cap(name), text: cap(joined.slice(at).trim()) };
    }
  }
  return { name: '', text: cap(joined) };
}

/** The top-level bullets of a section: wrapped lines are joined, and a blank line or a heading ends a bullet. */
function bulletsOf(body: string): ProjectBullet[] {
  const bullets: ProjectBullet[] = [];
  let current: string | null = null;
  const flush = (): void => {
    if (current !== null && bullets.length < MAX_BULLETS) {
      const bullet = bulletOf(current);
      if (bullet) bullets.push(bullet);
    }
    current = null;
  };
  for (const line of firstLines(body, MAX_LINES * 4)) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flush();
      current = line.slice(2);
    } else if (line.trim() === '' || line.startsWith('#')) {
      flush();
    } else if (current !== null && current.length < MAX_TEXT * 2) {
      current += ` ${line.trim()}`;
    }
    if (bullets.length >= MAX_BULLETS) break;
  }
  flush();
  return bullets;
}

/** The `### Out of Scope` subsection under any section, else a top-level `## Out of Scope`. */
function outOfScopeOf(sections: MarkdownSection[]): ProjectBullet[] {
  const top = findSection(sections, 'out of scope');
  if (top) return bulletsOf(top.body);
  const limit = Math.min(sections.length, MAX_HEADINGS);
  for (let i = 0; i < limit; i += 1) {
    const sub = findSection(splitSubsections(sections[i].body), 'out of scope');
    if (sub) return bulletsOf(sub.body);
  }
  return [];
}

/** The text of the italic `*Last updated: ...*` footer, from the last such line near the end of the file. */
function lastUpdatedOf(body: string): string | null {
  for (const raw of lastLines(body, 60)) {
    const line = raw.trim();
    if (line.length < 2 || (line[0] !== '*' && line[0] !== '_')) continue;
    let start = 0;
    let end = line.length;
    while (start < end && (line[start] === '*' || line[start] === '_')) start += 1;
    while (end > start && (line[end - 1] === '*' || line[end - 1] === '_')) end -= 1;
    const inner = line.slice(start, end).trim();
    if (!inner.toLowerCase().startsWith('last updated')) continue;
    const colon = inner.indexOf(':');
    if (colon < 0) continue;
    const text = cap(inner.slice(colon + 1).trim());
    return text === '' ? null : text;
  }
  return null;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}

/** True when a trailing parenthetical's text is a tag: `v` + digit, `Phase ` + digit, `D-` + digit, or `quick`. */
function isTag(inner: string): boolean {
  if (inner.startsWith('v') && isDigit(inner[1])) return true;
  if (inner.startsWith('Phase ') && isDigit(inner[6])) return true;
  if (inner.startsWith('D-') && isDigit(inner[2])) return true;
  return inner.toLowerCase().startsWith('quick');
}

/** A milestone or phase tag: `v` + digit, or `Phase `. */
function isEra(tag: string): boolean {
  return (tag.startsWith('v') && isDigit(tag[1])) || tag.startsWith('Phase ');
}

/** The Decision cell split into its text and the trailing tag; `(roadmap vs disk, ...)` stays text. */
function splitTag(cell: string): { decision: string; tag: string | null } {
  const text = cell.trim();
  if (!text.endsWith(')')) return { decision: text, tag: null };
  const open = text.lastIndexOf('(');
  if (open < 0) return { decision: text, tag: null };
  const inner = text.slice(open + 1, -1).trim();
  const head = text.slice(0, open).trimEnd();
  if (inner === '' || head === '' || inner.includes('(') || !isTag(inner)) return { decision: text, tag: null };
  return { decision: head, tag: inner };
}

const OUTCOME_WORDS: Record<string, [ProjectDecisionOutcome, string]> = {
  good: ['good', 'Good'],
  revisit: ['revisit', 'Revisit'],
  reversed: ['reversed', 'Reversed'],
  pending: ['pending', 'Pending'],
};

/** Classifies an Outcome cell by its first word after leading symbols (Pitfall 10); a character scan, no pattern. */
function outcomeOf(cell: string): { outcome: ProjectDecisionOutcome; outcomeLabel: string | null; note: string } {
  const text = cell.trim();
  let start = 0;
  while (start < text.length && !isLetter(text[start])) start += 1;
  let end = start;
  while (end < text.length && isLetter(text[end])) end += 1;
  const hit = end > start ? OUTCOME_WORDS[text.slice(start, end).toLowerCase()] : undefined;
  if (hit === undefined) return { outcome: 'other', outcomeLabel: null, note: cap(text) };
  let at = end;
  while (at < text.length && (text[at] === ' ' || text[at] === '-' || text[at] === '–' || text[at] === '—' || text[at] === ':')) {
    at += 1;
  }
  return { outcome: hit[0], outcomeLabel: hit[1], note: cap(text.slice(at).trim()) };
}

function cellOf(row: Record<string, string>, names: string[], position: number): string {
  const keys = Object.keys(row);
  for (const key of keys) {
    const lower = key.trim().toLowerCase();
    for (const name of names) if (lower.startsWith(name)) return row[key] ?? '';
  }
  const key = keys[position];
  return key === undefined ? '' : (row[key] ?? '');
}

/** The Key Decisions rows in file order (at most 500), each cell capped. */
function decisionsOf(rows: Record<string, string>[]): ProjectDecision[] {
  const decisions: ProjectDecision[] = [];
  const limit = Math.min(rows.length, MAX_DECISIONS);
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i];
    const cell = cellOf(row, ['decision'], 0);
    const rationale = cellOf(row, ['rationale', 'why'], 1);
    const outcomeCell = cellOf(row, ['outcome', 'result'], 2);
    if (cell.trim() === '' && rationale.trim() === '' && outcomeCell.trim() === '') continue;
    const { decision, tag } = splitTag(cell);
    decisions.push({
      n: decisions.length + 1,
      decision: cap(decision),
      tag: tag === null ? null : cap(tag),
      era: tag !== null && isEra(tag) ? cap(tag) : null,
      rationale: cap(rationale.trim()),
      ...outcomeOf(outcomeCell),
    });
  }
  return decisions;
}

export function extractProject(
  body: string,
  sections: MarkdownSection[],
  keyDecisions: Record<string, string>[] = [],
): ProjectStructure {
  const constraints = findSection(sections, 'constraints');
  return {
    milestone: milestoneOf(sections),
    constraints: constraints ? bulletsOf(constraints.body) : [],
    outOfScope: outOfScopeOf(sections),
    lastUpdated: lastUpdatedOf(body),
    decisions: decisionsOf(keyDecisions),
  };
}

export const ProjectHandler: ArtifactHandler = {
  kind: 'project',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'PROJECT.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const sections = splitSections(fm.body);
    const keyDecisionsSection = sections.find((s) => /key decisions/i.test(s.heading));
    const keyDecisions = keyDecisionsSection ? parseMarkdownTable(keyDecisionsSection.body) : [];
    let project: ProjectStructure | undefined;
    try {
      project = extractProject(fm.body, sections, keyDecisions);
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
        keyDecisions,
        ...(project === undefined ? {} : { project }),
      },
    };
  },
};
