// Source resolver for the dashboard ledger (quick-261018-4tb, sketch 026 B). A blocker, a decision
// or a STATE todo "names" documents in prose: a review finding, a phase document, a plan, a quick
// task, a requirement, a .md path. This module turns those names into links, and only when the
// name resolves to a real artifact in the snapshot. It never invents a source, and it never takes a
// link target from file text: every url comes from the route builders over discovered artifacts.
//
// T-4tb-02 (denial of service): author text is capped before any regex runs (MAX_SCAN_CHARS for an
// artifact body, MAX_OBJECTIVE_CHARS for an objective, MAX_TEXT_CHARS for the entry being
// resolved), every regex is linear, and "Also mentioned in" comes from a token index built in one
// pass per artifact body, never one scan per token per file.
// T-4tb-04 (spoofing): a source exists only when the id resolves to an artifact the reader found.
import type { Artifact, Phase, Project, QuickTask } from '../domain/model.ts';
import { buildRouteTable, type RouteTable } from '../presentation/route-table.ts';
import { buildArtifactUrl, buildPhaseUrl, buildPlanUrl } from '../presentation/routes.ts';

const PLANNING_PREFIX = '.planning/';
const MAX_SCAN_CHARS = 200_000;
const MAX_OBJECTIVE_CHARS = 20_000;
const MAX_TEXT_CHARS = 8_000;
const MAX_MENTIONS = 8;

export interface LedgerSourceDto {
  kind: string;
  label: string;
  meta: string | null;
  detail: string | null;
  path: string;
  url: string;
}

export interface LedgerMentionDto {
  label: string;
  path: string;
  url: string;
}

export interface SourceTrail {
  sources: LedgerSourceDto[];
  mentions: LedgerMentionDto[];
  moreMentions: number;
}

export interface SourceGroup {
  name: string;
  note: string | null;
}

export interface SourceResolver {
  /** Documents named by `text` (and the group line it sits under), in a fixed order, plus other
   * files that cite the same review finding, quick task or requirement. */
  sourcesOf(text: string, group: SourceGroup | null): SourceTrail;
  /** The document a decision was logged from: its plan, quick task, or the phase's CONTEXT or
   * RESEARCH, live phases first, then the newest archived milestone. */
  decisionSource(id: string | null): LedgerSourceDto | null;
  /** The in-app page of the first phase carrying this number (live first, then archived). */
  phaseUrl(number: string): string | null;
  /** The in-app page of an artifact path, or null when the reader found no such artifact. */
  artifactUrl(path: string): string | null;
  /** First sentence of an artifact's objective, else null. */
  objectiveOf(path: string): string | null;
  quickTask(id: string): QuickTask | null;
}

interface Entry {
  artifact: Artifact;
  phase: Phase | null;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compares by code unit, so the order never depends on the host locale. */
const byPath = (left: Entry, right: Entry): number =>
  left.artifact.path < right.artifact.path ? -1 : left.artifact.path > right.artifact.path ? 1 : 0;

const baseName = (path: string): string => path.split('/').pop() ?? path;
const withoutExtension = (path: string): string => baseName(path).replace(/\.md$/, '');

/** The first sentence of an artifact's <objective>, else null. Whitespace collapsed. */
export function objectiveSentence(body: string): string | null {
  const objective = objectiveText(body);
  if (!objective) return null;
  return objective.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? null;
}

/** The whole <objective> text with whitespace collapsed, else null. */
export function objectiveText(body: string): string | null {
  const match = body.slice(0, MAX_OBJECTIVE_CHARS).match(/<objective>\s*([\s\S]*?)<\/objective>/);
  const text = match?.[1].replace(/\s+/g, ' ').trim();
  return text ? text : null;
}

const PHASE_DOCUMENT_KINDS: Record<string, string> = {
  UAT: 'UAT',
  SECURITY: 'Security',
  'UI-REVIEW': 'UI review',
  'UI-SPEC': 'UI spec',
  VERIFICATION: 'Verification',
  VALIDATION: 'Validation',
  REVIEW: 'Review',
  CONTEXT: 'Context',
  RESEARCH: 'Research',
  PATTERNS: 'Patterns',
};

export function createSourceResolver(
  project: Project,
  routeTable: RouteTable = buildRouteTable(project),
): SourceResolver {
  // Every artifact the reader found, once each, with the phase that owns it (if any).
  const entryByPath = new Map<string, Entry>();
  const add = (artifact: Artifact, phase: Phase | null) => {
    if (!entryByPath.has(artifact.path)) entryByPath.set(artifact.path, { artifact, phase });
  };
  for (const artifact of Object.values(project.artifacts)) add(artifact, null);
  const allPhases = project.milestones.flatMap((milestone) => milestone.phases);
  for (const phase of allPhases) for (const artifact of Object.values(phase.artifacts)) add(artifact, phase);
  for (const quick of project.quickTasks) for (const artifact of Object.values(quick.artifacts)) add(artifact, null);
  const entries = [...entryByPath.values()].sort(byPath);

  // Live phases first, then archived milestones newest first (the sketch's phaseDirs).
  const live = project.milestones.filter((milestone) => !milestone.archived);
  const archived = project.milestones
    .filter((milestone) => milestone.archived)
    .sort((left, right) =>
      (right.version ?? '').localeCompare(left.version ?? '', undefined, { numeric: true }),
    );
  const orderedPhases = [...live, ...archived].flatMap((milestone) => milestone.phases);
  const phasesNumbered = (number: string): Phase[] => {
    const wanted = parseFloat(number);
    if (Number.isNaN(wanted)) return [];
    return orderedPhases.filter((phase) => parseFloat(phase.identity.number) === wanted);
  };
  const archiveLabel = (phase: Phase): string | null =>
    phase.archived ? phase.identity.milestoneVersion : null;

  const quickById = new Map<string, QuickTask>();
  for (const quick of project.quickTasks) quickById.set(quick.id, quick);
  const quickArtifact = (quick: QuickTask, suffix: string): Artifact | null =>
    Object.values(quick.artifacts).find((artifact) => baseName(artifact.path).endsWith(suffix)) ?? null;

  // The route table is the authority for the address a file really has (a collision loser lives at its
  // file/ address); the owner-aware stateless builder is only the fallback for a path the table lacks.
  const urlOf = (path: string): string => {
    const entry = entryByPath.get(path);
    return routeTable.urlOf(path) ?? buildArtifactUrl(entry?.phase?.identity ?? null, path);
  };

  const phaseArtifacts = (phase: Phase): Artifact[] => Object.values(phase.artifacts);

  // Requirements files that define ids: the root one first, then milestone snapshots newest first.
  const requirementFiles = entries
    .map((entry) => entry.artifact)
    .filter((artifact) => artifact.kind === 'requirements')
    .sort((left, right) => {
      const leftRoot = left.location === 'root' ? 0 : 1;
      const rightRoot = right.location === 'root' ? 0 : 1;
      if (leftRoot !== rightRoot) return leftRoot - rightRoot;
      return right.path.localeCompare(left.path, undefined, { numeric: true });
    });

  // The token index: one pass per artifact body. A token maps to the entries (indexes into
  // `entries`, ascending) whose body contains it. STATE.md is never scanned.
  const tokenIndex = new Map<string, number[]>();
  const note = (token: string, index: number) => {
    const list = tokenIndex.get(token);
    if (!list) tokenIndex.set(token, [index]);
    else if (list[list.length - 1] !== index) list.push(index);
  };
  entries.forEach((entry, index) => {
    if (entry.artifact.kind === 'state') return;
    const body = entry.artifact.body.slice(0, MAX_SCAN_CHARS);
    for (const match of body.matchAll(/(?<![\w.-])(\d{6}-[a-z0-9]{3})(?![\w-])/g)) note(match[1], index);
    for (const match of body.matchAll(/(?<![\w.-])([A-Z][A-Z0-9]+-\d{2,})(?![\w-])/g)) note(match[1], index);
    for (const match of body.matchAll(/(?<![\w.-])(\d+(?:\.\d+)?)-REVIEW\s+((?:WR|CR|IN)-\d+)(?![\w-])/g)) {
      note(`${match[1]}-REVIEW ${match[2]}`, index);
    }
  });

  const objectiveCache = new Map<string, string | null>();
  const objectiveOf = (path: string): string | null => {
    if (objectiveCache.has(path)) return objectiveCache.get(path) ?? null;
    const artifact = entryByPath.get(path)?.artifact;
    const sentence = artifact ? objectiveSentence(artifact.body) : null;
    objectiveCache.set(path, sentence);
    return sentence;
  };

  const planSource = (phase: Phase, planId: string, label: string): LedgerSourceDto | null => {
    const plan = phase.plans.find((candidate) => candidate.id === planId);
    if (!plan) return null;
    const done = plan.summary !== null;
    const where = archiveLabel(phase);
    return {
      kind: 'Plan',
      label,
      meta: `${done ? 'Has a summary' : 'No summary yet'}${where ? ` · ${where}` : ''}`,
      detail: objectiveOf(plan.path),
      path: plan.path,
      url: routeTable.urlOf(plan.path) ?? buildPlanUrl(phase.identity, plan.id),
    };
  };

  const quickSource = (id: string): LedgerSourceDto | null => {
    const quick = quickById.get(id);
    if (!quick) return null;
    const summary = quickArtifact(quick, '-SUMMARY.md');
    const plan = quickArtifact(quick, '-PLAN.md');
    const target = summary ?? plan;
    if (!target) return null;
    return {
      kind: 'Quick task',
      label: id,
      meta: summary ? 'Has a summary' : 'No summary yet',
      detail: objectiveOf((plan ?? target).path),
      path: target.path,
      url: urlOf(target.path),
    };
  };

  const reviewFinding = (number: string, id: string): LedgerSourceDto | null => {
    const heading = new RegExp(`^#+[ \\t]*${escapeRegExp(id)}\\b[:.\\s—-]*(.+)$`, 'm');
    for (const phase of phasesNumbered(number)) {
      const review = phaseArtifacts(phase).find((artifact) => artifact.kind === 'review');
      if (!review) continue;
      const found = review.body.slice(0, MAX_SCAN_CHARS).match(heading);
      if (!found) continue;
      return {
        kind: 'Review finding',
        label: id,
        meta: `Phase ${number} review`,
        detail: found[1].replace(/`/g, '').trim(),
        path: review.path,
        url: urlOf(review.path),
      };
    }
    return null;
  };

  const phaseDocumentSource = (number: string, doc: string): LedgerSourceDto | null => {
    for (const phase of phasesNumbered(number)) {
      const file = phaseArtifacts(phase).find((artifact) => {
        const name = baseName(artifact.path);
        if (!name.endsWith(`-${doc}.md`)) return false;
        // `-REVIEW.md` must not also claim `-UI-REVIEW.md`.
        return !(doc === 'REVIEW' && name.endsWith('-UI-REVIEW.md'));
      });
      if (!file) continue;
      const where = archiveLabel(phase);
      return {
        kind: PHASE_DOCUMENT_KINDS[doc] ?? doc,
        label: `${number}-${doc}`,
        meta: `Phase ${number}${where ? ` · ${where}` : ''}`,
        detail: null,
        path: file.path,
        url: urlOf(file.path),
      };
    }
    return null;
  };

  const requirementSource = (id: string): LedgerSourceDto | null => {
    const defined = new RegExp(`\\*\\*${escapeRegExp(id)}\\*\\*|\\|\\s*${escapeRegExp(id)}\\s*\\|`);
    const file = requirementFiles.find((artifact) => defined.test(artifact.body.slice(0, MAX_SCAN_CHARS)));
    if (!file) return null;
    const line = file.body
      .slice(0, MAX_SCAN_CHARS)
      .match(new RegExp(`\\*\\*${escapeRegExp(id)}\\*\\*:?[ \\t]*(.+)`))?.[1];
    return {
      kind: 'Requirement',
      label: id,
      meta: withoutExtension(file.path),
      detail: line?.trim() || null,
      path: file.path,
      url: urlOf(file.path),
    };
  };

  function sourcesOf(rawText: string, group: SourceGroup | null): SourceTrail {
    const text = `${rawText.slice(0, MAX_TEXT_CHARS)} ${(group?.note ?? '').slice(0, MAX_TEXT_CHARS)}`;
    const sources: LedgerSourceDto[] = [];
    const seen = new Set<string>();
    const tokens: { token: string; own: string }[] = [];
    const include = (source: LedgerSourceDto | null, token: string | null) => {
      if (!source || seen.has(source.path)) return;
      seen.add(source.path);
      sources.push(source);
      if (token) tokens.push({ token, own: source.path });
    };

    // Review findings: "01-REVIEW WR-05", or a bare "WR-01" under a group that names its phase.
    for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)-REVIEW\s+((?:WR|CR|IN)-\d+)/g)) {
      include(reviewFinding(match[1], match[2]), `${match[1]}-REVIEW ${match[2]}`);
    }
    const groupPhase = `${group?.name ?? ''} ${rawText.slice(0, MAX_TEXT_CHARS)}`.match(/\bPhase\s+(\d+)/)?.[1];
    if (groupPhase) {
      for (const match of rawText.slice(0, MAX_TEXT_CHARS).matchAll(/(?<![-\w])((?:WR|CR)-\d+)\b/g)) {
        include(reviewFinding(groupPhase, match[1]), null);
      }
    }
    // Phase documents named outright: "(05-SECURITY notes 1–2)", "(05-UI-REVIEW)", "05-UAT".
    const documentRe =
      /(?<![\w.-])(\d{2}(?:\.\d)?)-(UAT|SECURITY|UI-REVIEW|UI-SPEC|VERIFICATION|VALIDATION|REVIEW|CONTEXT|RESEARCH|PATTERNS)(?![\w-]|\s+(?:WR|CR|IN)-)/g;
    for (const match of text.matchAll(documentRe)) include(phaseDocumentSource(match[1], match[2]), null);
    // Plan ids: 03-07, never part of a date.
    for (const match of text.matchAll(/(?<![\d.-])(\d{2}(?:\.\d)?-\d{2})(?![\d-])/g)) {
      const number = match[1].split('-')[0];
      for (const phase of phasesNumbered(number)) {
        const source = planSource(phase, match[1], match[1]);
        if (!source) continue;
        include(source, null); // plan ids repeat across milestones and sibling plans cite each other: no mentions
        break;
      }
    }
    // Quick tasks: 260714-3tp resolves to its folder, and to the summary when there is one.
    for (const match of text.matchAll(/\b(\d{6}-[a-z0-9]{3})\b/g)) include(quickSource(match[1]), match[1]);
    // Requirement ids, only when a requirements file defines them.
    for (const match of text.matchAll(/\b([A-Z][A-Z0-9]+-\d{2,})\b/g)) {
      if (/^(WR|CR|IN|D|T)-/.test(match[1])) continue;
      include(requirementSource(match[1]), match[1]);
    }
    // Paths named outright, often on the group line.
    for (const match of text.matchAll(/((?:milestones|phases|quick|research|todos|notes)\/[\w./-]+\.md)/g)) {
      const path = `${PLANNING_PREFIX}${match[1]}`;
      if (!entryByPath.has(path)) continue;
      const named = group?.note?.includes(match[1]) ?? false;
      include(
        {
          kind: 'Document',
          label: withoutExtension(path),
          meta: named ? `Named for the whole “${(group?.name ?? '').split(/\s+[—(]/)[0]}” group` : null,
          detail: null,
          path,
          url: urlOf(path),
        },
        null,
      );
    }

    // Also mentioned in: other files that cite the same id, outside the source's own folder. Sibling
    // plans in a phase cite each other as dependencies, which says nothing about the blocker.
    const mentions: LedgerMentionDto[] = [];
    const mentioned = new Set(sources.map((source) => source.path));
    for (const { token, own } of tokens) {
      const ownDirectory = own.slice(PLANNING_PREFIX.length).split('/').slice(0, -1).join('/');
      const ownPrefix = ownDirectory ? `${PLANNING_PREFIX}${ownDirectory}/` : null;
      for (const index of tokenIndex.get(token) ?? []) {
        const { artifact } = entries[index];
        if (mentioned.has(artifact.path) || (ownPrefix !== null && artifact.path.startsWith(ownPrefix))) continue;
        mentioned.add(artifact.path);
        mentions.push({ label: withoutExtension(artifact.path), path: artifact.path, url: urlOf(artifact.path) });
      }
    }
    return {
      sources,
      mentions: mentions.slice(0, MAX_MENTIONS),
      moreMentions: Math.max(0, mentions.length - MAX_MENTIONS),
    };
  }

  function decisionSource(id: string | null): LedgerSourceDto | null {
    if (!id) return null;
    if (/^\d{6}-/.test(id)) {
      const quick = quickSource(id);
      return quick ? { ...quick, meta: null } : null;
    }
    const [number, part] = id.split('-');
    if (!number || !part) return null;
    const unpadded = number.replace(/^0+(?=\d)/, '');
    const documentName = new RegExp(`^0*${escapeRegExp(unpadded)}-${escapeRegExp(part)}\\.md$`, 'i');
    for (const phase of phasesNumbered(number)) {
      const where = archiveLabel(phase);
      const plan = planSource(phase, id, id);
      if (plan) return { ...plan, meta: where };
      const document = phaseArtifacts(phase).find((artifact) => documentName.test(baseName(artifact.path)));
      if (!document) continue;
      return {
        kind: part.toUpperCase() === 'CONTEXT' ? 'Context' : 'Research',
        label: `Phase ${number}`,
        meta: where,
        detail: null,
        path: document.path,
        url: urlOf(document.path),
      };
    }
    return null;
  }

  return {
    sourcesOf,
    decisionSource,
    phaseUrl(number) {
      const phase = phasesNumbered(number)[0];
      return phase ? buildPhaseUrl(phase.identity) : null;
    },
    artifactUrl(path) {
      return entryByPath.has(path) ? urlOf(path) : null;
    },
    objectiveOf,
    quickTask: (id) => quickById.get(id) ?? null,
  };
}
