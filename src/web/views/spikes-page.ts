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
  SpikeFolderEntry,
  SpikeLane,
  SpikeTile,
  SpikesContext,
  VerdictColumnKey,
} from '../../presentation/spikes-context.ts';
import { VERDICT_COLUMNS } from '../../presentation/spikes-context.ts';
import type { ViewInput } from './manifest.ts';

export type SpikeTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export const SPIKES_EYEBROW = 'Exploration · Spikes';
export const SPIKES_TITLE = 'Spikes';
export const NOT_IN_MANIFEST_TITLE = 'Not in the manifest';
export const WRAP_UP_TITLE = 'Wrap-up';
export const NOT_WRAPPED_UP_NOTE =
  'Not wrapped up yet: no WRAP-UP-SUMMARY.md or CONVENTIONS.md in .planning/spikes/.';
export const NO_MANIFEST_NOTE =
  'There is no MANIFEST.md in .planning/spikes/, so there is no board. Every spike folder is listed below with its own README verdict.';
export const UNREADABLE_MANIFEST_NOTE =
  'The manifest could not be read, so there is no board. Every spike folder is listed below with its own README verdict.';
export const EMPTY_MANIFEST_NOTE = 'The manifest lists no spikes.';
export const README_SAYS_WORDS = 'README says';
export const WRAPPED_UP_WORDS = 'Wrapped up';

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

/** The folder segment of a spike address such as `/spikes/001-name/readme`, compared case-insensitively. */
function folderOfUrl(url: string): string {
  const segments = url.split('/');
  return segments.length >= 2 ? segments[segments.length - 2].toLowerCase() : '';
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
  return { title: WRAP_UP_TITLE, tiles, note: tiles.length === 0 ? NOT_WRAPPED_UP_NOTE : null };
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
    };
  } catch {
    return null;
  }
}
