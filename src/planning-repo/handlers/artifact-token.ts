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
 */
export function artifactTokenOf(ref: ArtifactRef): string | null {
  const name = basename(ref.path);
  if (ref.location === 'phase' || ref.location === 'archived-phase') {
    const parsed = parsePhaseArtifactName(name);
    return parsed.matched ? parsed.artifact : null;
  }
  if (ref.location === 'quick') {
    const parsed = parseQuickArtifactName(name);
    return parsed.matched ? parsed.artifact : null;
  }
  return null;
}
