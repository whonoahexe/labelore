// The seed and thread lifts (Phase 11, 11-20, VIEW-15, VIEW-16, D-02). `/gsd-plant-seed` writes
// `seeds/SEED-{YYMMDD}-{3 chars}-{slug}.md` (six frontmatter keys, a `# {id}: {idea}` heading and five `##`
// sections); `/gsd-thread` writes `threads/{slug}.md` (five frontmatter keys and Goal, Context, References and
// Next Steps) or, in the older shape, a `# Thread:` heading with a `## Status: OPEN` line. This module turns each
// into the projection the Seeds and Threads pages compose from. It never writes and never throws on author data
// it can read around; the handlers still guard the call, so a throw only omits the structured key.
//
// Rules every function here follows.
//   * Nothing is guessed. A field the file does not state is null (a scalar) or [] (a list), never a default.
//   * The writer's own placeholder text reads as "not stated": the seed's `_To be filled in..._`, `_No
//     breadcrumbs collected yet._`, the stock surfacing sentence, the Notes boilerplate and the unknown Scope
//     line; a thread's `*(add links, ...)*` and `*(what the next session should do first)*` bullets.
//   * The surfacing condition is shown as the author wrote it: `when relevant` stays `when relevant`. No field
//     says whether it has been met.
//   * Author keys are read through Object.hasOwn and nothing from a file is spread into a plain object (RESEARCH
//     Pitfall 11, T-11-31). Lists are capped at LIFT_LIST_CAP, strings at LIFT_TEXT_CAP, and every scan is one
//     linear pass over a capped body (T-11-32).
//   * Breadcrumbs and references are kept as the written text; resolving one against the artifact paths belongs
//     to the page composer.
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';

/** The most list items any one lift keeps. */
export const LIFT_LIST_CAP = 200;
/** The longest string kept, in characters. */
export const LIFT_TEXT_CAP = 4000;

// ---------------------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------------------

export type SeedScope = 'Small' | 'Medium' | 'Large';

export interface SeedAudit {
  milestone: string | null;
  at: string | null;
  status: string | null;
}

export interface SeedLift {
  /** The frontmatter id, else the id the heading and file name agree on, else the file name's prefix. */
  id: string;
  /** The text after `{id}:` in the `# ` heading; the whole heading when it has no `id:` lead; null when none. */
  idea: string | null;
  status: string | null;
  /** A UTC date, `YYYY-MM-DD`, as the file wrote it. */
  planted: string | null;
  plantedDuring: string | null;
  /** Verbatim: `when relevant` stays `when relevant`. null when neither frontmatter nor a `**Trigger:**` line says. */
  triggerWhen: string | null;
  /** null for `unknown` or absent. */
  scope: SeedScope | null;
  auditAcknowledged: SeedAudit | null;
  /** Why This Matters; null when absent or the writer's placeholder. */
  why: string | null;
  /** The When to Surface section: its `**Trigger:**` value, and the text that is neither that line nor the stock sentence. */
  whenToSurface: { trigger: string | null; text: string | null };
  /** The Scope Estimate gloss after the size word; null when absent or the unknown placeholder. */
  scopeEstimate: string | null;
  /** Each Breadcrumbs bullet as written. */
  breadcrumbs: string[];
  /** Notes; null when absent or the writer's boilerplate line. */
  notes: string | null;
}

export interface ThreadLift {
  slug: string | null;
  title: string | null;
  /** As written: `open`, `in_progress`, `resolved`, or the older `OPEN`, `IN PROGRESS`, `RESOLVED`. */
  status: string | null;
  created: string | null;
  updated: string | null;
  goal: string | null;
  context: string | null;
  /** References bullets as written, the placeholder bullet dropped. */
  references: string[];
  /** Next Steps in the author's order, markers dropped, the placeholder bullet dropped. */
  nextSteps: string[];
}

// ---------------------------------------------------------------------------------------------------------
// Small readers (shared with reports-lift.ts and onboarding.ts)
// ---------------------------------------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function capText(text: string, limit: number = LIFT_TEXT_CAP): string {
  return text.length > limit ? text.slice(0, limit) : text;
}

/** An own property of a record, never one inherited from a prototype. */
export function own(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** A non-empty trimmed string, or a number or boolean read as text, else null. A Date reads as its UTC day. */
export function scalarText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : capText(trimmed);
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return null;
}

export function sectionLines(lines: readonly string[], section: FencedSection): string[] {
  return lines.slice(section.startLine + 1, section.endLine);
}

export function findSection(
  sections: readonly FencedSection[],
  level: 2 | 3,
  matches: (lowerHeading: string) => boolean,
): FencedSection | undefined {
  return sections.find((section) => section.level === level && matches(section.heading.trim().toLowerCase()));
}

/** The first `# ` heading outside a fence, its text, else null. `##` and deeper do not count. */
export function firstH1(lines: readonly string[]): string | null {
  let found: string | null = null;
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    if (found !== null) return;
    if (line.charCodeAt(0) === 35 && (line.charCodeAt(1) === 32 || line.charCodeAt(1) === 9)) {
      const text = line.slice(1).trim();
      if (text !== '') found = capText(text, 300);
    }
  });
  return found;
}

/** A list item's text with its marker dropped (`- `, `* `, `+ `, `1. `, `1) `), else null. */
export function listItemText(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 2) return null;
  const mark = trimmed.charCodeAt(0);
  if ((mark === 45 || mark === 42 || mark === 43) && (trimmed[1] === ' ' || trimmed[1] === '\t')) {
    const text = trimmed.slice(2).trim();
    return text === '' ? null : text;
  }
  let i = 0;
  while (i < trimmed.length && i < 6 && trimmed.charCodeAt(i) >= 48 && trimmed.charCodeAt(i) <= 57) i += 1;
  if (i > 0 && i < trimmed.length - 1 && (trimmed[i] === '.' || trimmed[i] === ')') && (trimmed[i + 1] === ' ' || trimmed[i + 1] === '\t')) {
    const text = trimmed.slice(i + 2).trim();
    return text === '' ? null : text;
  }
  return null;
}

/**
 * The list items of a block of lines, in order, markers dropped. An item that wraps onto an indented line
 * keeps that line (joined by one space); a deeper-indented list item is its own item. Fences are honoured.
 */
export function listItems(lines: readonly string[]): string[] {
  const items: string[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    if (line.trim() === '') return;
    const item = listItemText(line);
    if (item !== null) {
      if (items.length < LIFT_LIST_CAP) items.push(capText(item, 1000));
      return;
    }
    const indented = line.charCodeAt(0) === 32 || line.charCodeAt(0) === 9;
    if (indented && items.length > 0 && items.length <= LIFT_LIST_CAP) {
      const last = items.length - 1;
      items[last] = capText(`${items[last]} ${line.trim()}`, 1000);
    }
  });
  return items;
}

/** A bold-label line `**Label:** value` (the colon inside or outside the bold run): the label and value, else null. */
export function boldLabelLine(line: string): { label: string; value: string } | null {
  const trimmed = line.trim();
  if (trimmed.charCodeAt(0) !== 42 || trimmed.charCodeAt(1) !== 42) return null;
  const close = trimmed.indexOf('**', 2);
  if (close < 0) return null;
  let label = trimmed.slice(2, close).trim();
  let rest = trimmed.slice(close + 2);
  if (label.endsWith(':')) label = label.slice(0, -1).trim();
  else if (rest.startsWith(':')) rest = rest.slice(1);
  else return null;
  if (label === '') return null;
  return { label, value: capText(rest.trim()) };
}

/** The block's non-blank text outside fences, joined by newlines, trimmed; '' when none. */
function blockText(lines: readonly string[]): string {
  const kept: string[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    kept.push(line);
  });
  return capText(kept.join('\n').trim());
}

/** The text of a section (fenced lines included, verbatim), trimmed, capped; '' for an empty section. */
function sectionBody(lines: readonly string[], section: FencedSection | undefined): string {
  if (section === undefined) return '';
  return capText(sectionLines(lines, section).join('\n').trim());
}

/** A whole-line italic or bold-italic wrapper (`_text_`, `*text*`): the inside, else null. */
function wrappedInner(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;
  const first = trimmed[0];
  if ((first !== '_' && first !== '*') || trimmed[trimmed.length - 1] !== first) return null;
  return trimmed.slice(1, -1).trim();
}

function isDash(code: number): boolean {
  return code === 45 || code === 0x2013 || code === 0x2014;
}

function lowerSlice(text: string, length: number): string {
  return text.slice(0, length).toLowerCase();
}

// ---------------------------------------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------------------------------------

const SEED_SIZES: ReadonlyMap<string, SeedScope> = new Map<string, SeedScope>([
  ['small', 'Small'],
  ['medium', 'Medium'],
  ['large', 'Large'],
]);

function stemOf(path: string): string {
  const slash = path.lastIndexOf('/');
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

function isAllDigits(text: string): boolean {
  if (text === '') return false;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function isAlnum(text: string): boolean {
  if (text === '') return false;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const ok = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (!ok) return false;
  }
  return true;
}

/**
 * The id a seed file name carries: `SEED-260411-m2x-borrower-reminders` gives `SEED-260411-m2x`,
 * `SEED-003-paper-forms` gives `SEED-003`. A stem that does not start `SEED-` plus digits is its own id.
 */
export function seedIdFromStem(stem: string): string {
  const parts = stem.split('-');
  if (parts.length < 2 || parts[0].toUpperCase() !== 'SEED' || !isAllDigits(parts[1])) return stem;
  if (parts[1].length === 6 && parts.length >= 3 && parts[2].length === 3 && isAlnum(parts[2])) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  return `${parts[0]}-${parts[1]}`;
}

/** The id and idea a `# {id}: {idea}` heading carries; `id` is null when the heading has no `token:` lead. */
function splitSeedHeading(heading: string): { id: string | null; idea: string } {
  const colon = heading.indexOf(':');
  if (colon > 0) {
    const lead = heading.slice(0, colon).trim();
    if (lead !== '' && !lead.includes(' ')) {
      const idea = heading.slice(colon + 1).trim();
      return { id: lead, idea };
    }
  }
  return { id: null, idea: heading };
}

function readAudit(value: unknown): SeedAudit | null {
  if (!isRecord(value)) return null;
  const milestone = scalarText(own(value, 'milestone'));
  const at = scalarText(own(value, 'at'));
  const status = scalarText(own(value, 'status'));
  return milestone === null && at === null && status === null ? null : { milestone, at, status };
}

function scopeFromWord(word: string): SeedScope | null {
  return SEED_SIZES.get(word.trim().toLowerCase()) ?? null;
}

function isStockSurfaceSentence(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return lower.startsWith('this seed will surface during') && lower.includes('when the milestone scope matches');
}

export function extractSeed(path: string, frontmatter: Record<string, unknown>, body: string): SeedLift {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  const stem = stemOf(path);

  // The heading: `# {id}: {idea}`.
  const heading = firstH1(lines);
  const split = heading === null ? null : splitSeedHeading(heading);

  const fmId = scalarText(own(frontmatter, 'id'));
  let id: string;
  if (fmId !== null) id = fmId;
  else if (split !== null && split.id !== null && stem.toLowerCase().startsWith(split.id.toLowerCase())) id = split.id;
  else id = seedIdFromStem(stem);

  const idea = split === null ? null : split.idea === '' ? null : capText(split.idea, 500);

  // Sections.
  const why = findSection(sections, 2, (h) => h === 'why this matters');
  const surface = findSection(sections, 2, (h) => h === 'when to surface');
  const scopeSection = findSection(sections, 2, (h) => h === 'scope estimate');
  const crumbs = findSection(sections, 2, (h) => h === 'breadcrumbs');
  const notes = findSection(sections, 2, (h) => h === 'notes');

  // The surfacing condition: frontmatter, else the `**Trigger:**` line (in When to Surface, else anywhere).
  let sectionTrigger: string | null = null;
  const surfaceText: string[] = [];
  if (surface !== undefined) {
    eachLineOutsideFences(lines, surface.startLine + 1, surface.endLine, (line) => {
      const labelled = boldLabelLine(line);
      if (labelled !== null && labelled.label.toLowerCase() === 'trigger') {
        if (sectionTrigger === null && labelled.value !== '') sectionTrigger = labelled.value;
        return;
      }
      if (isStockSurfaceSentence(line)) return;
      surfaceText.push(line);
    });
  }
  let triggerWhen = scalarText(own(frontmatter, 'trigger_when'));
  if (triggerWhen === null) triggerWhen = sectionTrigger;
  if (triggerWhen === null) {
    eachLineOutsideFences(lines, 0, lines.length, (line) => {
      if (triggerWhen !== null) return;
      const labelled = boldLabelLine(line);
      if (labelled !== null && labelled.label.toLowerCase() === 'trigger' && labelled.value !== '') triggerWhen = labelled.value;
    });
  }

  // The scope: frontmatter, else the Scope Estimate's bold size word.
  let scope: SeedScope | null = null;
  const fmScope = scalarText(own(frontmatter, 'scope'));
  if (fmScope !== null) scope = scopeFromWord(fmScope);
  let scopeEstimate: string | null = null;
  if (scopeSection !== undefined) {
    const text = sectionBody(lines, scopeSection);
    let gloss = text;
    if (text.startsWith('**')) {
      const close = text.indexOf('**', 2);
      if (close > 2) {
        const word = text.slice(2, close);
        if (scope === null) scope = scopeFromWord(word);
        gloss = text.slice(close + 2).trim();
        let k = 0;
        while (k < gloss.length && (isDash(gloss.charCodeAt(k)) || gloss.charCodeAt(k) === 32 || gloss.charCodeAt(k) === 58)) k += 1;
        gloss = gloss.slice(k).trim();
        if (word.trim().toLowerCase() === 'unknown') gloss = '';
      }
    }
    scopeEstimate = gloss === '' ? null : gloss;
  }

  const whyText = sectionBody(lines, why);
  const whyIsPlaceholder = lowerSlice(wrappedInner(whyText) ?? whyText, 'to be filled in'.length) === 'to be filled in';

  const noteText = sectionBody(lines, notes);
  const noteInner = wrappedInner(noteText);
  const noteIsBoilerplate = noteInner !== null && noteInner.toLowerCase().startsWith('captured via one-shot seed capture');

  const breadcrumbs = crumbs === undefined ? [] : listItems(sectionLines(lines, crumbs));
  const surfaceBlock = blockText(surfaceText);

  return {
    id,
    idea,
    status: scalarText(own(frontmatter, 'status')),
    planted: scalarText(own(frontmatter, 'planted')),
    plantedDuring: scalarText(own(frontmatter, 'planted_during')),
    triggerWhen,
    scope,
    auditAcknowledged: readAudit(own(frontmatter, 'audit_acknowledged')),
    why: whyText === '' || whyIsPlaceholder ? null : whyText,
    whenToSurface: { trigger: sectionTrigger, text: surfaceBlock === '' ? null : surfaceBlock },
    scopeEstimate,
    breadcrumbs,
    notes: noteText === '' || noteIsBoilerplate ? null : noteText,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Thread
// ---------------------------------------------------------------------------------------------------------

/** `*(add links, ...)*` and `_(what the next session ...)_`: an italic wrapper around a parenthesis. */
export function isPlaceholderBullet(text: string): boolean {
  const inner = wrappedInner(text);
  return inner !== null && inner.startsWith('(') && inner.endsWith(')');
}

function realItems(lines: readonly string[]): string[] {
  return listItems(lines).filter((item) => !isPlaceholderBullet(item));
}

/** The status word of an older-shape `## Status: OPEN` heading, else null. */
function statusFromHeading(sections: readonly FencedSection[]): string | null {
  for (const section of sections) {
    if (section.level !== 2) continue;
    const heading = section.heading.trim();
    if (heading.toLowerCase().startsWith('status')) {
      let rest = heading.slice('status'.length).trim();
      if (rest.startsWith(':')) rest = rest.slice(1).trim();
      else continue;
      return rest === '' ? null : capText(rest, 100);
    }
  }
  return null;
}

export function extractThread(frontmatter: Record<string, unknown>, body: string): ThreadLift {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);

  const heading = firstH1(lines);
  let headingTitle: string | null = heading;
  if (heading !== null && heading.toLowerCase().startsWith('thread:')) {
    const rest = heading.slice('thread:'.length).trim();
    headingTitle = rest === '' ? null : rest;
  }

  const goal = findSection(sections, 2, (h) => h === 'goal');
  const context = findSection(sections, 2, (h) => h === 'context');
  const references = findSection(sections, 2, (h) => h === 'references');
  const nextSteps = findSection(sections, 2, (h) => h === 'next steps');

  const goalText = sectionBody(lines, goal);
  const contextText = sectionBody(lines, context);

  return {
    slug: scalarText(own(frontmatter, 'slug')),
    title: scalarText(own(frontmatter, 'title')) ?? headingTitle,
    status: scalarText(own(frontmatter, 'status')) ?? statusFromHeading(sections),
    created: scalarText(own(frontmatter, 'created')),
    updated: scalarText(own(frontmatter, 'updated')),
    goal: goalText === '' ? null : goalText,
    context: contextText === '' ? null : contextText,
    references: references === undefined ? [] : realItems(sectionLines(lines, references)),
    nextSteps: nextSteps === undefined ? [] : realItems(sectionLines(lines, nextSteps)),
  };
}
