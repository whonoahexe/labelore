// Shared match helper: the open artifact token used by phase-scoped and quick-task-scoped
// {token}-ARTIFACT.md files (CONTEXT, RESEARCH, VALIDATION, SECURITY, an unrecognized ad-hoc name,
// ...). Every typed handler that dispatches on this token calls through here rather than
// re-deriving it, keeping naming.ts the single grammar module (DATA-02).
import { basename } from 'node:path';
import { parsePhaseArtifactName, parseQuickArtifactName } from '../naming.ts';
import type { ArtifactRef } from '../types.ts';

/**
 * Returns the open artifact token for a phase-, archived-phase-, or quick-task-scoped
 * `{token}-ARTIFACT.md` file — e.g. 'CONTEXT', 'SECURITY', 'ROUTE-INVENTORY'. Null for anything
 * else (a plan/summary file, a root file, or a file this grammar doesn't recognize).
 *
 * quick-260923-lju: an archived quick task under `milestones/vX.Y-quick/<id>/` has no dedicated
 * `ArtifactLocation` of its own — `discovery.ts`'s `classify()` has no branch for a `vX.Y-quick`
 * top segment (only `vX.Y-phases`), so it falls through to the generic `'milestone-root'` case.
 * `deriveKind()` (also in discovery.ts) already tries `parseQuickArtifactName` unconditionally,
 * regardless of location, which is why the wire `kind` reads correctly as e.g. `'context'` — this
 * mirrors that same unconditional fallback here, so structural parsing (ContextHandler and every
 * other handler dispatching through this token) actually engages for those files too, not just
 * kind labeling. Phase-style and quick-style filename grammars never overlap (one requires a
 * phase-number prefix, the other a `\d{6}-[a-z]{3}` date-id prefix), so trying quick-style first
 * for every location this function doesn't already special-case is unambiguous.
 */
export function artifactTokenOf(ref: ArtifactRef): string | null {
  const name = basename(ref.path);
  if (ref.location === 'phase' || ref.location === 'archived-phase') {
    const parsed = parsePhaseArtifactName(name);
    return parsed.matched ? parsed.artifact : null;
  }
  if (ref.location === 'quick' || ref.location === 'milestone-root') {
    const parsed = parseQuickArtifactName(name);
    return parsed.matched ? parsed.artifact : null;
  }
  return null;
}
