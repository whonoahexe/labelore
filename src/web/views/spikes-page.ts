// The Spikes page's composer (Phase 11, 11-15, VIEW-14, D-01, sketch 053 winner A "Verdict board"): a pure
// `ViewInput` -> `ComposedSpikes` merge of the server-built `spikesContext` (11-12's join of the manifest, the
// spike READMEs, the wrap-up and the folder listing). One page serves the manifest, every spike README, CONVENTIONS
// and WRAP-UP-SUMMARY (the Phase 7 addresses stay the keys, RESEARCH C1). The page answers "what did we try, and
// what came out of it?":
//   - the head: the eyebrow "Exploration · Spikes", the h1 "Spikes", a facts line ("{n} ideas", "{n} spikes",
//     "{n} not in the manifest" when any, "Wrapped up {date}" or "Not wrapped up") and the lead
//     "{n} validated · {n} partial · {n} invalidated · {n} pending" (a zero keeps its term);
//   - the board: one lane per idea across Validated, Partial, Invalidated and Pending, each column with its total
//     count; a tile carries the tone square, id, type, name, the free text after the verdict keyword, the file
//     count, a dashed "README says {verdict}" flag when the README parts ways with the manifest and "Wrapped up"
//     when the wrap-up lists it. An unknown keyword is an untoned tile in Pending with the cell as written;
//   - below the board: the folders the manifest does not list ("Not in the manifest"), then the wrap-up tiles or
//     one quiet "Not wrapped up yet" line.
// A manifest that is missing or unreadable draws no board and claims no count beyond what was read: every spike
// folder sits under "Not in the manifest" with its README's own verdict.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level mutable
// state: two Spikes pages open at once each compose only from their own input. It returns `null` when the context
// is missing, so the page keeps the promoted-section view with no notice (Phase 10 C1, X2). T-11-24: every string
// is author text rendered as React text by the components.
import type {
  SpikeFileKind,
  SpikeFolderEntry,
  SpikeLane,
  SpikeTile,
  SpikesContext,
  VerdictColumnKey,
} from '../../presentation/spikes-context.ts';
import { VERDICT_COLUMNS } from '../../presentation/spikes-context.ts';
import { spikeFolderIdentity, spikeIdKey } from '../../planning-repo/handlers/spikes-lift.ts';
import type { ViewInput } from './manifest.ts';

export type SpikeTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export const SPIKES_EYEBROW = 'Exploration · Spikes';
export const SPIKES_TITLE = 'Spikes';
export const NOT_IN_MANIFEST_TITLE = 'Not in the manifest';
export const WRAP_UP_TITLE = 'Wrap-up';
export const NOT_WRAPPED_UP_NOTE =
  'Not wrapped up yet: no WRAP-UP-SUMMARY.md or CONVENTIONS.md in .planning/spikes/.';
export const NO_WRAP_UP_NOTE = 'Not wrapped up yet: no WRAP-UP-SUMMARY.md in .planning/spikes/.';
export const NO_MANIFEST_NOTE =
  'There is no MANIFEST.md in .planning/spikes/, so there is no board. Every spike folder is listed below with its own README verdict.';
export const UNREADABLE_MANIFEST_NOTE =
  'The manifest could not be read, so there is no board. Every spike folder is listed below with its own README verdict.';
export const EMPTY_MANIFEST_NOTE = 'The manifest lists no spikes.';
export const README_SAYS_WORDS = 'README says';
export const WRAPPED_UP_WORDS = 'Wrapped up';
export const SHEET_CLOSE_LABEL = 'Close spike';
export const DISAGREE_NOTE = 'The two files disagree; both are shown as written.';
export const NOT_PROCESSED_WORDS = 'Not processed';
export const CONVENTIONS_TITLE = 'How this project spikes';

/** The tone of each verdict column (UI-SPEC "Page-by-page tone use": never destructive, never warning). */
const COLUMN_TONE: Readonly<Record<VerdictColumnKey, SpikeTone>> = {
  validated: 'complete',
  partial: 'in-flight',
  invalidated: 'missing',
  pending: 'quiet',
};

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedSpikesColumn {
  key: VerdictColumnKey;
  label: string;
  tone: SpikeTone;
  /** The column's total across lanes. */
  count: number;
}

export interface ComposedSpikesTile {
  key: string;
  id: string;
  type: string;
  name: string;
  /** `null` is untoned: an unknown keyword, an empty verdict cell or a folder with no verdict. */
  tone: SpikeTone | null;
  /** The README's address, or `null` when there is nothing to open (the tile is then not a link). */
  to: string | null;
  /** The text under the name: the free text after a known keyword, or the cell as written for an unknown one. */
  freeText: string;
  /** "{n} files", "1 file" or "No files". */
  files: string;
  /** "README says PENDING" when the README's verdict differs from the manifest's, else `null`. */
  readmeSays: string | null;
  /** The README's own words behind the flag, for the tooltip. */
  readmeSaysTitle: string | null;
  wrappedUp: boolean;
  /** The accessible name: "{id} {name}, {verdict} {free text}". */
  label: string;
  /** True for the tile whose address the page is open at. */
  active: boolean;
  /** The README's folder segment as the address spells it, or `null`: the key focus returns to when the sheet closes. */
  folder: string | null;
}

export interface ComposedSpikesLane {
  key: string;
  /** The idea's paragraph from the manifest, '' when it has none. */
  description: string;
  /** "{n} requirements" ("1 requirement"), or `null` when the idea lists none (no toggle is drawn). */
  requirementsLabel: string | null;
  requirements: string[];
  /** One cell per verdict column, in the board's order; an empty cell has no tiles and no count. */
  cells: Array<{ column: VerdictColumnKey; label: string; tiles: ComposedSpikesTile[] }>;
}

export interface ComposedSpikesWrapTile {
  key: string;
  /** The file's name, in mono. */
  fileName: string;
  title: string;
  detail: string | null;
  to: string;
  active: boolean;
}

export interface ComposedSpikesFile {
  name: string;
  kind: SpikeFileKind;
  /** "1.7 KB": from the stat only, never from the file's bytes. */
  size: string;
}

export interface ComposedSpikesChip {
  id: string;
  label: string;
  /** The panel's address, or `null` for an id that resolves to no README (plain text). */
  to: string | null;
  tone: SpikeTone | null;
}

export interface ComposedSpikesBar {
  key: string;
  title: string;
  html: string;
}

export interface ComposedSpikesDisagreement {
  field: string;
  manifest: { label: string; value: string };
  readme: { label: string; value: string };
  note: string;
}

export type ComposedSpikesValidates =
  | { kind: 'gwt'; given: string; when: string; then: string }
  | { kind: 'whole'; text: string };

interface ComposedSpikesSheetBase {
  /** The panel the address names: a folder, `wrap-up-summary` or `conventions`. */
  key: string;
  /** The line over the title: "Spike 003b · export-staging · comparison", or the file's path. */
  eyebrow: string;
  title: string;
  /** The file the sheet shows, in the sheet's bar. */
  address: string;
  /** The manifest's address the sheet closes to, or `null` when the project has none (the sheet hides in place). */
  closeTo: string | null;
  /** The opening tile's folder, so focus can go back to it. */
  focus: string | null;
}

export interface ComposedSpikesSpikeSheet extends ComposedSpikesSheetBase {
  kind: 'spike';
  verdict: { word: string; tone: SpikeTone | null; freeText: string };
  disagreement: ComposedSpikesDisagreement | null;
  /** The line for a folder with no manifest row. */
  orphanNote: string | null;
  validates: ComposedSpikesValidates | null;
  /** The README's Results section as the sanitised document HTML, or `null`. */
  resultsHtml: string | null;
  related: ComposedSpikesChip[];
  filesTitle: string;
  files: ComposedSpikesFile[];
  tags: string[];
  bars: ComposedSpikesBar[];
  pauseTo: string | null;
}

export interface ComposedSpikesWrapSheet extends ComposedSpikesSheetBase {
  kind: 'wrap-up';
  skill: string | null;
  processed: ComposedSpikesChip[];
  findingsHtml: string | null;
  notProcessed: string | null;
}

export interface ComposedSpikesConventionsSheet extends ComposedSpikesSheetBase {
  kind: 'conventions';
  sections: ComposedSpikesBar[];
}

export type ComposedSpikesSheet = ComposedSpikesSpikeSheet | ComposedSpikesWrapSheet | ComposedSpikesConventionsSheet;

export interface ComposedSpikes {
  head: {
    eyebrow: string;
    title: string;
    /** The facts line, one entry per fact. */
    facts: string[];
    /** "2 validated · 1 partial · ..." as one string (every term, zeros kept), or `null` when no count was read. */
    leadText: string | null;
    leadTerms: Array<{ count: number; word: string }>;
    /** The manifest's path for the copy button, or `null`. */
    manifestPath: string | null;
  };
  columns: ComposedSpikesColumn[];
  /** The lanes, or `null` when the page draws no board (no manifest, an unreadable one or one that lists nothing). */
  lanes: ComposedSpikesLane[] | null;
  /** The quiet line standing in for a board that is not drawn. */
  boardNote: string | null;
  notInManifest: { title: string; tiles: ComposedSpikesTile[] } | null;
  wrapUp: { title: string; tiles: ComposedSpikesWrapTile[]; note: string | null };
  /** The open panel (the page was opened at a spike README, the wrap-up or the conventions), or `null` for the board. */
  sheet: ComposedSpikesSheet | null;
}

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

/** "{n} files", "1 file" and "No files". */
export function fileWords(count: number): string {
  if (count <= 0) return 'No files';
  return count === 1 ? '1 file' : `${count} files`;
}

/** "{n} requirements" and "1 requirement". */
export function requirementWords(count: number): string {
  return count === 1 ? '1 requirement' : `${count} requirements`;
}

function ideaWords(count: number): string {
  return count === 1 ? '1 idea' : `${count} ideas`;
}

function spikeWords(count: number): string {
  return count === 1 ? '1 spike' : `${count} spikes`;
}

/** A verdict cell as written: the keyword, then the free text in parentheses when there is some. */
function cellAsWritten(keyword: string, text: string): string {
  if (keyword === '') return text;
  return text === '' ? keyword : `${keyword} (${text})`;
}

function columnLabel(key: VerdictColumnKey): string {
  const column = VERDICT_COLUMNS.find((candidate) => candidate.key === key);
  return column === undefined ? key : column.label;
}

/** The folder segment of a spike address such as `/spikes/001-name/readme`, as the address spells it. */
function folderSegment(url: string): string {
  const segments = url.split('/');
  return segments.length >= 2 ? segments[segments.length - 2] : '';
}

/** The same segment, lower-cased for comparison. */
function folderOfUrl(url: string): string {
  return folderSegment(url).toLowerCase();
}

// ---------------------------------------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------------------------------------

interface TileSource {
  key: string;
  id: string;
  type: string;
  name: string;
  url: string | null;
  verdictKeyword: string;
  verdictText: string;
  columnKey: VerdictColumnKey | null;
  readmeSays: string | null;
  readmeSaysText: string | null;
  wrappedUp: boolean;
  fileCount: number;
}

function tileOf(source: TileSource, activeKey: string | null): ComposedSpikesTile {
  const known = source.columnKey !== null;
  const word = source.columnKey === null ? '' : columnLabel(source.columnKey);
  const freeText = known ? source.verdictText : cellAsWritten(source.verdictKeyword, source.verdictText);
  const verdict = known ? `${word} ${source.verdictText}`.trim() : freeText;
  const readmeTitle =
    source.readmeSays === null ? null : `${README_SAYS_WORDS} ${cellAsWritten(source.readmeSays, source.readmeSaysText ?? '')}`;
  return {
    key: source.key,
    id: source.id,
    type: source.type,
    name: source.name,
    tone: source.columnKey === null ? null : COLUMN_TONE[source.columnKey],
    to: source.url,
    freeText,
    files: fileWords(source.fileCount),
    readmeSays: source.readmeSays === null ? null : `${README_SAYS_WORDS} ${source.readmeSays}`,
    readmeSaysTitle: readmeTitle,
    wrappedUp: source.wrappedUp,
    label: verdict === '' ? `${source.id} ${source.name}` : `${source.id} ${source.name}, ${verdict}`,
    active: activeKey !== null && source.url !== null && folderOfUrl(source.url) === activeKey.toLowerCase(),
    folder: source.url === null ? null : folderSegment(source.url),
  };
}

function manifestTile(tile: SpikeTile, activeKey: string | null): ComposedSpikesTile {
  return tileOf(
    {
      key: `${tile.idea}/${tile.id}`,
      id: tile.id,
      type: tile.type,
      name: tile.name,
      url: tile.url,
      verdictKeyword: tile.verdictKeyword,
      verdictText: tile.verdictText,
      columnKey: tile.known ? tile.columnKey : null,
      readmeSays: tile.readmeSays,
      readmeSaysText: tile.readmeSaysText,
      wrappedUp: tile.wrappedUp,
      fileCount: tile.fileCount,
    },
    activeKey,
  );
}

function folderTile(entry: SpikeFolderEntry, activeKey: string | null): ComposedSpikesTile {
  const tile = tileOf(
    {
      key: `folder/${entry.folder}`,
      id: entry.id,
      type: entry.type,
      name: entry.name,
      url: entry.url,
      verdictKeyword: entry.verdictKeyword,
      verdictText: entry.verdictText,
      columnKey: entry.known ? entry.columnKey : null,
      readmeSays: null,
      readmeSaysText: null,
      wrappedUp: entry.wrappedUp,
      fileCount: entry.fileCount,
    },
    activeKey,
  );
  // A folder with no README has nothing to open and no verdict to quote; say so rather than leave the tile blank.
  return entry.url === null && tile.freeText === '' ? { ...tile, freeText: 'No README' } : tile;
}

// ---------------------------------------------------------------------------------------------------------
// Lanes and sections
// ---------------------------------------------------------------------------------------------------------

function laneOf(lane: SpikeLane, activeKey: string | null): ComposedSpikesLane {
  return {
    key: lane.key,
    description: lane.paragraph,
    requirementsLabel: lane.requirements.length === 0 ? null : requirementWords(lane.requirements.length),
    requirements: lane.requirements,
    cells: VERDICT_COLUMNS.map((column) => ({
      column: column.key,
      label: column.label,
      tiles: lane.columns[column.key].map((tile) => manifestTile(tile, activeKey)),
    })),
  };
}

function wrapUpOf(context: SpikesContext): ComposedSpikes['wrapUp'] {
  const tiles: ComposedSpikesWrapTile[] = [];
  const wrap = context.wrapUp;
  if (wrap !== null) {
    const processed = wrap.processed.length;
    const detail =
      processed === 0
        ? null
        : wrap.skillPath !== null && wrap.skillPath !== ''
          ? `${spikeWords(processed)} processed into ${wrap.skillPath}`
          : `${spikeWords(processed)} processed`;
    tiles.push({
      key: 'wrap-up-summary',
      fileName: 'WRAP-UP-SUMMARY.md',
      title: wrap.date === null || wrap.date === '' ? 'Wrap-up' : `Wrap-up, ${wrap.date}`,
      detail,
      to: wrap.url,
      active: context.activeKey === 'wrap-up-summary',
    });
  }
  if (context.conventions !== null) {
    tiles.push({
      key: 'conventions',
      fileName: 'CONVENTIONS.md',
      title: 'Conventions',
      detail: null,
      to: context.conventions.url,
      active: context.activeKey === 'conventions',
    });
  }
  // The line stands in for the wrap-up summary: it shows whenever that file is absent, naming only what is missing.
  const note = wrap !== null ? null : context.conventions === null ? NOT_WRAPPED_UP_NOTE : NO_WRAP_UP_NOTE;
  return { title: WRAP_UP_TITLE, tiles, note };
}

// ---------------------------------------------------------------------------------------------------------
// The sheet (11-16, D-01, D-07): one spike, the wrap-up or the conventions over the board
// ---------------------------------------------------------------------------------------------------------

/** One spike the page knows, whether the manifest lists it or only its folder does. */
interface Panel {
  id: string;
  name: string;
  /** The idea's lane key, or `null` for a folder with no manifest row and for the implicit lane. */
  idea: string | null;
  type: string;
  url: string | null;
  columnKey: VerdictColumnKey | null;
  verdictKeyword: string;
  verdictText: string;
  inManifest: boolean;
  readmeSays: string | null;
  readmeSaysText: string | null;
  files: SpikeTile['files'];
  pauseUrl: string | null;
}

function panelsOf(context: SpikesContext): Panel[] {
  const panels: Panel[] = [];
  for (const lane of context.lanes) {
    for (const column of VERDICT_COLUMNS) {
      for (const tile of lane.columns[column.key]) {
        panels.push({
          id: tile.id,
          name: tile.name,
          idea: lane.implicit ? null : lane.key,
          type: tile.type,
          url: tile.url,
          columnKey: tile.known ? tile.columnKey : null,
          verdictKeyword: tile.verdictKeyword,
          verdictText: tile.verdictText,
          inManifest: true,
          readmeSays: tile.readmeSays,
          readmeSaysText: tile.readmeSaysText,
          files: tile.files,
          pauseUrl: tile.pauseUrl,
        });
      }
    }
  }
  for (const entry of context.notInManifest) {
    panels.push({
      id: entry.id,
      name: entry.name,
      idea: null,
      type: entry.type,
      url: entry.url,
      columnKey: entry.known ? entry.columnKey : null,
      verdictKeyword: entry.verdictKeyword,
      verdictText: entry.verdictText,
      inManifest: false,
      readmeSays: null,
      readmeSaysText: null,
      files: entry.files,
      pauseUrl: entry.pauseUrl,
    });
  }
  return panels;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** The lift of the open document (`structured.spikes.readme`, `.wrapUp` or `.conventions`), or `null`. */
function liftOfInput(input: ViewInput, part: string): Record<string, unknown> | null {
  const structured = input.structured;
  if (!isRecord(structured) || !Object.hasOwn(structured, 'spikes')) return null;
  const spikes = structured.spikes;
  if (!isRecord(spikes) || !Object.hasOwn(spikes, part)) return null;
  const lift = spikes[part];
  return isRecord(lift) ? lift : null;
}

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

/** "812 B", "1.7 KB", "14 KB", "8.1 MB": from the stat's byte count alone. */
export function sizeWords(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

function headingOf(group: { heading: string | null }): string {
  return group.heading === null ? '' : group.heading.trim().toLowerCase();
}

function barsOf(input: ViewInput, skip: readonly string[]): ComposedSpikesBar[] {
  const bars: ComposedSpikesBar[] = [];
  input.groups.forEach((group, index) => {
    if (group.heading === null || skip.includes(headingOf(group))) return;
    bars.push({ key: group.id ?? `section-${index}`, title: group.heading, html: group.html });
  });
  return bars;
}

function groupHtml(input: ViewInput, heading: string): string | null {
  const found = input.groups.find((group) => headingOf(group) === heading);
  return found === undefined ? null : found.html;
}

function validatesOf(lift: Record<string, unknown> | null): ComposedSpikesValidates | null {
  if (lift === null || !isRecord(lift.validates)) return null;
  const validates = lift.validates;
  if (Object.hasOwn(validates, 'given') && Object.hasOwn(validates, 'when') && Object.hasOwn(validates, 'then')) {
    return { kind: 'gwt', given: textOf(validates.given), when: textOf(validates.when), then: textOf(validates.then) };
  }
  const whole = textOf(validates.whole);
  return whole === '' ? null : { kind: 'whole', text: whole };
}

/** The chip for an id the author wrote: it opens the spike's panel when the id names a spike with a README, and is
 * plain text otherwise. */
function chipOf(raw: string, panels: Panel[]): ComposedSpikesChip {
  const wanted = spikeIdKey(spikeFolderIdentity(raw).id);
  const found = panels.find((panel) => spikeIdKey(panel.id) === wanted);
  if (found === undefined) return { id: raw, label: raw, to: null, tone: null };
  return {
    id: found.id,
    label: found.name === '' ? found.id : `${found.id} ${found.name}`,
    to: found.url,
    tone: found.columnKey === null ? null : COLUMN_TONE[found.columnKey],
  };
}

function spikeSheet(input: ViewInput, context: SpikesContext, panel: Panel, panels: Panel[], closeTo: string | null): ComposedSpikesSpikeSheet {
  const lift = liftOfInput(input, 'readme');
  const folder = panel.url === null ? '' : folderSegment(panel.url);
  const manifestCell = cellAsWritten(panel.verdictKeyword, panel.verdictText);
  const verdict: ComposedSpikesSpikeSheet['verdict'] = !panel.inManifest
    ? { word: NOT_IN_MANIFEST_TITLE, tone: null, freeText: '' }
    : panel.columnKey !== null
      ? { word: columnLabel(panel.columnKey), tone: COLUMN_TONE[panel.columnKey], freeText: panel.verdictText }
      : { word: panel.verdictKeyword === '' ? 'No verdict' : panel.verdictKeyword, tone: null, freeText: panel.verdictText };

  const readmeCell = cellAsWritten(textOf(lift?.verdictKeyword), textOf(lift?.verdictText));
  const where = context.manifest === null ? 'the manifest' : 'MANIFEST.md';
  const orphanNote = panel.inManifest
    ? null
    : readmeCell === ''
      ? `This folder has no row in ${where}.`
      : `This folder has no row in ${where}. Its README says ${readmeCell}.`;

  const eyebrow = [`Spike ${panel.id}`, panel.idea ?? '', panel.type].filter((part) => part !== '').join(' · ');
  return {
    kind: 'spike',
    key: folder === '' ? panel.id : folder,
    eyebrow,
    title: panel.name === '' ? panel.id : panel.name,
    address: folder === '' ? 'README.md' : `${folder}/README.md`,
    closeTo,
    focus: panel.url === null ? null : folder,
    verdict,
    disagreement:
      panel.readmeSays === null
        ? null
        : {
            field: 'Verdict',
            manifest: { label: 'MANIFEST.md', value: manifestCell },
            readme: { label: 'README.md', value: cellAsWritten(panel.readmeSays, panel.readmeSaysText ?? '') },
            note: DISAGREE_NOTE,
          },
    orphanNote,
    validates: validatesOf(lift),
    resultsHtml: groupHtml(input, 'results'),
    related: listOf(lift?.related).map((raw) => chipOf(raw, panels)),
    filesTitle: folder === '' ? 'Files' : `Files in ${folder}/`,
    files: panel.files.map((file) => ({ name: file.name, kind: file.kind, size: sizeWords(file.sizeBytes) })),
    tags: listOf(lift?.tags),
    bars: barsOf(input, ['what this validates', 'results']),
    pauseTo: panel.pauseUrl,
  };
}

function wrapSheet(input: ViewInput, context: SpikesContext, panels: Panel[], closeTo: string | null): ComposedSpikesWrapSheet | null {
  const wrap = context.wrapUp;
  if (wrap === null) return null;
  const missed = wrap.notProcessed.map((entry) => entry.id);
  return {
    kind: 'wrap-up',
    key: 'wrap-up-summary',
    eyebrow: '.planning/spikes/WRAP-UP-SUMMARY.md',
    title: wrap.date === null || wrap.date === '' ? 'Wrap-up' : `Wrap-up, ${wrap.date}`,
    address: 'WRAP-UP-SUMMARY.md',
    closeTo,
    focus: null,
    skill: wrap.skillPath === null || wrap.skillPath === '' ? null : wrap.skillPath,
    processed: wrap.processed.map((row) => chipOf(row.id, panels)),
    findingsHtml: groupHtml(input, 'key findings'),
    notProcessed: missed.length === 0 ? null : `${NOT_PROCESSED_WORDS}: ${missed.join(', ')}.`,
  };
}

function conventionsSheet(input: ViewInput, closeTo: string | null): ComposedSpikesConventionsSheet {
  return {
    kind: 'conventions',
    key: 'conventions',
    eyebrow: '.planning/spikes/CONVENTIONS.md',
    title: CONVENTIONS_TITLE,
    address: 'CONVENTIONS.md',
    closeTo,
    focus: null,
    sections: barsOf(input, []),
  };
}

/** The sheet the address opens, or `null` when it names no panel the page can show. */
function sheetOf(input: ViewInput, context: SpikesContext): ComposedSpikesSheet | null {
  const activeKey = context.activeKey;
  if (activeKey === null) return null;
  const closeTo = context.manifest === null ? null : context.manifest.url;
  const panels = panelsOf(context);
  if (activeKey === 'wrap-up-summary') return wrapSheet(input, context, panels, closeTo);
  if (activeKey === 'conventions') return context.conventions === null ? null : conventionsSheet(input, closeTo);
  const wanted = activeKey.toLowerCase();
  const panel = panels.find((candidate) => candidate.url !== null && folderOfUrl(candidate.url) === wanted);
  return panel === undefined ? null : spikeSheet(input, context, panel, panels, closeTo);
}

// ---------------------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------------------

/** The Spikes page's model, or `null` when the input carries no spikes context (the promoted-section view then
 * renders with no notice). */
export function composeSpikes(input: ViewInput): ComposedSpikes | null {
  try {
    const context = input.spikesContext;
    if (context === null || context === undefined) return null;
    const activeKey = context.activeKey;
    const readable = context.manifest !== null && context.manifest.readable;
    const drawn = readable && context.lanes.length > 0;

    const columns: ComposedSpikesColumn[] = VERDICT_COLUMNS.map((column) => ({
      key: column.key,
      label: column.label,
      tone: COLUMN_TONE[column.key],
      count: context.counts[column.key],
    }));

    const wrapped =
      context.wrapUp === null
        ? 'Not wrapped up'
        : context.wrapUp.date === null || context.wrapUp.date === ''
          ? WRAPPED_UP_WORDS
          : `${WRAPPED_UP_WORDS} ${context.wrapUp.date}`;

    const facts: string[] = [];
    if (readable) {
      facts.push(ideaWords(context.lanes.length), spikeWords(context.facts.spikes));
      if (context.facts.notInManifestCount > 0) facts.push(`${context.facts.notInManifestCount} not in the manifest`);
    } else {
      facts.push(spikeWords(context.facts.spikes), context.manifest === null ? 'No manifest' : 'Manifest unreadable');
    }
    facts.push(wrapped);

    const leadTerms = drawn ? columns.map((column) => ({ count: column.count, word: column.label.toLowerCase() })) : [];
    const boardNote = drawn
      ? null
      : context.manifest === null
        ? NO_MANIFEST_NOTE
        : readable
          ? EMPTY_MANIFEST_NOTE
          : UNREADABLE_MANIFEST_NOTE;

    return {
      head: {
        eyebrow: SPIKES_EYEBROW,
        title: SPIKES_TITLE,
        facts,
        leadText: drawn ? leadTerms.map((term) => `${term.count} ${term.word}`).join(' · ') : null,
        leadTerms,
        manifestPath: context.manifest === null ? null : context.manifest.path,
      },
      columns,
      lanes: drawn ? context.lanes.map((lane) => laneOf(lane, activeKey)) : null,
      boardNote,
      notInManifest:
        context.notInManifest.length === 0
          ? null
          : { title: NOT_IN_MANIFEST_TITLE, tiles: context.notInManifest.map((entry) => folderTile(entry, activeKey)) },
      wrapUp: wrapUpOf(context),
      sheet: sheetOf(input, context),
    };
  } catch {
    return null;
  }
}
