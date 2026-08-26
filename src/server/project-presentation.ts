import type {
  Artifact,
  MentionIndex,
  PhaseIdentity,
  Project,
  Requirement,
} from '../domain/model.ts';
import type { LoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
import {
  artifactTokenOf,
  buildArtifactUrl,
  buildPlanUrl,
  milestoneKeyOf,
  phaseKeyOf,
} from '../presentation/routes.ts';
import { projectPlanCheckpoints } from '../rendering/plan-segments.ts';

export interface ProjectBlockerDto {
  key: string;
  sourcePath: string;
  heading: string;
  text: string;
}

export interface ProjectStateDto {
  sourcePath: string;
  milestone: string | null;
  phaseNumber: string | null;
  phaseName: string | null;
  status: string | null;
  progress: {
    totalPhases: number | null;
    completedPhases: number | null;
    totalPlans: number | null;
    completedPlans: number | null;
    percent: number | null;
  };
  blockersConcerns: { heading: string; body: string } | null;
}

export interface PlanCheckpointDto {
  key: string;
  planKey: string;
  planId: string;
  phaseKey: string;
  index: number;
  name: string;
  type: string;
  gate: string | null;
  status: 'pending' | 'passed';
  evidenceKey: string | null;
}

export interface CoverageWaitDto {
  key: string;
  planKey: string;
  planId: string;
  phaseKey: string;
  coverageId: string;
  description: string;
  status: 'pending' | 'passed';
  evidenceKey: string | null;
}

export interface PlanDto {
  key: string;
  id: string;
  phaseKey: string;
  planNumber: string;
  path: string;
  frontmatter: Record<string, unknown>;
  complete: boolean;
  summary: { key: string; path: string; frontmatter: Record<string, unknown> } | null;
  dependsOn: { raw: string; targetPlanKey: string | null }[];
  checkpoints: PlanCheckpointDto[];
}

export interface PhaseDto {
  key: string;
  milestoneKey: string;
  identity: PhaseIdentity;
  name: string;
  dirPath: string | null;
  archived: boolean;
  goal: string | null;
  dependsOnRaw: string | null;
  requirementIds: string[];
  requirementRefs: { raw: string; targetRequirementId: string | null }[];
  successCriteria: string[];
  roadmapComplete: boolean | null;
  diskStatus: string;
  plans: PlanDto[];
}

export interface MilestoneDto {
  key: string;
  version: string | null;
  name: string;
  archived: boolean;
  phases: PhaseDto[];
}

export interface RequirementDto {
  id: string;
  category: string;
  text: string;
  tier: string;
  checked: boolean | null;
  coveringPhases: { raw: string; targetPhaseKey: string | null }[];
}

export interface ArtifactDto {
  key: string;
  path: string;
  kind: string;
  title: string;
  frontmatter: Record<string, unknown>;
  structured: Record<string, unknown>;
  milestoneKey: string | null;
  phaseKey: string | null;
}

export interface ProjectPresentation {
  readAt: string;
  loadStatus: LoadStatus;
  rootPath: string;
  projectName: string | null;
  config: Record<string, unknown>;
  state: ProjectStateDto | null;
  milestones: MilestoneDto[];
  requirements: RequirementDto[];
  artifacts: ArtifactDto[];
  blockers: ProjectBlockerDto[];
  checkpoints: PlanCheckpointDto[];
  coverageWaits: CoverageWaitDto[];
  mentions: MentionIndex;
}

interface PassingEvidence {
  key: string;
  planId: string;
  checkpoint: string | null;
  checkpointIndex: number | null;
  coverageId: string | null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isPassing(value: unknown): boolean {
  return typeof value === 'string' && ['pass', 'passed'].includes(value.trim().toLowerCase());
}

function jsonValue(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return null;
  if (ancestors.has(value)) return null;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) return value.map((item) => jsonValue(item, nextAncestors));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      jsonValue(item, nextAncestors),
    ]),
  );
}

function jsonRecord(value: Record<string, unknown>): Record<string, unknown> {
  return jsonValue(value) as Record<string, unknown>;
}

function stateOf(project: Project): ProjectStateDto | null {
  const artifact = Object.values(project.artifacts).find((candidate) => candidate.kind === 'state');
  if (!artifact) return null;
  const progress = asRecord(artifact.frontmatter.progress) ?? {};
  const blockers = asRecord(artifact.structured.blockersConcerns);
  return {
    sourcePath: artifact.path,
    milestone: asString(artifact.frontmatter.milestone),
    phaseNumber: asString(artifact.frontmatter.current_phase),
    phaseName: asString(artifact.frontmatter.current_phase_name),
    status: asString(artifact.frontmatter.status),
    progress: {
      totalPhases: asNumber(progress.total_phases),
      completedPhases: asNumber(progress.completed_phases),
      totalPlans: asNumber(progress.total_plans),
      completedPlans: asNumber(progress.completed_plans),
      percent: asNumber(progress.percent),
    },
    blockersConcerns:
      blockers && typeof blockers.heading === 'string' && typeof blockers.body === 'string'
        ? { heading: blockers.heading, body: blockers.body }
        : null,
  };
}

function blockersOf(state: ProjectStateDto | null): ProjectBlockerDto[] {
  if (!state?.blockersConcerns) return [];
  const { heading, body } = state.blockersConcerns;
  const bullets = body
    .split('\n')
    .map((line) => line.match(/^\s*[-*+]\s+(.*)$/)?.[1]?.trim() ?? '')
    .filter(Boolean);
  const candidates = bullets.length > 0 ? bullets : [body.trim()];
  const absentMarkers = new Set(['none', 'none yet', '*(none)*', 'no blockers', 'n/a']);
  return candidates
    .filter((text) => text.length > 0 && !absentMarkers.has(text.toLowerCase()))
    .map((text, index) => ({
      key: `${state.sourcePath}#blocker-${index + 1}`,
      sourcePath: state.sourcePath,
      heading,
      text,
    }));
}

function allArtifacts(project: Project): Artifact[] {
  return [
    ...Object.values(project.artifacts),
    ...project.phases.flatMap((phase) => Object.values(phase.artifacts)),
  ];
}

function resultsFrom(
  artifact: Artifact,
  field: 'checkpoint_results' | 'coverage_results',
): PassingEvidence[] {
  const values = artifact.frontmatter[field];
  if (!Array.isArray(values)) return [];
  return values.flatMap((value, index) => {
    const record = asRecord(value);
    if (!record || !isPassing(record.status ?? record.result)) return [];
    const planId = asString(record.plan ?? record.plan_id);
    if (!planId) return [];
    const authoredKey = asString(record.evidence_key ?? record.id);
    return [
      {
        key: authoredKey ?? `${artifact.path}#${field}-${index + 1}`,
        planId,
        checkpoint: asString(record.checkpoint ?? record.checkpoint_name),
        checkpointIndex: asNumber(record.checkpoint_index),
        coverageId: asString(record.coverage ?? record.coverage_id),
      },
    ];
  });
}

function passingEvidenceOf(project: Project): PassingEvidence[] {
  return allArtifacts(project)
    .filter((artifact) => /(?:UAT|VERIFICATION)\.md$/i.test(artifact.path))
    .flatMap((artifact) => [
      ...resultsFrom(artifact, 'checkpoint_results'),
      ...resultsFrom(artifact, 'coverage_results'),
    ]);
}

function checkpointEvidence(
  evidence: PassingEvidence[],
  planId: string,
  name: string,
  index: number,
  siblingNames: string[],
): PassingEvidence | null {
  const sameNameCount = siblingNames.filter((candidate) => candidate === name).length;
  return (
    evidence.find(
      (item) =>
        item.planId === planId &&
        item.checkpoint === name &&
        (item.checkpointIndex === index || (item.checkpointIndex === null && sameNameCount === 1)),
    ) ?? null
  );
}

function coverageEvidence(
  evidence: PassingEvidence[],
  planId: string,
  coverageId: string,
): PassingEvidence | null {
  return (
    evidence.find((item) => item.planId === planId && item.coverageId === coverageId) ?? null
  );
}

function projectRequirement(requirement: Requirement): RequirementDto {
  return {
    id: requirement.id,
    category: requirement.category,
    text: requirement.text,
    tier: requirement.tier,
    checked: requirement.checked,
    coveringPhases: requirement.coveringPhaseRefs.map((reference) => ({
      raw: reference.raw,
      targetPhaseKey: reference.resolved ? phaseKeyOf(reference.resolved.identity) : null,
    })),
  };
}

function artifactDtos(project: Project): ArtifactDto[] {
  const context = new Map<string, { identity: PhaseIdentity; phaseKey: string }>();
  for (const phase of project.phases) {
    for (const artifact of Object.values(phase.artifacts)) {
      context.set(artifact.path, { identity: phase.identity, phaseKey: phaseKeyOf(phase.identity) });
    }
  }
  return allArtifacts(project)
    .map((artifact) => {
      const owner = context.get(artifact.path) ?? null;
      return {
        key: buildArtifactUrl(owner?.identity ?? null, artifact.path),
        path: artifact.path,
        kind: artifact.kind,
        title: artifact.title,
        frontmatter: jsonRecord(artifact.frontmatter),
        structured: jsonRecord(artifact.structured),
        milestoneKey: owner ? milestoneKeyOf(owner.identity.milestoneVersion) : null,
        phaseKey: owner?.phaseKey ?? null,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function emptyPresentation(snapshot: ProjectSnapshot): ProjectPresentation {
  return {
    readAt: snapshot.readAt,
    loadStatus: snapshot.loadStatus,
    rootPath: snapshot.rootPath,
    projectName: null,
    config: {},
    state: null,
    milestones: [],
    requirements: [],
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
  };
}

export function toProjectPresentation(snapshot: ProjectSnapshot): ProjectPresentation {
  const project = snapshot.project;
  if (!project) return emptyPresentation(snapshot);
  const evidence = passingEvidenceOf(project);
  const allCheckpoints: PlanCheckpointDto[] = [];
  const coverageWaits: CoverageWaitDto[] = [];

  const milestones: MilestoneDto[] = project.milestones.map((milestone) => ({
    key: milestoneKeyOf(milestone.version),
    version: milestone.version,
    name: milestone.name,
    archived: milestone.archived,
    phases: milestone.phases.map((phase) => {
      const phaseKey = phaseKeyOf(phase.identity);
      const plans: PlanDto[] = phase.plans.map((plan) => {
        const planKey = buildPlanUrl(phase.identity, plan.id);
        const planArtifact = phase.artifacts[plan.path];
        const syntax = planArtifact ? projectPlanCheckpoints(planArtifact.body) : [];
        const siblingNames = syntax.map((checkpoint) => checkpoint.name);
        const checkpoints: PlanCheckpointDto[] = syntax.map((checkpoint) => {
          const pass = checkpointEvidence(
            evidence,
            plan.id,
            checkpoint.name,
            checkpoint.index,
            siblingNames,
          );
          return {
            key: `${planKey}::checkpoint:${checkpoint.index}:${encodeURIComponent(checkpoint.name)}`,
            planKey,
            planId: plan.id,
            phaseKey,
            index: checkpoint.index,
            name: checkpoint.name,
            type: checkpoint.type,
            gate: checkpoint.gate,
            status: pass ? 'passed' : 'pending',
            evidenceKey: pass?.key ?? null,
          };
        });
        if (plan.summary === null) {
          allCheckpoints.push(
            ...checkpoints.filter((checkpoint) => checkpoint.gate === 'blocking-human'),
          );
        }

        const coverage = plan.summary?.frontmatter.coverage;
        if (Array.isArray(coverage)) {
          for (const value of coverage) {
            const record = asRecord(value);
            if (!record || record.human_judgment !== true) continue;
            const coverageId = asString(record.id);
            if (!coverageId) continue;
            const pass = coverageEvidence(evidence, plan.id, coverageId);
            coverageWaits.push({
              key: `${planKey}::coverage:${encodeURIComponent(coverageId)}`,
              planKey,
              planId: plan.id,
              phaseKey,
              coverageId,
              description: asString(record.description) ?? coverageId,
              status: pass ? 'passed' : 'pending',
              evidenceKey: pass?.key ?? null,
            });
          }
        }

        return {
          key: planKey,
          id: plan.id,
          phaseKey,
          planNumber: plan.planNumber,
          path: plan.path,
          frontmatter: jsonRecord(plan.frontmatter),
          complete: plan.summary !== null,
          summary: plan.summary
            ? {
                key: artifactTokenOf(plan.summary.path),
                path: plan.summary.path,
                frontmatter: jsonRecord(plan.summary.frontmatter),
              }
            : null,
          dependsOn: plan.dependsOnRefs.map((reference) => ({
            raw: reference.raw,
            targetPlanKey: reference.resolved
              ? buildPlanUrl(phase.identity, reference.resolved.id)
              : null,
          })),
          checkpoints,
        };
      });
      return {
        key: phaseKey,
        milestoneKey: milestoneKeyOf(milestone.version),
        identity: { ...phase.identity },
        name: phase.name,
        dirPath: phase.dirPath,
        archived: phase.archived,
        goal: phase.goal,
        dependsOnRaw: phase.dependsOnRaw,
        requirementIds: [...phase.requirementIds],
        requirementRefs: phase.requirementRefs.map((reference) => ({
          raw: reference.raw,
          targetRequirementId: reference.resolved?.id ?? null,
        })),
        successCriteria: [...phase.successCriteria],
        roadmapComplete: phase.roadmapComplete,
        diskStatus: phase.diskStatus,
        plans,
      };
    }),
  }));

  const state = stateOf(project);
  return {
    readAt: snapshot.readAt,
    loadStatus: snapshot.loadStatus,
    rootPath: snapshot.rootPath,
    projectName: project.name,
    config: jsonRecord(project.config),
    state,
    milestones,
    requirements: project.requirements.map(projectRequirement),
    artifacts: artifactDtos(project),
    blockers: blockersOf(state),
    checkpoints: allCheckpoints,
    coverageWaits,
    mentions: project.mentions,
  };
}
