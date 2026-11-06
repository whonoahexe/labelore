// The graph summary the Indexes page shows (Phase 11, 11-13, VIEW-19, D-04, RESEARCH Pattern 6): built on the
// server, lazily, and never sent as raw data. A knowledge graph (`.planning/graphs/graph.json`) can be tens of
// megabytes, so the summary reads, in order:
//   1. GRAPH_REPORT.md: the Summary counts and the God Nodes list (lines longer than a cap never enter);
//   2. .last-build-status.json: status, exit code, duration and the head at build;
//   3. graph.json itself, only through `readBytesWithin('.planning', path)` and only under GRAPH_READ_CAP_BYTES:
//      a hand-written one-pass scan that counts the `nodes` and `links`/`edges` elements, keeps a degree per node
//      id and returns the top 10 hubs, parsing one element at a time and never building the object graph. When
//      the report already gave counts and hubs the scan only looks for `built_at_commit` and parses no element;
//   4. everything else (.last-build-snapshot.json, graph.html, ...) is only named and sized.
// A file over the cap, a file cut off mid-element and a failed read all give "counts not read" and no text.
// "N commits behind" is `git rev-list --count {built_at_commit}..HEAD` through the injected git runner, null on
// any failure, and is asked again on every call, never cached across a refresh (the runtime drops this object
// with its bundle). No Node import: every byte comes through the PlanningFilesystem port.
import type { FileClass } from '../domain/model.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { INDEX_BOUNDS, GRAPH_READ_CAP_BYTES } from './index-bounds.ts';
import type { GitRunner } from './file-dates.ts';

// ---------------------------------------------------------------------------------------------------------
// The element scan
// ---------------------------------------------------------------------------------------------------------

export interface GraphHub {
  /** The node id, cut to the label length. */
  id: string;
  /** The node's label when it has one that differs from its id. */
  label: string | null;
  degree: number;
}

export interface GraphScan {
  nodes: number;
  links: number;
  /** The most connected nodes by degree, then by id; at most INDEX_BOUNDS.hubs. */
  hubs: GraphHub[];
  /** The top-level `built_at_commit` string, unvalidated (the caller checks it before git sees it). */
  builtAtCommit: string | null;
  /** False when the bytes were cut off, malformed, not a graph, or scanned without elements. */
  countsRead: boolean;
}

export interface ScanOptions {
  /** False looks only for the top-level `built_at_commit` and parses no element. Default true. */
  elements?: boolean;
}

const OPEN_OBJECT = 0x7b;
const CLOSE_OBJECT = 0x7d;
const OPEN_ARRAY = 0x5b;
const CLOSE_ARRAY = 0x5d;
const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const COLON = 0x3a;
const COMMA = 0x2c;
const MAX_KEY_BYTES = 64;
const MAX_COMMIT_BYTES = 128;
const MAX_ID_CHARS = 512;
const LABEL_KEEP_CHARS = 80;

type ArrayName = 'nodes' | 'links' | 'edges';
const ARRAY_NAMES: ReadonlySet<string> = new Set(['nodes', 'links', 'edges']);

const decoder = new TextDecoder();

const EMPTY_SCAN: GraphScan = Object.freeze({ nodes: 0, links: 0, hubs: [], builtAtCommit: null, countsRead: false });

function isWhitespace(b: number): boolean {
  return b === 0x20 || b === 0x0a || b === 0x0d || b === 0x09;
}

function endpointId(value: unknown): string | null {
  if (typeof value === 'string') return value.length > MAX_ID_CHARS ? value.slice(0, MAX_ID_CHARS) : value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.hasOwn(value, 'id')) {
    return endpointId((value as Record<string, unknown>).id);
  }
  return null;
}

function hubBefore(a: { id: string; degree: number }, b: { id: string; degree: number }): boolean {
  return a.degree > b.degree || (a.degree === b.degree && a.id < b.id);
}

/** The top `n` entries by degree (ties by id), in one pass with at most `n` kept: no sort of the whole map. */
function topHubs(degrees: ReadonlyMap<string, number>, labels: ReadonlyMap<string, string>, n: number): GraphHub[] {
  const top: { id: string; degree: number }[] = [];
  for (const [id, degree] of degrees) {
    const item = { id, degree };
    if (top.length === n && !hubBefore(item, top[n - 1])) continue;
    let at = top.length;
    while (at > 0 && hubBefore(item, top[at - 1])) at -= 1;
    top.splice(at, 0, item);
    if (top.length > n) top.pop();
  }
  return top.map(({ id, degree }) => ({
    id: cut(id, INDEX_BOUNDS.labelChars),
    label: labels.get(id) ?? null,
    degree,
  }));
}

function cut(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * One pass over the bytes of a graph.json. Tracks nesting depth and string and escape state (structural bytes
 * are ASCII, so a multi-byte character never looks like one), finds the top-level `nodes` and `links` or
 * `edges` arrays, and parses each depth-three element alone. Counts and the top hubs equal what JSON.parse of
 * the whole file would give. Bytes that end before the top-level object closes, an element that is not JSON, or
 * a file with none of the three arrays give `countsRead: false` and no other field.
 */
export function scanGraphElements(bytes: Uint8Array, options: ScanOptions = {}): GraphScan {
  const parseElements = options.elements !== false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let previous = 0;
  let stringStart = 0;
  let stringDepth = 0;
  let stringIsValue = false;
  let lastKey: string | null = null;
  let currentKey: string | null = null;
  let array: ArrayName | null = null;
  let elementOpen = false;
  let elementStart = -1;
  let closed = false;
  let builtAtCommit: string | null = null;

  const counts: Record<ArrayName, number> = { nodes: 0, links: 0, edges: 0 };
  const seen: Record<ArrayName, boolean> = { nodes: false, links: false, edges: false };
  const degrees: Record<'links' | 'edges', Map<string, number>> = { links: new Map(), edges: new Map() };
  const labels = new Map<string, string>();

  const addDegree = (name: 'links' | 'edges', id: string | null): void => {
    if (id === null) return;
    const map = degrees[name];
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (b === BACKSLASH) escaped = true;
      else if (b === QUOTE) {
        inString = false;
        if (stringDepth === 1) {
          const length = i - stringStart;
          if (stringIsValue) {
            if (currentKey === 'built_at_commit' && length <= MAX_COMMIT_BYTES) {
              builtAtCommit = decoder.decode(bytes.subarray(stringStart, i));
            }
          } else {
            lastKey = length <= MAX_KEY_BYTES ? decoder.decode(bytes.subarray(stringStart, i)) : '';
          }
        }
        previous = QUOTE;
      }
      continue;
    }
    if (isWhitespace(b)) continue;

    // A new element of a tracked array begins on its first significant byte.
    if (depth === 2 && array !== null && !elementOpen && b !== COMMA && b !== CLOSE_ARRAY) {
      elementOpen = true;
      counts[array] += 1;
    }

    switch (b) {
      case QUOTE:
        inString = true;
        stringStart = i + 1;
        stringDepth = depth;
        stringIsValue = previous === COLON;
        break;
      case OPEN_OBJECT:
        if (depth === 2 && array !== null) elementStart = i;
        depth += 1;
        previous = b;
        break;
      case CLOSE_OBJECT:
        if (depth === 3 && array !== null && elementStart >= 0 && parseElements) {
          let value: unknown;
          try {
            value = JSON.parse(decoder.decode(bytes.subarray(elementStart, i + 1)));
          } catch {
            return EMPTY_SCAN;
          }
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const rec = value as Record<string, unknown>;
            if (array === 'nodes') {
              const id = Object.hasOwn(rec, 'id') ? endpointId(rec.id) : null;
              const text = Object.hasOwn(rec, 'label') ? rec.label : undefined;
              if (id !== null && typeof text === 'string' && text !== id && text !== '') {
                labels.set(id, cut(text, LABEL_KEEP_CHARS));
              }
            } else {
              addDegree(array, Object.hasOwn(rec, 'source') ? endpointId(rec.source) : null);
              addDegree(array, Object.hasOwn(rec, 'target') ? endpointId(rec.target) : null);
            }
          }
        }
        if (depth === 3) elementStart = -1;
        depth -= 1;
        if (depth < 0) return EMPTY_SCAN;
        if (depth === 0) closed = true;
        previous = b;
        break;
      case OPEN_ARRAY:
        if (depth === 1 && previous === COLON && currentKey !== null && ARRAY_NAMES.has(currentKey)) {
          array = currentKey as ArrayName;
          // A repeated key replaces the earlier array, as JSON.parse does.
          counts[array] = 0;
          seen[array] = true;
          if (array !== 'nodes') degrees[array] = new Map();
          if (array === 'nodes') labels.clear();
          elementOpen = false;
        }
        depth += 1;
        previous = b;
        break;
      case CLOSE_ARRAY:
        if (depth === 2) {
          array = null;
          elementOpen = false;
        }
        depth -= 1;
        if (depth < 0) return EMPTY_SCAN;
        previous = b;
        break;
      case COLON:
        if (depth === 1) {
          currentKey = lastKey;
          lastKey = null;
        }
        previous = b;
        break;
      case COMMA:
        if (depth === 2) elementOpen = false;
        previous = b;
        break;
      default:
        previous = b;
    }
  }

  const recognised = seen.nodes || seen.links || seen.edges;
  if (inString || depth !== 0 || !closed || !recognised) return EMPTY_SCAN;
  const chosen: 'links' | 'edges' = seen.edges ? 'edges' : 'links';
  if (!parseElements) {
    return { nodes: 0, links: 0, hubs: [], builtAtCommit, countsRead: false };
  }
  return {
    nodes: counts.nodes,
    links: counts[chosen],
    hubs: topHubs(degrees[chosen], labels, INDEX_BOUNDS.hubs),
    builtAtCommit,
    countsRead: true,
  };
}

// ---------------------------------------------------------------------------------------------------------
// GRAPH_REPORT.md
// ---------------------------------------------------------------------------------------------------------

export interface GraphReportLift {
  /** The Summary counts, or null when the report names no node count. */
  counts: { nodes: number; edges: number | null; communities: number | null } | null;
  /** The Summary bullet lines as written (markers stripped), at most INDEX_BOUNDS.reportLines. */
  summaryLines: string[];
  /** The God Nodes list, at most INDEX_BOUNDS.hubs, with how many the report named. */
  godNodes: { items: { label: string; edges: number }[]; total: number };
  /** Thin communities the Summary line says it left out ("203 thin omitted"); null when it says none. */
  thin: number | null;
  /** The Summary's Extraction line as written, share by label ("87% EXTRACTED"); empty when there is none. */
  extraction: { label: string; percent: number }[];
  /** Bullets under "Import Cycles", counted even when a cycle line is too long to keep; null without the section. */
  importCycles: number | null;
  /** The date in the report's title "# Graph Report - {name} ({date})", the day of the build it describes. */
  reportDate: string | null;
}

function countBefore(line: string, word: RegExp): number | null {
  const found = word.exec(line);
  if (!found) return null;
  const n = Number(found[1].replace(/,/g, ''));
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * The Summary counts and the God Nodes of a GRAPH_REPORT.md. A line longer than INDEX_BOUNDS.reportLineChars
 * is dropped before anything reads it (the real report has a line over 5 KB), so neither list can carry it.
 */
export function liftGraphReport(text: string): GraphReportLift {
  const summaryLines: string[] = [];
  const godItems: { label: string; edges: number }[] = [];
  let godTotal = 0;
  let counts: GraphReportLift['counts'] = null;
  let thin: number | null = null;
  const extraction: GraphReportLift['extraction'] = [];
  let importCycles: number | null = null;
  let reportDate: string | null = null;
  let section: 'summary' | 'god' | 'cycles' | 'other' = 'other';
  for (const raw of text.split('\n')) {
    if (raw.length > INDEX_BOUNDS.reportLineChars) {
      // A cycle is one bullet however long: count it without ever reading the text.
      if (section === 'cycles' && /^\s*[-*]\s+\S/.test(raw.slice(0, 16))) importCycles = (importCycles ?? 0) + 1;
      continue;
    }
    const line = raw.replace(/\r$/, '');
    if (reportDate === null && section === 'other') {
      const title = /^#\s+.*\((\d{4}-\d{2}-\d{2})\)\s*$/.exec(line);
      if (title) reportDate = title[1];
    }
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      const name = heading[1].trim().toLowerCase();
      section = name.startsWith('summary')
        ? 'summary'
        : name.startsWith('god nodes')
          ? 'god'
          : name.startsWith('import cycles')
            ? 'cycles'
            : 'other';
      if (section === 'cycles' && importCycles === null) importCycles = 0;
      continue;
    }
    if (section === 'cycles') {
      if (/^\s*[-*]\s+\S/.test(line) && /cycle|->/i.test(line)) importCycles = (importCycles ?? 0) + 1;
    } else if (section === 'summary') {
      const bullet = /^\s*[-*]\s+(.*\S)\s*$/.exec(line);
      if (!bullet) continue;
      if (summaryLines.length < INDEX_BOUNDS.reportLines) summaryLines.push(bullet[1]);
      if (/^extraction\s*:/i.test(bullet[1])) {
        for (const found of bullet[1].matchAll(/(\d{1,3})%\s+([A-Za-z_]+)/g)) {
          if (extraction.length < 4) extraction.push({ label: found[2].toUpperCase(), percent: Number(found[1]) });
        }
        continue;
      }
      const thinCount = countBefore(bullet[1], /(\d[\d,]*)\s+thin\b/i);
      if (thin === null && thinCount !== null) thin = thinCount;
      const nodes = countBefore(bullet[1], /(\d[\d,]*)\s+nodes?\b/i);
      if (counts === null && nodes !== null) {
        counts = {
          nodes,
          edges: countBefore(bullet[1], /(\d[\d,]*)\s+(?:edges?|links?)\b/i),
          communities: countBefore(bullet[1], /(\d[\d,]*)\s+communit/i),
        };
      }
    } else if (section === 'god') {
      const item = /^\s*\d+\.\s*`?(.+?)`?\s+-\s+(\d[\d,]*)\s+(?:edges?|links?|connections?)\b/i.exec(line);
      if (!item) continue;
      godTotal += 1;
      if (godItems.length < INDEX_BOUNDS.hubs) {
        godItems.push({ label: cut(item[1].trim(), INDEX_BOUNDS.labelChars), edges: Number(item[2].replace(/,/g, '')) });
      }
    }
  }
  return { counts, summaryLines, godNodes: { items: godItems, total: godTotal }, thin, extraction, importCycles, reportDate };
}

// ---------------------------------------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------------------------------------

export interface BuildStatus {
  /** `ok`, `failed`, `running` or whatever word the file holds. */
  state: string | null;
  exitCode: number | null;
  durationMs: number | null;
  headAtBuild: string | null;
  at: string | null;
}

export interface GraphSummary {
  /** Counts the page shows; null when none could be read ("counts not read"). */
  counts: { nodes: number; links: number | null; communities: number | null } | null;
  /** Where the counts came from. */
  countsFrom: 'report' | 'scan' | null;
  /** True when counts were read (from the report or the scan); false reads as "counts not read". */
  countsRead: boolean;
  /** The most connected nodes, at most INDEX_BOUNDS.hubs; the report's God Nodes when it has them, else the scan's. */
  hubs: GraphHub[];
  /** Thin communities the report left out of its list; null when it does not say. */
  thinCommunities: number | null;
  /** Import cycles the report lists; null when it has no such section. */
  importCycles: number | null;
  /** How the edges were found, the report's Extraction shares as written; empty when it has none. */
  extraction: { label: string; percent: number }[];
  /** The day the report was written for, i.e. the last build that produced one; null without a report title date. */
  reportDate: string | null;
  reportLines: string[];
  status: BuildStatus | null;
  /** The commit graph.json says it was built at, when it is a hex commit id. */
  builtAtCommit: string | null;
  /** Commits between builtAtCommit and HEAD; null when unknown or git failed. */
  commitsBehind: number | null;
  /** Files that could not be read or parsed, by path. */
  unreadable: { path: string; reason: 'invalid' | 'read-failed' | 'too-large' }[];
  /** Files in graphs/ that were only stat'ed: named and sized, never read or sent. */
  notSent: { path: string; sizeBytes: number }[];
  notSentTotal: number;
}

/** A graph artifact as the snapshot knows it. */
export interface GraphArtifactRef {
  path: string;
  sizeBytes: number;
  fileClass: FileClass;
}

export interface IndexSummary {
  /** The graph summary for the files under `.planning/graphs/`; cached per path, size and snapshot read time. */
  graph(artifacts: readonly GraphArtifactRef[], readAt: string): Promise<GraphSummary>;
}

export interface IndexSummaryDeps {
  /** The live filesystem, or a getter for it; null answers every read as failed. */
  fs: PlanningFilesystem | null | (() => PlanningFilesystem | null);
  /** null skips the commits-behind figure. */
  git: GitRunner | null;
  /** Absolute project root, the git working directory. */
  root: string;
}

const COMMIT_RE = /^[0-9a-f]{7,40}$/;

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function commitOrNull(value: unknown): string | null {
  return typeof value === 'string' && COMMIT_RE.test(value.trim()) ? value.trim() : null;
}

function statusOf(data: Record<string, unknown>): BuildStatus {
  const text = (key: string, max: number): string | null => {
    const value = Object.hasOwn(data, key) ? data[key] : undefined;
    return typeof value === 'string' && value.trim() !== '' ? cut(value.trim(), max) : null;
  };
  const num = (key: string): number | null => (Object.hasOwn(data, key) ? numberOrNull(data[key]) : null);
  return {
    state: text('status', 24),
    exitCode: num('exit_code'),
    durationMs: num('duration_ms'),
    headAtBuild: commitOrNull(Object.hasOwn(data, 'head_at_build') ? data.head_at_build : undefined),
    at: text('ts', 40),
  };
}

type Read = { ok: true; bytes: Uint8Array } | { ok: false };

export function createIndexSummary(deps: IndexSummaryDeps): IndexSummary {
  const cache = new Map<string, Promise<unknown>>();

  const filesystem = (): PlanningFilesystem | null => (typeof deps.fs === 'function' ? deps.fs() : deps.fs);

  /** Runs `work` once per key; a failure is a value, so a rejected promise is never cached. */
  const once = <T>(key: string, work: () => Promise<T>): Promise<T> => {
    const held = cache.get(key);
    if (held) return held as Promise<T>;
    const started = work();
    cache.set(key, started);
    return started;
  };

  async function readWithin(path: string): Promise<Read> {
    const fs = filesystem();
    if (!fs || !fs.readBytesWithin) return { ok: false };
    try {
      const { bytes } = await fs.readBytesWithin('.planning', path);
      return { ok: true, bytes };
    } catch {
      return { ok: false };
    }
  }

  async function commitsBehind(commit: string | null): Promise<number | null> {
    if (commit === null || deps.git === null) return null;
    try {
      const out = await deps.git(
        ['-c', 'core.fsmonitor=false', '--no-pager', 'rev-list', '--count', `${commit}..HEAD`, '--'],
        { cwd: deps.root },
      );
      const line = String(out).trim();
      return /^\d{1,9}$/.test(line) ? Number(line) : null;
    } catch {
      return null;
    }
  }

  async function graph(artifacts: readonly GraphArtifactRef[], readAt: string): Promise<GraphSummary> {
    const keyOf = (a: GraphArtifactRef): string => `${a.path}\0${a.sizeBytes}\0${readAt}`;
    const report = artifacts.find((a) => baseName(a.path) === 'GRAPH_REPORT.md');
    const statusFile = artifacts.find((a) => baseName(a.path) === '.last-build-status.json');
    const graphFile = artifacts.find((a) => baseName(a.path) === 'graph.json');
    const unreadable: GraphSummary['unreadable'] = [];

    // Tier 1: the report, only when it is a normal text file.
    let lifted: GraphReportLift | null = null;
    if (report && report.fileClass === 'text') {
      lifted = await once(keyOf(report), async () => {
        const read = await readWithin(report.path);
        return read.ok ? liftGraphReport(decoder.decode(read.bytes)) : null;
      });
      if (lifted === null) unreadable.push({ path: report.path, reason: 'read-failed' });
    }

    // Tier 2: the last build status.
    let status: BuildStatus | null = null;
    if (statusFile && statusFile.fileClass === 'text') {
      const parsed = await once(keyOf(statusFile), async () => {
        const read = await readWithin(statusFile.path);
        if (!read.ok) return 'read-failed' as const;
        try {
          const value: unknown = JSON.parse(decoder.decode(read.bytes));
          if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'invalid' as const;
          return statusOf(value as Record<string, unknown>);
        } catch {
          return 'invalid' as const;
        }
      });
      if (typeof parsed === 'string') unreadable.push({ path: statusFile.path, reason: parsed });
      else status = parsed;
    }

    // Tier 3: graph.json, under the cap. With counts and hubs from the report only built_at_commit is wanted.
    const reportHasEverything = lifted !== null && lifted.counts !== null && lifted.godNodes.items.length > 0;
    let scan: GraphScan | null = null;
    if (graphFile && (graphFile.fileClass === 'text' || graphFile.fileClass === 'large')) {
      if (graphFile.sizeBytes > GRAPH_READ_CAP_BYTES) {
        if (!reportHasEverything) unreadable.push({ path: graphFile.path, reason: 'too-large' });
      } else {
        const elements = !reportHasEverything;
        scan = await once(`${keyOf(graphFile)}\0${elements ? 'full' : 'commit'}`, async () => {
          const read = await readWithin(graphFile.path);
          if (!read.ok || read.bytes.length > GRAPH_READ_CAP_BYTES) return null;
          return scanGraphElements(read.bytes, { elements });
        });
        if (scan === null) unreadable.push({ path: graphFile.path, reason: 'read-failed' });
        // Cut off mid-element (a concurrent rewrite) or not JSON: nothing is taken from it, and the next refresh reads again.
        else if (elements && !scan.countsRead) unreadable.push({ path: graphFile.path, reason: 'invalid' });
      }
    }

    let counts: GraphSummary['counts'] = null;
    let countsFrom: GraphSummary['countsFrom'] = null;
    let hubs: GraphHub[] = [];
    if (lifted !== null && lifted.counts !== null) {
      counts = { nodes: lifted.counts.nodes, links: lifted.counts.edges, communities: lifted.counts.communities };
      countsFrom = 'report';
    } else if (scan !== null && scan.countsRead) {
      counts = { nodes: scan.nodes, links: scan.links, communities: null };
      countsFrom = 'scan';
    }
    if (lifted !== null && lifted.godNodes.items.length > 0) {
      hubs = lifted.godNodes.items.slice(0, INDEX_BOUNDS.hubs).map((n) => ({ id: n.label, label: null, degree: n.edges }));
    } else if (scan !== null && scan.countsRead) {
      hubs = scan.hubs;
    }

    const builtAtCommit = scan !== null ? commitOrNull(scan.builtAtCommit) : null;
    const behind = await commitsBehind(builtAtCommit);

    const named = new Set([report, statusFile, graphFile].filter((a): a is GraphArtifactRef => a !== undefined));
    const others = artifacts.filter((a) => !named.has(a));
    const unnamedReads = [report, statusFile].filter(
      (a): a is GraphArtifactRef => a !== undefined && a.fileClass !== 'text',
    );
    const stated = [...others, ...unnamedReads].map((a) => ({ path: cut(a.path, INDEX_BOUNDS.labelChars), sizeBytes: a.sizeBytes }));

    return {
      counts,
      countsFrom,
      countsRead: counts !== null,
      hubs,
      thinCommunities: lifted ? lifted.thin : null,
      importCycles: lifted ? lifted.importCycles : null,
      extraction: lifted ? lifted.extraction : [],
      reportDate: lifted ? lifted.reportDate : null,
      reportLines: lifted ? lifted.summaryLines : [],
      status,
      builtAtCommit,
      commitsBehind: behind,
      unreadable,
      notSent: stated.slice(0, INDEX_BOUNDS.reportLines),
      notSentTotal: stated.length,
    };
  }

  return { graph };
}
