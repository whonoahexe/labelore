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
// page; the two wire kinds `handoff` and `continue-here` both map to it through the `viewKindOf` table). Phase 11
// (11-15) adds `spikes` (the Spikes page; the four wire kinds `spikes-manifest`, `spike`, `spikes-wrap-up` and
// `spikes-conventions` all map to it through the same table). Phase 11 (11-18) adds `indexes` (the Indexes page; the
// two wire kinds `intel` and `graph` both map to it through the same table) and `viewOwnsLargeFile`. Phase 11 (11-22) adds
// `seed` (the seed page; its wire kind is `seed` itself, so it needs no table row).
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
  'spikes',
  'indexes',
  'seed',
] as const;

export type ViewKind = (typeof VIEW_KINDS)[number];

const CODEBASE_KIND_PREFIX = 'codebase-';

/** Wire kinds that share another kind's view (Phase 11, RESEARCH Pattern 3): `handoff` and `continue-here` are
 * one pause page. Later plans add rows (spikes, indexes) to this one table. */
const VIEW_KIND_TABLE: ReadonlyMap<string, string> = new Map([
  ['handoff', 'pause'],
  ['continue-here', 'pause'],
  ['spikes-manifest', 'spikes'],
  ['spike', 'spikes'],
  ['spikes-wrap-up', 'spikes'],
  ['spikes-conventions', 'spikes'],
  ['intel', 'indexes'],
  ['graph', 'indexes'],
]);

/** Wire kinds whose designed page reads a bounded summary of a file too large to read as text (Phase 11, 11-18,
 * RESEARCH C2): a `large` intel or graph file opens the Indexes page instead of the File details card. Listed,
 * binary and image files keep their own pages. Pure. */
export function viewOwnsLargeFile(kind: string): boolean {
  return kind === 'intel' || kind === 'graph';
}

/** The view kind a wire `artifact.kind` is looked up under: every `codebase-*` kind (the seven map documents)
 * shares the one `codebase` view, a kind with a row in the table shares that row's view (the two pause files
 * share `pause`, the four spike files share `spikes`, `intel` and `graph` share `indexes`), any other kind is its own view kind (Phase 10, RESEARCH C8; Phase 11, RESEARCH Pattern 3). Pure. */
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
