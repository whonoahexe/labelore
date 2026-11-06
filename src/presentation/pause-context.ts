// The pause page's server-side join (Phase 11, 11-07, VIEW-17, sketch 054 C, D-05, D-07, D-08): what the page
// needs from the two pause files and from STATE and ROADMAP. Pure: it reads the cached `ProjectPresentation`,
// never a file, and imports nothing from Node. It builds no regular expression from file text and never
// throws on presentation data; any failure gives null.
//
// Pairing. A HANDOFF.json pairs with the root `.continue-here.md`, else the one in the folder its `phase_dir`
// names. A `.continue-here.md` pairs with the root HANDOFF.json when its `phase` matches, else stands alone.
// The `phase` frontmatter wins for the head even when the file sits in another phase's folder (seen for
// real); the path keeps the folder.
//
// Disagreement. Where the two files differ (task, total, status, next action) the context lists each field
// with both values and both file names. It never merges them and never picks one as "right": the stop line
// and the next action are the HANDOFF's when it exists (the richer record), and the other file's value sits
// beside it in `disagreements` and `nextActionOther`.
//
// Age. The context carries the pause date and where it came from; the page computes the days from today, as
// the dashboard ledger's age helper does.
import type { ArtifactDto, PhaseDto, ProjectPresentation } from '../server/project-presentation.ts';
import type {
  ContinueHereLift,
  HandoffLift,
  PauseAntiPattern,
  PauseTaskRow,
} from '../planning-repo/handlers/pause-lift.ts';
import { spikeIdInText } from '../planning-repo/handlers/spikes-lift.ts';
import { columnOfKeyword, manifestRowOfSpike } from './spikes-context.ts';

export const HANDOFF_FILE = 'HANDOFF.json';
export const CONTINUE_FILE = '.continue-here.md';

const ROOT_HANDOFF_PATH = '.planning/HANDOFF.json';
const ROOT_CONTINUE_PATH = '.planning/.continue-here.md';
const PLANNING_PREFIX = '.planning/';

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface PauseFileRef {
  path: string;
  url: string;
}

export interface PauseHeadPhase {
  /** The phase number without leading zeros: "3", "2.1". */
  number: string;
  name: string | null;
}

export interface PauseDate {
  /** As the file wrote it: a full ISO time, or a day. */
  iso: string;
  source: 'timestamp' | 'paused_at' | 'last_updated';
}

/** "Work has moved on since": the named phase is complete (ROADMAP) or STATE has moved past it. */
export interface PauseMovedOn {
  what: string;
  source: 'ROADMAP' | 'STATE' | 'MANIFEST';
  date: string | null;
}

export interface PauseStop {
  task: number | string | null;
  totalTasks: number | string | null;
  status: string | null;
  taskName: string | null;
  progress: string | null;
}

export interface PauseGate {
  kind: 'human-action' | 'constraint' | 'anti-pattern';
  what: string;
  why: string | null;
  /** The mitigation, or the prevention mechanism; null for a human action. */
  how: string | null;
  file: string;
}

export interface PauseText {
  text: string;
  file: string;
}

export interface PauseValue {
  value: string;
  file: string;
}

export interface PauseDisagreement {
  field: 'task' | 'totalTasks' | 'status' | 'nextAction';
  handoff: PauseValue;
  continueHere: PauseValue;
}

export interface PauseItem {
  text: string;
  detail: string | null;
  tag: string | null;
}

export interface PauseRestSection {
  title: string;
  file: string;
  /** Prose, or null when the section is a list. */
  text: string | null;
  /** A list, or null when the section is prose. */
  items: PauseItem[] | null;
}

export interface PauseContext {
  /** Which file the address opened. */
  active: 'handoff' | 'continue-here';
  /** "phase 3", "spike SPIKE-006", or null when the files name nothing. */
  contextLabel: string | null;
  headPhase: PauseHeadPhase | null;
  files: { handoff: PauseFileRef | null; continueHere: PauseFileRef | null };
  pausedAt: PauseDate | null;
  movedOn: PauseMovedOn | null;
  stop: PauseStop;
  behind: PauseTaskRow[];
  ahead: PauseTaskRow[];
  /** Blocking human actions, then blocking constraints, then blocking anti-patterns. */
  gates: PauseGate[];
  /** Non-blocking human actions and advisory anti-patterns. */
  sideNotes: PauseGate[];
  nextAction: PauseText | null;
  /** The other file's wording when it differs. */
  nextActionOther: PauseText | null;
  disagreements: PauseDisagreement[];
  restSections: PauseRestSection[];
  /** Rows the lifts dropped at their caps, summed over both files. */
  omitted: number;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the lifts
// ---------------------------------------------------------------------------------------------------------

type HandoffPause = HandoffLift & { source: 'handoff' };
type ContinuePause = ContinueHereLift & { source: 'continue-here' };

interface Loaded<T> {
  artifact: ArtifactDto;
  pause: T;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function loadHandoff(artifact: ArtifactDto | undefined): Loaded<HandoffPause> | null {
  const pause = artifact?.structured?.pause as { source?: unknown } | undefined;
  if (artifact === undefined || artifact.kind !== 'handoff' || pause?.source !== 'handoff') return null;
  return { artifact, pause: pause as HandoffPause };
}

function loadContinue(artifact: ArtifactDto | undefined): Loaded<ContinuePause> | null {
  const pause = artifact?.structured?.pause as { source?: unknown } | undefined;
  if (artifact === undefined || artifact.kind !== 'continue-here' || pause?.source !== 'continue-here') return null;
  return { artifact, pause: pause as ContinuePause };
}

// ---------------------------------------------------------------------------------------------------------
// Phase names and matching
// ---------------------------------------------------------------------------------------------------------

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/** The number a phase text starts with, without leading zeros ("03-account" gives "3", "2.10" gives "2.10"),
 * and the text after it; null when the text does not start with a digit (a spike id, a word). */
function leadingNumber(text: string): { number: string; rest: string } | null {
  const trimmed = text.trim();
  let end = 0;
  while (end < trimmed.length && isDigit(trimmed.charCodeAt(end))) end += 1;
  if (end === 0) return null;
  let integer = trimmed.slice(0, end);
  let fraction = '';
  if (trimmed.charCodeAt(end) === 46 && isDigit(trimmed.charCodeAt(end + 1))) {
    let stop = end + 1;
    while (stop < trimmed.length && isDigit(trimmed.charCodeAt(stop))) stop += 1;
    fraction = trimmed.slice(end, stop);
    end = stop;
  }
  let zeros = 0;
  while (zeros < integer.length - 1 && integer.charCodeAt(zeros) === 48) zeros += 1;
  integer = integer.slice(zeros);
  return { number: integer + fraction, rest: trimmed.slice(end) };
}

/** The slug after a leading number ("04-bulk-loan-export" gives "bulk-loan-export"), else null. */
function slugAfterNumber(text: string): string | null {
  const parsed = leadingNumber(text);
  if (parsed === null) return null;
  const slug = parsed.rest.replace(/^[\s\-_:.]+/, '');
  return slug === '' ? null : slug.toLowerCase();
}

/** Two phase texts name the same phase: the same number, or the same non-numeric id (case-insensitive). */
function samePhase(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  const left = leadingNumber(a);
  const right = leadingNumber(b);
  if (left !== null && right !== null) return left.number === right.number;
  if (left !== null || right !== null) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normaliseDir(dir: string | undefined): string | null {
  if (dir === undefined) return null;
  let value = dir.trim().replaceAll('\\', '/');
  while (value.startsWith('./')) value = value.slice(2);
  while (value.endsWith('/')) value = value.slice(0, -1);
  return value === '' ? null : value;
}

function allPhases(presentation: ProjectPresentation): PhaseDto[] {
  const out: PhaseDto[] = [];
  for (const milestone of Array.isArray(presentation.milestones) ? presentation.milestones : []) {
    for (const phase of Array.isArray(milestone.phases) ? milestone.phases : []) out.push(phase);
  }
  return out;
}

/** The phase a pause file names: by its folder when `phase_dir` is given, then by number and slug, a live
 * phase of the STATE milestone first. Null when no phase carries that number. */
function findPhase(
  presentation: ProjectPresentation,
  phaseText: string,
  phaseDir: string | undefined,
): PhaseDto | null {
  const wanted = leadingNumber(phaseText);
  if (wanted === null) return null;
  const slug = slugAfterNumber(phaseText);
  const dir = normaliseDir(phaseDir);
  const stateMilestone = presentation.state?.milestone ?? null;
  let best: PhaseDto | null = null;
  let bestScore = -1;
  for (const phase of allPhases(presentation)) {
    if (leadingNumber(phase.identity.number)?.number !== wanted.number) continue;
    let score = 1;
    if (dir !== null && normaliseDir(phase.dirPath ?? undefined) === dir) score += 8;
    if (slug !== null && phase.identity.slug.toLowerCase() === slug) score += 4;
    if (!phase.archived) score += 2;
    if (stateMilestone !== null && phase.identity.milestoneVersion === stateMilestone) score += 1;
    if (score > bestScore) {
      best = phase;
      bestScore = score;
    }
  }
  return best;
}

/** A completion date as a day: a YYYY-MM-DD, or the day of an ISO time; null for anything else. */
function dayOf(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const head = value.trim().slice(0, 10);
  if (head.length !== 10 || head.charCodeAt(4) !== 45 || head.charCodeAt(7) !== 45) return null;
  return head;
}

/** The newest `completed` day among a phase's summaries, else null. */
function latestCompleted(phase: PhaseDto): string | null {
  let latest: string | null = null;
  for (const plan of Array.isArray(phase.plans) ? phase.plans : []) {
    const day = dayOf(plan.summary?.frontmatter?.completed);
    if (day !== null && (latest === null || day > latest)) latest = day;
  }
  return latest;
}

function phaseLabel(phase: PhaseDto): string {
  const number = leadingNumber(phase.identity.number)?.number ?? phase.identity.number;
  return `Phase ${number} ${phase.name}`.trim();
}

/**
 * The "work has moved on" note for the named phase, kept apart from the handoff's own fields (D-07, D-08).
 * ROADMAP when its plan checklist marks the phase complete; STATE when the phase is complete on disk, or
 * STATE.md now names a later phase of the same milestone (the roadmap of a project that writes only a
 * "4/4 plans executed" line has no checklist, so `roadmapComplete` is null there).
 */
function movedOnForPhase(presentation: ProjectPresentation, phase: PhaseDto): PauseMovedOn | null {
  if (phase.roadmapComplete === true) {
    return { what: `${phaseLabel(phase)} is complete`, source: 'ROADMAP', date: latestCompleted(phase) };
  }
  const state = presentation.state;
  if (phase.diskStatus === 'complete') {
    return {
      what: `${phaseLabel(phase)} is complete`,
      source: 'STATE',
      date: state?.lastActivity ?? latestCompleted(phase),
    };
  }
  if (state?.phaseNumber != null && !phase.archived && state.milestone === phase.identity.milestoneVersion) {
    const current = Number.parseFloat(leadingNumber(state.phaseNumber)?.number ?? '');
    const named = Number.parseFloat(leadingNumber(phase.identity.number)?.number ?? '');
    if (Number.isFinite(current) && Number.isFinite(named) && current > named) {
      const now = state.phaseName == null || state.phaseName === '' ? '' : ` ${state.phaseName}`;
      return {
        what: `${phaseLabel(phase)} is behind the current phase ${current}${now}`,
        source: 'STATE',
        date: state.lastActivity ?? null,
      };
    }
  }
  return null;
}

/**
 * The "work has moved on" note for a spike pause (RESEARCH A8, UI-SPEC open item 5; no real example exists, so
 * the rule is stated here): the spike the pause names has a manifest verdict of VALIDATED, INVALIDATED or
 * PARTIAL. `spikeFolder` is what the pause calls its spike (`SPIKE-006`, `006`, `003b-local-disk-staging`); the
 * manifest row is found by the id it names. A pending, unknown or empty verdict, a spike with no row and a
 * project with no readable manifest give null. The manifest carries no date, so the note has none.
 */
export function movedOnForSpike(presentation: ProjectPresentation, spikeFolder: string): PauseMovedOn | null {
  const id = spikeIdInText(spikeFolder);
  if (id === null) return null;
  const row = manifestRowOfSpike(presentation, id);
  if (row === null) return null;
  const column = columnOfKeyword(row.verdictKeyword);
  if (column !== 'validated' && column !== 'invalidated' && column !== 'partial') return null;
  const label = row.name === '' ? `spike ${row.id}` : `spike ${row.id} ${row.name}`;
  return { what: `${label} is marked ${column.toUpperCase()} in the manifest`, source: 'MANIFEST', date: null };
}

// ---------------------------------------------------------------------------------------------------------
// The head
// ---------------------------------------------------------------------------------------------------------

/** "spikes/SPIKE-006/.continue-here.md" gives "SPIKE-006"; null when the path is not in a spike folder. */
function spikeIdOfPath(path: string): string | null {
  const marker = '/spikes/';
  const at = path.indexOf(marker);
  if (at === -1) return null;
  const rest = path.slice(at + marker.length);
  const cut = rest.indexOf('/');
  return cut <= 0 ? null : rest.slice(0, cut);
}

function locationWord(path: string): string | null {
  if (spikeIdOfPath(path) !== null) return 'spike';
  if (path.includes('/sketches/')) return 'sketch';
  if (path.includes('/deliberations/')) return 'deliberation';
  return null;
}

function contextLabelOf(phaseText: string | undefined, contextWord: string | undefined, path: string): string | null {
  const numeric = phaseText === undefined ? null : leadingNumber(phaseText);
  const word = contextWord?.trim().toLowerCase();
  if (numeric !== null && (word === undefined || word === 'phase')) return `phase ${numeric.number}`;
  if (phaseText !== undefined) {
    const kind = word ?? locationWord(path);
    return kind === null || kind === undefined ? phaseText : `${kind} ${phaseText}`;
  }
  const spike = spikeIdOfPath(path);
  if (spike !== null) return `spike ${spike}`;
  const located = locationWord(path);
  if (located !== null) return located;
  return word === undefined ? null : word;
}

// ---------------------------------------------------------------------------------------------------------
// Tasks, gates, rest
// ---------------------------------------------------------------------------------------------------------

function isInProgress(row: PauseTaskRow): boolean {
  const status = row.status?.toLowerCase().replaceAll('-', '_');
  return status === 'in_progress';
}

/** The row the stop names: a row with that task id, else the one in progress. */
function stopRow(handoff: HandoffPause | null): PauseTaskRow | null {
  if (handoff === null) return null;
  const rows = [...list<PauseTaskRow>(handoff.completed), ...list<PauseTaskRow>(handoff.remaining)];
  const wanted = handoff.task === undefined ? null : String(handoff.task);
  if (wanted !== null) {
    const byId = rows.find((row) => row.id === wanted && row.taskCount === undefined);
    if (byId !== undefined) return byId;
  }
  return rows.find((row) => isInProgress(row) && row.taskCount === undefined) ?? null;
}

function antiPatternGate(row: PauseAntiPattern): PauseGate {
  return {
    kind: 'anti-pattern',
    what: row.pattern,
    why: row.description ?? null,
    how: row.prevention ?? null,
    file: CONTINUE_FILE,
  };
}

function sameText(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function textItems(values: readonly string[]): PauseItem[] {
  return values.map((text) => ({ text, detail: null, tag: null }));
}

function restOf(handoff: HandoffPause | null, cont: ContinuePause | null): PauseRestSection[] {
  const rest: PauseRestSection[] = [];
  const add = (title: string, file: string, text: string | null, items: PauseItem[] | null): void => {
    if (text !== null && text.trim() === '') return;
    if (items !== null && items.length === 0) return;
    rest.push({ title, file, text, items });
  };
  if (handoff !== null) {
    add(
      'Blockers',
      HANDOFF_FILE,
      null,
      list<{ description: string; type?: string; workaround?: string }>(handoff.blockers).map((row) => ({
        text: row.description,
        detail: row.workaround ?? null,
        tag: row.type ?? null,
      })),
    );
    add(
      'Decisions',
      HANDOFF_FILE,
      null,
      list<{ decision: string; rationale?: string; phase?: string }>(handoff.decisions).map((row) => ({
        text: row.decision,
        detail: row.rationale ?? null,
        tag: row.phase ?? null,
      })),
    );
    add('Uncommitted files', HANDOFF_FILE, null, textItems(list<string>(handoff.uncommittedFiles)));
    add('Context notes', HANDOFF_FILE, handoff.contextNotes ?? null, null);
    add(
      'Async jobs',
      HANDOFF_FILE,
      null,
      list<{ text: string; detail?: string }>(handoff.asyncJobs).map((row) => ({
        text: row.text,
        detail: row.detail ?? null,
        tag: null,
      })),
    );
    add('Other keys', HANDOFF_FILE, null, textItems(list<string>(handoff.unknownKeys)));
  }
  if (cont !== null) {
    const tags = cont.tags ?? {};
    add('Current state', CONTINUE_FILE, tags.currentState ?? null, null);
    add('Completed work', CONTINUE_FILE, tags.completedWork ?? null, null);
    add('Remaining work', CONTINUE_FILE, tags.remainingWork ?? null, null);
    add('Decisions made', CONTINUE_FILE, tags.decisionsMade ?? null, null);
    add('Blockers', CONTINUE_FILE, tags.blockers ?? null, null);
    add('Context', CONTINUE_FILE, tags.context ?? null, null);
    for (const section of list<{ heading: string; text: string }>(cont.sections)) {
      add(section.heading, CONTINUE_FILE, section.text, null);
    }
  }
  return rest;
}

// ---------------------------------------------------------------------------------------------------------
// The context
// ---------------------------------------------------------------------------------------------------------

function refOf(artifact: ArtifactDto | undefined): PauseFileRef | null {
  return artifact === undefined ? null : { path: artifact.path, url: artifact.key };
}

/**
 * The page context for the pause file at `activePath`, or null when that path is not a pause file in the
 * presentation, or its lift is absent (the page then falls back to the plain document).
 */
export function buildPauseContext(presentation: ProjectPresentation, activePath: string): PauseContext | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const byPath = (path: string): ArtifactDto | undefined => artifacts.find((candidate) => candidate.path === path);
    const active = byPath(activePath);
    if (active === undefined) return null;

    let handoff: Loaded<HandoffPause> | null = null;
    let cont: Loaded<ContinuePause> | null = null;
    if (active.kind === 'handoff') {
      handoff = loadHandoff(active);
      if (handoff === null) return null;
      cont = loadContinue(byPath(ROOT_CONTINUE_PATH));
      if (cont === null) {
        const dir = normaliseDir(handoff.pause.phaseDir);
        if (dir !== null) {
          const candidate = byPath(`${dir}/${CONTINUE_FILE}`) ?? byPath(`${PLANNING_PREFIX}${dir}/${CONTINUE_FILE}`);
          cont = loadContinue(candidate);
        }
      }
    } else if (active.kind === 'continue-here') {
      cont = loadContinue(active);
      if (cont === null) return null;
      const root = loadHandoff(byPath(ROOT_HANDOFF_PATH));
      // A note that names no phase cannot disagree with the HANDOFF beside it, so the root one pairs.
      const unnamed = cont.pause.phase === undefined && active.path === ROOT_CONTINUE_PATH;
      const matches = unnamed || samePhase(root?.pause.phase, cont.pause.phase);
      if (root !== null && matches) handoff = root;
    } else {
      return null;
    }

    const h = handoff?.pause ?? null;
    const c = cont?.pause ?? null;
    // The head and the stop come from the HANDOFF when it exists, else from the note.
    const phaseText = h?.phase ?? c?.phase;
    const phaseDir = h?.phaseDir;
    const contextWord = c?.context;
    const phase = phaseText === undefined ? null : findPhase(presentation, phaseText, phaseDir);
    const numeric = phaseText === undefined ? null : leadingNumber(phaseText);
    const headPhase: PauseHeadPhase | null =
      numeric === null ? null : { number: numeric.number, name: h?.phaseName ?? phase?.name ?? null };

    let movedOn: PauseMovedOn | null = null;
    if (numeric !== null) {
      if (phase !== null) movedOn = movedOnForPhase(presentation, phase);
    } else {
      const inSpike = contextWord === 'spike' || locationWord(active.path) === 'spike';
      const spike = inSpike && phaseText !== undefined ? phaseText : spikeIdOfPath(active.path);
      if (spike !== null) movedOn = movedOnForSpike(presentation, spike);
    }

    let pausedAt: PauseDate | null = null;
    if (h?.pausedAt !== undefined) pausedAt = { iso: h.pausedAt, source: h.pausedAtSource ?? 'timestamp' };
    else if (c?.lastUpdated !== undefined) pausedAt = { iso: c.lastUpdated, source: 'last_updated' };

    const row = stopRow(h);
    const primary = h ?? c;
    const stop: PauseStop = {
      task: primary?.task ?? null,
      totalTasks: primary?.totalTasks ?? null,
      status: primary?.status ?? null,
      taskName: row?.name ?? null,
      progress: row?.progress ?? null,
    };

    const behind = list<PauseTaskRow>(h?.completed).filter((entry) => !isInProgress(entry));
    const ahead = list<PauseTaskRow>(h?.remaining);

    const gates: PauseGate[] = [];
    const sideNotes: PauseGate[] = [];
    const blockingActions: PauseGate[] = [];
    for (const action of list<{ action: string; context?: string; blocking: boolean }>(h?.humanActions)) {
      const gate: PauseGate = {
        kind: 'human-action',
        what: action.action,
        why: action.context ?? null,
        how: null,
        file: HANDOFF_FILE,
      };
      (action.blocking ? blockingActions : sideNotes).push(gate);
    }
    // A constraint listed under BLOCKING CONSTRAINTS blocks, so the constraints follow the human actions.
    const constraints: PauseGate[] = list<{ name: string; what?: string; mitigation?: string }>(c?.constraints).map(
      (constraint) => ({
        kind: 'constraint',
        what: constraint.name,
        why: constraint.what ?? null,
        how: constraint.mitigation ?? null,
        file: CONTINUE_FILE,
      }),
    );
    const patterns = list<PauseAntiPattern>(c?.antiPatterns);
    gates.push(...blockingActions, ...constraints, ...patterns.filter((p) => p.blocking).map(antiPatternGate));
    sideNotes.push(...patterns.filter((p) => !p.blocking).map(antiPatternGate));

    const handoffNext = h?.nextAction;
    const continueNext = c?.tags?.nextAction;
    let nextAction: PauseText | null = null;
    let nextActionOther: PauseText | null = null;
    if (handoffNext !== undefined) {
      nextAction = { text: handoffNext, file: HANDOFF_FILE };
      if (continueNext !== undefined && !sameText(handoffNext, continueNext)) {
        nextActionOther = { text: continueNext, file: CONTINUE_FILE };
      }
    } else if (continueNext !== undefined) {
      nextAction = { text: continueNext, file: CONTINUE_FILE };
    }

    const disagreements: PauseDisagreement[] = [];
    if (h !== null && c !== null) {
      const compare = (field: PauseDisagreement['field'], left: unknown, right: unknown): void => {
        if (left === undefined || right === undefined) return;
        const a = String(left);
        const b = String(right);
        if (sameText(a, b)) return;
        disagreements.push({
          field,
          handoff: { value: a, file: HANDOFF_FILE },
          continueHere: { value: b, file: CONTINUE_FILE },
        });
      };
      compare('task', h.task, c.task);
      compare('totalTasks', h.totalTasks, c.totalTasks);
      compare('status', h.status, c.status);
      compare('nextAction', h.nextAction, c.tags?.nextAction);
    }

    return {
      active: active.kind === 'handoff' ? 'handoff' : 'continue-here',
      contextLabel: contextLabelOf(phaseText, contextWord, active.path),
      headPhase,
      files: { handoff: refOf(handoff?.artifact), continueHere: refOf(cont?.artifact) },
      pausedAt,
      movedOn,
      stop,
      behind,
      ahead,
      gates,
      sideNotes,
      nextAction,
      nextActionOther,
      disagreements,
      restSections: restOf(h, c),
      omitted: (h?.moreCount ?? 0) + (c?.moreCount ?? 0),
    };
  } catch {
    return null;
  }
}
