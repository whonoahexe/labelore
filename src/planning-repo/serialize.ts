// The ONE function that owns every machine-varying value (D-07). Absolute paths become
// project-root-relative always; mtimeMs and readAt become fixed placeholders under --stable so two
// dumps taken from different clones of the same tree are byte-identical.
import { relative } from 'node:path';
import type { ProjectSnapshot } from './types.ts';

export interface NormalizeOptions {
  stable: boolean;
  withBodies: boolean;
}

const STABLE_TIMESTAMP_PLACEHOLDER = '1970-01-01T00:00:00.000Z';

/**
 * Every key across the snapshot/domain-model shapes whose value is ever an absolute filesystem
 * path derived from `rootPath` — never a key that merely SHARES a name with a non-path field
 * elsewhere (e.g. `Plan.id`/`Requirement.id`/`QuickTask.id` are short tokens like "01-02", never
 * absolute paths; `Artifact.id` IS a path). The `startsWith(rootPath)` guard below is the second,
 * load-bearing half of this scoping: a same-named non-path value would never pass it, so listing
 * `id`/`path` here is safe even though those keys are reused for non-path data elsewhere in the
 * graph. What this scoping exists to prevent: verbatim artifact `body` text (which this project's
 * own design explicitly promises to keep byte-for-byte, see `markdown-sections.ts`) silently
 * having a substring rewritten just because it happens to quote the project's own absolute root
 * path in prose.
 */
const PATH_KEYS = new Set(['rootPath', 'pathChecked', 'rawPath', 'path', 'id', 'dirPath', 'artifactPath']);

/**
 * Plan 01-04's eager cross-reference resolution deliberately produces a graph with genuine object
 * cycles — e.g. `Phase.requirementRefs[].resolved` is a `Requirement`, and that same
 * `Requirement.coveringPhaseRefs[].resolved` can point right back to the same `Phase` object. This
 * is correct and desired for in-memory consumers (a future UI walks the resolved graph directly,
 * no re-lookup needed) but `JSON.stringify` throws on a genuine ancestor-cycle. This pre-pass walks
 * the snapshot with a proper per-path ancestor stack (push on descent, pop on return — something a
 * single JSON.stringify replacer callback cannot express, since it has no "leaving this object"
 * hook) and replaces ONLY a true self-referential cycle with a compact, stable stub identifying
 * what was elided. A shared but non-cyclic reference (e.g. the same Requirement resolved from two
 * different Phases, neither an ancestor of the other) is left fully expanded at both occurrences —
 * ordinary JSON duplication, not a cycle, and not touched by this pass.
 */
function circularStub(value: Record<string, unknown>): unknown {
  if (typeof value.id === 'string') return { $circularRef: 'id', id: value.id };
  if (value.identity && typeof value.identity === 'object') return { $circularRef: 'identity', identity: value.identity };
  if (typeof value.path === 'string') return { $circularRef: 'path', path: value.path };
  return { $circularRef: true };
}

function breakCycles(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) return circularStub(value as Record<string, unknown>);

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  if (Array.isArray(value)) {
    return value.map((v) => breakCycles(v, nextAncestors));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = breakCycles(v, nextAncestors);
  }
  return out;
}

export function normalizeForGolden(
  snapshot: ProjectSnapshot,
  rootPath: string,
  options: NormalizeOptions,
): unknown {
  const cycleFree = breakCycles(snapshot, new Set());
  return JSON.parse(
    JSON.stringify(cycleFree, (key, value) => {
      if (PATH_KEYS.has(key) && typeof value === 'string' && value.startsWith(rootPath)) {
        const rel = relative(rootPath, value);
        return rel === '' ? '.' : rel;
      }
      if (options.stable && key === 'mtimeMs') {
        return 0;
      }
      if (options.stable && key === 'readAt') {
        return STABLE_TIMESTAMP_PLACEHOLDER;
      }
      if (!options.withBodies && key === 'body') {
        return undefined; // JSON.stringify drops keys whose replacer returns undefined
      }
      return value;
    }),
  );
}
