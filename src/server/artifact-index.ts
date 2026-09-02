import type { Artifact, PhaseIdentity } from '../domain/model.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { buildPlanUrl, type PresentationRoute } from '../presentation/routes.ts';

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
  lookupRoute(route: PresentationRoute): ArtifactLookupResult;
}

const NOT_FOUND_WARNING = 'Artifact is not present in the loaded project snapshot.';

/**
 * Builds the only artifact lookup table used by HTTP request handling. Request text can select an
 * already-indexed canonical path, but it never crosses back into PlanningFilesystem or node:path.
 */
export function buildArtifactIndex(snapshot: ProjectSnapshot): ArtifactIndex {
  const entries = new Map<string, IndexedArtifact>();
  const planRoutes = new Map<string, IndexedArtifact>();
  const project = snapshot.project;

  if (project) {
    for (const artifact of Object.values(project.artifacts)) {
      entries.set(artifact.path, { artifact, phaseIdentity: null });
    }
    for (const phase of project.phases) {
      for (const artifact of Object.values(phase.artifacts)) {
        const indexed = { artifact, phaseIdentity: phase.identity };
        entries.set(artifact.path, indexed);
      }
      for (const plan of phase.plans) {
        const indexed = entries.get(plan.path);
        if (indexed) planRoutes.set(buildPlanUrl(phase.identity, plan.id), indexed);
      }
    }
    // D-11: quick tasks carry no phase identity of their own.
    for (const quickTask of project.quickTasks) {
      for (const artifact of Object.values(quickTask.artifacts)) {
        entries.set(artifact.path, { artifact, phaseIdentity: null });
      }
    }
  }

  const missing = (artifactPath: string): ArtifactLookupResult => ({
    found: false,
    status: 'not-found',
    artifactPath,
    warning: NOT_FOUND_WARNING,
  });

  return Object.freeze({
    size: entries.size,
    lookup(artifactPath: string): ArtifactLookupResult {
      const indexed = entries.get(artifactPath);
      return indexed
        ? { found: true, artifact: indexed.artifact, phaseIdentity: indexed.phaseIdentity }
        : missing(artifactPath);
    },
    lookupRoute(route: PresentationRoute): ArtifactLookupResult {
      if (route.kind === 'artifact') return this.lookup(route.artifactPath);
      if (route.kind === 'plan') {
        const indexed = planRoutes.get(buildPlanUrl(route.phaseIdentity, route.planId));
        return indexed
          ? { found: true, artifact: indexed.artifact, phaseIdentity: indexed.phaseIdentity }
          : missing(route.planId);
      }
      return missing(route.kind);
    },
  });
}
