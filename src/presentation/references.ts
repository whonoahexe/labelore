import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
  RequirementDto,
} from '../server/project-presentation.ts';
import type { DecisionEntry, ReviewWarning } from '../planning-repo/handlers/section-projection.ts';
import { buildPhaseUrl } from './routes.ts';

export type ReferencePreviewType = 'requirement' | 'phase' | 'plan' | 'artifact' | 'decision' | 'warning';

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
  /** BACK-02/D-14: artifact path -> owning `phaseKey`, present only for artifacts whose `phaseKey`
   * is non-null. Lets `decision`/`warning` resolution ask "does the artifact containing this
   * mention belong to a phase" before falling back corpus-wide. */
  readonly artifactPhases: ReadonlyMap<string, string>;
  /** BACK-02/D-14: phase-scoped decision/warning resolution, keyed by
   * `phaseKey + '\u0000' + type + '\u0000' + ID.toUpperCase()`. A key present with a non-null value
   * is an unambiguous phase-local definition; present with `null` means two-or-more definitions
   * collided within that phase (ambiguous, plain text); absent means the phase defines no such id
   * at all — the corpus-wide fallback applies. */
  readonly phaseResolutions: ReadonlyMap<string, string | null>;
  /** BACK-02/D-14: whole-corpus decision/warning resolution, keyed by
   * `type + '\u0000' + ID.toUpperCase()` — the fallback consulted only when the containing
   * artifact's phase (if any) defines no matching entry. Same null-means-ambiguous semantics as
   * `phaseResolutions`. */
  readonly corpusResolutions: ReadonlyMap<string, string | null>;
}

function lookupKey(milestoneKey: string, type: ReferencePreviewType, identity: string): string {
  return `${milestoneKey}\u0000${type}\u0000${identity.toUpperCase()}`;
}

function previewKey(milestoneKey: string, type: ReferencePreviewType, identity: string): string {
  return `reference:${encodeURIComponent(milestoneKey)}:${type}:${encodeURIComponent(identity.toUpperCase())}`;
}

/** BACK-02/D-14: phase-scoped decision/warning key — see `ReferenceRegistry.phaseResolutions`. */
function phaseScopedKey(phaseKey: string, type: ReferencePreviewType, identity: string): string {
  return `${phaseKey}\u0000${type}\u0000${identity.toUpperCase()}`;
}

/** BACK-02/D-14: whole-corpus decision/warning key — see `ReferenceRegistry.corpusResolutions`. */
function corpusKey(type: ReferencePreviewType, identity: string): string {
  return `${type}\u0000${identity.toUpperCase()}`;
}

function statusOf(value: boolean | null): string {
  return value === true ? 'complete' : value === false ? 'incomplete' : 'not recorded';
}

function milestoneLocation(milestone: MilestoneDto): string {
  return milestone.version ?? milestone.name;
}

const DECISION_TITLE_MAX_LENGTH = 240;

/** D-15's decision-preview title: the first sentence of the decision's own text, cut at the first
 * `. ` or at 240 characters with an ellipsis — whichever position comes first in the string. */
function firstSentence(text: string): string {
  const periodIndex = text.indexOf('. ');
  if (periodIndex !== -1 && periodIndex + 1 <= DECISION_TITLE_MAX_LENGTH) {
    return text.slice(0, periodIndex + 1);
  }
  if (text.length <= DECISION_TITLE_MAX_LENGTH) return text;
  return `${text.slice(0, DECISION_TITLE_MAX_LENGTH)}…`;
}

/** The same `milestoneLocation · Phase N` shape `requirementPreview`/`phasePreview` build, for a
 * decision/warning definition site — falls back to `Quick task` for a quick-task-scoped artifact
 * and `Root` when the artifact carries no milestone at all. */
function definitionLocation(
  dto: ArtifactDto,
  milestone: MilestoneDto | undefined,
  phase: PhaseDto | undefined,
): string {
  if (!milestone) return 'Root';
  if (phase) return `${milestoneLocation(milestone)} · Phase ${phase.identity.number}`;
  return dto.location === 'quick' ? 'Quick task' : milestoneLocation(milestone);
}

function isDecisionEntry(value: unknown): value is DecisionEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id: unknown }).id === 'string' &&
    typeof (value as { text: unknown }).text === 'string'
  );
}

function isReviewWarning(value: unknown): value is ReviewWarning {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id: unknown }).id === 'string' &&
    typeof (value as { title: unknown }).title === 'string'
  );
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

/** D-15: a decision definition's preview. `key` is unique per definition SITE
 * (`entry.id + '@' + dto.path`), not per id alone — a `D-05` defined in two different phases must
 * get two distinct preview keys so `addResolution`'s ambiguity collapse operates per-scope, not
 * globally. */
function decisionPreview(
  dto: ArtifactDto,
  milestone: MilestoneDto | undefined,
  phase: PhaseDto | undefined,
  entry: DecisionEntry,
): ReferencePreviewDto {
  return {
    key: previewKey(dto.milestoneKey ?? 'root', 'decision', `${entry.id}@${dto.path}`),
    type: 'decision',
    identity: entry.id,
    title: firstSentence(entry.text),
    status: 'locked',
    location: definitionLocation(dto, milestone, phase),
    detail: {
      label: 'Defined in',
      value: phase ? `Phase ${phase.identity.number} · CONTEXT` : dto.path,
    },
    url: dto.key,
  };
}

/** D-15: a warning (review finding) definition's preview — symmetric with `decisionPreview`. */
function warningPreview(
  dto: ArtifactDto,
  milestone: MilestoneDto | undefined,
  phase: PhaseDto | undefined,
  entry: ReviewWarning,
): ReferencePreviewDto {
  return {
    key: previewKey(dto.milestoneKey ?? 'root', 'warning', `${entry.id}@${dto.path}`),
    type: 'warning',
    identity: entry.id,
    title: entry.title,
    status: 'reported',
    location: definitionLocation(dto, milestone, phase),
    detail: {
      label: 'Defined in',
      value: phase ? `Phase ${phase.identity.number} · REVIEW` : dto.path,
    },
    url: dto.key,
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
  const artifactPhases = new Map<string, string>();
  const phaseResolutions = new Map<string, string | null>();
  const corpusResolutions = new Map<string, string | null>();
  const activeMilestone = presentation.milestones.find((milestone) => !milestone.archived) ?? null;
  const milestonesByKey = new Map(presentation.milestones.map((milestone) => [milestone.key, milestone]));
  const phasesByKey = new Map<string, PhaseDto>();

  for (const artifact of presentation.artifacts) {
    artifactMilestones.set(artifact.path, artifact.milestoneKey ?? activeMilestone?.key ?? '');
    artifactPreviews.set(artifact.path, artifactPreview(milestonesByKey, artifact));
    if (artifact.phaseKey) artifactPhases.set(artifact.path, artifact.phaseKey);
  }

  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      phasesByKey.set(phase.key, phase);
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

  // BACK-02/D-14: decision/warning definitions, in `presentation.artifacts`' own (path-sorted)
  // order — the deterministic "which duplicate wins the first-insert slot" tie-break. Each entry
  // registers into BOTH its owning phase's scoped map (when the artifact has a phase) and the
  // corpus-wide map — `addResolution`'s existing null-on-duplicate collapse is the ambiguity rule
  // for both, reused rather than reimplemented.
  for (const dto of presentation.artifacts) {
    const milestone = dto.milestoneKey ? milestonesByKey.get(dto.milestoneKey) : undefined;
    const phase = dto.phaseKey ? phasesByKey.get(dto.phaseKey) : undefined;

    if (dto.kind === 'context') {
      const decisions = dto.structured.decisions;
      if (Array.isArray(decisions)) {
        for (const raw of decisions) {
          if (!isDecisionEntry(raw)) continue;
          const preview = decisionPreview(dto, milestone, phase, raw);
          if (dto.phaseKey) {
            addResolution(phaseResolutions, phaseScopedKey(dto.phaseKey, 'decision', raw.id), preview, previews);
          }
          addResolution(corpusResolutions, corpusKey('decision', raw.id), preview, previews);
        }
      }
    } else if (dto.kind === 'review') {
      const warnings = dto.structured.warnings;
      if (Array.isArray(warnings)) {
        for (const raw of warnings) {
          if (!isReviewWarning(raw)) continue;
          const preview = warningPreview(dto, milestone, phase, raw);
          if (dto.phaseKey) {
            addResolution(phaseResolutions, phaseScopedKey(dto.phaseKey, 'warning', raw.id), preview, previews);
          }
          addResolution(corpusResolutions, corpusKey('warning', raw.id), preview, previews);
        }
      }
    }
  }

  return Object.freeze({
    previews,
    resolutions,
    artifactMilestones,
    artifactPreviews,
    artifactPhases,
    phaseResolutions,
    corpusResolutions,
    activeMilestoneKey: activeMilestone?.key ?? null,
  });
}

function tokenIdentity(raw: string): { type: ReferencePreviewType; identity: string } | null {
  const value = raw.trim();
  if (value.startsWith('.planning/')) return { type: 'artifact', identity: value };
  const phase = /^Phase\s+([\p{Letter}\p{Number}.]+)$/iu.exec(value);
  if (phase) return { type: 'phase', identity: phase[1] };
  // BACK-02: WR-\d+/D-\d+ must be checked before `requirement` — `WR-01` also satisfies
  // requirement's two-or-more-uppercase-prefix shape, and would otherwise be misclassified.
  if (/^WR-\d+$/u.test(value)) {
    return { type: 'warning', identity: value.toUpperCase() };
  }
  if (/^D-\d+$/u.test(value)) {
    return { type: 'decision', identity: value.toUpperCase() };
  }
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
  if (token.type === 'decision' || token.type === 'warning') {
    // D-14: phase-local first, then whole corpus. A phase that defines the id (even ambiguously)
    // owns the answer — the corpus fallback only applies when the containing artifact's phase (if
    // any) has no entry for this id at all, never as a second opinion once the phase has spoken.
    const phaseKey = registry.artifactPhases.get(artifactPath);
    if (phaseKey) {
      const scopedKey = phaseScopedKey(phaseKey, token.type, token.identity);
      if (registry.phaseResolutions.has(scopedKey)) {
        const resolvedKey = registry.phaseResolutions.get(scopedKey);
        return resolvedKey ? (registry.previews.get(resolvedKey) ?? null) : null;
      }
    }
    const resolvedKey = registry.corpusResolutions.get(corpusKey(token.type, token.identity));
    return resolvedKey ? (registry.previews.get(resolvedKey) ?? null) : null;
  }
  const milestoneKey = registry.artifactMilestones.get(artifactPath);
  if (!milestoneKey) return null;
  const resolvedKey = registry.resolutions.get(lookupKey(milestoneKey, token.type, token.identity));
  return resolvedKey ? (registry.previews.get(resolvedKey) ?? null) : null;
}
