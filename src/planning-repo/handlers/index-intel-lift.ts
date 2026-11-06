// The bounded summaries of the intel and graph files (Phase 11, 11-13, VIEW-19, D-04, RESEARCH C5 and C14).
// A machine-written intel file can be any size and any shape, and the Indexes page must never show a dump of
// it. Each file kind lifts to a short summary (lists capped by INDEX_BOUNDS, every cut list keeping its total
// so the page can say '{shown} of {n}'), and `digestOf` turns the summary into a body of labels under 2 KB.
// The raw object is never kept: only strings cut to a label length, counts and the capped lists leave here.
//
// Author keys are read through Object.hasOwn and plain-object checks, never `obj.key` on an unknown value
// (tryParseJson already strips prototype keys; this is the second guard). No Node import.
import { INDEX_BOUNDS } from '../../server/index-bounds.ts';

export type IntelKind =
  | 'stack'
  | 'file-roles'
  | 'api-map'
  | 'dependency-graph'
  | 'arch-decisions'
  | 'synthesis'
  | 'ingest-doc'
  | 'stamp'
  | 'unknown';

/** A list cut to its bound: what is shown and how many there were. */
export interface Bounded<T> {
  items: T[];
  total: number;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface StackSummary {
  kind: 'stack';
  languages: Bounded<string>;
  frameworks: Bounded<string>;
  tools: Bounded<string>;
  contentFormats: Bounded<string>;
  buildSystem: string | null;
  testFramework: string | null;
  packageManager: string | null;
}

export interface FileRoleGroup {
  folder: string;
  files: { name: string; type: string | null }[];
}

export interface FileRolesSummary {
  kind: 'file-roles';
  total: number;
  types: Bounded<CountRow>;
  /** Up to INDEX_BOUNDS.paths paths in file order, grouped by folder. */
  groups: FileRoleGroup[];
  shown: number;
}

export interface ApiRoute {
  method: string;
  path: string;
  description: string | null;
  file: string | null;
}

export interface ApiMapSummary {
  kind: 'api-map';
  total: number;
  methods: Bounded<CountRow>;
  routes: ApiRoute[];
  shown: number;
}

export interface DependencyRow {
  name: string;
  version: string | null;
  type: string | null;
  usedBy: number;
}

export interface DependencyGraphSummary {
  kind: 'dependency-graph';
  total: number;
  production: number;
  development: number;
  other: number;
  dependencies: DependencyRow[];
  shown: number;
}

export interface ArchDecisionsSummary {
  kind: 'arch-decisions';
  keys: Bounded<string>;
  /** overview.pattern split on '->', each layer as written. */
  layers: string[];
}

/** The file's own conflict words (RESEARCH C5): blockers, competing variants, auto-resolved. */
export interface ConflictBuckets {
  blockers: number;
  competing: number;
  autoResolved: number;
}

export interface SynthesisSummary {
  kind: 'synthesis';
  /** Documents synthesized, when the file says so; null when it does not. */
  documents: number | null;
  /** How many classification types the file counts; null when it counts none. */
  classifications: number | null;
  /** null when the summary line could not be read. */
  conflicts: ConflictBuckets | null;
}

export interface IngestDocSummary {
  kind: 'ingest-doc';
  entries: number;
  locked: number;
  proposed: number;
}

export interface StampSummary {
  kind: 'stamp';
  date: string | null;
}

export interface UnknownSummary {
  kind: 'unknown';
  /** Top-level key names (or heading names for a markdown file) only, never values. */
  keys: Bounded<string>;
}

export type IntelSummary =
  | StackSummary
  | FileRolesSummary
  | ApiMapSummary
  | DependencyGraphSummary
  | ArchDecisionsSummary
  | SynthesisSummary
  | IngestDocSummary
  | StampSummary
  | UnknownSummary;

const DECISION_FILES = new Set(['decisions.md', 'requirements.md', 'constraints.md', 'context.md']);

/** The intel kind of a file by its name alone (gsd-intel-updater.md schemas; gsd-doc-synthesizer.md family). */
export function intelKindOf(fileName: string): IntelKind {
  const name = fileName.slice(fileName.lastIndexOf('/') + 1);
  switch (name.toLowerCase()) {
    case 'stack.json':
      return 'stack';
    case 'file-roles.json':
      return 'file-roles';
    case 'api-map.json':
      return 'api-map';
    case 'dependency-graph.json':
      return 'dependency-graph';
    case 'arch-decisions.json':
      return 'arch-decisions';
    case '.last-refresh.json':
      return 'stamp';
    case 'synthesis.md':
      return 'synthesis';
    default:
      return DECISION_FILES.has(name.toLowerCase()) ? 'ingest-doc' : 'unknown';
  }
}

// ---------------------------------------------------------------------------------------------------------
// Guarded readers
// ---------------------------------------------------------------------------------------------------------

type Rec = Record<string, unknown>;

export function isRec(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function own(rec: Rec, key: string): unknown {
  return Object.hasOwn(rec, key) ? rec[key] : undefined;
}

/** A string cut to `max` characters, or null for anything that is not a non-empty string. */
export function label(value: unknown, max: number = INDEX_BOUNDS.labelChars): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function boundedLabels(value: unknown, cap: number): Bounded<string> {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const items: string[] = [];
  let total = 0;
  for (const entry of source) {
    const text = label(entry, INDEX_BOUNDS.listItemChars);
    if (text === null) continue;
    total += 1;
    if (items.length < cap) items.push(text);
  }
  return { items, total };
}

/** The `entries` object of an intel file, or the file itself when it has no `entries`. */
function entriesOf(value: unknown): Rec {
  if (!isRec(value)) return {};
  const entries = own(value, 'entries');
  return isRec(entries) ? entries : {};
}

/** Counts by label, most frequent first (ties by label), cut to the split-row bound with the total kept. */
function countRows(counts: Map<string, number>): Bounded<CountRow> {
  const rows = [...counts.entries()]
    .map(([name, count]) => ({ label: name, count }))
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  return { items: rows.slice(0, INDEX_BOUNDS.splitRows), total: rows.length };
}

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

// ---------------------------------------------------------------------------------------------------------
// One extractor per kind
// ---------------------------------------------------------------------------------------------------------

function extractStack(value: unknown): StackSummary {
  const rec = isRec(value) ? value : {};
  const list = (key: string): Bounded<string> => boundedLabels(own(rec, key), INDEX_BOUNDS.listItems);
  return {
    kind: 'stack',
    languages: list('languages'),
    frameworks: list('frameworks'),
    tools: list('tools'),
    contentFormats: list('content_formats'),
    buildSystem: label(own(rec, 'build_system')),
    testFramework: label(own(rec, 'test_framework')),
    packageManager: label(own(rec, 'package_manager')),
  };
}

function folderOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? '.' : path.slice(0, cut);
}

function extractFileRoles(value: unknown): FileRolesSummary {
  const entries = entriesOf(value);
  const types = new Map<string, number>();
  const groups = new Map<string, FileRoleGroup>();
  let total = 0;
  let shown = 0;
  for (const key of Object.keys(entries)) {
    total += 1;
    const entry = entries[key];
    const type = isRec(entry) ? label(own(entry, 'type'), 40) : null;
    bump(types, type ?? 'untyped');
    if (shown >= INDEX_BOUNDS.paths) continue;
    const path = label(key);
    if (path === null) continue;
    shown += 1;
    const folder = folderOf(path);
    let group = groups.get(folder);
    if (!group) {
      group = { folder, files: [] };
      groups.set(folder, group);
    }
    group.files.push({ name: path.slice(path.lastIndexOf('/') + 1), type });
  }
  return { kind: 'file-roles', total, types: countRows(types), groups: [...groups.values()], shown };
}

function extractApiMap(value: unknown): ApiMapSummary {
  const entries = entriesOf(value);
  const methods = new Map<string, number>();
  const routes: ApiRoute[] = [];
  let total = 0;
  for (const key of Object.keys(entries)) {
    total += 1;
    const entry = entries[key];
    const rec = isRec(entry) ? entry : {};
    const keyMethod = key.includes(' ') ? key.slice(0, key.indexOf(' ')) : '';
    const keyPath = key.includes(' ') ? key.slice(key.indexOf(' ') + 1) : key;
    const method = (label(own(rec, 'method'), 12) ?? label(keyMethod, 12) ?? 'ANY').toUpperCase();
    bump(methods, method);
    if (routes.length < INDEX_BOUNDS.routes) {
      routes.push({
        method,
        path: label(own(rec, 'path')) ?? label(keyPath) ?? '',
        description: label(own(rec, 'description'), 160),
        file: label(own(rec, 'file')),
      });
    }
  }
  return { kind: 'api-map', total, methods: countRows(methods), routes, shown: routes.length };
}

function extractDependencyGraph(value: unknown): DependencyGraphSummary {
  const entries = entriesOf(value);
  let production = 0;
  let development = 0;
  let other = 0;
  const rows: DependencyRow[] = [];
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    const rec = isRec(entry) ? entry : {};
    const type = label(own(rec, 'type'), 40);
    if (type === 'production') production += 1;
    else if (type === 'development') development += 1;
    else other += 1;
    const usedBy = own(rec, 'used_by');
    rows.push({
      name: label(key) ?? '',
      version: label(own(rec, 'version'), 40),
      type,
      usedBy: Array.isArray(usedBy) ? usedBy.length : 0,
    });
  }
  rows.sort((a, b) => b.usedBy - a.usedBy || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const dependencies = rows.slice(0, INDEX_BOUNDS.dependencies);
  return {
    kind: 'dependency-graph',
    total: rows.length,
    production,
    development,
    other,
    dependencies,
    shown: dependencies.length,
  };
}

function extractArchDecisions(value: unknown): ArchDecisionsSummary {
  const entries = entriesOf(value);
  const names = Object.keys(entries);
  const keys: Bounded<string> = { items: [], total: 0 };
  for (const name of names) {
    const text = label(name, 48);
    if (text === null) continue;
    keys.total += 1;
    if (keys.items.length < INDEX_BOUNDS.archKeys) keys.items.push(text);
  }
  const overview = Object.hasOwn(entries, 'overview') ? entries.overview : undefined;
  const pattern = isRec(overview) ? own(overview, 'pattern') : undefined;
  const layers: string[] = [];
  if (typeof pattern === 'string') {
    for (const part of pattern.split('->')) {
      const layer = label(part, 40);
      if (layer !== null && layers.length < INDEX_BOUNDS.layers) layers.push(layer);
    }
  }
  return { kind: 'arch-decisions', keys, layers };
}

const STAMP_KEYS = ['updated_at', 'ts', 'timestamp', 'last_refresh', 'refreshed_at', 'date'];

function extractStamp(value: unknown): StampSummary {
  const rec = isRec(value) ? value : {};
  const meta = own(rec, '_meta');
  const sources = isRec(meta) ? [rec, meta] : [rec];
  for (const source of sources) {
    for (const key of STAMP_KEYS) {
      const text = label(own(source, key), 40);
      if (text !== null) return { kind: 'stamp', date: text };
    }
  }
  return { kind: 'stamp', date: null };
}

function extractUnknownJson(value: unknown): UnknownSummary {
  const keys: Bounded<string> = { items: [], total: 0 };
  if (isRec(value)) {
    for (const name of Object.keys(value)) {
      const text = label(name, 48);
      if (text === null) continue;
      keys.total += 1;
      if (keys.items.length < INDEX_BOUNDS.unknownKeys) keys.items.push(text);
    }
  }
  return { kind: 'unknown', keys };
}

function numberAt(text: string, pattern: RegExp): number | null {
  const found = pattern.exec(text);
  if (!found) return null;
  const n = Number(found[1]);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * SYNTHESIS.md (gsd-doc-synthesizer.md): the document count, the per-type counts and the conflicts line. The
 * conflicts line is read in the file's own words: `Conflicts: N blockers, N competing-variants, N
 * auto-resolved` (the return message says `variants`). A line the pattern cannot read gives no buckets (C5).
 */
function extractSynthesis(text: string): SynthesisSummary {
  const documents =
    numberAt(text, /^\s*(?:[-*]\s*)?Docs synthesized:\s*(\d+)/im) ??
    numberAt(text, /^\s*(?:[-*]\s*)?Documents?(?: synthesized)?:\s*(\d+)/im);
  const types = new Set<string>();
  const typeRow = /^\s*[-*]\s*(ADR|SPEC|PRD|DOC|UNKNOWN)s?\s*[:x×-]\s*(\d+)\b/gim;
  for (let found = typeRow.exec(text); found !== null; found = typeRow.exec(text)) types.add(found[1].toUpperCase());
  const conflictLine = /^\s*(?:[-*]\s*)?Conflicts:\s*(.*)$/im.exec(text);
  let conflicts: ConflictBuckets | null = null;
  if (conflictLine) {
    const line = conflictLine[1].slice(0, 400);
    const blockers = numberAt(line, /(\d+)\s+blockers?\b/i);
    const competing = numberAt(line, /(\d+)\s+(?:competing[- ]variants?|variants?|competing)\b/i);
    const autoResolved = numberAt(line, /(\d+)\s+auto[- ]resolved\b/i);
    if (blockers !== null && competing !== null && autoResolved !== null) {
      conflicts = { blockers, competing, autoResolved };
    }
  }
  return { kind: 'synthesis', documents, classifications: types.size > 0 ? types.size : null, conflicts };
}

/** decisions.md, requirements.md, constraints.md and context.md: a heading count and status counts only. */
function extractIngestDoc(text: string): IngestDocSummary {
  let entries = 0;
  let locked = 0;
  let proposed = 0;
  for (const line of text.split('\n')) {
    if (/^##\s+\S/.test(line) && !line.startsWith('###')) entries += 1;
    const status = /^\s*[-*]\s*status:\s*(\w+)/i.exec(line);
    if (status) {
      const word = status[1].toLowerCase();
      if (word === 'locked') locked += 1;
      else if (word === 'proposed') proposed += 1;
    }
  }
  return { kind: 'ingest-doc', entries, locked, proposed };
}

/** Any other markdown file under intel or graphs: its heading names only. */
function extractUnknownMarkdown(text: string): UnknownSummary {
  const keys: Bounded<string> = { items: [], total: 0 };
  for (const line of text.split('\n')) {
    const heading = /^#{1,3}\s+(\S.*)$/.exec(line);
    if (!heading) continue;
    const name = label(heading[1], 48);
    if (name === null) continue;
    keys.total += 1;
    if (keys.items.length < INDEX_BOUNDS.unknownKeys) keys.items.push(name);
  }
  return { kind: 'unknown', keys };
}

/**
 * The bounded summary of one file. `value` is the parsed JSON object for a .json file and the file's text for a
 * .md file. Never throws on a value of the wrong shape: a field that is not what the schema says reads as absent.
 */
export function extractIntel(kind: IntelKind, value: unknown): IntelSummary {
  if (typeof value === 'string') {
    if (kind === 'synthesis') return extractSynthesis(value);
    if (kind === 'ingest-doc') return extractIngestDoc(value);
    return extractUnknownMarkdown(value);
  }
  switch (kind) {
    case 'stack':
      return extractStack(value);
    case 'file-roles':
      return extractFileRoles(value);
    case 'api-map':
      return extractApiMap(value);
    case 'dependency-graph':
      return extractDependencyGraph(value);
    case 'arch-decisions':
      return extractArchDecisions(value);
    case 'stamp':
      return extractStamp(value);
    default:
      return extractUnknownJson(value);
  }
}

// ---------------------------------------------------------------------------------------------------------
// The digest: labels only, under INDEX_BOUNDS.digestBytes
// ---------------------------------------------------------------------------------------------------------

const encoder = new TextEncoder();
/** One digest line never runs longer than this, so a long key list cannot crowd out the lines after it. */
const DIGEST_LINE_CHARS = 400;

function of(shown: number, total: number, noun: string): string {
  return `${shown} of ${total} ${noun}`;
}

function joined(list: Bounded<string>): string {
  return list.items.join(', ');
}

function linesOf(summary: IntelSummary): string[] {
  switch (summary.kind) {
    case 'stack': {
      const out = ['Stack'];
      if (summary.languages.items.length) out.push(`Languages: ${joined(summary.languages)}`);
      if (summary.frameworks.items.length) out.push(`Frameworks: ${joined(summary.frameworks)}`);
      if (summary.tools.items.length) out.push(`Tools: ${joined(summary.tools)}`);
      if (summary.contentFormats.items.length) out.push(`Content formats: ${joined(summary.contentFormats)}`);
      if (summary.buildSystem) out.push(`Build system: ${summary.buildSystem}`);
      if (summary.testFramework) out.push(`Test framework: ${summary.testFramework}`);
      if (summary.packageManager) out.push(`Package manager: ${summary.packageManager}`);
      return out;
    }
    case 'file-roles': {
      const out = ['File roles', of(summary.shown, summary.total, 'entries')];
      for (const row of summary.types.items) out.push(`${row.label}: ${row.count}`);
      for (const group of summary.groups) out.push(`${group.folder}: ${group.files.map((f) => f.name).join(', ')}`);
      return out;
    }
    case 'api-map': {
      const out = ['API map', of(summary.shown, summary.total, 'routes')];
      for (const row of summary.methods.items) out.push(`${row.label}: ${row.count}`);
      for (const route of summary.routes) out.push(`${route.method} ${route.path}`);
      return out;
    }
    case 'dependency-graph': {
      const out = [
        'Dependency graph',
        `Production: ${summary.production}`,
        `Development: ${summary.development}`,
        of(summary.shown, summary.total, 'dependencies'),
      ];
      for (const row of summary.dependencies) out.push(`${row.name} (used by ${row.usedBy})`);
      return out;
    }
    case 'arch-decisions': {
      const out = ['Architecture decisions', `Keys: ${summary.keys.items.join(', ')}`];
      if (summary.layers.length) out.push(`Layers: ${summary.layers.join(' -> ')}`);
      return out;
    }
    case 'synthesis': {
      const out = ['Synthesis'];
      if (summary.documents !== null) out.push(`Documents: ${summary.documents}`);
      if (summary.classifications !== null) out.push(`Classifications: ${summary.classifications}`);
      if (summary.conflicts) {
        const { blockers, competing, autoResolved } = summary.conflicts;
        out.push(`Conflicts: ${blockers} blockers, ${competing} competing variants, ${autoResolved} auto-resolved`);
      }
      return out;
    }
    case 'ingest-doc':
      return ['Ingested document', `Entries: ${summary.entries}`, `Locked: ${summary.locked}`, `Proposed: ${summary.proposed}`];
    case 'stamp':
      return summary.date ? ['Refresh stamp', `Date: ${summary.date}`] : ['Refresh stamp'];
    default:
      return ['Index file', `Keys: ${summary.keys.items.join(', ')}`];
  }
}

/** The label-only body of a summary: one label per line, cut to INDEX_BOUNDS.digestBytes at a line boundary. */
export function digestOf(summary: IntelSummary): string {
  const kept: string[] = [];
  let bytes = 0;
  for (const full of linesOf(summary)) {
    const line = full.length > DIGEST_LINE_CHARS ? `${full.slice(0, DIGEST_LINE_CHARS - 1)}…` : full;
    const cost = encoder.encode(line).length + 1;
    if (bytes + cost > INDEX_BOUNDS.digestBytes) break;
    kept.push(line);
    bytes += cost;
  }
  return kept.join('\n');
}
