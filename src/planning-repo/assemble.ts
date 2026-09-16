// Assembles the resolved, milestone-qualified domain graph from parsed artifacts. Phase identity
// is the compound of milestone version, phase number, optional project code, and slug — phase
// number alone is never used as a key anywhere in this module. Every collection that can be empty
// is an empty array, never null: an absent milestones/, quick/, research/, or ROADMAP.md is a
// normal-path state of a real GSD project, not a warning.
//
// D-09's dual warning channel: every ParsedArtifact.warnings array this module copies onto an
// Artifact was produced by registry.ts's single shared WarningCollector (see warnings.ts) during
// parsing — the same object references also populate the flat `snapshot.warnings` list one layer
// up in snapshot.ts. This module never re-collects or rebuilds warnings; it only copies references
// through, which is what keeps the two channels from ever drifting apart.
//
// One documented exception: resolveCrossReferences() runs at the END of this function, after every
// Artifact.warnings array above has already been copied from its ParsedArtifact. A warning it adds
// (e.g. a malformed plan `depends_on`) reaches the flat `snapshot.warnings` list via the live
// `warnings` collector threaded in below — snapshot.ts re-reads the collector after this function
// returns — but does NOT reliably reach the owning Artifact's own `.warnings` array, since that
// array reference was captured before this pass ran. Flat-only is the honest answer here, not a bug
// to fix quietly.
import { basename, dirname } from 'node:path';
import type { Project, Artifact, Phase, Milestone, Plan, PlanSummary, Requirement, QuickTask, PhaseIdentity } from '../domain/model.ts';
import type { ParsedArtifact } from './types.ts';
import { parsePlanFileName, comparePhaseNumbers } from './naming.ts';
import type { RoadmapPhaseBlock } from './handlers/roadmap.ts';
import { resolveCrossReferences } from './crossref.ts';
import type { WarningCollector } from './warnings.ts';

const CONFIG_PATH = '.planning/config.json';
const PROJECT_MD_PATH = '.planning/PROJECT.md';
const STATE_MD_PATH = '.planning/STATE.md';
const ROADMAP_MD_PATH = '.planning/ROADMAP.md';
const REQUIREMENTS_MD_PATH = '.planning/REQUIREMENTS.md';

/**
 * Frontmatter text that is optional in practice: absent, empty, and whitespace-only all mean
 * "not set." Returns null for every one of them so downstream key derivation sees a single
 * absent-value shape instead of three.
 */
function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toDomainArtifact(parsed: ParsedArtifact): Artifact {
  return {
    id: parsed.ref.path,
    path: parsed.ref.path,
    kind: parsed.ref.kind,
    location: parsed.ref.location,
    frontmatter: parsed.frontmatter,
    title: parsed.title,
    body: parsed.body,
    bodyLength: parsed.bodyLength,
    bodyHash: parsed.bodyHash,
    mtimeMs: parsed.mtimeMs,
    warnings: parsed.warnings,
    structured: parsed.structured,
  };
}

/** Scopes a phase group by milestone version + project code + number — never by number alone. */
function phaseGroupKey(identity: PhaseIdentity): string {
  return `${identity.milestoneVersion ?? ''}::${identity.projectCode ?? ''}::${identity.number}`;
}

/**
 * ROADMAP.md phase headings are commonly written non-zero-padded ("### Phase 1: ..."), while the
 * matching directory name is zero-padded ("phases/01-slug/") — comparePhaseNumbers's dotted-numeric
 * semantics treat these as equal (both parse to base 1), which is what a plain string `===` would not.
 */
function phaseNumbersEqual(a: string, b: string): boolean {
  return comparePhaseNumbers(a, b) === 0;
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface PhaseGroupInput {
  identity: PhaseIdentity;
  refs: ParsedArtifact[];
  archived: boolean;
}

function buildPhaseFromGroup(group: PhaseGroupInput, roadmapBlock: RoadmapPhaseBlock | null): Phase {
  const artifacts: Record<string, Artifact> = {};
  const summariesByPlanNumber = new Map<string, ParsedArtifact>();
  const planRefs: ParsedArtifact[] = [];

  for (const p of group.refs) {
    artifacts[p.ref.path] = toDomainArtifact(p);
    if (p.ref.kind === 'summary') {
      const parsedName = parsePlanFileName(basename(p.ref.path));
      if (parsedName.matched) summariesByPlanNumber.set(parsedName.plan, p);
    } else if (p.ref.kind === 'plan') {
      planRefs.push(p);
    }
  }

  const plans: Plan[] = planRefs
    .map((p): Plan | null => {
      const parsedName = parsePlanFileName(basename(p.ref.path));
      if (!parsedName.matched) return null;
      const summaryArtifact = summariesByPlanNumber.get(parsedName.plan) ?? null;
      const summary: PlanSummary | null = summaryArtifact
        ? { path: summaryArtifact.ref.path, frontmatter: summaryArtifact.frontmatter }
        : null;
      const id = `${parsedName.phase}-${parsedName.plan}`;
      return {
        id,
        identity: group.identity,
        planNumber: parsedName.plan,
        path: p.ref.path,
        frontmatter: p.frontmatter,
        summary,
        // Filled in by resolveCrossReferences() at the end of assembleDomainModel — cross-phase
        // Plan lookups (dependsOnRefs resolves within THIS phase's own plan list, not built yet
        // while this map() is still running) are impossible to resolve mid-construction.
        summaryRef: { raw: id, resolved: summary },
        dependsOnRefs: [],
      };
    })
    .filter((p): p is Plan => p !== null)
    .sort((a, b) => a.planNumber.localeCompare(b.planNumber));

  const dirPath = group.refs.length > 0 ? dirname(group.refs[0].ref.path) : null;

  let diskStatus: string;
  if (plans.length === 0) {
    diskStatus = Object.keys(artifacts).length > 0 ? 'researched' : 'no_directory';
  } else if (plans.every((p) => p.summary !== null)) {
    diskStatus = 'complete';
  } else {
    diskStatus = 'in_progress';
  }

  return {
    identity: group.identity,
    name: roadmapBlock?.name ?? humanizeSlug(group.identity.slug),
    dirPath,
    archived: group.archived,
    goal: roadmapBlock?.goal ?? null,
    dependsOnRaw: roadmapBlock?.dependsOnRaw ?? null,
    requirementIds: roadmapBlock?.requirementIds ?? [],
    requirementRefs: [], // filled in by resolveCrossReferences() at the end of assembleDomainModel
    successCriteria: roadmapBlock?.successCriteria ?? [],
    roadmapComplete: roadmapBlock?.roadmapComplete ?? null,
    diskStatus,
    plans,
    artifacts,
  };
}

/**
 * Promote-with-field-level-fallback (0YP assumption-delta decision): `primary` (the per-milestone
 * `vX.Y-ROADMAP.md` block for this phase number) wins per field when it supplies a value —
 * non-null `goal`/`dependsOnRaw`, non-empty `name`/`requirementIds`/`successCriteria` — and
 * `fallback` (the root `<details>` block) fills whatever `primary` leaves empty, remaining the
 * sole source when no per-milestone block exists. `plans` and `roadmapComplete` are taken
 * together, as a pair, from whichever block actually supplies a non-empty plan checklist,
 * preferring `primary` — `roadmapComplete` is a derived summary of exactly that array and is
 * never paired with a `plans` array it did not describe.
 */
function mergeRoadmapPhaseBlocks(
  primary: RoadmapPhaseBlock | null,
  fallback: RoadmapPhaseBlock | null,
): RoadmapPhaseBlock | null {
  if (!primary) return fallback;
  if (!fallback) return primary;

  const plansSource = primary.plans.length > 0 ? primary : fallback;

  return {
    number: primary.number,
    name: primary.name || fallback.name,
    goal: primary.goal ?? fallback.goal,
    dependsOnRaw: primary.dependsOnRaw ?? fallback.dependsOnRaw,
    requirementIds: primary.requirementIds.length > 0 ? primary.requirementIds : fallback.requirementIds,
    successCriteria: primary.successCriteria.length > 0 ? primary.successCriteria : fallback.successCriteria,
    plans: plansSource.plans,
    roadmapComplete: plansSource.roadmapComplete,
  };
}

/** Builds a directory-less Phase for a ROADMAP.md entry with no matching phases/ directory. */
function buildPhaseFromRoadmapOnly(identity: PhaseIdentity, block: RoadmapPhaseBlock, archived: boolean): Phase {
  return {
    identity,
    name: block.name,
    dirPath: null,
    archived,
    goal: block.goal,
    dependsOnRaw: block.dependsOnRaw,
    requirementIds: block.requirementIds,
    requirementRefs: [], // filled in by resolveCrossReferences() at the end of assembleDomainModel
    successCriteria: block.successCriteria,
    roadmapComplete: block.roadmapComplete,
    diskStatus: 'no_directory',
    plans: [],
    artifacts: {},
  };
}

export function assembleDomainModel(parsed: ParsedArtifact[], warnings: WarningCollector, rootPath: string): Project {
  // D-11: widened from a root-only filter to a loose-artifact filter — 'research', 'milestone-root'
  // and 'other' have no other home in the domain model, so they fold into the same Project.artifacts
  // map root docs already use. The existing CONFIG_PATH/PROJECT_MD_PATH/STATE_MD_PATH/ROADMAP_MD_PATH/
  // REQUIREMENTS_MD_PATH exact-path lookups below keep resolving unchanged since those paths are
  // still 'root'-located and still land in this same map.
  const looseArtifacts = parsed.filter(
    (p) =>
      p.ref.location === 'root' ||
      p.ref.location === 'research' ||
      p.ref.location === 'milestone-root' ||
      p.ref.location === 'other',
  );
  const artifacts: Record<string, Artifact> = {};
  for (const p of looseArtifacts) {
    artifacts[p.ref.path] = toDomainArtifact(p);
  }

  const config = (artifacts[CONFIG_PATH]?.frontmatter ?? {}) as Record<string, unknown>;
  const projectDoc = artifacts[PROJECT_MD_PATH];
  const name = projectDoc?.title ?? basename(rootPath);

  const stateArtifact = artifacts[STATE_MD_PATH];
  // An empty or whitespace-only value is a legal YAML scalar and a plausible "not yet named"
  // state, but it is not a usable milestone version: routes.ts's milestoneKeyOf() refuses to
  // encode an empty path segment and throws, and that throw reaches createApp() synchronously.
  // Normalize it to null here so an unnamed milestone degrades to the same 'current' key an
  // absent one already produces, rather than taking the whole dashboard down.
  const activeMilestoneVersion = normalizeOptionalText(stateArtifact?.frontmatter.milestone);
  const activeMilestoneName = normalizeOptionalText(stateArtifact?.frontmatter.milestone_name);

  const roadmapArtifact = parsed.find((p) => p.ref.path === ROADMAP_MD_PATH);
  const roadmapStructured = roadmapArtifact?.structured as
    | { phases: RoadmapPhaseBlock[]; milestoneGroups: { summary: string; version: string | null; phases: RoadmapPhaseBlock[] }[] }
    | undefined;
  const liveRoadmapPhases = roadmapStructured?.phases ?? [];
  const archivedRoadmapGroups = roadmapStructured?.milestoneGroups ?? [];

  // --- Per-milestone ROADMAP.md snapshots (e.g. milestones/v1.0-ROADMAP.md): a second,
  // preferred-when-present phase-block source for archived phases only (0YP-01/02/03). Keyed by
  // milestone version; a version is only recorded when its per-milestone file actually supplies a
  // non-empty phases array, so an absent, empty, or malformed per-milestone file contributes
  // nothing and every changed code path degrades to today's root-only behavior (0YP-04).
  const perMilestoneRoadmapPhases = new Map<string, RoadmapPhaseBlock[]>();
  for (const p of parsed) {
    if (p.ref.location !== 'milestone-root' || p.ref.kind !== 'roadmap' || !p.ref.milestoneVersion) continue;
    const candidatePhases = (p.structured as { phases?: unknown } | undefined)?.phases;
    if (Array.isArray(candidatePhases) && candidatePhases.length > 0) {
      perMilestoneRoadmapPhases.set(p.ref.milestoneVersion, candidatePhases as RoadmapPhaseBlock[]);
    }
  }

  // --- Group phase-scoped and archived-phase-scoped refs by their compound identity. ---
  const liveGroups = new Map<string, PhaseGroupInput>();
  const archivedGroups = new Map<string, PhaseGroupInput>();

  for (const p of parsed) {
    if (p.ref.location === 'phase' && p.ref.phaseIdentity) {
      const identity: PhaseIdentity = { ...p.ref.phaseIdentity, milestoneVersion: activeMilestoneVersion };
      const key = phaseGroupKey(identity);
      const existing = liveGroups.get(key);
      if (existing) existing.refs.push(p);
      else liveGroups.set(key, { identity, refs: [p], archived: false });
    } else if (p.ref.location === 'archived-phase' && p.ref.phaseIdentity) {
      const key = phaseGroupKey(p.ref.phaseIdentity);
      const existing = archivedGroups.get(key);
      if (existing) existing.refs.push(p);
      else archivedGroups.set(key, { identity: p.ref.phaseIdentity, refs: [p], archived: true });
    }
  }

  // --- Live milestone: directory groups + ROADMAP-only entries (a planned phase with no directory yet). ---
  const livePhases: Phase[] = [];
  const matchedLiveNumbers = new Set<string>();
  for (const group of liveGroups.values()) {
    const roadmapBlock = liveRoadmapPhases.find((b) => phaseNumbersEqual(b.number, group.identity.number)) ?? null;
    if (roadmapBlock) matchedLiveNumbers.add(roadmapBlock.number);
    livePhases.push(buildPhaseFromGroup(group, roadmapBlock));
  }
  for (const block of liveRoadmapPhases) {
    if (matchedLiveNumbers.has(block.number)) continue;
    const identity: PhaseIdentity = { milestoneVersion: activeMilestoneVersion, number: block.number, projectCode: null, slug: '' };
    livePhases.push(buildPhaseFromRoadmapOnly(identity, block, false));
  }
  livePhases.sort((a, b) => comparePhaseNumbers(a.identity.number, b.identity.number));

  const milestones: Milestone[] = [];
  if (livePhases.length > 0) {
    milestones.push({
      version: activeMilestoneVersion,
      name: activeMilestoneName ?? activeMilestoneVersion ?? 'Current',
      archived: false,
      phases: livePhases,
    });
  }

  // --- Archived milestones: union of directory-derived versions and ROADMAP <details> groups. ---
  const archivedVersions = new Set<string>();
  for (const group of archivedGroups.values()) {
    if (group.identity.milestoneVersion) archivedVersions.add(group.identity.milestoneVersion);
  }
  for (const g of archivedRoadmapGroups) {
    if (g.version) archivedVersions.add(g.version);
  }
  // A per-milestone file can be the sole source of phase data for its version (e.g. an archive
  // whose root <details> group is absent entirely) — additive only, never removes a version.
  for (const version of perMilestoneRoadmapPhases.keys()) {
    archivedVersions.add(version);
  }

  for (const version of archivedVersions) {
    const roadmapGroup = archivedRoadmapGroups.find((g) => g.version === version) ?? null;
    const perMilestoneBlocks = perMilestoneRoadmapPhases.get(version) ?? [];
    const rootBlocks = roadmapGroup?.phases ?? [];

    const phases: Phase[] = [];
    // Numbers (in whichever source's raw spelling matched) already covered by a directory group.
    const matchedNumbers: string[] = [];

    for (const group of archivedGroups.values()) {
      if (group.identity.milestoneVersion !== version) continue;
      const primary = perMilestoneBlocks.find((b) => phaseNumbersEqual(b.number, group.identity.number)) ?? null;
      const fallback = rootBlocks.find((b) => phaseNumbersEqual(b.number, group.identity.number)) ?? null;
      const block = mergeRoadmapPhaseBlocks(primary, fallback);
      if (block) matchedNumbers.push(group.identity.number);
      phases.push(buildPhaseFromGroup(group, block));
    }

    // Union of both roadmap sources' phase numbers not already covered by a directory group above
    // — a number present only in the per-milestone file still produces a Phase (0YP-02), and a
    // root-only number is unaffected (today's behavior).
    const roadmapOnlyBlocks: RoadmapPhaseBlock[] = [];
    const seenRoadmapOnly: string[] = [];
    for (const block of [...rootBlocks, ...perMilestoneBlocks]) {
      if (matchedNumbers.some((n) => phaseNumbersEqual(n, block.number))) continue;
      if (seenRoadmapOnly.some((n) => phaseNumbersEqual(n, block.number))) continue;
      seenRoadmapOnly.push(block.number);
      roadmapOnlyBlocks.push(block);
    }
    for (const b of roadmapOnlyBlocks) {
      const primary = perMilestoneBlocks.find((x) => phaseNumbersEqual(x.number, b.number)) ?? null;
      const fallback = rootBlocks.find((x) => phaseNumbersEqual(x.number, b.number)) ?? null;
      // At least one of primary/fallback is non-null: b was drawn from one of those two arrays.
      const block = mergeRoadmapPhaseBlocks(primary, fallback)!;
      const identity: PhaseIdentity = { milestoneVersion: version, number: block.number, projectCode: null, slug: '' };
      phases.push(buildPhaseFromRoadmapOnly(identity, block, true));
    }
    phases.sort((a, b) => comparePhaseNumbers(a.identity.number, b.identity.number));

    milestones.push({
      version,
      name: roadmapGroup?.summary ?? version,
      archived: true,
      phases,
    });
  }

  // Archived milestones sorted by version ascending, live milestone (if any) last — mirrors
  // ROADMAP.md's own template ordering (collapsed archives, then the current milestone).
  milestones.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? -1 : 1;
    return (a.version ?? '').localeCompare(b.version ?? '');
  });

  const phases: Phase[] = milestones.flatMap((m) => m.phases);

  // --- Requirements: from the requirements handler's items — traceability resolution is 01-04's job. ---
  const requirementsArtifact = artifacts[REQUIREMENTS_MD_PATH];
  const requirementItems = (requirementsArtifact?.structured.items as
    | { id: string; category: string; text: string; tier: string; checked: boolean | null }[]
    | undefined) ?? [];
  const requirements: Requirement[] = requirementItems.map((item) => ({
    id: item.id,
    category: item.category,
    text: item.text,
    tier: item.tier,
    checked: item.checked,
    coveringPhaseRefs: [], // filled in by resolveCrossReferences() below
  }));

  // --- Quick tasks: grouped by quickTaskId, cross-linked to STATE.md's authoritative status table. ---
  // D-11: collects every matching ParsedArtifact per quick task (not just its directory path), so
  // QuickTask.artifacts can be built the same way Phase.artifacts already is by buildPhaseFromGroup —
  // no second artifact-to-map helper.
  const quickTasksCompleted = (stateArtifact?.structured.quickTasksCompleted as Record<string, string>[] | undefined) ?? [];
  const quickGroups = new Map<string, ParsedArtifact[]>(); // quickTaskId -> its ParsedArtifacts
  for (const p of parsed) {
    if (p.ref.location === 'quick' && p.ref.quickTaskId) {
      const existing = quickGroups.get(p.ref.quickTaskId);
      if (existing) existing.push(p);
      else quickGroups.set(p.ref.quickTaskId, [p]);
    }
  }
  const quickTasks: QuickTask[] = [...quickGroups.entries()]
    .map(([id, group]): QuickTask => {
      const artifacts: Record<string, Artifact> = {};
      for (const p of group) artifacts[p.ref.path] = toDomainArtifact(p);
      return {
        id,
        // dirname of the first collected artifact — preserves the existing value byte for byte,
        // since discovery groups every artifact for one quick task under the same directory.
        path: dirname(group[0].ref.path),
        // `typeof v === 'string'` guards the unchecked cast above: parseMarkdownTable pads every
        // missing cell with '', so a non-string is unreachable today, but the cast asserts a
        // shape this code does not own.
        stateRow:
          quickTasksCompleted.find((row) =>
            Object.values(row).some((v) => typeof v === 'string' && v.includes(id)),
          ) ?? null,
        artifacts,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const project: Project = {
    rootPath,
    name,
    artifacts,
    config,
    milestones,
    phases,
    quickTasks,
    requirements,
    mentions: { byId: {}, all: [] }, // filled in by scanMentions() in snapshot.ts, after assembleDomainModel returns — it needs the raw ParsedArtifact[] bodies, which no longer exist on the assembled Plan/PlanSummary shapes
  };

  // Cross-reference resolution runs exactly once, here, over the fully-built graph — every
  // Phase/Plan/Requirement it touches already exists in its final shape (ARCHITECTURE.md's eager
  // resolution rationale: milliseconds-to-low-seconds at this corpus size, and lazy per-render
  // resolution would just be this same pass re-run on every request).
  resolveCrossReferences(project, warnings);

  return project;
}
