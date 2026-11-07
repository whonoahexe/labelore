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

export interface ComposedOnboarding {
  head: ComposedOnboardingHead;
  next: ComposedOnboardingNext;
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

/** A command as the copy row shows and copies it: control and invisible format characters (a bidirectional override, a zero-width
 * character, a line break) removed, so what is copied is the visible text on one line (T-11-39). Ordinary text is untouched. */
function commandOrNull(value: unknown): string | null {
  return typeof value === 'string' ? textOrNull(stripControlCharacters(value)) : null;
}

function liftOf(input: ViewInput): Record<string, unknown> | null {
  const lift = isRecord(input.structured) ? input.structured.onboarding : undefined;
  return isRecord(lift) ? lift : null;
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
    return {
      head: { eyebrow: ONBOARDING_EYEBROW },
      next: { command, labelled: context?.differs === true },
    };
  } catch {
    return null;
  }
}
