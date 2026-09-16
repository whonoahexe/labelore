import { basename } from 'node:path';
import type {
  Artifact,
  ArtifactLocation,
  MentionIndex,
  PhaseIdentity,
  Project,
  Requirement,
} from '../domain/model.ts';
import type { DiscoveryExclusion, LoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
import { parseMilestoneFileName } from '../planning-repo/naming.ts';
import {
  artifactTokenOf,
  buildArtifactUrl,
  buildPlanUrl,
  milestoneKeyOf,
  phaseKeyOf,
} from '../presentation/routes.ts';
import { projectPlanCheckpoints } from '../rendering/plan-segments.ts';

/** The canonical root roadmap path — looked up by identity, never by first-artifact-with-kind
 * 'roadmap', since a per-milestone `vX.Y-ROADMAP.md` snapshot now also carries `kind: 'roadmap'`
 * and structured phases (0YP). */
const ROOT_ROADMAP_PATH = '.planning/ROADMAP.md';

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
   * unchanged) — a non-empty array is what lets a consumer (e.g. presentation/artifact-warning-
   * tone.ts's `artifactWarningTone()`) mark a file the reader could not fully parse without
   * dropping it from any listing. */
  warnings: unknown[];
  /** Artifact.bodyLength, passed through unchanged (Phase 4, D-12) — the deterministic
   * did-the-body-survive signal `artifactWarningTone()` uses to split `warnings.length > 0` into
   * the body-survived ('warning') vs. nothing-salvageable ('unreadable') tone, rather than a prose
   * match against a warning's own `salvage` string. */
  bodyLength: number;
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

interface RoadmapSource {
  sourcePath: string;
  candidates: unknown;
}

/** Scans one candidate phase-block array for `identity.number`, mapping its plan checklist into
 * `RoadmapPlanRecord[]` with the existing defensive shape checks intact — extracted so it can run
 * over more than one source (per-milestone file, then root `<details>` group) without duplication. */
function findPhaseRecord(candidates: unknown, number: string): RoadmapPhaseRecord | null {
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    const candidateNumber = record ? asString(record.number) : null;
    if (!record || !candidateNumber || !samePhaseNumber(candidateNumber, number)) continue;
    const plans = Array.isArray(record.plans)
      ? record.plans.flatMap((value): RoadmapPlanRecord[] => {
          const plan = asRecord(value);
          const id = plan ? asString(plan.id) : null;
          if (!plan || !id || typeof plan.checked !== 'boolean') return [];
          return [{ id, description: asString(plan.description) ?? '', checked: plan.checked }];
        })
      : [];
    return { number: candidateNumber, plans };
  }
  return null;
}

/** Locates the per-milestone `vX.Y-ROADMAP.md` snapshot artifact for `version`, if one exists —
 * resolved by `parseMilestoneFileName` on the basename, compared case-insensitively, per naming.ts
 * (this codebase's single grammar module for milestone filenames). */
function perMilestoneRoadmapArtifact(project: Project, version: string): Artifact | null {
  return (
    Object.values(project.artifacts).find((artifact) => {
      if (artifact.kind !== 'roadmap' || artifact.location !== 'milestone-root') return false;
      const parsed = parseMilestoneFileName(basename(artifact.path));
      return parsed.matched && parsed.version.toLowerCase() === version.toLowerCase();
    }) ?? null
  );
}

/**
 * Resolves the roadmap phase-block ordered candidate sources for `identity`. A live phase (or an
 * archived phase with no milestone version) has exactly one source: the root artifact's top-level
 * `structured.phases`. An archived phase with a milestone version lists the per-milestone
 * artifact's `structured.phases` first, then the root artifact's matching `<details>` group
 * phases — a missing per-milestone artifact simply yields a one-entry list, so a project with no
 * per-milestone files behaves exactly as it does today.
 */
function roadmapSources(project: Project, identity: PhaseIdentity, archived: boolean): RoadmapSource[] {
  const rootArtifact = project.artifacts[ROOT_ROADMAP_PATH] ?? null;
  const rootSourcePath = rootArtifact?.path ?? ROOT_ROADMAP_PATH;

  if (!archived || identity.milestoneVersion === null) {
    return [{ sourcePath: rootSourcePath, candidates: rootArtifact?.structured.phases }];
  }

  const sources: RoadmapSource[] = [];
  const perMilestoneArtifact = perMilestoneRoadmapArtifact(project, identity.milestoneVersion);
  if (perMilestoneArtifact) {
    sources.push({ sourcePath: perMilestoneArtifact.path, candidates: perMilestoneArtifact.structured.phases });
  }

  let rootCandidates: unknown;
  if (rootArtifact) {
    const groups = rootArtifact.structured.milestoneGroups;
    if (Array.isArray(groups)) {
      const group = groups
        .map(asRecord)
        .find((record) => record && asString(record.version) === identity.milestoneVersion);
      rootCandidates = group?.phases;
    }
  }
  sources.push({ sourcePath: rootSourcePath, candidates: rootCandidates });
  return sources;
}

/**
 * Chooses among the ordered candidate sources: the first whose matched block has a non-empty
 * `plans` array wins outright (this is what fixes the compacted-root-checklist case without
 * letting a per-milestone file that lists no plans blank out plan rows the root file still
 * supplies). If no source has plan entries, the first source that matched the phase number at all
 * is used; if none matched, `phase` is null and `sourcePath` names the first candidate source.
 */
function roadmapPhaseRecord(
  project: Project,
  identity: PhaseIdentity,
  archived: boolean,
): { sourcePath: string; phase: RoadmapPhaseRecord | null } {
  const sources = roadmapSources(project, identity, archived);

  let firstMatch: { sourcePath: string; phase: RoadmapPhaseRecord } | null = null;
  for (const source of sources) {
    const phase = findPhaseRecord(source.candidates, identity.number);
    if (!phase) continue;
    if (!firstMatch) firstMatch = { sourcePath: source.sourcePath, phase };
    if (phase.plans.length > 0) return { sourcePath: source.sourcePath, phase };
  }
  if (firstMatch) return firstMatch;
  return { sourcePath: sources[0]?.sourcePath ?? ROOT_ROADMAP_PATH, phase: null };
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
        bodyLength: artifact.bodyLength,
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
        const summaryStatus = asString(plan.summary?.frontmatter?.status);
        const isAwaitingCheckpoint = summaryStatus === 'awaiting-checkpoint';
        const isComplete = plan.summary !== null && !isAwaitingCheckpoint;

        if (plan.summary === null || isAwaitingCheckpoint) {
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
          complete: isComplete,
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
