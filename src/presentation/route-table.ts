// The route table: every file of a project gets exactly one readable address, and no two files share one
// (NAV-10). `addressOfPath` (routes.ts) names the clean address a file would like; this module groups the
// files by it, lets the path that sorts first by code-unit order keep the clean address, and gives every
// other file in the group its lossless `file/` address. It also records each such collision, so the audit
// can report what an accident tree produced. Built once per derived bundle, so a refresh swaps the whole
// table atomically (D-05 of v1.0); pure: the input is the assembled Project and nothing else.
import type { Artifact, PhaseIdentity, Project } from '../domain/model.ts';
import { addressOfPath, buildUrl, fileUrlOf, milestoneSegmentOf } from './routes.ts';
import type { AddressOwner } from './routes.ts';

const ROOT_ROADMAP = '.planning/ROADMAP.md';
const ROOT_REQUIREMENTS = '.planning/REQUIREMENTS.md';

/** A clean address several files wanted: `paths` is every claimant, sorted, the first of which kept it. */
export interface RouteConflict {
  url: string;
  paths: string[];
}

export interface RouteTable {
  readonly urlByPath: ReadonlyMap<string, string>;
  readonly pathByUrl: ReadonlyMap<string, string>;
  /** D-03: the live milestone's own addresses for its roadmap and requirements (`/v1.1/roadmap`), each
   * mapped to the one address those files really have (`/roadmap`). An alias is not a file address, so it
   * is not in `pathByUrl`; the dispatcher redirects it. */
  readonly aliases: ReadonlyMap<string, string>;
  readonly conflicts: readonly RouteConflict[];
  /** The number of files in the table. */
  readonly size: number;
  /** The one address of a file, or null for a path that is not in the table. */
  urlOf(path: string): string | null;
  /** The file at an address, or null when no file has it. */
  pathOf(url: string): string | null;
  /** The address an alias redirects to, or null when `url` is not an alias. */
  aliasOf(url: string): string | null;
  /**
   * D-02: where a bare milestone address leads. An archived milestone's own ROADMAP copy, the root roadmap
   * (`/roadmap`) for the live milestone, and the milestone's `/overview` page when no such file exists.
   */
  milestoneRoadmapUrl(version: string | null): string;
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

/** The live milestone's version, or null when the project has none (or no live milestone at all). */
function liveVersionOf(project: Project | null): string | null {
  return project?.milestones.find((milestone) => !milestone.archived)?.version ?? null;
}

/** The directories of phases that share a phase address: two folders of one milestone whose phase
 * segments are equal (`05-a` and `5-b`), keyed by that address. Roadmap-only phases have no folder. */
function phaseAddressClaims(project: Project): Map<string, string[]> {
  const claims = new Map<string, string[]>();
  for (const phase of project.phases) {
    if (phase.dirPath === null) continue;
    const url = buildUrl({
      kind: 'phase',
      milestone: phase.identity.milestoneVersion,
      phase: { projectCode: phase.identity.projectCode, number: phase.identity.number },
      heading: null,
    });
    const dirs = claims.get(url);
    if (dirs) dirs.push(phase.dirPath);
    else claims.set(url, [phase.dirPath]);
  }
  return claims;
}

export function buildRouteTable(project: Project | null): RouteTable {
  const owners = project === null ? new Map<string, AddressOwner>() : ownedArtifacts(project);
  const liveVersion = liveVersionOf(project);

  // D-03: the live milestone's roadmap and requirements have one address, the root file's. The
  // milestone-scoped address is an alias, so a file that wants it (a stray milestones/<live>-ROADMAP.md)
  // cannot keep it.
  const aliasSources = new Map<string, string>();
  if (liveVersion !== null) {
    const scope = `/${milestoneSegmentOf(liveVersion)}`;
    if (owners.has(ROOT_ROADMAP)) aliasSources.set(`${scope}/roadmap`, ROOT_ROADMAP);
    if (owners.has(ROOT_REQUIREMENTS)) aliasSources.set(`${scope}/requirements`, ROOT_REQUIREMENTS);
  }

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
    if (aliasSources.has(url)) {
      // An alias owns this address outright: every claimant is demoted and reported.
      conflicts.push({ url, paths });
      for (const loser of paths) urlByPath.set(loser, fileUrlOf(loser));
      continue;
    }
    urlByPath.set(paths[0], url);
    if (paths.length > 1) {
      conflicts.push({ url, paths });
      for (const loser of paths.slice(1)) urlByPath.set(loser, fileUrlOf(loser));
    }
  }

  // Two phase folders of one milestone with the same phase address: the first folder keeps the phase
  // page, the other is reachable through its files' addresses, and the clash is reported.
  if (project !== null) {
    for (const [url, dirs] of phaseAddressClaims(project)) {
      if (dirs.length > 1) conflicts.push({ url, paths: dirs.slice().sort(byCodeUnit) });
    }
  }
  conflicts.sort((a, b) => byCodeUnit(a.url, b.url));

  const pathByUrl = new Map<string, string>();
  for (const [path, url] of urlByPath) pathByUrl.set(url, path);

  const aliases = new Map<string, string>();
  for (const [aliasUrl, sourcePath] of aliasSources) {
    const target = urlByPath.get(sourcePath);
    if (target !== undefined) aliases.set(aliasUrl, target);
  }

  const milestoneRoadmapUrl = (version: string | null): string => {
    const overview = buildUrl({ kind: 'overview', milestone: version });
    if (version === null || version === liveVersion) {
      return urlByPath.get(ROOT_ROADMAP) ?? overview;
    }
    const archived = `/${milestoneSegmentOf(version)}/roadmap`;
    return pathByUrl.has(archived) ? archived : overview;
  };

  return Object.freeze({
    urlByPath,
    pathByUrl,
    aliases,
    conflicts,
    size: urlByPath.size,
    urlOf: (path: string): string | null => urlByPath.get(path) ?? null,
    pathOf: (url: string): string | null => pathByUrl.get(url) ?? null,
    aliasOf: (url: string): string | null => aliases.get(url) ?? null,
    milestoneRoadmapUrl,
  });
}
