// The API coverage composer (Phase 9, 09-15, VIEW-10): a pure `ViewInput` -> `ComposedCoverage` merge of
// `structured.coverage` (the tolerant reading the handler made of a COVERAGE.md). Two shapes:
//   - the common file is one line, "No external API integration: <why>", and opens as a single quiet card reading
//     "No external API in this phase" with the file's reason beneath it - no matrix and no counts (D-14);
//   - a file holding a capability matrix shows "{n} integrated, {m} opted out" with a two-segment bar (complete,
//     then quiet), the file's lead lines as a caption, then the Integrated and Opted out groups in file order.
//     Every row carries a decision chip (Integrate complete, Opt out quiet) and the reason; an opt-out with no
//     reason says "No reason given". Any other decision value goes verbatim to a final Other group. Nothing on
//     the page is drawn missing: a capability that is opted out is a decision, not a gap.
// When both exist the matrix wins. No DOM, no filesystem access, no rendering, no regular expression and no
// module-level state: two coverage pages open at once each compose only from their own input. Returns `null` when
// the projection is missing or the file holds neither shape, so the page keeps the promoted-section view
// (UI-SPEC error consideration).
// T-09-31: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const COVERAGE_EYEBROW = 'API coverage';
export const NO_API_HEADING = 'No external API in this phase';
export const NO_REASON = 'No reason given';
export const NO_DECISION = 'No decision';

/** The two tones this page writes: a decision is `complete` or `quiet`, never missing. */
export type CoverageTone = 'complete' | 'quiet';

export interface ComposedCoverageIntro {
  eyebrow: 'API coverage';
  /** The file's H1, else 'API coverage'. */
  title: string;
}

export interface ComposedCoverageCard {
  heading: 'No external API in this phase';
  /** The file's reason, or null when it gives none. */
  reason: string | null;
}

export interface ComposedCoverageRow {
  capability: string;
  /** The decision chip's text: 'Integrate', 'Opt out', or the decision as written. */
  chip: string;
  tone: CoverageTone;
  reason: string | null;
  /** True for an opt-out with no reason: the row says so on a dashed quiet line. */
  noReason: boolean;
}

export interface ComposedCoverageGroup {
  key: 'integrated' | 'opted-out' | 'other';
  label: 'Integrated' | 'Opted out' | 'Other';
  tone: CoverageTone;
  rows: ComposedCoverageRow[];
}

export interface ComposedCoverageMatrix {
  /** "3 integrated, 2 opted out". */
  summary: string;
  integrated: number;
  optedOut: number;
  /** The file's lead lines, shown as a quiet caption. */
  lead: string[];
  /** Integrated, Opted out and Other in that order, empty groups omitted, rows in file order. */
  groups: ComposedCoverageGroup[];
}

export interface ComposedCoverage {
  intro: ComposedCoverageIntro;
  card: ComposedCoverageCard | null;
  matrix: ComposedCoverageMatrix | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

interface ReadRow {
  capability: string;
  decision: 'integrate' | 'opt-out' | 'other';
  decisionRaw: string;
  reason: string | null;
}

function readRow(value: unknown): ReadRow | null {
  if (!isRecord(value)) return null;
  const decision = value.decision === 'integrate' || value.decision === 'opt-out' ? value.decision : 'other';
  return {
    capability: text(value.capability),
    decision,
    decisionRaw: text(value.decisionRaw),
    reason: textOrNull(value.reason),
  };
}

function composeMatrix(value: unknown): ComposedCoverageMatrix | null {
  if (!isRecord(value) || !Array.isArray(value.rows)) return null;
  const integrated: ComposedCoverageRow[] = [];
  const optedOut: ComposedCoverageRow[] = [];
  const other: ComposedCoverageRow[] = [];
  for (const item of value.rows) {
    const row = readRow(item);
    if (row === null) continue;
    if (row.decision === 'integrate') {
      integrated.push({ capability: row.capability, chip: 'Integrate', tone: 'complete', reason: row.reason, noReason: false });
    } else if (row.decision === 'opt-out') {
      optedOut.push({
        capability: row.capability,
        chip: 'Opt out',
        tone: 'quiet',
        reason: row.reason,
        noReason: row.reason === null,
      });
    } else {
      other.push({
        capability: row.capability,
        chip: row.decisionRaw === '' ? NO_DECISION : row.decisionRaw,
        tone: 'quiet',
        reason: row.reason,
        noReason: false,
      });
    }
  }
  if (integrated.length + optedOut.length + other.length === 0) return null;
  const groups: ComposedCoverageGroup[] = [];
  if (integrated.length > 0) groups.push({ key: 'integrated', label: 'Integrated', tone: 'complete', rows: integrated });
  if (optedOut.length > 0) groups.push({ key: 'opted-out', label: 'Opted out', tone: 'quiet', rows: optedOut });
  if (other.length > 0) groups.push({ key: 'other', label: 'Other', tone: 'quiet', rows: other });
  const lead = Array.isArray(value.lead)
    ? value.lead.filter((line): line is string => typeof line === 'string' && line.trim() !== '').map((line) => line.trim())
    : [];
  return {
    summary: `${integrated.length} integrated, ${optedOut.length} opted out`,
    integrated: integrated.length,
    optedOut: optedOut.length,
    lead,
    groups,
  };
}

/** Composes the coverage page, or `null` when the file holds neither a matrix nor a "none" paragraph. */
export function composeCoverage(input: ViewInput): ComposedCoverage | null {
  const raw = input.structured.coverage;
  if (!isRecord(raw)) return null;
  const intro: ComposedCoverageIntro = { eyebrow: COVERAGE_EYEBROW, title: textOrNull(raw.h1) ?? COVERAGE_EYEBROW };
  const matrix = composeMatrix(raw.matrix);
  if (matrix !== null) return { intro, card: null, matrix };
  if (!isRecord(raw.none)) return null;
  return { intro, card: { heading: NO_API_HEADING, reason: textOrNull(raw.none.reason) }, matrix: null };
}
