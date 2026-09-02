import type {
  Artifact,
  ArtifactLocation,
  MentionIndex,
  PhaseIdentity,
  Project,
  Requirement,
} from '../domain/model.ts';
import type { DiscoveryExclusion, LoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
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
  /** Human-authored ROADMAP description when one exists. */
  description: string | null;
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
  formalPlanProgress: {
    completed: number;
    total: number;
    sourcePath: string;
  } | null;
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
  location: ArtifactLocation;
  frontmatter: Record<string, unknown>;
  structured: Record<string, unknown>;
  milestoneKey: string | null;
  phaseKey: string | null;
  /** Parse warnings the artifact carries (Phase 1's WarningCollector output, passed through
   * unchanged) — a non-empty array is what lets a consumer (e.g. search.ts's `unreadable` flag)
   * mark a file the reader could not fully parse without dropping it from any listing. */
  warnings: unknown[];
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
  /** D-10/NAV-01: every recorded discovery exclusion (research/.cache/, a depth-terminated walk),
   * passed through unchanged so the tree projection can render them as visible, reason-carrying
   * stub nodes rather than letting a deliberate skip vanish silently. Populated on both the normal
   * and the empty presentation paths — a failed load still carries an empty array, never an absent
   * key. */
  exclusions: DiscoveryExclusion[];
}

interface PassingEvidence {
  key: string;
  planId: string;
  checkpoint: string | null;
  checkpointIndex: number | null;
  coverageId: string | null;
}

interface RoadmapPlanRecord {
  id: string;
  description: string;
  checked: boolean;
}

interface RoadmapPhaseRecord {
  number: string;
  plans: RoadmapPlanRecord[];
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

/**
 * Normalizes a parsed-frontmatter record into something `JSON.stringify` can always serialize —
 * cycles broken, non-JSON types coerced. Exported because the artifact and document routes hand
 * the same records straight to the client and must not be the one pair of endpoints that throws
 * a 500 on a self-referencing YAML anchor.
 */
export function jsonRecord(value: Record<string, unknown>): Record<string, unknown> {
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

function samePhaseNumber(left: string, right: string): boolean {
  if (left === right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
}

function roadmapPhaseRecord(
  project: Project,
  identity: PhaseIdentity,
  archived: boolean,
): { sourcePath: string; phase: RoadmapPhaseRecord | null } {
  const roadmap = Object.values(project.artifacts).find((artifact) => artifact.kind === 'roadmap');
  if (!roadmap) return { sourcePath: '.planning/ROADMAP.md', phase: null };
  let candidates: unknown = roadmap.structured.phases;
  if (archived && identity.milestoneVersion !== null) {
    const groups = roadmap.structured.milestoneGroups;
    if (Array.isArray(groups)) {
      const group = groups
        .map(asRecord)
        .find((record) => record && asString(record.version) === identity.milestoneVersion);
      candidates = group?.phases;
    }
  }
  if (!Array.isArray(candidates)) return { sourcePath: roadmap.path, phase: null };
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    const number = record ? asString(record.number) : null;
    if (!record || !number || !samePhaseNumber(number, identity.number)) continue;
    const plans = Array.isArray(record.plans)
      ? record.plans.flatMap((value): RoadmapPlanRecord[] => {
          const plan = asRecord(value);
          const id = plan ? asString(plan.id) : null;
          if (!plan || !id || typeof plan.checked !== 'boolean') return [];
          return [{ id, description: asString(plan.description) ?? '', checked: plan.checked }];
        })
      : [];
    return { sourcePath: roadmap.path, phase: { number, plans } };
  }
  return { sourcePath: roadmap.path, phase: null };
}

function allArtifacts(project: Project): Artifact[] {
  return [
    ...Object.values(project.artifacts),
    ...project.phases.flatMap((phase) => Object.values(phase.artifacts)),
    ...project.quickTasks.flatMap((quickTask) => Object.values(quickTask.artifacts)),
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
  return evidence.find((item) => item.planId === planId && item.coverageId === coverageId) ?? null;
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
      context.set(artifact.path, {
        identity: phase.identity,
        phaseKey: phaseKeyOf(phase.identity),
      });
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
        location: artifact.location,
        frontmatter: jsonRecord(artifact.frontmatter),
        structured: jsonRecord(artifact.structured),
        milestoneKey: owner ? milestoneKeyOf(owner.identity.milestoneVersion) : null,
        phaseKey: owner?.phaseKey ?? null,
        warnings: artifact.warnings,
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
    exclusions: snapshot.exclusions,
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
      const roadmap = roadmapPhaseRecord(project, phase.identity, phase.archived);
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
          description:
            roadmap.phase?.plans.find((entry) => entry.id === plan.id)?.description || null,
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
        formalPlanProgress:
          roadmap.phase && roadmap.phase.plans.length > 0
            ? {
                completed: roadmap.phase.plans.filter((plan) => plan.checked).length,
                total: roadmap.phase.plans.length,
                sourcePath: roadmap.sourcePath,
              }
            : null,
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
    exclusions: snapshot.exclusions,
  };
}
