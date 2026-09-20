// The client-side view registry's key space. `VIEW_KINDS` is UI-SPEC's own "Per-Type Header
// Copy" table (16 entries) plus `review-fix` and `findings`, which a real-corpus grep over
// `.planning/` at planning time surfaced as additional `artifact.kind` wire values with no
// dedicated route (RESEARCH.md § Open Question 1's recommended spot-check). Every one of these
// is already a granular `artifact.kind` string on the wire (RESEARCH.md § Corrected
// Understanding) — this module adds no new server-side splitting, only a client-side name list.
export const VIEW_KINDS = [
  'discussion-log',
  'verification',
  'plan',
  'summary',
  'review',
  'milestone-audit',
  'research',
  'patterns',
  'ui-spec',
  'uat',
  'validation',
  'security',
  'ui-review',
  'coverage',
  'learnings',
  'context',
  'review-fix',
  'findings',
] as const;

export type ViewKind = (typeof VIEW_KINDS)[number];

/** The D-09 reserved view-local class-prefix namespace: every registered kind plus the literal
 * `unrecognized` fallback used by VIEW-06's unmanifested/unknown-shape marker. Consumed by the
 * (future) CSS vocabulary-allowlist test (UI-05/D-08). */
export const VIEW_LOCAL_PREFIXES = [...VIEW_KINDS, 'unrecognized'] as const;

/** `discussion-log` -> `Discussion log`; the literal `unknown` wire value (a filename that
 * matched no GSD naming grammar at all) humanizes to `Unrecognized` per UI-SPEC § New Component
 * Specifications 8. */
export function humanizeKind(kind: string): string {
  if (kind === 'unknown') return 'Unrecognized';
  return kind
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
