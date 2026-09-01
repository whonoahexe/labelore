import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
  RequirementDto,
} from '../server/project-presentation.ts';
import { buildPhaseUrl } from './routes.ts';

export type ReferencePreviewType = 'requirement' | 'phase' | 'plan' | 'artifact';

export interface ReferencePreviewDto {
  key: string;
  type: ReferencePreviewType;
  identity: string;
  title: string;
  status: string;
  location: string;
  detail: { label: string; value: string };
  url: string;
}

export interface ReferenceRegistry {
  readonly previews: ReadonlyMap<string, ReferencePreviewDto>;
  readonly activeMilestoneKey: string | null;
  readonly artifactMilestones: ReadonlyMap<string, string>;
  readonly resolutions: ReadonlyMap<string, string | null>;
  /** Exact `.planning/...` canonical path -> its artifact preview. No milestone-context indirection: each snapshot path is already a unique identity, unlike phase/plan/requirement identifiers which repeat across milestones. */
  readonly artifactPreviews: ReadonlyMap<string, ReferencePreviewDto>;
}

function lookupKey(milestoneKey: string, type: ReferencePreviewType, identity: string): string {
  return `${milestoneKey}\u0000${type}\u0000${identity.toUpperCase()}`;
}

function previewKey(milestoneKey: string, type: ReferencePreviewType, identity: string): string {
  return `reference:${encodeURIComponent(milestoneKey)}:${type}:${encodeURIComponent(identity.toUpperCase())}`;
}

function statusOf(value: boolean | null): string {
  return value === true ? 'complete' : value === false ? 'incomplete' : 'not recorded';
}

function milestoneLocation(milestone: MilestoneDto): string {
  return milestone.version ?? milestone.name;
}

function addResolution(
  resolutions: Map<string, string | null>,
  key: string,
  preview: ReferencePreviewDto,
  previews: Map<string, ReferencePreviewDto>,
): void {
  if (resolutions.has(key)) {
    resolutions.set(key, null);
    return;
  }
  resolutions.set(key, preview.key);
  previews.set(preview.key, preview);
}

function requirementPreview(
  requirement: RequirementDto,
  milestone: MilestoneDto,
  phase: PhaseDto,
): ReferencePreviewDto {
  return {
    key: previewKey(milestone.key, 'requirement', requirement.id),
    type: 'requirement',
    identity: requirement.id,
    title: requirement.text,
    status: statusOf(requirement.checked),
    location: `${milestoneLocation(milestone)} · Phase ${phase.identity.number}`,
    detail: { label: 'Tier', value: requirement.tier },
    url: buildPhaseUrl(phase.identity),
  };
}

function phasePreview(milestone: MilestoneDto, phase: PhaseDto): ReferencePreviewDto {
  return {
    key: previewKey(milestone.key, 'phase', phase.identity.number),
    type: 'phase',
    identity: `Phase ${phase.identity.number}`,
    title: phase.name,
    status: statusOf(phase.roadmapComplete),
    location: milestoneLocation(milestone),
    detail: { label: 'Observed', value: phase.diskStatus },
    url: buildPhaseUrl(phase.identity),
  };
}

function planPreview(milestone: MilestoneDto, phase: PhaseDto, plan: PlanDto): ReferencePreviewDto {
  const authoredTitle = plan.frontmatter.title;
  const wave = plan.frontmatter.wave;
  return {
    key: previewKey(milestone.key, 'plan', plan.id),
    type: 'plan',
    identity: plan.id,
    title:
      typeof authoredTitle === 'string' && authoredTitle.trim() ? authoredTitle : `Plan ${plan.id}`,
    status: plan.complete ? 'complete' : 'open',
    location: `${milestoneLocation(milestone)} · Phase ${phase.identity.number}`,
    detail: {
      label: 'Wave',
      value: typeof wave === 'number' || typeof wave === 'string' ? String(wave) : 'Not recorded',
    },
    url: plan.key,
  };
}

function artifactLocation(milestone: MilestoneDto | undefined, phaseKey: string | null): string {
  if (!milestone) return 'Milestone root';
  const phase = phaseKey ? milestone.phases.find((candidate) => candidate.key === phaseKey) : undefined;
  return phase
    ? `${milestoneLocation(milestone)} · Phase ${phase.identity.number}`
    : milestoneLocation(milestone);
}

function artifactStatus(dto: ArtifactDto): string {
  const status = dto.frontmatter.status;
  return typeof status === 'string' && status.trim() ? status : dto.kind;
}

function artifactPreview(
  milestonesByKey: ReadonlyMap<string, MilestoneDto>,
  dto: ArtifactDto,
): ReferencePreviewDto {
  const milestone = dto.milestoneKey ? milestonesByKey.get(dto.milestoneKey) : undefined;
  return {
    key: previewKey(dto.milestoneKey ?? 'root', 'artifact', dto.path),
    type: 'artifact',
    identity: dto.path,
    title: dto.title,
    status: artifactStatus(dto),
    location: artifactLocation(milestone, dto.phaseKey),
    detail: { label: 'Kind', value: dto.kind },
    url: dto.key,
  };
}

/** Builds all contextual lookup maps once for one immutable presentation snapshot. */
export function buildReferenceRegistry(presentation: ProjectPresentation): ReferenceRegistry {
  const previews = new Map<string, ReferencePreviewDto>();
  const resolutions = new Map<string, string | null>();
  const artifactMilestones = new Map<string, string>();
  const artifactPreviews = new Map<string, ReferencePreviewDto>();
  const activeMilestone = presentation.milestones.find((milestone) => !milestone.archived) ?? null;
  const milestonesByKey = new Map(presentation.milestones.map((milestone) => [milestone.key, milestone]));

  for (const artifact of presentation.artifacts) {
    artifactMilestones.set(artifact.path, artifact.milestoneKey ?? activeMilestone?.key ?? '');
    artifactPreviews.set(artifact.path, artifactPreview(milestonesByKey, artifact));
  }

  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      const phaseDto = phasePreview(milestone, phase);
      addResolution(
        resolutions,
        lookupKey(milestone.key, 'phase', phase.identity.number),
        phaseDto,
        previews,
      );

      for (const plan of phase.plans) {
        const planDto = planPreview(milestone, phase, plan);
        addResolution(resolutions, lookupKey(milestone.key, 'plan', plan.id), planDto, previews);
      }
    }

    for (const requirement of presentation.requirements) {
      const covering = milestone.phases.filter((phase) =>
        phase.requirementIds.some((id) => id.toUpperCase() === requirement.id.toUpperCase()),
      );
      if (covering.length !== 1) continue;
      const dto = requirementPreview(requirement, milestone, covering[0]);
      addResolution(
        resolutions,
        lookupKey(milestone.key, 'requirement', requirement.id),
        dto,
        previews,
      );
    }
  }

  return Object.freeze({
    previews,
    resolutions,
    artifactMilestones,
    artifactPreviews,
    activeMilestoneKey: activeMilestone?.key ?? null,
  });
}

function tokenIdentity(raw: string): { type: ReferencePreviewType; identity: string } | null {
  const value = raw.trim();
  if (value.startsWith('.planning/')) return { type: 'artifact', identity: value };
  const phase = /^Phase\s+([\p{Letter}\p{Number}.]+)$/iu.exec(value);
  if (phase) return { type: 'phase', identity: phase[1] };
  if (/^[A-Z][A-Z0-9]+-\d+$/u.test(value)) {
    return { type: 'requirement', identity: value.toUpperCase() };
  }
  if (/^\d+(?:\.\d+)?-\d+$/u.test(value)) {
    return { type: 'plan', identity: value };
  }
  return null;
}

/**
 * Resolves an exact `.planning/...` canonical path directly against the artifact registry — no
 * milestone-context indirection, no path-shape inference. Only a path already present in the
 * presentation snapshot resolves; every other string returns null. Exported so inline-code
 * handling (linkify.ts) can reuse this exact resolver without duplicating path parsing.
 */
export function resolveArtifactReference(
  registry: ReferenceRegistry,
  path: string,
): ReferencePreviewDto | null {
  return registry.artifactPreviews.get(path.trim()) ?? null;
}

/** Resolves a token only within the containing artifact's milestone context (artifact-path tokens skip this — see resolveArtifactReference). */
export function resolvePresentationReference(
  registry: ReferenceRegistry,
  raw: string,
  artifactPath: string,
): ReferencePreviewDto | null {
  const token = tokenIdentity(raw);
  if (!token) return null;
  if (token.type === 'artifact') return resolveArtifactReference(registry, token.identity);
  const milestoneKey = registry.artifactMilestones.get(artifactPath);
  if (!milestoneKey) return null;
  const resolvedKey = registry.resolutions.get(lookupKey(milestoneKey, token.type, token.identity));
  return resolvedKey ? (registry.previews.get(resolvedKey) ?? null) : null;
}
