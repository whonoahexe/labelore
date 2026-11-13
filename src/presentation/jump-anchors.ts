// The one place the quick-jump palette builds the element id a jump lands on (13-01, D-05). Pure, no
// imports: the ids below are the ones the pages already give their items - composeContextBrief gives the
// first decision row of a tag `decision-<tag>` and composeReviewThreads gives a finding
// `review-finding-<id>` - so a palette row, a pasted link and the landing helper all name the same
// element. Requirement ids land on `requirement-<id>` (13-04 puts that id on the traceability rows).

/** `decision-d-12`: the id composeContextBrief assigns the first decision row tagged D-12. */
export function decisionAnchor(id: string): string {
  return `decision-${id.toLowerCase()}`;
}

/** `review-finding-wr-03`: the id composeReviewThreads assigns a finding. */
export function findingAnchor(id: string): string {
  return `review-finding-${id.toLowerCase()}`;
}

/** `requirement-nav-12`: the id a traceability row carries for a requirement. */
export function requirementAnchor(id: string): string {
  return `requirement-${id.toLowerCase()}`;
}

/** Exactly one of the three prefixes, then 1 to 64 characters of a-z, 0-9 and hyphen. Anchored and
 * bounded, so a pasted hash cannot drive it into backtracking. */
export const JUMP_ANCHOR_PATTERN = /^(?:decision-|review-finding-|requirement-)[a-z0-9-]{1,64}$/;

/** True when `value` is an id the palette could have built (13-02's landing helper acts only on these). */
export function isJumpAnchor(value: string): boolean {
  return JUMP_ANCHOR_PATTERN.test(value);
}
