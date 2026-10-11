// The PLAN page's presentation lookups (quick-261006-iz6, sketch 019 B): what the composer needs
// from outside the document — the document's file dates, the dependencies of the plan resolved to
// their titles / state / in-app URLs, and requirement ID -> text — resolved against the cached
// `ProjectPresentation`. Matched generically by path (no kind branch), like `findPlanProgress` and
// `findSiblingArtifacts` in artifact-page.tsx. Pure; a missing presentation still returns the dates
// with empty lookups. Requirement texts are keyed by the plan's own milestone first (archived
// milestones reuse IDs such as AUTH-01), then the live root REQUIREMENTS.md, then every other
// requirements archive newest first. T-iz6-03: nothing here builds an href from document text — the
// URLs come from `buildArtifactUrl` over presentation paths.
import type { PhaseIdentity } from '../../domain/model.ts';
import { buildArtifactUrl } from '../../presentation/routes.ts';
import type { ArtifactDto, PlanDto, ProjectPresentation } from '../../server/project-presentation.ts';

export interface PlanDependency {
  /** The id as the plan's `depends_on` wrote it. */
  raw: string;
  id: string;
  title: string | null;
  complete: boolean;
  /** The in-app URL of that plan's document, null when it does not resolve. */
  url: string | null;
}

export interface PlanContext {
  /** The git author date of the commit that added the file (ISO, as written), null when unknown. */
  addedAt: string | null;
  mtimeMs: number | null;
  /** The ROADMAP one-liner for this plan, when one exists. */
  description: string | null;
  dependencies: PlanDependency[];
  requirementTexts: Record<string, string>;
}

interface ContextArtifact {
  path: string;
  addedAt?: string | null;
  mtimeMs?: number;
}

function isPlanPath(path: string): boolean {
  return path.endsWith('-PLAN.md');
}

/** `v1.1` from `.planning/milestones/v1.1-REQUIREMENTS.md`, `v1.0-quick/...` or `v1.1-phases/...`. */
function milestoneVersionOfPath(path: string): string | null {
  const marker = 'milestones/';
  const at = path.indexOf(marker);
  if (at < 0) return null;
  const rest = path.slice(at + marker.length);
  if (rest[0] !== 'v') return null;
  let end = 1;
  while (end < rest.length && ((rest[end] >= '0' && rest[end] <= '9') || rest[end] === '.')) end += 1;
  const version = rest.slice(0, end);
  return version.length > 1 ? version : null;
}

function versionKey(version: string): number[] {
  return version
    .slice(1)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

function newestFirst(left: string, right: string): number {
  const a = versionKey(left);
  const b = versionKey(right);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface RequirementItemLike {
  id: string;
  text: string;
}

function itemsOf(artifact: ArtifactDto): RequirementItemLike[] {
  const items = (artifact.structured as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const found: RequirementItemLike[] = [];
  for (const item of items) {
    if (item === null || typeof item !== 'object') continue;
    const { id, text } = item as { id?: unknown; text?: unknown };
    if (typeof id === 'string' && typeof text === 'string' && text.trim() !== '') found.push({ id, text });
  }
  return found;
}

function requirementTextsOf(
  presentation: ProjectPresentation,
  ownVersion: string | null,
): Record<string, string> {
  const texts: Record<string, string> = {};
  const add = (id: string, text: string): void => {
    if (texts[id] === undefined && text.trim() !== '') texts[id] = text.trim();
  };
  const archives = presentation.artifacts
    .filter((artifact) => artifact.path.endsWith('-REQUIREMENTS.md') && milestoneVersionOfPath(artifact.path) !== null)
    .map((artifact) => ({ artifact, version: milestoneVersionOfPath(artifact.path) as string }));
  if (ownVersion !== null) {
    for (const entry of archives) {
      if (entry.version === ownVersion) for (const item of itemsOf(entry.artifact)) add(item.id, item.text);
    }
  }
  for (const requirement of presentation.requirements) add(requirement.id, requirement.text);
  for (const entry of [...archives].sort((a, b) => newestFirst(a.version, b.version))) {
    if (entry.version === ownVersion) continue;
    for (const item of itemsOf(entry.artifact)) add(item.id, item.text);
  }
  return texts;
}

interface PlanHit {
  plan: PlanDto;
  identity: PhaseIdentity;
}

function allPlans(presentation: ProjectPresentation): PlanHit[] {
  const hits: PlanHit[] = [];
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) hits.push({ plan, identity: phase.identity });
    }
  }
  return hits;
}

function objectiveTitleOf(artifact: ArtifactDto | undefined): string | null {
  const plan = artifact?.structured.plan as { objective?: { title?: unknown } | null } | undefined;
  const title = plan?.objective?.title;
  return typeof title === 'string' && title.trim() !== '' ? title : null;
}

/**
 * The dates, resolved dependencies and requirement texts a PLAN page needs, or `null` when the
 * artifact is not a PLAN file. `phaseIdentity` is the one the document response carried.
 */
export function findPlanContext(
  presentation: ProjectPresentation | undefined,
  artifact: ContextArtifact | undefined,
  phaseIdentity: PhaseIdentity | null | undefined,
): PlanContext | null {
  if (!artifact || !isPlanPath(artifact.path)) return null;
  const addedAt = typeof artifact.addedAt === 'string' ? artifact.addedAt : null;
  const mtimeMs = typeof artifact.mtimeMs === 'number' && Number.isFinite(artifact.mtimeMs) ? artifact.mtimeMs : null;
  if (!presentation) return { addedAt, mtimeMs, description: null, dependencies: [], requirementTexts: {} };

  const plans = allPlans(presentation);
  const own = plans.find((hit) => hit.plan.path === artifact.path);
  const byKey = new Map(plans.map((hit) => [hit.plan.key, hit]));
  const byPath = new Map(presentation.artifacts.map((entry) => [entry.path, entry]));

  const dependencies: PlanDependency[] = (own?.plan.dependsOn ?? []).map((dependency) => {
    const target = dependency.targetPlanKey === null ? undefined : byKey.get(dependency.targetPlanKey);
    if (!target) return { raw: dependency.raw, id: dependency.raw, title: null, complete: false, url: null };
    return {
      raw: dependency.raw,
      id: dependency.raw,
      title: target.plan.description ?? objectiveTitleOf(byPath.get(target.plan.path)),
      complete: target.plan.complete,
      url: buildArtifactUrl(target.identity, target.plan.path),
    };
  });

  const ownVersion = phaseIdentity?.milestoneVersion ?? milestoneVersionOfPath(artifact.path);
  return {
    addedAt,
    mtimeMs,
    description: own?.plan.description ?? null,
    dependencies,
    requirementTexts: requirementTextsOf(presentation, ownVersion),
  };
}
