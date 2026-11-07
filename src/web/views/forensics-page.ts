// The forensics page's composer (Phase 11, 11-25, VIEW-18, D-03, sketch 060 winner B "Evidence rail"): a pure `ViewInput` ->
// `ComposedForensics` merge of the forensics lift (11-20's `structured.forensics`). A forensics report is what `/gsd-forensics`
// concluded about a stalled or confusing project; the page answers "what went wrong, and what should I do about it?":
//   - the head: the eyebrow "Forensics", the report's own title as the h1 and "Generated {stamp}" as meta; the Problem sentence
//     the report opens with stands under it as a quiet note;
//   - the left column, in the report's own order: "Root cause hypothesis" (the writer's paragraph, verbatim), "Recommended
//     actions" (numbered, verbatim, in the writer's order) and "Anomalies" (one card each, HIGH first, with an untoned
//     confidence chip, the Evidence and the Interpretation);
//   - the right rail: "Artifact completeness" as a heat map (artifacts down, phases across, a square and the cell's own note
//     or the word "Absent" in each) and the "Evidence summary" (a small axis of the git span, then the Git Activity and
//     Planning State lists as the report wrote them).
// Nothing is re-worded, merged or reordered except the anomalies, which the lift already orders HIGH, MEDIUM, LOW and then any
// other word. A report with no anomalies says "No anomalies were detected." in that place. The composer computes only what the
// file's own fields give: the anomaly numbers, the absent count and the positions on the git axis. It holds no DOM, no
// filesystem access, no rendering, no regular expression and no module-level mutable state, and it reads no clock. It returns
// `null` when the forensics lift is missing or carries nothing the page can show, so the page keeps the promoted-section view
// with no notice (Phase 10 C1, X2). T-11-40: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const FORENSICS_EYEBROW = 'Forensics';
export const PROBLEM_LABEL = 'Problem';
export const HYPOTHESIS_LABEL = 'Root cause hypothesis';
export const ACTIONS_LABEL = 'Recommended actions';

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedForensicsHead {
  eyebrow: string;
  /** The report's own title; null leaves the file's title. */
  title: string | null;
  generated: string | null;
  /** The report's own Problem sentence, else null. */
  problem: string | null;
}

export interface ComposedForensics {
  head: ComposedForensicsHead;
  /** The hypothesis as the writer's paragraphs, in order; empty when the report has none. */
  hypothesis: string[];
  /** The recommended actions in the writer's order and words; empty when the report has none. */
  actions: string[];
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

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

function forensicsOf(input: ViewInput): Record<string, unknown> | null {
  const forensics = isRecord(input.structured) ? input.structured.forensics : undefined;
  return isRecord(forensics) ? forensics : null;
}

/** A text as its paragraphs: a blank line ends one, and a line that starts a bullet starts one. Lines of a paragraph are joined
 * with a space, so the words are the writer's and only the line breaks go. */
export function paragraphsOf(text: string | null): string[] {
  if (text === null) return [];
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) paragraphs.push(current.join(' '));
    current = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) flush();
    current.push(line);
  }
  flush();
  return paragraphs;
}

// ---------------------------------------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------------------------------------

/** The forensics page's model, or `null` when the input carries no forensics lift (the promoted-section view then renders with
 * no notice). */
export function composeForensics(input: ViewInput): ComposedForensics | null {
  try {
    const forensics = forensicsOf(input);
    if (forensics === null) return null;
    const hypothesis = paragraphsOf(textOrNull(forensics.hypothesis));
    const actions = stringList(forensics.actions);
    if (hypothesis.length === 0 && actions.length === 0) return null;
    return {
      head: {
        eyebrow: FORENSICS_EYEBROW,
        title: textOrNull(forensics.title),
        generated: textOrNull(forensics.generated),
        problem: textOrNull(forensics.problem),
      },
      hypothesis,
      actions,
    };
  } catch {
    return null;
  }
}
