// The Spikes page's server-side join (Phase 11, 11-12, VIEW-14, D-01, D-07, sketch 053 A): the verdict board the
// manifest draws, with each spike's README verdict, its file list and the wrap-up laid against it. Pure: it
// reads the cached `ProjectPresentation`, never a file, and imports nothing from Node. It builds no regular
// expression from document text, reads author keys through Maps, and gives null on any failure, never a throw.
//
// Verdicts. The manifest's verdict cell is a keyword plus free text (`INVALIDATED (no spare test kiosk)`); the
// keyword places the tile in one of four columns, the text rides on the tile. A keyword outside the four
// (DEFERRED, `yes`) or an empty cell goes to Pending as written, flagged `known: false` so the page leaves it
// untoned. A README may carry its own verdict: when its keyword differs from the manifest's both are kept
// (`readmeSays` beside the manifest's verdict), never merged and never corrected.
//
// Files. A spike folder's file list is the README plus the folder's `listed` files (scripts and outputs the
// scanner never read). Each entry is exactly name, kind, sizeBytes and url: the kind comes from position and
// extension, the size from the stat, and no content exists in the presentation to leak (T-11-17).
//
// Order. Tiles within a column are ordered by spike id: the number first, then the letter suffix (001a, 001b,
// 002, 003b), ties by manifest row order. The same files give the same board whatever order the table lists them.
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import { IMPLICIT_IDEA_KEY, spikeFolderIdentity, spikeIdKey } from '../planning-repo/handlers/spikes-lift.ts';
import type {
  SpikeIdea,
  SpikeManifestRow,
  SpikeReadmeBody,
  SpikesWrapUpBody,
  WrapUpProcessedRow,
} from '../planning-repo/handlers/spikes-lift.ts';

const SPIKES_DIR = '.planning/spikes/';

// ---------------------------------------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------------------------------------

export type VerdictColumnKey = 'validated' | 'partial' | 'invalidated' | 'pending';

export interface VerdictColumn {
  key: VerdictColumnKey;
  label: string;
  /** The manifest keyword that places a tile here, upper case. */
  keyword: string;
}

/** The four fixed verdict columns in the board's order (UI-SPEC section 2). */
export const VERDICT_COLUMNS: readonly VerdictColumn[] = [
  { key: 'validated', label: 'Validated', keyword: 'VALIDATED' },
  { key: 'partial', label: 'Partial', keyword: 'PARTIAL' },
  { key: 'invalidated', label: 'Invalidated', keyword: 'INVALIDATED' },
  { key: 'pending', label: 'Pending', keyword: 'PENDING' },
];

/** A keyword with its emphasis marks (`**VALIDATED**`) and case removed, for comparison only. */
function comparable(keyword: string): string {
  let out = '';
  for (const ch of keyword) {
    if (ch === '*' || ch === '_' || ch === '`') continue;
    out += ch;
  }
  return out.trim().toUpperCase();
}

/** The column a keyword names, or null for an empty or unknown one. */
export function columnOfKeyword(keyword: string): VerdictColumnKey | null {
  const wanted = comparable(keyword);
  if (wanted === '') return null;
  for (const column of VERDICT_COLUMNS) if (column.keyword === wanted) return column.key;
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export type SpikeFileKind = 'notes' | 'script' | 'output';

/** One file of a spike folder: exactly these four keys, never a content field. */
export interface SpikeFile {
  name: string;
  kind: SpikeFileKind;
  sizeBytes: number;
  url: string;
}

export interface SpikeTile {
  /** Text, as the manifest writes it: `003b`. */
  id: string;
  name: string;
  /** The idea key of the lane the tile sits in. */
  idea: string;
  type: string;
  /** The README's address, or null when the manifest row has no folder with a README. */
  url: string | null;
  /** The manifest cell's first word as written; '' for an empty cell. */
  verdictKeyword: string;
  verdictText: string;
  columnKey: VerdictColumnKey;
  /** False for an unknown keyword or an empty cell: the page leaves the tile untoned. */
  known: boolean;
  /** The README's own keyword when it differs from the manifest's, else null. */
  readmeSays: string | null;
  readmeSaysText: string | null;
  wrappedUp: boolean;
  fileCount: number;
  files: SpikeFile[];
  /** The address of a pause file in the spike's folder, or null. */
  pauseUrl: string | null;
}

/** A spike folder with no manifest row: the README's verdict, drawn the same way. */
export interface SpikeFolderEntry {
  folder: string;
  id: string;
  name: string;
  type: string;
  url: string | null;
  verdictKeyword: string;
  verdictText: string;
  /** The column the README's keyword names, or null (no README, no verdict or an unknown word). */
  columnKey: VerdictColumnKey | null;
  known: boolean;
  wrappedUp: boolean;
  fileCount: number;
  files: SpikeFile[];
  pauseUrl: string | null;
}

export interface SpikeLane {
  key: string;
  paragraph: string;
  requirements: string[];
  implicit: boolean;
  count: number;
  columns: Record<VerdictColumnKey, SpikeTile[]>;
}

export interface SpikeWrapUpEntry extends WrapUpProcessedRow {
  /** The spike's panel address, or null when no README matches. */
  url: string | null;
}

export interface SpikeWrapUp {
  url: string;
  date: string | null;
  count: number | null;
  skillPath: string | null;
  areas: string[];
  keyFindings: string;
  processed: SpikeWrapUpEntry[];
  notProcessed: Array<{ id: string; name: string; url: string | null }>;
}

export interface SpikesContext {
  manifest: { path: string; url: string; readable: boolean } | null;
  lanes: SpikeLane[];
  /** The total of each column across lanes. */
  counts: Record<VerdictColumnKey, number>;
  notInManifest: SpikeFolderEntry[];
  wrapUp: SpikeWrapUp | null;
  conventions: { url: string } | null;
  facts: { ideas: number; spikes: number; notInManifestCount: number; wrappedUpDate: string | null };
  /** The panel the address names: a spike's folder name, `wrap-up-summary`, `conventions`, or null (the board). */
  activeKey: string | null;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the lifts
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function liftOf(artifact: ArtifactDto | undefined, part: string): Record<string, unknown> | null {
  if (artifact === undefined || !isRecord(artifact.structured)) return null;
  const spikes = Object.hasOwn(artifact.structured, 'spikes') ? artifact.structured.spikes : undefined;
  if (!isRecord(spikes) || !Object.hasOwn(spikes, part)) return null;
  const lift = spikes[part];
  return isRecord(lift) ? lift : null;
}

function rowsOfManifest(artifact: ArtifactDto | undefined): { ideas: SpikeIdea[]; rows: SpikeManifestRow[] } | null {
  const lift = liftOf(artifact, 'manifest');
  if (lift === null || !Array.isArray(lift.rows) || !Array.isArray(lift.ideas)) return null;
  const rows: SpikeManifestRow[] = [];
  for (const raw of lift.rows) {
    if (!isRecord(raw) || str(raw.id) === '') continue;
    rows.push({
      id: str(raw.id),
      idea: str(raw.idea),
      name: str(raw.name),
      type: str(raw.type),
      validates: str(raw.validates),
      verdictKeyword: str(raw.verdictKeyword),
      verdictText: str(raw.verdictText),
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    });
  }
  const ideas: SpikeIdea[] = [];
  for (const raw of lift.ideas) {
    if (!isRecord(raw) || str(raw.key) === '') continue;
    ideas.push({
      key: str(raw.key),
      paragraph: str(raw.paragraph),
      requirements: Array.isArray(raw.requirements) ? raw.requirements.filter((r): r is string => typeof r === 'string') : [],
      ...(raw.implicit === true ? { implicit: true as const } : {}),
    });
  }
  return { ideas, rows };
}

function readmeOf(artifact: ArtifactDto | undefined): Partial<SpikeReadmeBody> | null {
  const lift = liftOf(artifact, 'readme');
  return lift === null ? null : (lift as Partial<SpikeReadmeBody>);
}

function wrapUpOf(artifact: ArtifactDto | undefined): Partial<SpikesWrapUpBody> | null {
  const lift = liftOf(artifact, 'wrapUp');
  return lift === null ? null : (lift as Partial<SpikesWrapUpBody>);
}

// ---------------------------------------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------------------------------------

interface IdOrder {
  numeric: boolean;
  number: number;
  suffix: string;
  text: string;
}

function idOrder(id: string): IdOrder {
  const text = id.trim().toLowerCase();
  let i = 0;
  while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i += 1;
  if (i === 0) return { numeric: false, number: 0, suffix: '', text };
  return { numeric: true, number: Number.parseInt(text.slice(0, i), 10), suffix: text.slice(i), text };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Spike ids in board order: numbers first (as numbers, then by letter suffix), then any other id as text. */
export function compareSpikeIds(a: string, b: string): number {
  const left = idOrder(a);
  const right = idOrder(b);
  if (left.numeric !== right.numeric) return left.numeric ? -1 : 1;
  if (!left.numeric) return compareText(left.text, right.text);
  if (left.number !== right.number) return left.number - right.number;
  return compareText(left.suffix, right.suffix);
}

// ---------------------------------------------------------------------------------------------------------
// Folders and files
// ---------------------------------------------------------------------------------------------------------

interface SpikeFolder {
  name: string;
  readme: ArtifactDto | undefined;
  pause: ArtifactDto | undefined;
  listed: Array<{ sub: string; artifact: ArtifactDto }>;
}

const OUTPUT_EXTENSIONS: ReadonlySet<string> = new Set(['csv', 'log', 'json', 'txt', 'png', 'jpg', 'webm', 'mp4']);

function extensionOf(name: string): string {
  const slash = name.lastIndexOf('/');
  const dot = name.lastIndexOf('.');
  return dot > slash + 1 ? name.slice(dot + 1).toLowerCase() : '';
}

/** `README.md` and other `.md` are notes; a file under `out/` or with an output extension is output; the rest scripts. */
export function spikeFileKind(name: string): SpikeFileKind {
  const ext = extensionOf(name);
  if (ext === 'md') return 'notes';
  if (name.startsWith('out/') || OUTPUT_EXTENSIONS.has(ext)) return 'output';
  return 'script';
}

function filesOf(folder: SpikeFolder | undefined): SpikeFile[] {
  if (folder === undefined) return [];
  const files: SpikeFile[] = [];
  if (folder.readme !== undefined) {
    files.push({ name: 'README.md', kind: 'notes', sizeBytes: folder.readme.sizeBytes, url: folder.readme.key });
  }
  const rest = folder.listed
    .map((entry) => ({
      name: entry.sub,
      kind: spikeFileKind(entry.sub),
      sizeBytes: entry.artifact.sizeBytes,
      url: entry.artifact.key,
    }))
    .sort((a, b) => compareText(a.name, b.name));
  return files.concat(rest);
}

// ---------------------------------------------------------------------------------------------------------
// One spike's manifest verdict (the pause page's "work has moved on" rule)
// ---------------------------------------------------------------------------------------------------------

/**
 * The manifest row whose id matches `id` (compared without leading zeros, case-insensitively), or null when the
 * project has no readable manifest or no such row. The first row wins when an id repeats.
 */
export function manifestRowOfSpike(presentation: ProjectPresentation, id: string): SpikeManifestRow | null {
  try {
    const artifact = presentation.artifacts.find((candidate) => candidate.kind === 'spikes-manifest' && candidate.path.startsWith(SPIKES_DIR));
    const manifest = rowsOfManifest(artifact);
    if (manifest === null) return null;
    const wanted = spikeIdKey(id);
    return manifest.rows.find((row) => spikeIdKey(row.id) === wanted) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------
// The build
// ---------------------------------------------------------------------------------------------------------

function activeKeyOf(activePath: string): string | null {
  const rest = activePath.slice(SPIKES_DIR.length);
  const segments = rest.split('/');
  if (segments.length >= 2) return segments[0];
  if (rest === 'WRAP-UP-SUMMARY.md') return 'wrap-up-summary';
  if (rest === 'CONVENTIONS.md') return 'conventions';
  return null;
}

function emptyColumns(): Record<VerdictColumnKey, SpikeTile[]> {
  return { validated: [], partial: [], invalidated: [], pending: [] };
}

function build(presentation: ProjectPresentation, activePath: string): SpikesContext | null {
  if (!activePath.startsWith(SPIKES_DIR)) return null;

  let manifestArtifact: ArtifactDto | undefined;
  let wrapUpArtifact: ArtifactDto | undefined;
  let conventionsArtifact: ArtifactDto | undefined;
  const folders = new Map<string, SpikeFolder>();
  for (const artifact of presentation.artifacts) {
    if (!artifact.path.startsWith(SPIKES_DIR)) continue;
    const segments = artifact.path.slice(SPIKES_DIR.length).split('/');
    if (segments.length === 1) {
      if (artifact.kind === 'spikes-manifest') manifestArtifact = artifact;
      else if (artifact.kind === 'spikes-wrap-up') wrapUpArtifact = artifact;
      else if (artifact.kind === 'spikes-conventions') conventionsArtifact = artifact;
      continue;
    }
    const folderName = segments[0];
    let folder = folders.get(folderName);
    if (folder === undefined) {
      folder = { name: folderName, readme: undefined, pause: undefined, listed: [] };
      folders.set(folderName, folder);
    }
    const sub = segments.slice(1).join('/');
    if (sub === 'README.md' && artifact.kind === 'spike') folder.readme = artifact;
    else if (sub === '.continue-here.md') folder.pause = artifact;
    else if (artifact.fileClass === 'listed') folder.listed.push({ sub, artifact });
  }

  const folderList = [...folders.values()].sort((a, b) => compareSpikeIds(spikeFolderIdentity(a.name).id, spikeFolderIdentity(b.name).id) || compareText(a.name, b.name));
  const folderByKey = new Map<string, SpikeFolder[]>();
  for (const folder of folderList) {
    const key = spikeIdKey(spikeFolderIdentity(folder.name).id);
    const list = folderByKey.get(key);
    if (list === undefined) folderByKey.set(key, [folder]);
    else list.push(folder);
  }

  const manifest = rowsOfManifest(manifestArtifact);
  const rows = manifest === null ? [] : manifest.rows;

  const wrapLift = wrapUpOf(wrapUpArtifact);
  const processed: WrapUpProcessedRow[] = Array.isArray(wrapLift?.processed)
    ? wrapLift.processed.filter(isRecord).map((row) => ({
        id: str(row.id),
        name: str(row.name),
        type: str(row.type),
        verdict: str(row.verdict),
        area: str(row.area),
      }))
    : [];
  const processedKeys = new Set(processed.map((row) => spikeIdKey(row.id)));

  const used = new Set<SpikeFolder>();
  const lanes = new Map<string, SpikeLane>();
  const laneKeyOf = new Map<string, string>();
  const addLane = (key: string, paragraph: string, requirements: string[], implicit: boolean): SpikeLane => {
    const lane: SpikeLane = { key, paragraph, requirements, implicit, count: 0, columns: emptyColumns() };
    lanes.set(key, lane);
    laneKeyOf.set(key.trim().toLowerCase(), key);
    return lane;
  };
  const laneFor = (ideaCell: string): SpikeLane => {
    const wanted = ideaCell.trim() === '' ? IMPLICIT_IDEA_KEY : ideaCell.trim();
    const declared = laneKeyOf.get(wanted.toLowerCase());
    if (declared !== undefined) return lanes.get(declared)!;
    return addLane(wanted, '', [], wanted === IMPLICIT_IDEA_KEY);
  };

  if (rows.length > 0 && manifest !== null) {
    for (const idea of manifest.ideas) addLane(idea.key, idea.paragraph, idea.requirements, idea.implicit === true);
  }

  const order = new Map<SpikeTile, number>();
  rows.forEach((row, index) => {
    const lane = laneFor(row.idea);
    const candidates = folderByKey.get(spikeIdKey(row.id)) ?? [];
    const folder = candidates.find((candidate) => spikeFolderIdentity(candidate.name).name === row.name) ?? candidates[0];
    if (folder !== undefined) used.add(folder);
    const readme = readmeOf(folder?.readme);
    const column = columnOfKeyword(row.verdictKeyword);
    const readmeKeyword = str(readme?.verdictKeyword);
    const differs = readmeKeyword !== '' && comparable(readmeKeyword) !== comparable(row.verdictKeyword);
    const files = filesOf(folder);
    const tile: SpikeTile = {
      id: row.id,
      name: row.name,
      idea: lane.key,
      type: row.type !== '' ? row.type : str(readme?.type),
      url: folder?.readme?.key ?? null,
      verdictKeyword: row.verdictKeyword,
      verdictText: row.verdictText,
      columnKey: column ?? 'pending',
      known: column !== null,
      readmeSays: differs ? readmeKeyword : null,
      readmeSaysText: differs ? str(readme?.verdictText) : null,
      wrappedUp: processedKeys.has(spikeIdKey(row.id)),
      fileCount: files.length,
      files,
      pauseUrl: folder?.pause?.key ?? null,
    };
    order.set(tile, index);
    lane.columns[tile.columnKey].push(tile);
    lane.count += 1;
  });

  const byOrder = (a: SpikeTile, b: SpikeTile): number => compareSpikeIds(a.id, b.id) || order.get(a)! - order.get(b)!;
  const counts: Record<VerdictColumnKey, number> = { validated: 0, partial: 0, invalidated: 0, pending: 0 };
  const laneList = [...lanes.values()];
  for (const lane of laneList) {
    for (const column of VERDICT_COLUMNS) {
      lane.columns[column.key].sort(byOrder);
      counts[column.key] += lane.columns[column.key].length;
    }
  }

  const notInManifest: SpikeFolderEntry[] = [];
  for (const folder of folderList) {
    if (used.has(folder)) continue;
    const identity = spikeFolderIdentity(folder.name);
    const readme = readmeOf(folder.readme);
    const keyword = str(readme?.verdictKeyword);
    const column = columnOfKeyword(keyword);
    const files = filesOf(folder);
    notInManifest.push({
      folder: folder.name,
      id: identity.id,
      name: identity.name,
      type: str(readme?.type),
      url: folder.readme?.key ?? null,
      verdictKeyword: keyword,
      verdictText: str(readme?.verdictText),
      columnKey: column,
      known: column !== null,
      wrappedUp: processedKeys.has(spikeIdKey(identity.id)),
      fileCount: files.length,
      files,
      pauseUrl: folder.pause?.key ?? null,
    });
  }

  const urlOfId = (id: string): string | null => folderByKey.get(spikeIdKey(id))?.[0]?.readme?.key ?? null;

  let wrapUp: SpikeWrapUp | null = null;
  if (wrapUpArtifact !== undefined) {
    const lifted = wrapLift ?? {};
    const known: Array<{ id: string; name: string; url: string | null }> = [];
    for (const lane of laneList) {
      for (const column of VERDICT_COLUMNS) for (const tile of lane.columns[column.key]) known.push({ id: tile.id, name: tile.name, url: tile.url });
    }
    for (const entry of notInManifest) if (entry.url !== null) known.push({ id: entry.id, name: entry.name, url: entry.url });
    known.sort((a, b) => compareSpikeIds(a.id, b.id));
    wrapUp = {
      url: wrapUpArtifact.key,
      date: typeof lifted.date === 'string' ? lifted.date : null,
      count: typeof lifted.count === 'number' ? lifted.count : null,
      skillPath: typeof lifted.skillPath === 'string' ? lifted.skillPath : null,
      areas: Array.isArray(lifted.areas) ? lifted.areas.filter((a): a is string => typeof a === 'string') : [],
      keyFindings: str(lifted.keyFindings),
      processed: processed.map((row) => ({ ...row, url: urlOfId(row.id) })),
      notProcessed: wrapLift === null ? [] : known.filter((entry) => !processedKeys.has(spikeIdKey(entry.id))),
    };
  }

  return {
    manifest:
      manifestArtifact === undefined
        ? null
        : { path: manifestArtifact.path, url: manifestArtifact.key, readable: manifest !== null },
    lanes: laneList,
    counts,
    notInManifest,
    wrapUp,
    conventions: conventionsArtifact === undefined ? null : { url: conventionsArtifact.key },
    facts: {
      ideas: laneList.length,
      spikes: rows.length + notInManifest.length,
      notInManifestCount: notInManifest.length,
      wrappedUpDate: wrapUp?.date ?? null,
    },
    activeKey: activeKeyOf(activePath),
  };
}

/**
 * The Spikes page's context for the document at `activePath` (a path under `.planning/spikes/`), or null when the
 * path is elsewhere or the presentation cannot be read. Never throws.
 */
export function buildSpikesContext(presentation: ProjectPresentation, activePath: string): SpikesContext | null {
  try {
    return build(presentation, activePath);
  } catch {
    return null;
  }
}
