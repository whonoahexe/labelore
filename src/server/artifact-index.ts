import type { Artifact, PhaseIdentity } from '../domain/model.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { buildRouteTable, type RouteTable } from '../presentation/route-table.ts';
import { buildUrl, type Route } from '../presentation/routes.ts';

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
  lookupRoute(route: Route): ArtifactLookupResult;
}

const NOT_FOUND_WARNING = 'Artifact is not present in the loaded project snapshot.';

/**
 * Builds the only artifact lookup table used by HTTP request handling. Request text can select an
 * already-indexed canonical path, but it never crosses back into PlanningFilesystem or node:path.
 * `routeTable` is the table the same bundle's presentation and search state were built from (T-07-15).
 */
export function buildArtifactIndex(
  snapshot: ProjectSnapshot,
  routeTable: RouteTable = buildRouteTable(snapshot.project),
): ArtifactIndex {
  const entries = new Map<string, IndexedArtifact>();
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
    lookupRoute(route: Route): ArtifactLookupResult {
      // Request text only ever selects a path the table already holds: the canonical URL (heading
      // dropped) is looked up in the table, an alias follows to its target, and only an indexed path is
      // read. A file/ URL of an internal file has no table entry, so it is a miss.
      let canonical: string;
      if (route.kind === 'document' || route.kind === 'plan') {
        canonical = buildUrl({ ...route, heading: null });
      } else if (route.kind === 'page') {
        canonical = buildUrl(route);
      } else {
        return missing(route.kind);
      }
      const url = routeTable.aliasOf(canonical) ?? canonical;
      const path = routeTable.pathOf(url);
      return path === null ? missing(route.kind) : this.lookup(path);
    },
  });
}
