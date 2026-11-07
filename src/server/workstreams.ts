// The workstream inventory (D-10, D-13; RESEARCH Pattern 7, C7, C12, A9, Pitfalls 5, 6, 12): which
// workstreams a project holds, how each one stands, which one the active pointer names, which were
// completed into milestones/, and whether the root still carries files a migration should have moved.
// It reads only through the filesystem port (never a Node module), never throws, and never writes.
//
// Everything it learns from disk is text an author wrote, so it is bounded and validated: a name is a
// path segment only after isValidWorkstreamName and a match against the listing; the active pointer is
// a hint matched against the listing and never becomes a path; phases and plans counts are separate
// facts and neither is derived from the other.
import { isValidScopeName } from '../planning-fs/scoped-fs.ts';
import type { DirEntry, PlanningFilesystem } from '../planning-fs/types.ts';
import { tryParseFrontmatter } from '../planning-repo/frontmatter.ts';

const WORKSTREAMS_DIR = '.planning/workstreams';
const ACTIVE_POINTER = '.planning/active-workstream';
const MILESTONES_DIR = '.planning/milestones';
/** The names a workstream carries instead of the root (what GSD's migration moves). */
const MOVED_NAMES = ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'phases'] as const;
const MAX_POINTER_BYTES = 256;
const MAX_WORKSTREAMS = 500;
const MAX_STATE_CHARS = 64 * 1024;
const MAX_ROADMAP_CHARS = 256 * 1024;
const MAX_LINE_CHARS = 400;
const MAX_STATUS_CHARS = 80;
const MAX_PHASE_NAME_CHARS = 120;
const MAX_COMPLETED = 500;

export type WorkstreamDashedReason = 'STATE.md not found' | 'No roadmap yet';

export interface WorkstreamProgress {
  phasesDone: number;
  phasesTotal: number;
  plansDone: number;
  plansTotal: number;
}

export interface WorkstreamEntry {
  name: string;
  /** A `workstreams/` entry that is a file is listed (dashed) and has no scope of its own. */
  kind: 'folder' | 'file';
  /** The status word as the workstream's STATE wrote it (frontmatter first, then the bold line), or null. */
  status: string | null;
  currentPhase: { number: string; name: string | null } | null;
  progress: WorkstreamProgress | null;
  hasRoadmap: boolean;
  /** The entries of the workstream's own folder, in code-point order. */
  ownFiles: string[];
  /** How many phase folders the workstream's phases/ holds. */
  phaseCount: number;
  dashed: WorkstreamDashedReason | null;
}

export type ActivePointerState = 'present' | 'absent' | 'stale';

export interface WorkstreamInventory {
  mode: 'flat' | 'workstreams';
  entries: WorkstreamEntry[];
  /** The active-workstream file read as a hint: `present` names a listed folder, `stale` names none, `absent`
   * means no usable pointer. Nothing is inferred from mtimes or STATE. */
  active: { name: string | null; state: ActivePointerState };
  completed: { name: string; folder: string; phasesArchived: number }[];
  /** Root files a migration should have moved, while `workstreams/` also exists; null otherwise. */
  midMigration: { rootFiles: string[] } | null;
}

/** A workstream name is a path segment only when it passes GSD's own grammar (and is not `none`, `.` or `..`). */
export function isValidWorkstreamName(name: string): boolean {
  return isValidScopeName(name);
}

const compareCodePoints = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export function flatInventory(): WorkstreamInventory {
  return { mode: 'flat', entries: [], active: { name: null, state: 'absent' }, completed: [], midMigration: null };
}

async function listOrNull(fs: PlanningFilesystem, relDir: string): Promise<DirEntry[] | null> {
  try {
    return await fs.list(relDir);
  } catch {
    return null;
  }
}

async function existsSafely(fs: PlanningFilesystem, relPath: string): Promise<boolean> {
  try {
    return await fs.exists(relPath);
  } catch {
    return false;
  }
}

async function readText(fs: PlanningFilesystem, relPath: string, maxChars: number): Promise<string | null> {
  try {
    const read = await fs.read(relPath);
    return read.content.length > maxChars ? read.content.slice(0, maxChars) : read.content;
  } catch {
    return null;
  }
}

function boundedText(value: string, max: number): string | null {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The text after a `**Label:**` bold line of a STATE body, found by a linear line scan. */
function boldLineValue(body: string, label: string): string | null {
  const marker = `**${label}:**`;
  for (const line of body.split('\n')) {
    const trimmed = line.length > MAX_LINE_CHARS ? line.slice(0, MAX_LINE_CHARS).trim() : line.trim();
    if (trimmed.startsWith(marker)) return trimmed.slice(marker.length).trim();
  }
  return null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;

/** "02" and "2" name the same phase; "2.1" keeps its decimal part. */
function normalizePhaseNumber(raw: string): string | null {
  const match = /^(\d{1,4})(\.\d{1,4})?$/.exec(raw.trim());
  if (!match) return null;
  return `${Number(match[1])}${match[2] ?? ''}`;
}

function progressOf(frontmatter: Record<string, unknown>): WorkstreamProgress | null {
  const progress = asRecord(frontmatter.progress);
  if (!progress) return null;
  const phasesTotal = count(progress.total_phases);
  const phasesDone = count(progress.completed_phases);
  const plansTotal = count(progress.total_plans);
  const plansDone = count(progress.completed_plans);
  // Phases and plans are separate facts: a missing figure is not filled from the other pair.
  if (phasesTotal === null || phasesDone === null || plansTotal === null || plansDone === null) return null;
  return { phasesDone, phasesTotal, plansDone, plansTotal };
}

interface StateReading {
  status: string | null;
  phaseNumber: string | null;
  phaseName: string | null;
  progress: WorkstreamProgress | null;
}

/** STATE read the way GSD's own inventory reads it: frontmatter first, then the bold lines of the body. */
function readState(content: string): StateReading {
  const parsed = tryParseFrontmatter(content);
  const data = parsed.data;
  const statusFront = typeof data.status === 'string' ? boundedText(data.status, MAX_STATUS_CHARS) : null;
  const status = statusFront ?? boundedText(boldLineValue(parsed.body, 'Status') ?? '', MAX_STATUS_CHARS);

  const bold = boldLineValue(parsed.body, 'Current Phase');
  const boldToken = bold === null ? null : (bold.split(/\s+/)[0] ?? null);
  let rawNumber: string | null = null;
  const front = data.current_phase;
  if (typeof front === 'string') rawNumber = front;
  // A numeric frontmatter value may have lost its leading zeros (or been read as octal); the body's own text is exact.
  else if (typeof front === 'number') rawNumber = boldToken !== null && normalizePhaseNumber(boldToken) !== null ? boldToken : String(front);
  else if (boldToken !== null) rawNumber = boldToken;
  const phaseNumber = rawNumber === null ? null : normalizePhaseNumber(rawNumber);

  const phaseName = typeof data.current_phase_name === 'string' ? boundedText(data.current_phase_name, MAX_PHASE_NAME_CHARS) : null;
  return { status, phaseNumber, phaseName, progress: progressOf(data) };
}

/** The phase names a ROADMAP declares, by normalized number, from its bullets and `### Phase N:` headings. */
function roadmapPhaseNames(content: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const rawLine of content.split('\n')) {
    let line = rawLine.length > MAX_LINE_CHARS ? rawLine.slice(0, MAX_LINE_CHARS) : rawLine;
    line = line.trim();
    if (line.startsWith('#')) line = line.replace(/^#{1,6}\s*/, '');
    const bullet = /^[-*]\s*\[[ xX]\]\s*/.exec(line);
    if (bullet) line = line.slice(bullet[0].length);
    if (line.startsWith('**')) line = line.slice(2);
    if (!line.startsWith('Phase ')) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const number = normalizePhaseNumber(line.slice('Phase '.length, colon));
    if (number === null) continue;
    let name = line.slice(colon + 1).trim();
    const bold = name.indexOf('**');
    if (bold >= 0) name = name.slice(0, bold);
    const dash = name.indexOf(' - ');
    if (dash >= 0) name = name.slice(0, dash);
    const bounded = boundedText(name, MAX_PHASE_NAME_CHARS);
    if (bounded !== null && !names.has(number)) names.set(number, bounded);
  }
  return names;
}

async function inspectWorkstream(fs: PlanningFilesystem, entry: DirEntry): Promise<WorkstreamEntry> {
  const name = entry.name;
  if (!entry.isDirectory) {
    return {
      name,
      kind: 'file',
      status: null,
      currentPhase: null,
      progress: null,
      hasRoadmap: false,
      ownFiles: [],
      phaseCount: 0,
      dashed: 'STATE.md not found',
    };
  }
  const folder = `${WORKSTREAMS_DIR}/${name}`;
  const own = (await listOrNull(fs, folder)) ?? [];
  const ownFiles = own.map((child) => child.name).sort(compareCodePoints);
  const phases = own.some((child) => child.name === 'phases' && child.isDirectory)
    ? ((await listOrNull(fs, `${folder}/phases`)) ?? [])
    : [];
  const phaseCount = phases.filter((child) => child.isDirectory).length;
  const stateText = ownFiles.includes('STATE.md') ? await readText(fs, `${folder}/STATE.md`, MAX_STATE_CHARS) : null;
  const roadmapText = ownFiles.includes('ROADMAP.md') ? await readText(fs, `${folder}/ROADMAP.md`, MAX_ROADMAP_CHARS) : null;
  const hasRoadmap = roadmapText !== null;

  const state = stateText === null ? null : readState(stateText);
  let currentPhase: WorkstreamEntry['currentPhase'] = null;
  if (state?.phaseNumber != null) {
    const fromRoadmap = roadmapText === null ? undefined : roadmapPhaseNames(roadmapText).get(state.phaseNumber);
    currentPhase = { number: state.phaseNumber, name: fromRoadmap ?? state.phaseName };
  }
  return {
    name,
    kind: 'folder',
    status: state?.status ?? null,
    currentPhase,
    progress: state?.progress ?? null,
    hasRoadmap,
    ownFiles,
    phaseCount,
    dashed: stateText === null ? 'STATE.md not found' : hasRoadmap ? null : 'No roadmap yet',
  };
}

/** The active pointer, read once, at most MAX_POINTER_BYTES, trimmed and validated; a hint only. */
async function readActivePointer(fs: PlanningFilesystem, folderNames: ReadonlySet<string>): Promise<WorkstreamInventory['active']> {
  const absent = { name: null, state: 'absent' as const };
  let text: string;
  try {
    if (fs.readHead) {
      const head = await fs.readHead(ACTIVE_POINTER, MAX_POINTER_BYTES + 1);
      if (head.length > MAX_POINTER_BYTES) return absent;
      text = new TextDecoder().decode(head);
    } else {
      const read = await fs.read(ACTIVE_POINTER);
      if (read.size > MAX_POINTER_BYTES) return absent;
      text = read.content;
    }
  } catch {
    return absent;
  }
  const name = text.trim();
  if (!isValidWorkstreamName(name)) return absent;
  return { name, state: folderNames.has(name) ? 'present' : 'stale' };
}

async function readCompleted(fs: PlanningFilesystem): Promise<WorkstreamInventory['completed']> {
  const entries = await listOrNull(fs, MILESTONES_DIR);
  if (entries === null) return [];
  const folders = entries
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.name)
    .filter((folder) => /^ws-[a-zA-Z0-9][a-zA-Z0-9._-]*?-\d{4}-\d{2}-\d{2}(?:-\d{1,3})?$/.test(folder))
    .sort(compareCodePoints)
    .slice(0, MAX_COMPLETED);
  const rows: WorkstreamInventory['completed'] = [];
  for (const folder of folders) {
    const match = /^ws-(.+?)-\d{4}-\d{2}-\d{2}(?:-\d{1,3})?$/.exec(folder);
    if (!match) continue;
    const phases = (await listOrNull(fs, `${MILESTONES_DIR}/${folder}/phases`)) ?? [];
    rows.push({
      name: match[1],
      folder: `milestones/${folder}/`,
      phasesArchived: phases.filter((phase) => phase.isDirectory).length,
    });
  }
  return rows;
}

/** Reads the project's workstream inventory through the port. Never throws; a project with no workstream
 * folder (or an unreadable listing) is flat. */
export async function readWorkstreamInventory(fs: PlanningFilesystem): Promise<WorkstreamInventory> {
  try {
    const completed = await readCompleted(fs);
    const listed = await listOrNull(fs, WORKSTREAMS_DIR);
    // Dot-names (.gitkeep, .DS_Store) are filesystem noise, not workstreams.
    const items = (listed ?? []).filter((entry) => !entry.name.startsWith('.'));
    if (!items.some((entry) => entry.isDirectory)) return { ...flatInventory(), completed };

    const ordered = items.slice().sort((a, b) => compareCodePoints(a.name, b.name)).slice(0, MAX_WORKSTREAMS);
    const entries: WorkstreamEntry[] = [];
    for (const item of ordered) entries.push(await inspectWorkstream(fs, item));
    const folderNames = new Set(entries.filter((entry) => entry.kind === 'folder').map((entry) => entry.name));
    const active = await readActivePointer(fs, folderNames);

    const rootFiles: string[] = [];
    for (const name of MOVED_NAMES) if (await existsSafely(fs, `.planning/${name}`)) rootFiles.push(name);
    return {
      mode: 'workstreams',
      entries,
      active,
      completed,
      midMigration: rootFiles.length > 0 ? { rootFiles } : null,
    };
  } catch {
    return flatInventory();
  }
}
