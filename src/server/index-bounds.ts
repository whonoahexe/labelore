// The one place every Indexes-page bound lives (Phase 11, 11-13, VIEW-19, D-04, RESEARCH Pattern 6): how many
// hubs, paths, routes and dependencies a summary may carry, how long the label digest may be, and the most the
// graph scan may read. Intel and graph files can be any size and any shape, so a summary is always a short,
// bounded projection and says '{shown} of {n}' when it cut something (UI-SPEC section 4, Bounded-summary rule).
// Constants and types only: this module holds no Node import, so the planning-repo handlers can use it.

export interface IndexBounds {
  /** Most connected nodes a graph summary names. */
  readonly hubs: number;
  /** File paths a file-roles summary lists. */
  readonly paths: number;
  /** Routes an api-map summary lists. */
  readonly routes: number;
  /** Dependencies a dependency-graph summary lists, most used first. */
  readonly dependencies: number;
  /** Largest body (UTF-8 bytes) the digest of labels may have. */
  readonly digestBytes: number;
  /** A GRAPH_REPORT line longer than this many characters never enters a summary. */
  readonly reportLineChars: number;
  /** Items a stack list (languages, frameworks, tools, content formats) shows. */
  readonly listItems: number;
  /** Characters of one label, name, path or description in a summary. */
  readonly labelChars: number;
  /** Keys an arch-decisions summary names (every key of a real file; a cap against a hostile one). */
  readonly archKeys: number;
  /** Layers an architecture pattern splits into. */
  readonly layers: number;
  /** Top-level key names an unknown intel file shows. */
  readonly unknownKeys: number;
  /** Rows of a type or method split. */
  readonly splitRows: number;
  /** Lines of a graph report summary and entries of the "Not sent to this page" list. */
  readonly reportLines: number;
}

export const INDEX_BOUNDS: IndexBounds = Object.freeze({
  hubs: 10,
  paths: 12,
  routes: 6,
  dependencies: 8,
  digestBytes: 2048,
  reportLineChars: 400,
  listItems: 12,
  labelChars: 120,
  archKeys: 40,
  layers: 8,
  unknownKeys: 24,
  splitRows: 12,
  reportLines: 8,
});

/** The largest graph.json the scan reads (RESEARCH A3): a transient read of up to 96 MiB; a larger file reads "counts not read". */
export const GRAPH_READ_CAP_BYTES = 96 * 1024 * 1024;
