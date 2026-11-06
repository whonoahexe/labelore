// The Indexes page's server-side join (Phase 11, 11-18, VIEW-19, D-04, sketch 055 A): one tile per intel or graph
// file, each carrying only the bounded summary 11-13 made (`structured.index` for an intel file, the awaited
// `GraphSummary` for the graphs/ folder). Pure: it reads the cached `ProjectPresentation` and the summary it is
// handed, never a file, and imports nothing from Node. It reads author keys through Object.hasOwn and plain-object
// checks, and gives null on a project with no index file at all.
//
// Tiles, in the grid's order (UI-SPEC section 4): Graph, Architecture, Stack, File roles, API surface,
// Dependencies, then a generic tile for each intel file the page does not know (title from its name, key names only);
// a project whose intel is the ingest-docs markdown family (SYNTHESIS.md and no JSON intel) orders Synthesis, Graph. A tile is drawn only for a file the project holds, except Graph: with no graphs/ folder the
// Graph tile is a "not-built" ghost. A file the summary could not shape (invalid JSON, over the text cap) is an
// "unreadable" tile that still names its path.
//
// Addresses. Phase 7's /intel/{file} and /graphs/{file} stay the keys (RESEARCH C1): `openKey` names the tile the
// open address belongs to (every graphs/ file opens Graph; each JSON file its own tile; SYNTHESIS.md and the four
// ingest documents open Synthesis; an intel file the page does not know opens its own generic tile `file:{name}`;
// the `.last-refresh.json` stamp opens no tile).
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import type { GraphArtifactRef, GraphSummary } from '../server/index-summary.ts';
import { intelKindOf } from '../planning-repo/handlers/index-intel-lift.ts';
import type { IntelKind, IntelSummary } from '../planning-repo/handlers/index-intel-lift.ts';

const INTEL_DIR = '.planning/intel/';
const GRAPHS_DIR = '.planning/graphs/';

export type KnownTileKey = 'graph' | 'architecture' | 'stack' | 'file-roles' | 'api-map' | 'dependencies' | 'synthesis';

/** A tile's key: one of the known seven, or `file:{name}` for an intel file the page does not know (a generic tile). */
export type IndexTileKey = KnownTileKey | `file:${string}`;

/** The grid's order for a project with JSON intel: Graph first, then Architecture, Stack, File roles, API surface and Dependencies. */
export const INDEX_TILE_ORDER: readonly KnownTileKey[] = [
  'graph',
  'architecture',
  'stack',
  'file-roles',
  'api-map',
  'dependencies',
];

/** The order for an ingest-docs project (SYNTHESIS.md, no JSON intel). */
export const INGEST_TILE_ORDER: readonly KnownTileKey[] = ['synthesis', 'graph'];

interface TileSpec {
  title: string;
  span: 1 | 2;
  /** The intel file name a JSON tile reads, or null for Graph and Synthesis. */
  file: string | null;
  kind: IntelKind | null;
}

const TILE_SPECS: Readonly<Record<KnownTileKey, TileSpec>> = {
  graph: { title: 'Graph', span: 2, file: null, kind: null },
  architecture: { title: 'Architecture', span: 1, file: 'arch-decisions.json', kind: 'arch-decisions' },
  stack: { title: 'Stack', span: 1, file: 'stack.json', kind: 'stack' },
  'file-roles': { title: 'File roles', span: 2, file: 'file-roles.json', kind: 'file-roles' },
  'api-map': { title: 'API surface', span: 1, file: 'api-map.json', kind: 'api-map' },
  dependencies: { title: 'Dependencies', span: 2, file: 'dependency-graph.json', kind: 'dependency-graph' },
  synthesis: { title: 'Synthesis', span: 2, file: 'SYNTHESIS.md', kind: 'synthesis' },
};

export type IndexTileState = 'ok' | 'unreadable' | 'not-built';

export interface IndexFileFacts {
  path: string;
  /** The artifact's address (its payload key), or null when it has none. */
  url: string | null;
  sizeBytes: number;
}

export interface IndexMeta {
  updated: string | null;
  version: string | null;
}

/** One ingest-docs document (decisions.md and its siblings) a Synthesis panel lists. */
export interface IndexDocumentFile extends IndexFileFacts {
  name: string;
  summary: IntelSummary | null;
}

export interface IndexTile {
  key: IndexTileKey;
  title: string;
  /** The tile's file path, or null for the not-built Graph ghost. */
  path: string | null;
  /** The address that opens this tile, or null when there is none (the ghost). */
  url: string | null;
  span: 1 | 2;
  state: IndexTileState;
  sizeBytes: number | null;
  meta: IndexMeta;
  /** The bounded summary of an intel tile; null for Graph, an unreadable file and the ghost. */
  summary: IntelSummary | null;
  /** The graph tile's bounded summary; null on every other tile and when none could be built. */
  graph: GraphSummary | null;
  /** Synthesis only: the ingest-docs documents beside it. */
  documents: IndexDocumentFile[];
}

export interface IndexesContext {
  tiles: IndexTile[];
  /** The tile the open address belongs to, or null (the stamp, an unknown file). */
  openKey: IndexTileKey | null;
  /** How many intel files the project holds (tiles other than Graph). */
  intelFiles: number;
  /** The `.last-refresh.json` date, as the file writes it. */
  refreshed: string | null;
  /** The snapshot read time, so a page counts ages to the day the project was read. */
  readAt: string;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the lifts
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** `structured.index` as the summary its `kind` names, or null when the artifact carries none or another kind. */
function summaryOf(artifact: ArtifactDto, expected: IntelKind | null): IntelSummary | null {
  if (!isRecord(artifact.structured) || !Object.hasOwn(artifact.structured, 'index')) return null;
  const index = artifact.structured.index;
  if (!isRecord(index) || typeof index.kind !== 'string') return null;
  if (expected !== null && index.kind !== expected) return null;
  return index as unknown as IntelSummary;
}

function scalarText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** `_meta.updated_at` and `_meta.version`, as scalars (the handler keeps only scalars of `_meta`). */
function metaOf(artifact: ArtifactDto): IndexMeta {
  const meta = isRecord(artifact.frontmatter) && Object.hasOwn(artifact.frontmatter, '_meta') ? artifact.frontmatter._meta : null;
  if (!isRecord(meta)) return { updated: null, version: null };
  return {
    updated: scalarText(Object.hasOwn(meta, 'updated_at') ? meta.updated_at : undefined),
    version: scalarText(Object.hasOwn(meta, 'version') ? meta.version : undefined),
  };
}

const NO_META: IndexMeta = { updated: null, version: null };

/** The artifacts under `.planning/graphs/` as the graph summary wants them (path, size, class), in path order. */
export function graphArtifactsOf(presentation: ProjectPresentation): GraphArtifactRef[] {
  return presentation.artifacts
    .filter((artifact) => artifact.path.startsWith(GRAPHS_DIR))
    .map((artifact) => ({ path: artifact.path, sizeBytes: artifact.sizeBytes, fileClass: artifact.fileClass }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Which tile a path belongs to, by position and file name alone; null for the stamp and unknown files. */
export function tileKeyOfPath(path: string): IndexTileKey | null {
  if (path.startsWith(GRAPHS_DIR)) return 'graph';
  if (!path.startsWith(INTEL_DIR)) return null;
  const name = baseName(path);
  switch (intelKindOf(name)) {
    case 'arch-decisions':
      return 'architecture';
    case 'stack':
      return 'stack';
    case 'file-roles':
      return 'file-roles';
    case 'api-map':
      return 'api-map';
    case 'dependency-graph':
      return 'dependencies';
    case 'synthesis':
    case 'ingest-doc':
      return 'synthesis';
    case 'unknown':
      return isGenericIntelPath(path) ? `file:${name}` : null;
    default:
      return null;
  }
}

/** A file directly inside intel/ that is JSON or markdown and that the page has no tile for (the `.last-refresh.json`
 * stamp is not one: it is a known kind). Files in a sub-folder (classifications/) are counted, never tiled. */
function isGenericIntelPath(path: string): boolean {
  if (!path.startsWith(INTEL_DIR)) return false;
  const name = path.slice(INTEL_DIR.length);
  if (name === '' || name.includes('/')) return false;
  const lower = name.toLowerCase();
  return lower.endsWith('.json') || lower.endsWith('.md');
}

/** "notes.json" -> "Notes", "dead_links-2.json" -> "Dead links 2": the file's own words, sentence case. */
function genericTitle(name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const words = stem.split('-').join(' ').split('_').join(' ').trim();
  return words === '' ? name : `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function atPath(presentation: ProjectPresentation, path: string): ArtifactDto | undefined {
  return presentation.artifacts.find((artifact) => artifact.path === path);
}

function keyOrNull(artifact: ArtifactDto | undefined): string | null {
  return artifact !== undefined && artifact.key !== '' ? artifact.key : null;
}

// ---------------------------------------------------------------------------------------------------------
// The tiles
// ---------------------------------------------------------------------------------------------------------

function fileTile(key: KnownTileKey, artifact: ArtifactDto): IndexTile {
  const spec = TILE_SPECS[key];
  const summary = summaryOf(artifact, spec.kind);
  return {
    key,
    title: spec.title,
    path: artifact.path,
    url: keyOrNull(artifact),
    span: spec.span,
    state: summary === null ? 'unreadable' : 'ok',
    sizeBytes: artifact.sizeBytes,
    meta: metaOf(artifact),
    summary,
    graph: null,
    documents: [],
  };
}

/** An intel file the page does not know: a tile titled from its name; never its content (UI-SPEC section 7). */
function genericTile(artifact: ArtifactDto): IndexTile {
  const name = baseName(artifact.path);
  const summary = summaryOf(artifact, 'unknown');
  return {
    key: `file:${name}`,
    title: genericTitle(name),
    path: artifact.path,
    url: keyOrNull(artifact),
    span: 1,
    state: summary === null ? 'unreadable' : 'ok',
    sizeBytes: artifact.sizeBytes,
    meta: metaOf(artifact),
    summary,
    graph: null,
    documents: [],
  };
}

function graphTile(presentation: ProjectPresentation, graph: GraphSummary | null): IndexTile {
  const inFolder = presentation.artifacts.filter((artifact) => artifact.path.startsWith(GRAPHS_DIR));
  const spec = TILE_SPECS.graph;
  if (inFolder.length === 0) {
    return {
      key: 'graph',
      title: spec.title,
      path: null,
      url: null,
      span: spec.span,
      state: 'not-built',
      sizeBytes: null,
      meta: NO_META,
      summary: null,
      graph: null,
      documents: [],
    };
  }
  // The tile's own file: graph.json, else the report, else the first file with an address.
  const lead =
    inFolder.find((artifact) => baseName(artifact.path) === 'graph.json') ??
    inFolder.find((artifact) => baseName(artifact.path) === 'GRAPH_REPORT.md') ??
    inFolder.find((artifact) => artifact.key !== '') ??
    inFolder[0];
  return {
    key: 'graph',
    title: spec.title,
    path: lead.path,
    url: keyOrNull(lead),
    span: spec.span,
    state: graph === null ? 'unreadable' : 'ok',
    sizeBytes: lead.sizeBytes,
    meta: NO_META,
    summary: null,
    graph,
    documents: [],
  };
}

function synthesisTile(presentation: ProjectPresentation): IndexTile | null {
  const synthesis = atPath(presentation, `${INTEL_DIR}SYNTHESIS.md`);
  if (synthesis === undefined) return null;
  const tile = fileTile('synthesis', synthesis);
  const documents: IndexDocumentFile[] = [];
  for (const artifact of presentation.artifacts) {
    if (!artifact.path.startsWith(INTEL_DIR) || intelKindOf(artifact.path) !== 'ingest-doc') continue;
    documents.push({
      name: baseName(artifact.path),
      path: artifact.path,
      url: keyOrNull(artifact),
      sizeBytes: artifact.sizeBytes,
      summary: summaryOf(artifact, 'ingest-doc'),
    });
  }
  documents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { ...tile, documents };
}

function intelFileOf(presentation: ProjectPresentation, name: string): ArtifactDto | undefined {
  return atPath(presentation, `${INTEL_DIR}${name}`);
}

/**
 * The Indexes page's tiles for the project, or null when it holds no intel or graph file. `activePath` is the
 * path of the document being opened (it decides `openKey`); `graph` is the awaited graph summary (null when none
 * could be built). Never throws on a payload of the wrong shape.
 */
export function buildIndexesContext(
  presentation: ProjectPresentation,
  activePath: string | null,
  graph: GraphSummary | null,
): IndexesContext | null {
  const hasIntel = presentation.artifacts.some((artifact) => artifact.path.startsWith(INTEL_DIR));
  const hasGraphs = presentation.artifacts.some((artifact) => artifact.path.startsWith(GRAPHS_DIR));
  if (!hasIntel && !hasGraphs) return null;

  const jsonTiles: IndexTile[] = [];
  for (const key of INDEX_TILE_ORDER) {
    const spec = TILE_SPECS[key];
    if (spec.file === null) continue;
    const artifact = intelFileOf(presentation, spec.file);
    if (artifact !== undefined) jsonTiles.push(fileTile(key, artifact));
  }
  const synthesis = synthesisTile(presentation);
  const graphOne = graphTile(presentation, graph);
  // Intel files the page does not know, one generic tile each, in file-name order, after the known tiles.
  const generics = presentation.artifacts
    .filter((artifact) => isGenericIntelPath(artifact.path) && intelKindOf(artifact.path) === 'unknown')
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(genericTile);

  let tiles: IndexTile[];
  if (synthesis !== null && jsonTiles.length === 0) {
    // The ingest-docs family: Synthesis, then Graph (a ghost when there is no graphs/ folder).
    tiles = [synthesis, graphOne, ...generics];
  } else {
    tiles = [graphOne, ...jsonTiles, ...generics, ...(synthesis !== null ? [synthesis] : [])];
    // Only intel files and a graph: a ghost Graph beside no intel file would be the whole page.
    if (graphOne.state === 'not-built' && jsonTiles.length === 0 && generics.length === 0 && synthesis === null) {
      tiles = [graphOne];
    }
  }

  const stamp = intelFileOf(presentation, '.last-refresh.json');
  const stampSummary = stamp === undefined ? null : summaryOf(stamp, 'stamp');
  const refreshed = stampSummary !== null && stampSummary.kind === 'stamp' ? stampSummary.date : null;

  const wanted = activePath === null ? null : tileKeyOfPath(activePath);
  const openKey = wanted !== null && tiles.some((tile) => tile.key === wanted && tile.state !== 'not-built') ? wanted : null;

  return {
    tiles,
    openKey,
    intelFiles: tiles.filter((tile) => tile.key !== 'graph').length,
    refreshed,
    readAt: presentation.readAt,
  };
}

/** The address the bare /indexes leads to: the first tile in grid order that has an address. Null when there is none. */
export function firstTileUrl(context: IndexesContext | null): string | null {
  if (context === null) return null;
  for (const tile of context.tiles) if (tile.url !== null) return tile.url;
  return null;
}
