// The onboarding page's composer (Phase 11, 11-26, VIEW-18, D-03, RESEARCH C11, sketch 061 winner A "Desk"): a pure `ViewInput` ->
// `ComposedOnboarding` merge of the onboarding lift (11-20's `structured.onboarding`) and the onboarding context (11-20's
// `buildOnboardingContext`, carried on the document response). `/gsd-onboard` writes `onboarding/SUMMARY.md`; the page answers
// "what should I run next?" before it shows anything else:
//   - the head: the eyebrow "Onboarding" and the file's own title as the h1;
//   - "Recommended next step": the summary's command, verbatim, in the shared copy-command row, and once under it the sentence
//     that Labelore does not run commands. The command is text and the only action is copying it;
//   - when a map-only project's first screen suggests a different command, a second quiet block "The first screen suggests"
//     with the first screen's own reason and command. The two are never merged and neither is hidden; the summary's command
//     then carries the quiet line "From the onboarding summary". On any other project the block is absent;
//   - "Your project files" (the four planning files, present or "Not found"), "Codebase" (the readiness chip in the Phase 10
//     words, the mapped-document count out of the map's seven) and "Documents" (the candidate count).
// The composer computes only what the file's own fields give: the present count, the mapped-document figure (the leading number
// of the map's parenthetical) and whether the two commands differ (taken from the context). A line it cannot read leaves its
// figure out and the plain line stays. It holds no DOM, no filesystem access, no rendering, no regular expression, no clock and
// no module-level mutable state. It returns `null` when the onboarding lift is missing or carries nothing the page can show,
// so the page keeps the promoted-section view with no notice (Phase 10 C1, X2). T-11-58: every string is author text rendered
// as React text by the components.
import { stripControlCharacters } from '../../planning-repo/handlers/withhold-values.ts';
import type { ViewInput } from './manifest.ts';

export const ONBOARDING_EYEBROW = 'Onboarding';
export const NEXT_LABEL = 'Recommended next step';
/** Said once, under the summary's command. The page makes no request and runs nothing (T-11-39). */
export const NEVER_RUNS = 'Labelore does not run commands. Paste it in your terminal.';
export const NO_COMMAND = 'No command in the summary.';
/** The quiet line over the summary's command, drawn only when the first screen suggests a different one. */
export const FROM_SUMMARY = 'From the onboarding summary';
export const FILES_LABEL = 'Your project files';
export const CODEBASE_LABEL = 'Codebase';
export const DOCUMENTS_LABEL = 'Documents';
/** The label of the quiet second block: the command the Phase 10 map-only first screen suggests. */
export const FIRST_SCREEN_LABEL = 'The first screen suggests';
export const NOT_FOUND_WORD = 'Not found';
export const NOT_STATED_WORD = 'Not stated';
export const NO_MAP_WORD = 'No map';
export const NO_CANDIDATES = 'No candidates';
/** The seven documents a complete codebase map holds (Phase 10). */
export const MAP_DOCUMENT_TOTAL = 7;
/** The pile draws at most this many sheets, however many candidates there are. */
export const PILE_MAX = 5;

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedOnboardingHead {
  eyebrow: string;
}

export interface ComposedOnboardingNext {
  /** The summary's Recommended Next Step as `/gsd-onboard` wrote it; null when the file has none. */
  command: string | null;
  /** True when the first screen suggests a different command, so the summary's carries the quiet "From the onboarding summary". */
  labelled: boolean;
}

/** The map-only first screen's own command and reason, carried apart; present only when it differs from the summary's. */
export interface ComposedFirstScreen {
  command: string;
  reason: string;
}

export interface ComposedOnboardingFile {
  key: string;
  name: string;
  /** true for `present`, false for `missing`, null for any other word. */
  present: boolean | null;
}

export interface ComposedOnboardingFiles {
  rows: ComposedOnboardingFile[];
  present: number;
  /** "{present} of {total}": counted here from the rows, never written by the summary. */
  summary: string;
}

export type ReadinessTone = 'complete' | 'in-flight';

/** The readiness chip in the Phase 10 words. A word outside the three is shown as written in a dashed plain chip. */
export interface ComposedReadiness {
  /** "Complete map", "Fast map", "Partial map", or the word as written. */
  label: string;
  /** Null for a word outside the three: an untoned dashed chip. */
  tone: ReadinessTone | null;
}

export interface ComposedOnboardingCodebase {
  /** True when the summary names a map path (not `missing`). */
  found: boolean;
  /** The chip, or null for `none` and for no line. */
  readiness: ComposedReadiness | null;
  /** True for `none`, so the facts say "None" where a chip would be. */
  readinessNone: boolean;
  mapPath: string | null;
  mapDetail: string | null;
  /** Mapped documents, the leading number of the parenthetical, when it reads and fits in seven; else null. */
  mapped: number | null;
  /** "{n} of 7 documents mapped", "No map" or "Documents mapped: not stated". */
  caption: string;
  brownfield: boolean | null;
  fastMap: boolean | null;
}

export interface ComposedOnboardingDocuments {
  /** The candidate count; null when the summary has no line for it. */
  count: number | null;
  /** "{n} ADR, PRD, SPEC or RFC candidates", "No candidates" or "Not stated". */
  line: string;
  /** The sheets the pile draws: the count clamped to 1 to 5, and 1 for none (a dashed empty sheet). */
  layers: number;
}

export interface ComposedOnboarding {
  head: ComposedOnboardingHead;
  next: ComposedOnboardingNext;
  firstScreen: ComposedFirstScreen | null;
  /** Null when the summary has no Project State lines. */
  files: ComposedOnboardingFiles | null;
  codebase: ComposedOnboardingCodebase;
  documents: ComposedOnboardingDocuments;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/** A command as the copy row shows and copies it: control and invisible format characters (a bidirectional override, a zero-width
 * character, a line break) removed, so what is copied is the visible text on one line (T-11-39). Ordinary text is untouched. */
function commandOrNull(value: unknown): string | null {
  return typeof value === 'string' ? textOrNull(stripControlCharacters(value)) : null;
}

function liftOf(input: ViewInput): Record<string, unknown> | null {
  const lift = isRecord(input.structured) ? input.structured.onboarding : undefined;
  return isRecord(lift) ? lift : null;
}

/** The leading decimal figure of a text as a number, or null; no regular expression. */
function leadingNumber(text: string | null): number | null {
  if (text === null) return null;
  let end = 0;
  while (end < text.length && end < 9 && text.charCodeAt(end) >= 48 && text.charCodeAt(end) <= 57) end += 1;
  return end === 0 ? null : Number(text.slice(0, end));
}

// ---------------------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------------------

function filesOf(value: unknown): ComposedOnboardingFiles | null {
  if (!Array.isArray(value)) return null;
  const rows: ComposedOnboardingFile[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const name = textOrNull(entry.name);
    if (name === null) continue;
    rows.push({ key: `${rows.length}-${name}`, name, present: boolOrNull(entry.present) });
  }
  if (rows.length === 0) return null;
  const present = rows.filter((row) => row.present === true).length;
  return { rows, present, summary: `${present} of ${rows.length}` };
}

function readinessOf(word: string | null): { chip: ComposedReadiness | null; none: boolean } {
  if (word === null) return { chip: null, none: false };
  const lower = word.toLowerCase();
  if (lower === 'none') return { chip: null, none: true };
  if (lower === 'complete') return { chip: { label: 'Complete map', tone: 'complete' }, none: false };
  if (lower === 'fast') return { chip: { label: 'Fast map', tone: 'in-flight' }, none: false };
  if (lower === 'partial') return { chip: { label: 'Partial map', tone: 'in-flight' }, none: false };
  return { chip: { label: word, tone: null }, none: false };
}

function codebaseOf(lift: Record<string, unknown>): ComposedOnboardingCodebase {
  const raw = isRecord(lift.codebase) ? lift.codebase : {};
  const mapPath = textOrNull(raw.mapPath);
  const mapDetail = textOrNull(raw.mapDetail);
  const found = mapPath !== null;
  const lead = found ? leadingNumber(mapDetail) : null;
  const mapped = lead !== null && lead <= MAP_DOCUMENT_TOTAL ? lead : null;
  const readiness = readinessOf(textOrNull(raw.readiness));
  return {
    found,
    readiness: readiness.chip,
    readinessNone: readiness.none,
    mapPath,
    mapDetail,
    mapped,
    caption: mapped !== null ? `${mapped} of ${MAP_DOCUMENT_TOTAL} documents mapped` : found ? 'Documents mapped: not stated' : NO_MAP_WORD,
    brownfield: boolOrNull(raw.brownfield),
    fastMap: boolOrNull(raw.fastMapAvailable),
  };
}

function documentsOf(value: unknown): ComposedOnboardingDocuments {
  const count = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  if (count === null) return { count, line: NOT_STATED_WORD, layers: 1 };
  const line = count === 0 ? NO_CANDIDATES : `${count} ADR, PRD, SPEC or RFC ${count === 1 ? 'candidate' : 'candidates'}`;
  return { count, line, layers: Math.min(Math.max(count, 1), PILE_MAX) };
}

/** The first screen's command, only when the context says it differs from the summary's and both read as text. */
function firstScreenOf(input: ViewInput, command: string | null): ComposedFirstScreen | null {
  const context = input.onboardingContext ?? null;
  if (context === null || context.differs !== true || command === null) return null;
  const screen = context.firstScreen;
  if (screen === null || screen === undefined) return null;
  const firstCommand = commandOrNull(screen.command);
  if (firstCommand === null || firstCommand === command) return null;
  return { command: firstCommand, reason: textOrNull(screen.reason) ?? '' };
}

/** True when the lift carries anything at all for the page to show. */
function hasContent(
  command: string | null,
  files: ComposedOnboardingFiles | null,
  codebase: ComposedOnboardingCodebase,
  documents: ComposedOnboardingDocuments,
): boolean {
  return (
    command !== null ||
    files !== null ||
    documents.count !== null ||
    codebase.found ||
    codebase.readiness !== null ||
    codebase.readinessNone ||
    codebase.brownfield !== null ||
    codebase.fastMap !== null
  );
}

// ---------------------------------------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------------------------------------

export function composeOnboarding(input: ViewInput): ComposedOnboarding | null {
  try {
    const lift = liftOf(input);
    if (lift === null) return null;
    const context = input.onboardingContext ?? null;
    const command = commandOrNull(context?.summaryCommand) ?? commandOrNull(lift.command);
    const files = filesOf(lift.files);
    const codebase = codebaseOf(lift);
    const documents = documentsOf(lift.docsCount);
    if (!hasContent(command, files, codebase, documents)) return null;
    const firstScreen = firstScreenOf(input, command);
    return {
      head: { eyebrow: ONBOARDING_EYEBROW },
      next: { command, labelled: firstScreen !== null },
      firstScreen,
      files,
      codebase,
      documents,
    };
  } catch {
    return null;
  }
}
