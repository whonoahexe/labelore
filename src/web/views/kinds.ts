// The client-side view registry's key space. `VIEW_KINDS` is UI-SPEC's own "Per-Type Header
// Copy" table (16 entries) plus `review-fix` and `findings`, which a real-corpus grep over
// `.planning/` at planning time surfaced as additional `artifact.kind` wire values with no
// dedicated route (RESEARCH.md § Open Question 1's recommended spot-check). Every one of these
// is already a granular `artifact.kind` string on the wire (RESEARCH.md § Corrected
// Understanding) — this module adds no new server-side splitting, only a client-side name list.
// `debug` is discovery's directory-position kind for GSD debug sessions under `.planning/debug/`
// (quick-261018-j5h). `todo` is discovery's directory-position kind for files under `.planning/todos/`
// (quick-261023-61k). `note` is discovery's directory-position kind for GSD notes under `.planning/notes/`
// (quick-261023-61l). `project` is the root PROJECT.md (Phase 9, 09-07). `windows` is the root WINDOWS.md
// ledger (Phase 9, 09-10). Phase 10 (10-08) adds `codebase` (one view kind for the seven map documents, reached
// through `viewKindOf`, whose wire kinds are `codebase-stack` ... `codebase-concerns`) and registers the six
// specification and check kinds (`spec`, `ai-spec`, `user-setup`, `eval-review`, `dom-verify`, `reviews`), each
// with a lead and a promote fallback until its page plan adds a composer. Phase 11 (11-10) adds `pause` (the pause
// page; the two wire kinds `handoff` and `continue-here` both map to it through the `viewKindOf` table).
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
  'project',
  'windows',
  'review-fix',
  'review-disposition',
  'findings',
  'todo',
  'note',
  'debug',
  'codebase',
  'spec',
  'ai-spec',
  'user-setup',
  'eval-review',
  'dom-verify',
  'reviews',
  'pause',
] as const;

export type ViewKind = (typeof VIEW_KINDS)[number];

const CODEBASE_KIND_PREFIX = 'codebase-';

/** Wire kinds that share another kind's view (Phase 11, RESEARCH Pattern 3): `handoff` and `continue-here` are
 * one pause page. Later plans add rows (spikes, indexes) to this one table. */
const VIEW_KIND_TABLE: ReadonlyMap<string, string> = new Map([
  ['handoff', 'pause'],
  ['continue-here', 'pause'],
]);

/** The view kind a wire `artifact.kind` is looked up under: every `codebase-*` kind (the seven map documents)
 * shares the one `codebase` view, a kind with a row in the table shares that row's view (the two pause files
 * share `pause`), any other kind is its own view kind (Phase 10, RESEARCH C8; Phase 11, RESEARCH Pattern 3). Pure. */
export function viewKindOf(kind: string): string {
  if (kind.startsWith(CODEBASE_KIND_PREFIX)) return 'codebase';
  return VIEW_KIND_TABLE.get(kind) ?? kind;
}

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
