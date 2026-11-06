// The Indexes page's composer (Phase 11, 11-18, VIEW-19, D-04, sketch 055 winner A "Instrument grid"): a pure
// `ViewInput` -> `ComposedIndexes` merge of the server-built `indexesContext` (the bounded summaries 11-13 made).
// One page serves every intel and graph address (the Phase 7 addresses stay the keys, RESEARCH C1): the address
// decides which tile is open in place. The page answers "what do the codebase indexes say?" as short summaries:
//   - the head: the eyebrow "Exploration · Indexes", the h1 "Indexes", a facts line ("{n} intel files", "1 graph" or
//     "No graph", "Intel refreshed {date}") and the manifest's lead;
//   - the grid: one tile per index file in the context's order, Graph first (or Synthesis, Graph for an ingest-docs
//     project). The Graph tile carries the node and edge counts, a "{n} commits behind" `in-flight` chip and a
//     "Last update failed" `missing` chip when they apply, so a stale graph whose last update failed reads as two
//     facts (the last good counts, the chip), never one broken tile. A project with no graphs/ folder draws a hatched,
//     dashed "Not built" ghost tile that cannot be focused;
//   - the open tile: spans the full row and shows its panel. This plan builds the Graph panel (three counts and the
//     freshness cells); the other tiles carry a one-line figure and open to their foot (path, updated, size), and
//     11-19 completes them with the empty and broken states.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression built from document text and
// no module-level mutable state. It returns `null` when the context is missing, so the page keeps the promoted-section
// view with no notice (Phase 10 C1, X2). T-11-28: only the bounded summary is read here; every string is author text
// rendered as React text by the components.
import type { IndexTile, IndexTileKey } from '../../presentation/indexes-context.ts';
import type { SynthesisSummary } from '../../planning-repo/handlers/index-intel-lift.ts';
import type { GraphSummary } from '../../server/index-summary.ts';
import { formatByteSize } from '../../presentation/file-facts.ts';
import type { ViewInput } from './manifest.ts';

export type IndexTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export const INDEXES_EYEBROW = 'Exploration · Indexes';
export const INDEXES_TITLE = 'Indexes';
export const NOT_BUILT_WORDS = 'Not built';
export const COUNTS_NOT_READ_WORDS = 'Counts not read';
export const LAST_UPDATE_FAILED_WORDS = 'Last update failed';
export const UNREADABLE_WORDS = 'Unreadable';

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedIndexesChip {
  label: string;
  tone: IndexTone;
}

export interface ComposedIndexesCount {
  /** The number as written for the page: "41,280". */
  value: string;
  /** The word under it: "nodes". */
  word: string;
}

export type ComposedIndexesFigure =
  /** The Graph tile: big counts when they were read, else "Counts not read", then the chips. */
  | { kind: 'graph'; counts: ComposedIndexesCount[]; countsLabel: string | null; chips: ComposedIndexesChip[] }
  /** A big count with, as the tile needs, a split bar, untoned tags and toned chips (File roles, API surface,
   * Dependencies, Synthesis). `count` is null when the file does not state one. */
  | {
      kind: 'count';
      count: ComposedIndexesCount | null;
      split: ComposedIndexesSplit | null;
      tags: string[];
      chips: ComposedIndexesChip[];
    }
  /** Every other tile: one line of text. */
  | { kind: 'line'; text: string }
  | { kind: 'unreadable' }
  | { kind: 'ghost'; text: string };

/** One part of a split bar. `fill` picks one of four theme-token fills; `share` is its width in percent. */
export interface ComposedIndexesSplitPart {
  label: string;
  value: number;
  share: number;
  fill: 'a' | 'b' | 'c' | 'd';
}

/** A split bar with its one accessible name ("24 module, 3 entry-point"); the parts are decoration. */
export interface ComposedIndexesSplit {
  name: string;
  parts: ComposedIndexesSplitPart[];
}

export interface ComposedIndexesCell {
  key: 'built' | 'good' | 'update';
  label: string;
  value: string;
  note: string | null;
  /** The cell's border tone; `null` is the faint default. */
  tone: IndexTone | null;
}

export interface ComposedIndexesFoot {
  path: string;
  /** "updated 2026-04-19 · version 2", or `null` when the file states neither. */
  updated: string | null;
  size: string | null;
}

export interface ComposedIndexesGraphPanel {
  counts: ComposedIndexesCount[];
  /** Shown instead of the counts when none could be read. */
  countsLabel: string | null;
  cells: ComposedIndexesCell[];
  /** The report's Summary lines as written (bounded by 11-13). */
  reportLines: string[];
}

export interface ComposedIndexesPanel {
  /** Only the Graph panel has a body in this plan. */
  graph: ComposedIndexesGraphPanel | null;
  foot: ComposedIndexesFoot | null;
}

export interface ComposedIndexesTile {
  key: IndexTileKey;
  title: string;
  /** The file path, or `null` for the not-built ghost. */
  path: string | null;
  /** The address that opens this tile, or `null` for the ghost. */
  to: string | null;
  span: 1 | 2;
  ghost: boolean;
  /** True for the tile the page's address names. */
  open: boolean;
  figure: ComposedIndexesFigure;
  /** Set only on the open tile. */
  panel: ComposedIndexesPanel | null;
}

export interface ComposedIndexes {
  head: { eyebrow: string; title: string; facts: string[] };
  tiles: ComposedIndexesTile[];
  /** The open tile's key, or `null` (the stamp, an unknown file, or no tile open). */
  openKey: IndexTileKey | null;
}

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

function groupedNumber(value: number): string {
  return value.toLocaleString('en-GB');
}

function filesWords(count: number): string {
  return count === 1 ? '1 intel file' : `${count} intel files`;
}

/** "{n} commits behind" and "1 commit behind". */
export function commitsBehindWords(count: number): string {
  return count === 1 ? '1 commit behind' : `${count} commits behind`;
}

function toneOfStatus(state: string | null): IndexTone {
  const word = (state ?? '').toLowerCase();
  if (word === 'ok') return 'complete';
  if (word === 'running') return 'in-flight';
  if (word === 'failed') return 'missing';
  return 'quiet';
}

function isFailed(graph: GraphSummary): boolean {
  return graph.status !== null && (graph.status.state ?? '').toLowerCase() === 'failed';
}

function countsOf(graph: GraphSummary | null, withCommunities: boolean): ComposedIndexesCount[] {
  if (graph === null || graph.counts === null) return [];
  const out: ComposedIndexesCount[] = [{ value: groupedNumber(graph.counts.nodes), word: 'nodes' }];
  if (graph.counts.links !== null) out.push({ value: groupedNumber(graph.counts.links), word: 'edges' });
  if (withCommunities && graph.counts.communities !== null) {
    out.push({ value: groupedNumber(graph.counts.communities), word: 'communities' });
  }
  return out;
}

function datePart(text: string | null): string | null {
  if (text === null) return null;
  const head = text.slice(0, 10);
  return head === '' ? null : head;
}

/** "61 hours ago" or "3 days ago", counted from the snapshot read time; `null` when either date will not parse. */
function ageWords(at: string | null, readAt: string): string | null {
  if (at === null) return null;
  const then = Date.parse(at);
  const now = Date.parse(readAt);
  if (!Number.isFinite(then) || !Number.isFinite(now) || now < then) return null;
  const hours = Math.floor((now - then) / 3_600_000);
  if (hours < 48) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function chipsOf(graph: GraphSummary | null): ComposedIndexesChip[] {
  if (graph === null) return [];
  const chips: ComposedIndexesChip[] = [];
  if (graph.commitsBehind !== null && graph.commitsBehind > 0) {
    chips.push({ label: commitsBehindWords(graph.commitsBehind), tone: 'in-flight' });
  }
  if (isFailed(graph)) chips.push({ label: LAST_UPDATE_FAILED_WORDS, tone: 'missing' });
  return chips;
}

function cellsOf(graph: GraphSummary, readAt: string): ComposedIndexesCell[] {
  const cells: ComposedIndexesCell[] = [];
  if (graph.builtAtCommit !== null) {
    const behind = graph.commitsBehind !== null && graph.commitsBehind > 0;
    cells.push({
      key: 'built',
      label: 'Built from',
      value: graph.builtAtCommit.slice(0, 7),
      note: graph.commitsBehind === null ? null : behind ? commitsBehindWords(graph.commitsBehind) : 'Up to date',
      tone: behind ? 'in-flight' : null,
    });
  }
  const status = graph.status;
  if (status !== null && (status.state ?? '').toLowerCase() === 'ok' && datePart(status.at) !== null) {
    cells.push({
      key: 'good',
      label: 'Last good build',
      value: datePart(status.at) ?? '',
      note: ageWords(status.at, readAt),
      tone: null,
    });
  }
  if (status !== null && status.state !== null) {
    const parts: string[] = [status.state];
    if (status.exitCode !== null) parts.push(`exit ${status.exitCode}`);
    const notes: string[] = [];
    const date = datePart(status.at);
    if (date !== null) notes.push(date);
    if (status.durationMs !== null) notes.push(`${(status.durationMs / 1000).toFixed(1)} s`);
    if (isFailed(graph)) notes.push('the counts above are from the build before it');
    cells.push({
      key: 'update',
      label: 'Last auto-update',
      value: parts.join(' · '),
      note: notes.length === 0 ? null : notes.join(' · '),
      tone: toneOfStatus(status.state),
    });
  }
  return cells;
}

function footOf(tile: IndexTile): ComposedIndexesFoot | null {
  if (tile.path === null) return null;
  const parts: string[] = [];
  if (tile.meta.updated !== null) parts.push(`updated ${tile.meta.updated}`);
  if (tile.meta.version !== null) parts.push(`version ${tile.meta.version}`);
  return {
    path: tile.path,
    updated: parts.length === 0 ? null : parts.join(' · '),
    size: tile.sizeBytes === null ? null : formatByteSize(tile.sizeBytes),
  };
}

function lineOf(tile: IndexTile): string {
  const summary = tile.summary;
  if (summary === null) return '';
  switch (summary.kind) {
    case 'stack':
      return `${summary.frameworks.total} ${summary.frameworks.total === 1 ? 'framework' : 'frameworks'}`;
    case 'file-roles':
      return `${summary.total} ${summary.total === 1 ? 'entry' : 'entries'}`;
    case 'api-map':
      return `${summary.total} ${summary.total === 1 ? 'route' : 'routes'}`;
    case 'dependency-graph':
      return `${summary.total} ${summary.total === 1 ? 'dependency' : 'dependencies'}`;
    case 'arch-decisions':
      return summary.layers.length > 0
        ? `${summary.layers.length} ${summary.layers.length === 1 ? 'layer' : 'layers'}`
        : `${summary.keys.total} ${summary.keys.total === 1 ? 'key' : 'keys'}`;
    case 'synthesis':
      return summary.documents === null ? '' : `${summary.documents} ${summary.documents === 1 ? 'document' : 'documents'}`;
    default:
      return '';
  }
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

/** The synthesis conflict chips in the file's own words (RESEARCH C5): blockers `missing`, competing variants
 * `in-flight`, auto-resolved `quiet`. A bucket that holds none is `quiet`, never a tone that reads as a problem. */
function conflictChips(summary: SynthesisSummary): ComposedIndexesChip[] {
  if (summary.conflicts === null) return [];
  const { blockers, competing, autoResolved } = summary.conflicts;
  return [
    { label: plural(blockers, 'blocker', 'blockers'), tone: blockers > 0 ? 'missing' : 'quiet' },
    { label: plural(competing, 'competing variant', 'competing variants'), tone: competing > 0 ? 'in-flight' : 'quiet' },
    { label: `${autoResolved} auto-resolved`, tone: 'quiet' },
  ];
}

function synthesisFigure(summary: SynthesisSummary): ComposedIndexesFigure {
  return {
    kind: 'count',
    count: summary.documents === null ? null : { value: groupedNumber(summary.documents), word: summary.documents === 1 ? 'document' : 'documents' },
    split: null,
    tags: [],
    chips: conflictChips(summary),
  };
}

function figureOf(tile: IndexTile): ComposedIndexesFigure {
  if (tile.state === 'not-built') return { kind: 'ghost', text: NOT_BUILT_WORDS };
  if (tile.key === 'graph') {
    const counts = countsOf(tile.graph, false);
    return {
      kind: 'graph',
      counts,
      countsLabel: counts.length === 0 ? COUNTS_NOT_READ_WORDS : null,
      chips: chipsOf(tile.graph),
    };
  }
  if (tile.state === 'unreadable') return { kind: 'unreadable' };
  if (tile.summary !== null && tile.summary.kind === 'synthesis') return synthesisFigure(tile.summary);
  return { kind: 'line', text: lineOf(tile) };
}

function panelOf(tile: IndexTile, readAt: string): ComposedIndexesPanel {
  if (tile.key === 'graph' && tile.graph !== null) {
    const counts = countsOf(tile.graph, true);
    return {
      graph: {
        counts,
        countsLabel: counts.length === 0 ? COUNTS_NOT_READ_WORDS : null,
        cells: cellsOf(tile.graph, readAt),
        reportLines: tile.graph.reportLines,
      },
      foot: footOf(tile),
    };
  }
  return { graph: null, foot: footOf(tile) };
}

// ---------------------------------------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------------------------------------

export function composeIndexes(input: ViewInput): ComposedIndexes | null {
  try {
    const context = input.indexesContext;
    if (context === null || context === undefined) return null;
    if (!Array.isArray(context.tiles) || context.tiles.length === 0) return null;

    const graphTile = context.tiles.find((tile) => tile.key === 'graph');
    const facts: string[] = [filesWords(context.intelFiles)];
    facts.push(graphTile !== undefined && graphTile.state !== 'not-built' ? '1 graph' : 'No graph');
    if (context.refreshed !== null) facts.push(`Intel refreshed ${datePart(context.refreshed) ?? context.refreshed}`);

    const tiles: ComposedIndexesTile[] = context.tiles.map((tile) => {
      const open = context.openKey === tile.key && tile.state !== 'not-built';
      return {
        key: tile.key,
        title: tile.title,
        path: tile.path,
        to: tile.url,
        span: tile.span,
        ghost: tile.state === 'not-built',
        open,
        figure: figureOf(tile),
        panel: open ? panelOf(tile, context.readAt) : null,
      };
    });

    return {
      head: { eyebrow: INDEXES_EYEBROW, title: INDEXES_TITLE, facts },
      tiles,
      openKey: tiles.some((tile) => tile.open) ? context.openKey : null,
    };
  } catch {
    return null;
  }
}
