// Zero-import-cost pure module — the single derivation of a damaged artifact's tone (D-12). Both
// tree.ts and search.ts call this rather than re-deriving the survived/not-survived split locally,
// so the tree, search, and artifact-page badge always agree on the same vocabulary.
export type ArtifactWarningTone = 'warning' | 'unreadable' | null;

/**
 * No warnings -> null (an undamaged artifact, whatever its body length). At least one warning with
 * a non-empty body -> 'warning' (the recovered body is readable). At least one warning with an
 * empty body -> 'unreadable' (nothing survived). `bodyLength` — not a prose match against the
 * warning's own `salvage` string — is what makes the split deterministic.
 */
export function artifactWarningTone(artifact: { warnings: unknown[]; bodyLength: number }): ArtifactWarningTone {
  if (artifact.warnings.length === 0) return null;
  return artifact.bodyLength > 0 ? 'warning' : 'unreadable';
}
