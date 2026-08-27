import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
  RequirementDto,
} from '../server/project-presentation.ts';
import { buildPhaseUrl } from './routes.ts';

export type ReferencePreviewType = 'requirement' | 'phase' | 'plan';

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

/** Builds all contextual lookup maps once for one immutable presentation snapshot. */
export function buildReferenceRegistry(presentation: ProjectPresentation): ReferenceRegistry {
  const previews = new Map<string, ReferencePreviewDto>();
  const resolutions = new Map<string, string | null>();
  const artifactMilestones = new Map<string, string>();
  const activeMilestone = presentation.milestones.find((milestone) => !milestone.archived) ?? null;

  for (const artifact of presentation.artifacts) {
    artifactMilestones.set(artifact.path, artifact.milestoneKey ?? activeMilestone?.key ?? '');
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
    activeMilestoneKey: activeMilestone?.key ?? null,
  });
}

function tokenIdentity(raw: string): { type: ReferencePreviewType; identity: string } | null {
  const value = raw.trim();
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

/** Resolves a token only within the containing artifact's milestone context. */
export function resolvePresentationReference(
  registry: ReferenceRegistry,
  raw: string,
  artifactPath: string,
): ReferencePreviewDto | null {
  const token = tokenIdentity(raw);
  if (!token) return null;
  const milestoneKey = registry.artifactMilestones.get(artifactPath);
  if (!milestoneKey) return null;
  const resolvedKey = registry.resolutions.get(lookupKey(milestoneKey, token.type, token.identity));
  return resolvedKey ? (registry.previews.get(resolvedKey) ?? null) : null;
}
