// The seed page's composer (Phase 11, 11-22, VIEW-15, D-02, sketch 057 winner C "Seed packet"): a pure `ViewInput` ->
// `ComposedSeed` merge of the seed lift (11-20's `structured.seed`) and the links context (the Breadcrumbs resolved to
// payload addresses). The page answers "what is this idea, when should it come up, and where did it start?" as one
// envelope:
//   - the head: the eyebrow "Seed", the idea as the h1 and the id as meta;
//   - the packet: a postmark ("Planted" and the date), a dashed stamp carrying the scope letter ("Scope not stated"
//     when it is unknown or absent), "Planted during {phase}" top left, the "Surface when" sentence as the address
//     (verbatim as the author wrote it, never judged; the quiet dashed "No surfacing condition" when the seed has none)
//     and the status as a seal (dormant quiet, active and triggered in-flight, anything else verbatim quiet);
//   - below it, as folded sheets in one narrow column: `audit_acknowledged` when present, "Why this matters",
//     "Breadcrumbs" (a reference that resolves to a payload artifact is a link, every other is text), and three closed
//     bars: "Scope estimate", "When to surface" (only what the author wrote beyond the packet's sentence) and "Notes".
// Nothing here evaluates the surfacing condition: no word says it is met, due or overdue (VIEW-15). A name beside a
// value-looking string (`KEY=...`) in the prose is drawn as the name and the shared "Value not shown" mark (UI-SPEC
// section 1, rule 8, T-11-37). The composer holds no DOM, no filesystem access, no rendering, no regular expression
// and no module-level mutable state; it reads no clock (ages count to the day the project was read). It returns `null`
// when the seed lift is missing or carries nothing beyond its id and idea, so the page keeps the promoted-section view
// with no notice (Phase 10 C1, X2). T-11-35: every string is author text rendered as React text by the components.
import type { SeedLift } from '../../planning-repo/handlers/seed-thread-lift.ts';
import { splitLinkText } from '../../presentation/seed-thread-links.ts';
import type { SeedThreadLink } from '../../presentation/seed-thread-links.ts';
import { dayOfIso } from './pause-page.ts';
import type { ViewInput } from './manifest.ts';

export const SEED_EYEBROW = 'Seed';
export const SURFACE_WHEN_LABEL = 'Surface when';
export const NO_SURFACING_LABEL = 'No surfacing condition';
export const SCOPE_LABEL = 'Scope';
export const SCOPE_NOT_STATED_LABEL = 'Scope not stated';
export const PLANTED_LABEL = 'Planted';
export const PLANTED_DURING_LABEL = 'Planted during';
export const BREADCRUMBS_LABEL = 'Breadcrumbs';
export const NOT_FOUND_LABEL = 'Not found';
export const AUDIT_KEY = 'audit_acknowledged';
export const WHY_LABEL = 'Why this matters';
export const SCOPE_ESTIMATE_LABEL = 'Scope estimate';
export const WHEN_TO_SURFACE_LABEL = 'When to surface';
export const NOTES_LABEL = 'Notes';
export const TRIGGER_LABEL = 'Trigger';

const MS_PER_DAY = 86_400_000;

export type SeedTone = 'quiet' | 'in-flight';

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

/** A run of an author's prose: plain text, or the name of a `NAME=value` pair whose value is never drawn. */
export type SeedSegment = { kind: 'text'; text: string } | { kind: 'withheld'; name: string };

export type ComposedSeedBlock =
  | { kind: 'paragraph'; segments: SeedSegment[] }
  | { kind: 'list'; items: SeedSegment[][] };

export interface ComposedSeedStatus {
  /** The status word as the file wrote it. */
  word: string;
  tone: SeedTone;
}

export interface ComposedSeedStamp {
  /** The scope letter, or `?` when the scope is not stated. */
  letter: string;
  /** "Small", "Medium" or "Large"; null when the scope is not stated. */
  size: string | null;
}

export interface ComposedSeedCrumb {
  key: string;
  /** The path as the author wrote it, else null for prose. */
  path: string | null;
  /** The words beside the path; for prose the whole bullet. */
  text: string | null;
  /** The in-app address of the payload artifact the path names. */
  url: string | null;
  /** `resolved` is a link; `not-found` is a path that names no payload artifact; `text` is prose or an unchecked path. */
  state: 'resolved' | 'not-found' | 'text';
}

export interface ComposedSeedBar {
  key: 'estimate' | 'when' | 'notes';
  title: string;
  /** The count cell: the size word on the estimate bar. */
  count: string | null;
  /** A bold word that opens the body: the size word on the estimate bar. */
  strong: string | null;
  /** The section's own `**Trigger:**` line, when it says something the packet's sentence does not. */
  trigger: string | null;
  blocks: ComposedSeedBlock[];
}

export interface ComposedSeed {
  head: {
    eyebrow: string;
    /** The idea; null leaves the file's own title. */
    title: string | null;
    id: string;
  };
  packet: {
    /** "Planted during" value, e.g. "v1.0 / Phase 4 (Shed-to-Shed Transfers)". */
    plantedDuring: string | null;
    /** The planted day, `YYYY-MM-DD`, as the file wrote it. */
    planted: string | null;
    stamp: ComposedSeedStamp;
    /** The trigger sentence verbatim; null draws the quiet dashed "No surfacing condition". */
    surfaceWhen: string | null;
    /** "{n} days since planted", counted to the day the project was read; null when either date is unknown. */
    age: string | null;
    status: ComposedSeedStatus | null;
  };
  /** "v1.0 · 2026-03-20 · dormant": the parts of `audit_acknowledged` that exist; null when the key is absent. */
  audit: string | null;
  why: ComposedSeedBlock[];
  breadcrumbs: ComposedSeedCrumb[];
  bars: ComposedSeedBar[];
}

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

/** The tone of a seed's status word: active and triggered are in flight, every other word (dormant included) is quiet. */
export function seedStatusTone(word: string): SeedTone {
  const lower = word.trim().toLowerCase();
  return lower === 'active' || lower === 'triggered' ? 'in-flight' : 'quiet';
}

/** "{n} days since planted" from whole UTC days between the planted day and the day the project was read. */
export function sincePlantedWords(planted: string | null, readAt: string | null | undefined): string | null {
  const from = dayOfIso(planted);
  const to = dayOfIso(readAt);
  if (from === null || to === null) return null;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
  if (days < 0) return null;
  if (days === 0) return 'planted today';
  return days === 1 ? '1 day since planted' : `${days} days since planted`;
}

function isNameCode(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 48 && code <= 57) || code === 95;
}

/** The variable name when `word` is a `NAME=value` pair (upper-case name of two characters or more, a value after the
 * equals sign), tolerating an opening backtick, bracket or quote; else null. */
function withheldNameOf(word: string): string | null {
  let start = 0;
  while (start < word.length && '`("\''.includes(word.charAt(start))) start += 1;
  const equals = word.indexOf('=', start);
  if (equals < start + 2 || equals >= word.length - 1) return null;
  const first = word.charCodeAt(start);
  if (first < 65 || first > 90) return null;
  for (let at = start; at < equals; at += 1) if (!isNameCode(word.charCodeAt(at))) return null;
  return word.slice(start, equals);
}

/** The prose as plain-text runs and the names of `NAME=value` pairs, their values dropped (UI-SPEC section 1, rule 8). */
export function segmentsOf(text: string): SeedSegment[] {
  const segments: SeedSegment[] = [];
  let pending = '';
  let word = '';
  const flushText = (): void => {
    if (pending !== '') segments.push({ kind: 'text', text: pending });
    pending = '';
  };
  const endWord = (): void => {
    if (word === '') return;
    const name = withheldNameOf(word);
    if (name === null) {
      pending += word;
    } else {
      flushText();
      segments.push({ kind: 'withheld', name });
    }
    word = '';
  };
  for (const char of text) {
    if (char === ' ' || char === '\n' || char === '\t') {
      endWord();
      pending += char;
    } else {
      word += char;
    }
  }
  endWord();
  flushText();
  return segments;
}

/** Blank-line separated blocks of an author's text; a block whose every line starts "- " or "* " is a list. */
export function blocksOf(text: string | null | undefined): ComposedSeedBlock[] {
  if (typeof text !== 'string') return [];
  const blocks: ComposedSeedBlock[] = [];
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.length === 0) return;
    const bullets = lines.every((line) => line.startsWith('- ') || line.startsWith('* '));
    blocks.push(
      bullets
        ? { kind: 'list', items: lines.map((line) => segmentsOf(line.slice(2).trim())) }
        : { kind: 'paragraph', segments: segmentsOf(lines.join('\n')) },
    );
    lines = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim() === '') flush();
    else lines.push(line.trimStart());
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** The seed lift as the response carries it (JSON, so every field is read defensively), or null. */
function seedOf(input: ViewInput): SeedLift | null {
  const seed = isRecord(input.structured) ? input.structured.seed : undefined;
  if (!isRecord(seed)) return null;
  const when = isRecord(seed.whenToSurface) ? seed.whenToSurface : {};
  const audit = isRecord(seed.auditAcknowledged) ? seed.auditAcknowledged : null;
  const scope = seed.scope === 'Small' || seed.scope === 'Medium' || seed.scope === 'Large' ? seed.scope : null;
  return {
    id: textOrNull(seed.id) ?? '',
    idea: textOrNull(seed.idea),
    status: textOrNull(seed.status),
    planted: textOrNull(seed.planted),
    plantedDuring: textOrNull(seed.plantedDuring),
    triggerWhen: textOrNull(seed.triggerWhen),
    scope,
    auditAcknowledged:
      audit === null
        ? null
        : { milestone: textOrNull(audit.milestone), at: textOrNull(audit.at), status: textOrNull(audit.status) },
    why: textOrNull(seed.why),
    whenToSurface: { trigger: textOrNull(when.trigger), text: textOrNull(when.text) },
    scopeEstimate: textOrNull(seed.scopeEstimate),
    breadcrumbs: stringList(seed.breadcrumbs),
    notes: textOrNull(seed.notes),
  };
}

function hasAnyKnownField(seed: SeedLift): boolean {
  return (
    seed.status !== null ||
    seed.planted !== null ||
    seed.plantedDuring !== null ||
    seed.triggerWhen !== null ||
    seed.scope !== null ||
    seed.auditAcknowledged !== null ||
    seed.why !== null ||
    seed.whenToSurface.trigger !== null ||
    seed.whenToSurface.text !== null ||
    seed.scopeEstimate !== null ||
    seed.breadcrumbs.length > 0 ||
    seed.notes !== null
  );
}

function auditOf(seed: SeedLift): string | null {
  const audit = seed.auditAcknowledged;
  if (audit === null) return null;
  const parts = [audit.milestone, audit.at, audit.status].filter((part): part is string => part !== null);
  return parts.length === 0 ? '' : parts.join(' · ');
}

function linkIsUsable(link: unknown): link is SeedThreadLink {
  return isRecord(link) && typeof link.text === 'string';
}

/** The Breadcrumbs: the server's resolved links when they match the lift's list, else the lift's bullets as text. */
function crumbsOf(input: ViewInput, seed: SeedLift): ComposedSeedCrumb[] {
  const links = input.seedThreadLinks;
  const resolved =
    links !== null &&
    links !== undefined &&
    links.kind === 'seed' &&
    Array.isArray(links.breadcrumbs) &&
    links.breadcrumbs.length === seed.breadcrumbs.length &&
    links.breadcrumbs.every(linkIsUsable);
  return seed.breadcrumbs.map((bullet, at): ComposedSeedCrumb => {
    const key = `crumb-${at}`;
    if (resolved && links !== null && links !== undefined) {
      const link = links.breadcrumbs[at]!;
      const url = typeof link.url === 'string' && link.url !== '' ? link.url : null;
      if (link.path === null || link.path === undefined) {
        return { key, path: null, text: link.text, url: null, state: 'text' };
      }
      return { key, path: link.path, text: link.description ?? null, url, state: url === null ? 'not-found' : 'resolved' };
    }
    const { path, description } = splitLinkText(bullet);
    return path === null
      ? { key, path: null, text: bullet, url: null, state: 'text' }
      : { key, path, text: description, url: null, state: 'text' };
  });
}

function barsOf(seed: SeedLift): ComposedSeedBar[] {
  const bars: ComposedSeedBar[] = [];
  if (seed.scopeEstimate !== null) {
    bars.push({
      key: 'estimate',
      title: SCOPE_ESTIMATE_LABEL,
      count: seed.scope,
      strong: seed.scope,
      trigger: null,
      blocks: blocksOf(seed.scopeEstimate),
    });
  }
  const sectionTrigger = seed.whenToSurface.trigger;
  const extra = sectionTrigger !== null && sectionTrigger !== seed.triggerWhen ? sectionTrigger : null;
  const whenBlocks = blocksOf(seed.whenToSurface.text);
  if (extra !== null || whenBlocks.length > 0) {
    bars.push({ key: 'when', title: WHEN_TO_SURFACE_LABEL, count: null, strong: null, trigger: extra, blocks: whenBlocks });
  }
  if (seed.notes !== null) {
    bars.push({ key: 'notes', title: NOTES_LABEL, count: null, strong: null, trigger: null, blocks: blocksOf(seed.notes) });
  }
  return bars;
}

/** The seed page's model, or `null` when the input carries no seed lift or the lift holds only an id and an idea (the
 * promoted-section view then renders with no notice). */
export function composeSeed(input: ViewInput): ComposedSeed | null {
  try {
    const seed = seedOf(input);
    if (seed === null || !hasAnyKnownField(seed)) return null;
    const readAt = input.seedThreadLinks?.readAt ?? null;
    return {
      head: { eyebrow: SEED_EYEBROW, title: seed.idea, id: seed.id },
      packet: {
        plantedDuring: seed.plantedDuring,
        planted: seed.planted,
        stamp: { letter: seed.scope === null ? '?' : seed.scope.charAt(0), size: seed.scope },
        surfaceWhen: seed.triggerWhen,
        age: sincePlantedWords(seed.planted, readAt),
        status: seed.status === null ? null : { word: seed.status, tone: seedStatusTone(seed.status) },
      },
      audit: auditOf(seed),
      why: blocksOf(seed.why),
      breadcrumbs: crumbsOf(input, seed),
      bars: barsOf(seed),
    };
  } catch {
    return null;
  }
}
