// VIEW-06's speculative structural fallback (UI-SPEC §8, RESEARCH.md § Corrected Understanding):
// an artifact whose kind has no registered manifest still opens with structure inferred from its
// shape — nested frontmatter promoted through the existing fact-list block, then every headed
// `##` section promoted in document order — rather than the dead `unknownKind` badge RESEARCH.md's
// Pitfall 1 found. This is presentation-side inference over already-parsed content only (DATA-02):
// no handler `match()` change, no new server-side kind splitting.
import { selectFacts } from './facts.ts';
import type { PromotedBlock, ViewInput, ViewManifest } from './manifest.ts';

/** The synthesized manifest `kind` VIEW-06 uses in place of the real (unregistered) `artifact.kind`
 * — also reserved in `VIEW_LOCAL_PREFIXES` (`kinds.ts`) for the `view-unrecognized-*` class
 * namespace. */
export const UNRECOGNIZED_KIND = 'unrecognized';

const CASE_A_NOTICE =
  "This file's name doesn't match a known GSD document pattern, so nothing about its type could be inferred from context. Showing its structure as found.";

/** Carries a literal `{kind}` placeholder — the page splits on it to embed the kind string inside
 * a real `<strong>` element rather than pre-rendering it into the plain-text sentence. */
const CASE_B_NOTICE =
  "Labelore doesn't yet have a dedicated view for {kind} documents. Showing what its headings and structure suggest.";

/** True when any frontmatter value is a non-null object or a non-empty array — the signal that a
 * fact-list projection of the raw frontmatter is worth promoting ahead of the full document
 * (UI-SPEC §8's "nested frontmatter" branch). */
export function hasNestedFrontmatter(frontmatter: Record<string, unknown>): boolean {
  return Object.values(frontmatter).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'object' && value !== null;
  });
}

/**
 * UI-SPEC §8's structural read, in order: nested frontmatter -> one `fact-list` block over every
 * frontmatter key; stable `##` sections -> every headed group promoted (`all: true`, document
 * order); neither -> `promote: []`, so `composeView` yields zero blocks, `viewAvailable` is false,
 * and the page falls through to the full document with no toggle (UI-SPEC §8's "neither"
 * sub-case) — never an empty-state message (prohibitions).
 */
export function fallbackManifest(kind: string, input: ViewInput): ViewManifest {
  const promote: PromotedBlock[] = [];
  if (hasNestedFrontmatter(input.frontmatter)) {
    promote.push({
      type: 'data',
      id: 'frontmatter',
      label: 'Frontmatter',
      component: 'fact-list',
      select: (viewInput) => selectFacts(viewInput.frontmatter, Object.keys(viewInput.frontmatter)),
    });
  }
  if (input.groups.some((group) => group.heading !== null)) {
    promote.push({ type: 'section', heading: /./, all: true });
  }
  return {
    kind: UNRECOGNIZED_KIND,
    lead: kind === 'unknown' ? CASE_A_NOTICE : CASE_B_NOTICE.replace('{kind}', kind),
    promote,
  };
}

/**
 * The two verbatim notice copies (UI-SPEC §8). `lead` for case (b) still carries the literal
 * `{kind}` placeholder — `kindLabel` is the value the page substitutes there inside a `<strong>`;
 * case (a) has no such substitution and `kindLabel` is `null`.
 */
export function unrecognizedNotice(kind: string): { lead: string; kindLabel: string | null } {
  if (kind === 'unknown') {
    return { lead: CASE_A_NOTICE, kindLabel: null };
  }
  return { lead: CASE_B_NOTICE, kindLabel: kind };
}
