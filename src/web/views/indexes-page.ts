// The Indexes page's composer (Phase 11, 11-18 and 11-19, VIEW-19, D-04, sketch 055 winner A "Instrument grid"): a
// pure `ViewInput` -> `ComposedIndexes` merge of the server-built `indexesContext` (the bounded summaries 11-13
// made). One page serves every intel and graph address (the Phase 7 addresses stay the keys, RESEARCH C1): the
// address decides which tile is open in place. The page answers "what do the codebase indexes say?" as short
// summaries:
//   - the head: the eyebrow "Exploration · Indexes", the h1 "Indexes", a facts line ("{n} intel files", "1 graph" or
//     "No graph", "Intel refreshed {date}") and the manifest's lead;
//   - the grid: one tile per index file in the context's order, Graph first (or Synthesis, Graph for an ingest-docs
//     project), each with its key figure: the Graph tile's node and edge counts with a "{n} commits behind"
//     `in-flight` chip and a "Last update failed" `missing` chip (a stale graph whose last update failed reads as two
//     facts, never one broken tile); the layer stack; the framework chips; a big count with a split bar or method
//     tags; the document count with the file's own conflict words. A project with no graphs/ folder draws a hatched,
//     dashed "Not built" ghost tile that cannot be focused. A file that could not be read shows its path and the
//     "Unreadable" chip; an intel file the page does not know is a generic tile (name, key names, never content);
//   - the open tile: spans the full row and shows its panel (UI-SPEC section 4), every list as '{shown} of {n}'.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level mutable
// state. It returns `null` when the context is missing, so the page keeps the promoted-section view with no notice
// (Phase 10 C1, X2). T-11-28 and T-11-30: only the bounded summary is read here; every string is author text
// rendered as React text by the components.
import type { IndexTile, IndexTileKey } from '../../presentation/indexes-context.ts';
import type { IntelSummary, SynthesisSummary } from '../../planning-repo/handlers/index-intel-lift.ts';
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

/** Tags a tile shows before "{n} more"; a panel shows every item its summary holds. */
const TILE_TAGS = 6;

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
  /** Written after each value in the key: "%" for the extraction shares, empty for counts. */
  suffix: string;
  parts: ComposedIndexesSplitPart[];
}

/** A row of tags with how many more the summary held than the row shows. */
export interface ComposedIndexesTags {
  items: string[];
  more: number;
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
  /** Architecture: the layers as written, numbered. */
  | { kind: 'layers'; layers: string[] }
  /** Stack: the framework chips. */
  | { kind: 'tags'; tags: ComposedIndexesTags }
  /** Any other tile: one line of text. */
  | { kind: 'line'; text: string }
  | { kind: 'unreadable' }
  | { kind: 'ghost'; text: string };

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

export interface ComposedIndexesBar {
  label: string;
  value: string;
  /** Width in percent of the longest bar. */
  share: number;
}

export interface ComposedIndexesHubs {
  /** "Most connected (top 10 of 41,280)". */
  title: string;
  bars: ComposedIndexesBar[];
}

export interface ComposedIndexesNotSent {
  /** Each file's name and size: "graph.json" "22 MB". */
  files: { name: string; size: string }[];
  more: number;
}

export interface ComposedIndexesRoute {
  method: string;
  path: string;
  description: string | null;
  file: string | null;
}

export interface ComposedIndexesDocument {
  name: string;
  facts: string | null;
  size: string;
}

export type ComposedIndexesBody =
  | {
      kind: 'graph';
      counts: ComposedIndexesCount[];
      /** Shown instead of the counts when none could be read. */
      countsLabel: string | null;
      cells: ComposedIndexesCell[];
      /** "How the edges were found": the report's Extraction shares. */
      extraction: ComposedIndexesSplit | null;
      hubs: ComposedIndexesHubs | null;
      /** The report's Summary lines as written (bounded by 11-13). */
      reportLines: string[];
      notSent: ComposedIndexesNotSent | null;
      /** Files that could not be read, by path, each drawn with the Unreadable chip. */
      unreadable: string[];
    }
  | { kind: 'architecture'; layers: string[]; keys: ComposedIndexesTags | null; keysLabel: string | null }
  | {
      kind: 'stack';
      groups: { label: string; tags: ComposedIndexesTags }[];
      facts: { label: string; value: string }[];
    }
  | {
      kind: 'file-roles';
      split: ComposedIndexesSplit | null;
      folders: { folder: string; files: { name: string; type: string | null }[] }[];
      shownLabel: string;
    }
  | { kind: 'api-map'; methods: string[]; routes: ComposedIndexesRoute[]; shownLabel: string }
  | { kind: 'dependencies'; split: ComposedIndexesSplit | null; rows: ComposedIndexesBar[]; shownLabel: string }
  | {
      kind: 'synthesis';
      count: ComposedIndexesCount | null;
      chips: ComposedIndexesChip[];
      split: ComposedIndexesSplit | null;
      documents: ComposedIndexesDocument[];
      /** "3 classification types, counted, not shown" or null. */
      classifications: string | null;
    }
  | { kind: 'generic'; keys: ComposedIndexesTags | null; keysLabel: string }
  /** A file that could not be read: its foot (path, size) is all there is. */
  | { kind: 'unreadable' };

export interface ComposedIndexesPanel {
  body: ComposedIndexesBody;
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
  /** The open tile's key, or `null` (the stamp, or no tile open). */
  openKey: IndexTileKey | null;
}

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

function groupedNumber(value: number): string {
  return value.toLocaleString('en-GB');
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function filesWords(count: number): string {
  return plural(count, 'intel file', 'intel files');
}

/** "{n} commits behind" and "1 commit behind". */
export function commitsBehindWords(count: number): string {
  return plural(count, 'commit behind', 'commits behind');
}

/** "{shown} of {n} entries": the bounded-list line (UI-SPEC section 4). */
function shownOf(shown: number, total: number, noun: string): string {
  return `${shown} of ${groupedNumber(total)} ${noun}`;
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
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

function countsOf(graph: GraphSummary | null, full: boolean): ComposedIndexesCount[] {
  if (graph === null || graph.counts === null) return [];
  const out: ComposedIndexesCount[] = [{ value: groupedNumber(graph.counts.nodes), word: 'nodes' }];
  if (graph.counts.links !== null) out.push({ value: groupedNumber(graph.counts.links), word: 'edges' });
  if (full && graph.counts.communities !== null) {
    const thin = graph.thinCommunities;
    out.push({
      value: groupedNumber(graph.counts.communities),
      word: thin !== null ? `communities (${groupedNumber(thin)} thin)` : 'communities',
    });
  }
  if (full && graph.importCycles !== null) {
    out.push({ value: groupedNumber(graph.importCycles), word: graph.importCycles === 1 ? 'import cycle' : 'import cycles' });
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

// ---------------------------------------------------------------------------------------------------------
// Bars and tags
// ---------------------------------------------------------------------------------------------------------

const FILLS: readonly ComposedIndexesSplitPart['fill'][] = ['a', 'b', 'c', 'd'];

/** A split bar over labelled counts; rows with no count are dropped; null when nothing is left to draw. */
function splitOf(rows: readonly { label: string; value: number }[], suffix: string = ''): ComposedIndexesSplit | null {
  const kept = rows.filter((row) => Number.isFinite(row.value) && row.value > 0);
  const total = kept.reduce((sum, row) => sum + row.value, 0);
  if (kept.length === 0 || total <= 0) return null;
  return {
    name: kept.map((row) => `${groupedNumber(row.value)}${suffix} ${row.label}`).join(', '),
    suffix,
    parts: kept.map((row, index) => ({
      label: row.label,
      value: row.value,
      share: Math.round((row.value / total) * 10_000) / 100,
      fill: FILLS[index % FILLS.length],
    })),
  };
}

function tagsOf(items: readonly string[], total: number, limit: number): ComposedIndexesTags | null {
  if (items.length === 0) return null;
  const shown = items.slice(0, limit);
  return { items: shown, more: Math.max(0, total - shown.length) };
}

/** Bars scaled to the longest value, the longest full width. */
function barsOf(rows: readonly { label: string; value: number }[]): ComposedIndexesBar[] {
  const peak = rows.reduce((max, row) => Math.max(max, row.value), 0);
  return rows.map((row) => ({
    label: row.label,
    value: groupedNumber(row.value),
    share: peak > 0 ? Math.round((row.value / peak) * 10_000) / 100 : 0,
  }));
}

// ---------------------------------------------------------------------------------------------------------
// The Graph tile and panel
// ---------------------------------------------------------------------------------------------------------

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
  // The last good build: the update's own date when it succeeded, else the day the report (the last good build's
  // output) was written for.
  const statusOk = status !== null && (status.state ?? '').toLowerCase() === 'ok' && datePart(status.at) !== null;
  const goodAt = statusOk ? status.at : graph.reportDate;
  if (goodAt !== null && datePart(goodAt) !== null) {
    cells.push({
      key: 'good',
      label: 'Last good build',
      value: datePart(goodAt) ?? '',
      note: ageWords(goodAt, readAt),
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

function hubsOf(graph: GraphSummary): ComposedIndexesHubs | null {
  if (graph.hubs.length === 0) return null;
  const k = graph.hubs.length;
  const of = graph.counts !== null ? ` of ${groupedNumber(graph.counts.nodes)}` : '';
  return {
    title: `Most connected (top ${k}${of})`,
    bars: barsOf(graph.hubs.map((hub) => ({ label: hub.label ?? hub.id, value: hub.degree }))),
  };
}

function notSentOf(tile: IndexTile, graph: GraphSummary): ComposedIndexesNotSent | null {
  const files: { name: string; size: string }[] = [];
  // graph.json itself is never sent: only counts and hubs are read from it (the lead file's size is the tile's).
  if (tile.path !== null && tile.sizeBytes !== null && baseName(tile.path) === 'graph.json') {
    files.push({ name: 'graph.json', size: formatByteSize(tile.sizeBytes) });
  }
  for (const file of graph.notSent) files.push({ name: baseName(file.path), size: formatByteSize(file.sizeBytes) });
  if (files.length === 0) return null;
  return { files, more: Math.max(0, graph.notSentTotal - graph.notSent.length) };
}

function graphBody(tile: IndexTile, graph: GraphSummary | null, readAt: string): ComposedIndexesBody {
  if (graph === null) {
    return {
      kind: 'graph',
      counts: [],
      countsLabel: COUNTS_NOT_READ_WORDS,
      cells: [],
      extraction: null,
      hubs: null,
      reportLines: [],
      notSent: null,
      unreadable: [],
    };
  }
  const counts = countsOf(graph, true);
  return {
    kind: 'graph',
    counts,
    countsLabel: counts.length === 0 ? COUNTS_NOT_READ_WORDS : null,
    cells: cellsOf(graph, readAt),
    extraction: splitOf(
      graph.extraction.map((row) => ({ label: row.label, value: row.percent })),
      '%',
    ),
    hubs: hubsOf(graph),
    reportLines: graph.reportLines,
    notSent: notSentOf(tile, graph),
    unreadable: graph.unreadable.map((file) => file.path),
  };
}

// ---------------------------------------------------------------------------------------------------------
// The intel tiles and panels
// ---------------------------------------------------------------------------------------------------------

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

function documentCount(summary: SynthesisSummary): ComposedIndexesCount | null {
  if (summary.documents === null) return null;
  return { value: groupedNumber(summary.documents), word: summary.documents === 1 ? 'document' : 'documents' };
}

function figureOf(tile: IndexTile): ComposedIndexesFigure {
  if (tile.state === 'not-built') return { kind: 'ghost', text: NOT_BUILT_WORDS };
  if (tile.key === 'graph') {
    const graph = tile.graph;
    const counts = countsOf(graph, false);
    // No counts and the tile's own file among the unreadable ones: the shared "Unreadable" chip, once.
    if (counts.length === 0 && graph !== null && graph.unreadable.some((file) => file.path === tile.path)) {
      return { kind: 'unreadable' };
    }
    return { kind: 'graph', counts, countsLabel: counts.length === 0 ? COUNTS_NOT_READ_WORDS : null, chips: chipsOf(graph) };
  }
  if (tile.state === 'unreadable') return { kind: 'unreadable' };
  const summary = tile.summary;
  if (summary === null) return { kind: 'line', text: '' };
  switch (summary.kind) {
    case 'arch-decisions':
      return summary.layers.length > 0
        ? { kind: 'layers', layers: summary.layers }
        : { kind: 'line', text: plural(summary.keys.total, 'key', 'keys') };
    case 'stack': {
      const shown = summary.frameworks.items.length > 0 ? summary.frameworks : summary.languages;
      const tags = tagsOf(shown.items, shown.total, TILE_TAGS);
      return tags === null ? { kind: 'line', text: '' } : { kind: 'tags', tags };
    }
    case 'file-roles':
      return {
        kind: 'count',
        count: { value: groupedNumber(summary.total), word: summary.total === 1 ? 'entry' : 'entries' },
        split: splitOf(summary.types.items.map((row) => ({ label: row.label, value: row.count }))),
        tags: [],
        chips: [],
      };
    case 'api-map':
      return {
        kind: 'count',
        count: { value: groupedNumber(summary.total), word: summary.total === 1 ? 'route' : 'routes' },
        split: null,
        tags: summary.methods.items.map((row) => `${row.label} ${row.count}`),
        chips: [],
      };
    case 'dependency-graph':
      return {
        kind: 'count',
        count: { value: groupedNumber(summary.total), word: summary.total === 1 ? 'dependency' : 'dependencies' },
        split: splitOf([
          { label: 'production', value: summary.production },
          { label: 'development', value: summary.development },
          { label: 'other', value: summary.other },
        ]),
        tags: [],
        chips: [],
      };
    case 'synthesis':
      return { kind: 'count', count: documentCount(summary), split: null, tags: [], chips: conflictChips(summary) };
    case 'unknown':
      return { kind: 'line', text: plural(summary.keys.total, 'key', 'keys') };
    default:
      return { kind: 'line', text: '' };
  }
}

function documentFacts(summary: IntelSummary | null): string | null {
  if (summary === null || summary.kind !== 'ingest-doc') return null;
  const parts: string[] = [plural(summary.entries, 'entry', 'entries')];
  if (summary.locked > 0) parts.push(`${summary.locked} locked`);
  if (summary.proposed > 0) parts.push(`${summary.proposed} proposed`);
  return parts.join(', ');
}

function footOf(tile: IndexTile): ComposedIndexesFoot | null {
  if (tile.path === null) return null;
  const parts: string[] = [];
  if (tile.meta.updated !== null) parts.push(`updated ${datePart(tile.meta.updated) ?? tile.meta.updated}`);
  if (tile.meta.version !== null) parts.push(`version ${tile.meta.version}`);
  return {
    path: tile.path,
    updated: parts.length === 0 ? null : parts.join(' · '),
    size: tile.sizeBytes === null ? null : formatByteSize(tile.sizeBytes),
  };
}

function listOf(list: { items: string[]; total: number }): ComposedIndexesTags | null {
  return tagsOf(list.items, list.total, list.items.length);
}

function bodyOf(tile: IndexTile, readAt: string): ComposedIndexesBody {
  if (tile.key === 'graph') return graphBody(tile, tile.graph, readAt);
  const summary = tile.summary;
  if (tile.state === 'unreadable' || summary === null) return { kind: 'unreadable' };
  switch (summary.kind) {
    case 'arch-decisions': {
      const keys = listOf(summary.keys);
      return {
        kind: 'architecture',
        layers: summary.layers,
        keys,
        keysLabel: keys === null ? null : shownOf(summary.keys.items.length, summary.keys.total, 'keys'),
      };
    }
    case 'stack': {
      const lists: [string, ComposedIndexesTags | null][] = [
        ['Languages', listOf(summary.languages)],
        ['Frameworks', listOf(summary.frameworks)],
        ['Tools', listOf(summary.tools)],
        ['Content formats', listOf(summary.contentFormats)],
      ];
      const groups: { label: string; tags: ComposedIndexesTags }[] = [];
      for (const [label, tags] of lists) if (tags !== null) groups.push({ label, tags });
      const facts: { label: string; value: string }[] = [];
      if (summary.buildSystem !== null) facts.push({ label: 'Build', value: summary.buildSystem });
      if (summary.testFramework !== null) facts.push({ label: 'Tests', value: summary.testFramework });
      if (summary.packageManager !== null) facts.push({ label: 'Packages', value: summary.packageManager });
      return { kind: 'stack', groups, facts };
    }
    case 'file-roles':
      return {
        kind: 'file-roles',
        split: splitOf(summary.types.items.map((row) => ({ label: row.label, value: row.count }))),
        folders: summary.groups.map((group) => ({ folder: group.folder, files: group.files })),
        shownLabel: shownOf(summary.shown, summary.total, 'entries'),
      };
    case 'api-map':
      return {
        kind: 'api-map',
        methods: summary.methods.items.map((row) => `${row.label} ${row.count}`),
        routes: summary.routes.map((route) => ({
          method: route.method,
          path: route.path,
          description: route.description,
          file: route.file,
        })),
        shownLabel: shownOf(summary.shown, summary.total, 'routes'),
      };
    case 'dependency-graph':
      return {
        kind: 'dependencies',
        split: splitOf([
          { label: 'production', value: summary.production },
          { label: 'development', value: summary.development },
          { label: 'other', value: summary.other },
        ]),
        rows: barsOf(
          summary.dependencies.map((row) => ({
            label: `${row.name}${row.version !== null ? ` ${row.version}` : ''}${row.type === 'development' ? ' · dev' : ''}`,
            value: row.usedBy,
          })),
        ),
        shownLabel: shownOf(summary.shown, summary.total, 'dependencies'),
      };
    case 'synthesis':
      return {
        kind: 'synthesis',
        count: documentCount(summary),
        chips: conflictChips(summary),
        split: splitOf(summary.classificationSplit.map((row) => ({ label: row.label, value: row.count }))),
        documents: tile.documents.map((document) => ({
          name: document.name,
          facts: documentFacts(document.summary),
          size: formatByteSize(document.sizeBytes),
        })),
        classifications:
          summary.classifications === null
            ? null
            : `${plural(summary.classifications, 'classification type', 'classification types')}, counted, not shown`,
      };
    case 'unknown':
      return { kind: 'generic', keys: listOf(summary.keys), keysLabel: shownOf(summary.keys.items.length, summary.keys.total, 'keys') };
    default:
      return { kind: 'unreadable' };
  }
}

function panelOf(tile: IndexTile, readAt: string): ComposedIndexesPanel {
  return { body: bodyOf(tile, readAt), foot: footOf(tile) };
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
