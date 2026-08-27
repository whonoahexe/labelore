import type { Artifact, PhaseIdentity } from '../domain/model.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';

export interface IndexedArtifact {
  artifact: Artifact;
  phaseIdentity: PhaseIdentity | null;
}

export type ArtifactLookupResult =
  | ({ found: true } & IndexedArtifact)
  | {
      found: false;
      status: 'not-found';
      artifactPath: string;
      warning: string;
    };

export interface ArtifactIndex {
  readonly size: number;
  lookup(artifactPath: string): ArtifactLookupResult;
}

const NOT_FOUND_WARNING = 'Artifact is not present in the loaded project snapshot.';

/**
 * Builds the only artifact lookup table used by HTTP request handling. Request text can select an
 * already-indexed canonical path, but it never crosses back into PlanningFilesystem or node:path.
 */
export function buildArtifactIndex(snapshot: ProjectSnapshot): ArtifactIndex {
  const entries = new Map<string, IndexedArtifact>();
  const project = snapshot.project;

  if (project) {
    for (const artifact of Object.values(project.artifacts)) {
      entries.set(artifact.path, { artifact, phaseIdentity: null });
    }
    for (const phase of project.phases) {
      for (const artifact of Object.values(phase.artifacts)) {
        entries.set(artifact.path, { artifact, phaseIdentity: phase.identity });
      }
    }
  }

  return Object.freeze({
    size: entries.size,
    lookup(artifactPath: string): ArtifactLookupResult {
      const indexed = entries.get(artifactPath);
      return indexed
        ? { found: true, artifact: indexed.artifact, phaseIdentity: indexed.phaseIdentity }
        : {
            found: false,
            status: 'not-found',
            artifactPath,
            warning: NOT_FOUND_WARNING,
          };
    },
  });
}
