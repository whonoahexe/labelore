// The route table: every file of a project gets exactly one readable address, and no two files share one
// (NAV-10). `addressOfPath` (routes.ts) names the clean address a file would like; this module groups the
// files by it, lets the path that sorts first by code-unit order keep the clean address, and gives every
// other file in the group its lossless `file/` address. It also records each such collision, so the audit
// can report what an accident tree produced. Built once per derived bundle, so a refresh swaps the whole
// table atomically (D-05 of v1.0); pure: the input is the assembled Project and nothing else.
import type { Artifact, PhaseIdentity, Project } from '../domain/model.ts';
import { addressOfPath, fileUrlOf } from './routes.ts';
import type { AddressOwner } from './routes.ts';

/** A clean address several files wanted: `paths` is every claimant, sorted, the first of which kept it. */
export interface RouteConflict {
  url: string;
  paths: string[];
}

export interface RouteTable {
  readonly urlByPath: ReadonlyMap<string, string>;
  readonly pathByUrl: ReadonlyMap<string, string>;
  readonly conflicts: readonly RouteConflict[];
  /** The number of files in the table. */
  readonly size: number;
  /** The one address of a file, or null for a path that is not in the table. */
  urlOf(path: string): string | null;
  /** The file at an address, or null when no file has it. */
  pathOf(url: string): string | null;
}

/** Code-unit order, so the same files sort the same way on every machine and locale. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every artifact of the project with the owner its address depends on. */
function ownedArtifacts(project: Project): Map<string, AddressOwner> {
  const owners = new Map<string, AddressOwner>();
  const add = (artifacts: Record<string, Artifact>, phase: PhaseIdentity | null): void => {
    for (const artifact of Object.values(artifacts)) {
      owners.set(artifact.path, phase === null ? null : { phase });
    }
  };
  add(project.artifacts, null);
  for (const phase of project.phases) add(phase.artifacts, phase.identity);
  for (const quickTask of project.quickTasks) add(quickTask.artifacts, null);
  return owners;
}

export function buildRouteTable(project: Project | null): RouteTable {
  const owners = project === null ? new Map<string, AddressOwner>() : ownedArtifacts(project);

  const claimants = new Map<string, string[]>();
  for (const [path, owner] of owners) {
    const url = addressOfPath(path, owner);
    const group = claimants.get(url);
    if (group) group.push(path);
    else claimants.set(url, [path]);
  }

  const urlByPath = new Map<string, string>();
  const conflicts: RouteConflict[] = [];
  for (const [url, group] of claimants) {
    const paths = group.slice().sort(byCodeUnit);
    urlByPath.set(paths[0], url);
    if (paths.length > 1) {
      conflicts.push({ url, paths });
      for (const loser of paths.slice(1)) urlByPath.set(loser, fileUrlOf(loser));
    }
  }
  conflicts.sort((a, b) => byCodeUnit(a.url, b.url));

  const pathByUrl = new Map<string, string>();
  for (const [path, url] of urlByPath) pathByUrl.set(url, path);

  return Object.freeze({
    urlByPath,
    pathByUrl,
    conflicts,
    size: urlByPath.size,
    urlOf: (path: string): string | null => urlByPath.get(path) ?? null,
    pathOf: (url: string): string | null => pathByUrl.get(url) ?? null,
  });
}
