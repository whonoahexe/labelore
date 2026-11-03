// The API coverage composer (Phase 9, 09-15, VIEW-10): a pure `ViewInput` -> `ComposedCoverage` merge of
// `structured.coverage` (the tolerant reading the handler made of a COVERAGE.md). The common file is one line,
// "No external API integration: <why>", and opens as a single quiet card reading "No external API in this phase"
// with the file's reason beneath it - no matrix and no counts (D-14). No DOM, no filesystem access, no
// rendering, no regular expression and no module-level state: two coverage pages open at once each compose only
// from their own input. Returns `null` when the projection is missing or the file holds neither a "none"
// paragraph nor a matrix, so the page keeps the promoted-section view (UI-SPEC error consideration).
// T-09-31: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const COVERAGE_EYEBROW = 'API coverage';
export const NO_API_HEADING = 'No external API in this phase';

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

export interface ComposedCoverage {
  intro: ComposedCoverageIntro;
  card: ComposedCoverageCard | null;
  matrix: null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Composes the coverage page, or `null` when the file holds neither a "none" paragraph nor a matrix. */
export function composeCoverage(input: ViewInput): ComposedCoverage | null {
  const raw = input.structured.coverage;
  if (!isRecord(raw)) return null;
  const none = raw.none;
  if (!isRecord(none)) return null;
  return {
    intro: { eyebrow: COVERAGE_EYEBROW, title: textOrNull(raw.h1) ?? COVERAGE_EYEBROW },
    card: { heading: NO_API_HEADING, reason: textOrNull(none.reason) },
    matrix: null,
  };
}
