// The PATTERNS pattern-map composer (quick-260930-wfs, sketch 013 B): a pure `ViewInput` ->
// `ComposedPatternMap` projection over `structured.map` (built by
// `src/planning-repo/handlers/pattern-map.ts`). It merges File Classification, Pattern
// Assignments and No Analog Found into one row per file, resolves the House rules to the files
// they touch, and lists everything the map could not place. No DOM, no rendering —
// `pattern-map-components.tsx` is the only consumer. Returns `null` when the map is missing or
// classifies no file, and the page then keeps the pre-existing promoted-block view (T-wfs-04).
// T-wfs-03: author-written paths and globs are matched by hand-written string logic — this module
// never builds a regular expression from document text.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type { PatternMap } from '../../planning-repo/handlers/pattern-map.ts';
import type { ViewInput } from './manifest.ts';

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export type PatternQuality = 'exact' | 'role' | 'partial' | 'none';

/** The document-content tone vocabulary the map draws from — never the parse-degradation tones
 * (`destructive`/`warning`), which stay reserved for the artifact-parse badge alone. */
export type PatternTone = 'complete' | 'quiet' | 'in-flight' | 'missing';

/** The only place a match quality becomes a tone: exact -> complete, role match -> quiet,
 * partial -> in-flight, no analog -> missing. */
export const QUALITY_TONE: Record<PatternQuality, PatternTone> = {
  exact: 'complete',
  role: 'quiet',
  partial: 'in-flight',
  none: 'missing',
};

export const QUALITY_CHIP: Record<PatternQuality, string> = {
  exact: 'Exact',
  role: 'Role',
  partial: 'Partial',
  none: 'New',
};

export const QUALITY_LABEL: Record<PatternQuality, string> = {
  exact: 'Exact',
  role: 'Role match',
  partial: 'Partial',
  none: 'New ground',
};

export const QUALITY_ORDER: readonly PatternQuality[] = ['exact', 'role', 'partial', 'none'];

export const UNPLACED_AREA = 'Outside the file table';

export type AnalogShort =
  | { kind: 'none' }
  | { kind: 'itself' }
  | { kind: 'path'; name: string }
  | { kind: 'text'; text: string };

export interface ComposedPatternRow {
  id: string;
  /** `file` = a File Classification row; `unplaced` = a No Analog entry or a Pattern Assignment
   * that matched no classified file. */
  origin: 'file' | 'unplaced';
  /** null for the quiet "Guidance" row of an assignment with no classified file. */
  quality: PatternQuality | null;
  tone: PatternTone;
  chip: string;
  qualityLabel: string;
  qualifier: string | null;
  role: string;
  name: string;
  dir: string;
  tag: string | null;
  analog: string;
  analogShort: AnalogShort;
  copyFrom: string | null;
  useInstead: string | null;
  reason: string | null;
  partNew: boolean;
  guidance: Block[];
  excerpts: number;
  ruleIds: string[];
  area: string;
}

export interface ComposedPatternRule {
  id: string;
  name: string;
  text: string | null;
  applyTo: string | null;
  source: string | null;
  excerpts: number;
  hits: string[];
  broad: boolean;
}

export interface ComposedPatternArea {
  label: string;
  rows: ComposedPatternRow[];
}

export interface ComposedPatternBackEntry {
  id: string;
  heading: string;
  count: number;
  blocks: Block[];
}

export interface ComposedPatternSourceOnly {
  label: string;
  targetId: string | null;
}

export interface ComposedPatternIntro {
  eyebrow: string;
  title: string | null;
  mapped: string | null;
  filesAnalyzed: { value: string; qualifier: string | null } | null;
  analogsFound: string | null;
  scope: string | null;
  scanned: string | null;
  counts: Record<PatternQuality, number>;
  total: number;
}

export interface ComposedPatternMap {
  intro: ComposedPatternIntro;
  notes: Block[];
  areas: ComposedPatternArea[];
  rows: ComposedPatternRow[];
  rules: ComposedPatternRule[];
  defaultSelection: string;
  backMatter: ComposedPatternBackEntry[];
  sourceOnly: ComposedPatternSourceOnly[];
}

// ---------------------------------------------------------------------------
// Defensive readers (an older server's payload must still compose or return null)
// ---------------------------------------------------------------------------

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

// ---------------------------------------------------------------------------
// Paths and matching
// ---------------------------------------------------------------------------

const MAX_EXPANSIONS = 64;

/** `a/{b,c}.ts` -> `a/b.ts`, `a/c.ts` (nested and repeated groups expand too), capped. */
function expandBraces(path: string): string[] {
  const open = path.indexOf('{');
  if (open === -1) return [path];
  const close = path.indexOf('}', open);
  if (close === -1) return [path];
  const head = path.slice(0, open);
  const tail = path.slice(close + 1);
  const out: string[] = [];
  for (const option of path.slice(open + 1, close).split(',')) {
    for (const rest of expandBraces(tail)) {
      out.push(head + option.trim() + rest);
      if (out.length >= MAX_EXPANSIONS) return out;
    }
  }
  return out;
}

function trimPathSuffix(path: string): string {
  let out = path;
  const colons = out.indexOf('::');
  if (colons !== -1) out = out.slice(0, colons);
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] === ':' && out[i + 1] >= '0' && out[i + 1] <= '9') {
      out = out.slice(0, i);
      break;
    }
  }
  return out;
}

/** Backticked tokens, brace-expanded, with any `::…` or `:<digit>…` suffix removed. */
export function pathsOf(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  let i = 0;
  while (i < text.length && out.length < MAX_EXPANSIONS) {
    const open = text.indexOf('`', i);
    if (open === -1) break;
    const close = text.indexOf('`', open + 1);
    if (close === -1) break;
    const token = text.slice(open + 1, close);
    i = close + 1;
    if (token.trim() === '') continue;
    for (const path of expandBraces(token)) out.push(trimPathSuffix(path.trim()));
  }
  return out;
}

function base(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const slash = trimmed.lastIndexOf('/');
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

/** Iterative wildcard match: `*` (and `**`) match any run of characters. No regular expression,
 * no recursion — worst case O(pattern × text). */
export function globMatch(pattern: string, text: string): boolean {
  let p = 0;
  let t = 0;
  let star = -1;
  let mark = 0;
  while (t < text.length) {
    if (p < pattern.length && pattern[p] === '*') {
      star = p;
      mark = t;
      p += 1;
    } else if (p < pattern.length && pattern[p] === text[t]) {
      p += 1;
      t += 1;
    } else if (star !== -1) {
      p = star + 1;
      mark += 1;
      t = mark;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') p += 1;
  return p === pattern.length;
}

/** Whether the author-written `ref` names any of the row's `paths`. */
export function refMatches(ref: string, paths: string[]): boolean {
  if (ref === '' || ref === '*') return false;
  return paths.some((path) => {
    if (path === ref) return true;
    if (path.endsWith(`/${ref}`)) return true;
    // The row names a shorter tail of a longer ref (`health/mod.rs` vs `backend/src/health/mod.rs`).
    if (ref.includes('/') && ref.endsWith(`/${path}`)) return true;
    if (ref.endsWith('/') && path.includes(ref)) return true;
    if (ref.includes('*') && globMatch(ref, path)) return true;
    if (!ref.includes('/') && base(path) === ref) return true;
    return false;
  });
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** The text inside the last trailing parenthetical, or null. */
function trailingParenthetical(text: string): string | null {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith(')')) return null;
  const open = trimmed.lastIndexOf('(');
  if (open === -1) return null;
  return trimmed.slice(open + 1, -1).trim();
}

/** The text with a trailing parenthetical (from its first `(`) removed. */
function withoutParenthetical(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith(')')) return trimmed;
  const open = trimmed.indexOf('(');
  return open <= 0 ? trimmed : trimmed.slice(0, open).trimEnd();
}

function firstSentence(text: string): string {
  const t = plain(text).replace(/\s+/g, ' ').trim();
  const limit = Math.min(t.length - 1, 169);
  for (let i = 19; i <= limit; i++) {
    if ((t[i] === '.' || t[i] === ';') && /\s/.test(t[i + 1] ?? '')) return t.slice(0, i + 1);
  }
  return t.length > 170 ? `${t.slice(0, 168)}…` : t;
}

export function qualityOf(cell: string): PatternQuality {
  const s = cell.replace(/\*/g, '').trim().toLowerCase();
  if (s.startsWith('no analog') || s.startsWith('none') || s.includes('n/a')) return 'none';
  if (s.startsWith('partial')) return 'partial';
  if (s.startsWith('role')) return 'role';
  if (s.startsWith('exact')) return 'exact';
  return 'role';
}

export function qualifierOf(cell: string): string | null {
  const s = cell.replace(/\*/g, '').trim();
  const open = s.indexOf('(');
  const close = s.lastIndexOf(')');
  if (open !== -1 && close > open) {
    const inner = s.slice(open + 1, close).trim();
    if (inner !== '') return inner;
  }
  const dash = s.indexOf('—');
  if (dash !== -1) {
    const tail = s.slice(dash + 1).trim();
    if (tail !== '') return tail;
  }
  return null;
}

function analogKeyOf(analog: string): string | null {
  const t = plain(analog).toLowerCase();
  if (t.startsWith('itself') || t.startsWith('same file') || t.startsWith('its ')) return 'itself';
  if (t.startsWith('none') || t.startsWith('n/a')) return null;
  return pathsOf(analog)[0] ?? null;
}

function analogShortOf(quality: PatternQuality, analog: string): AnalogShort {
  if (quality === 'none') return { kind: 'none' };
  const key = analogKeyOf(analog);
  if (key === 'itself') return { kind: 'itself' };
  if (key) return { kind: 'path', name: base(key) };
  return { kind: 'text', text: firstSentence(analog).slice(0, 60) };
}

/** A rule's short name: the heading minus a trailing parenthetical and any ` — …` tail. */
export function shortRuleName(heading: string): string {
  let name = withoutParenthetical(plain(heading));
  const dash = name.indexOf(' — ');
  if (dash !== -1) name = name.slice(0, dash);
  return name.trim();
}

function areaOfPath(path: string): string {
  const seg = path.split('/');
  if (seg[0] === 'test' || seg[0] === 'tests' || (seg[0] === 'backend' && seg[1] === 'tests')) return 'Tests';
  if (seg[0] === 'src') return seg.length > 2 ? seg.slice(0, 2).join('/') : 'src';
  if (seg[0] === 'frontend' || seg[0] === 'backend') return seg[0];
  return seg.length > 1 ? seg[0] : 'Other';
}

export function normalizeHeading(text: string): string {
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isBroad(applyTo: string | null, refs: string[]): boolean {
  if (refs.length === 0) return true;
  const lower = plain(applyTo ?? '').toLowerCase();
  return lower.includes('every') || lower.includes('all ');
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

interface Cls {
  group: string | null;
  file: string;
  role: string;
  analog: string;
  quality: string;
}
interface Assign {
  heading: string;
  analog: string | null;
  applyTo: string | null;
  useInstead: string | null;
  guidance: Block[];
  excerpts: number;
}
interface Shared {
  heading: string;
  source: string | null;
  applyTo: string | null;
  rule: string | null;
  excerpts: number;
}
interface NoAnalog {
  file: string;
  reason: string;
}

function blockCount(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) count += block.kind === 'list' ? block.items.length : 1;
  return count;
}

function headingIds(input: ViewInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 2) continue;
    const key = normalizeHeading(heading.text);
    if (!ids.has(key)) ids.set(key, heading.id);
  }
  for (const group of input.groups) {
    if (group.heading === null || group.id === null) continue;
    const key = normalizeHeading(group.heading);
    if (!ids.has(key)) ids.set(key, group.id);
  }
  return ids;
}

function idStartingWith(ids: Map<string, string>, prefix: string): string | null {
  for (const [key, id] of ids) if (key.startsWith(prefix)) return id;
  return null;
}

function emptyCounts(): Record<PatternQuality, number> {
  return { exact: 0, role: 0, partial: 0, none: 0 };
}

export function composePatternMap(input: ViewInput): ComposedPatternMap | null {
  const raw = input.structured?.map as Partial<PatternMap> | undefined | null;
  if (!raw || typeof raw !== 'object') return null;
  const classification = arrayOf<Cls>(raw.classification);
  if (classification.length === 0) return null;
  const assignments = arrayOf<Assign>(raw.assignments);
  const shared = arrayOf<Shared>(raw.shared);
  const noAnalog = arrayOf<NoAnalog>(raw.noAnalog);
  const meta = (raw.meta ?? {}) as Partial<PatternMap['meta']>;

  const usedAssignments = new Set<number>();
  const usedNoAnalog = new Set<number>();
  const assignmentPaths = assignments.map((a) => ({
    heading: pathsOf(stringOr(a.heading, '').split('(')[0]),
    applyTo: pathsOf(a.applyTo),
  }));
  const noAnalogPaths = noAnalog.map((n) => pathsOf(stringOr(n.file, '')));

  const fileRows: ComposedPatternRow[] = [];
  const rowPaths = new Map<string, string[]>();
  classification.forEach((entry, index) => {
    const fileCell = stringOr(entry.file, '');
    const cleanFile = plain(fileCell);
    const real = pathsOf(fileCell).filter((p) => p.includes('/') || p.includes('.'));
    const fps = real.length > 0 ? real : [cleanFile];
    const name = real.length > 0 ? real.map(base).join(', ') : withoutParenthetical(cleanFile) || cleanFile;
    const dir = real.length > 0 ? real[0].split('/').slice(0, -1).join('/') : '';
    const tag = trailingParenthetical(cleanFile);
    const qualityCell = stringOr(entry.quality, '');
    const quality = qualityOf(qualityCell);
    const analog = stringOr(entry.analog, '');

    const assignmentIndex = assignments.findIndex(
      (_, i) =>
        assignmentPaths[i].heading.some((ref) => refMatches(ref, fps)) ||
        assignmentPaths[i].applyTo.some((ref) => refMatches(ref, fps)),
    );
    const assignment = assignmentIndex === -1 ? null : assignments[assignmentIndex];
    if (assignmentIndex !== -1) usedAssignments.add(assignmentIndex);

    const noAnalogIndex = noAnalog.findIndex((n, i) => {
      const paths = noAnalogPaths[i];
      if (paths.length > 0) return paths.some((p) => refMatches(p, fps));
      const needle = plain(stringOr(n.file, '')).toLowerCase();
      return needle !== '' && cleanFile.toLowerCase().includes(needle);
    });
    const missing = noAnalogIndex === -1 ? null : noAnalog[noAnalogIndex];
    if (noAnalogIndex !== -1) usedNoAnalog.add(noAnalogIndex);

    const id = `f${index}`;
    rowPaths.set(id, fps);
    fileRows.push({
      id,
      origin: 'file',
      quality,
      tone: QUALITY_TONE[quality],
      chip: QUALITY_CHIP[quality],
      qualityLabel: QUALITY_LABEL[quality],
      qualifier: qualifierOf(qualityCell),
      role: plain(stringOr(entry.role, '')),
      name,
      dir,
      tag,
      analog,
      analogShort: analogShortOf(quality, analog),
      copyFrom: quality === 'none' ? null : (assignment?.analog ?? (analog === '' ? null : analog)),
      useInstead: assignment?.useInstead ?? null,
      reason: missing ? stringOr(missing.reason, '') || null : null,
      partNew: missing !== null && quality !== 'none',
      guidance: arrayOf<Block>(assignment?.guidance),
      excerpts: typeof assignment?.excerpts === 'number' ? assignment.excerpts : 0,
      ruleIds: [],
      area: stringOrNull(entry.group) ?? areaOfPath(fps[0]),
    });
  });

  // Rows the file table does not account for: nothing in the document is dropped silently.
  const unplaced: ComposedPatternRow[] = [];
  noAnalog.forEach((entry, index) => {
    if (usedNoAnalog.has(index)) return;
    const fileCell = stringOr(entry.file, '');
    const cleanFile = plain(fileCell);
    const real = pathsOf(fileCell).filter((p) => p.includes('/') || p.includes('.'));
    unplaced.push({
      id: `n${index}`,
      origin: 'unplaced',
      quality: 'none',
      tone: QUALITY_TONE.none,
      chip: QUALITY_CHIP.none,
      qualityLabel: QUALITY_LABEL.none,
      qualifier: null,
      role: '',
      name: real.length > 0 ? real.map(base).join(', ') : withoutParenthetical(cleanFile) || cleanFile,
      dir: real.length > 0 ? real[0].split('/').slice(0, -1).join('/') : '',
      tag: null,
      analog: '',
      analogShort: { kind: 'none' },
      copyFrom: null,
      useInstead: null,
      reason: stringOr(entry.reason, '') || null,
      partNew: false,
      guidance: [],
      excerpts: 0,
      ruleIds: [],
      area: UNPLACED_AREA,
    });
  });
  assignments.forEach((entry, index) => {
    if (usedAssignments.has(index)) return;
    const heading = stringOr(entry.heading, '');
    const paths = pathsOf(heading.split('(')[0]).filter((p) => p.includes('/') || p.includes('.'));
    const headingName = withoutParenthetical(plain(heading)) || plain(heading);
    unplaced.push({
      id: `a${index}`,
      origin: 'unplaced',
      quality: null,
      tone: 'quiet',
      chip: 'Guidance',
      qualityLabel: 'Guidance',
      qualifier: null,
      role: '',
      name: paths.length > 0 ? paths.map(base).join(', ') : headingName,
      dir: paths.length > 0 ? paths[0].split('/').slice(0, -1).join('/') : '',
      tag: null,
      analog: stringOr(entry.analog, ''),
      analogShort: { kind: 'none' },
      copyFrom: stringOrNull(entry.analog),
      useInstead: stringOrNull(entry.useInstead),
      reason: null,
      partNew: false,
      guidance: arrayOf<Block>(entry.guidance),
      excerpts: typeof entry.excerpts === 'number' ? entry.excerpts : 0,
      ruleIds: [],
      area: UNPLACED_AREA,
    });
  });

  const rows = [...fileRows, ...unplaced];

  const rules: ComposedPatternRule[] = shared.map((entry, index) => {
    const refs = pathsOf(entry.applyTo);
    const hits = refs.length === 0 ? [] : fileRows.filter((row) => refs.some((ref) => refMatches(ref, rowPaths.get(row.id) ?? []))).map((row) => row.id);
    return {
      id: `r${index}`,
      name: shortRuleName(stringOr(entry.heading, '')),
      text: stringOrNull(entry.rule),
      applyTo: stringOrNull(entry.applyTo),
      source: stringOrNull(entry.source),
      excerpts: typeof entry.excerpts === 'number' ? entry.excerpts : 0,
      hits,
      broad: isBroad(stringOrNull(entry.applyTo), refs),
    };
  });
  for (const rule of rules) {
    const hit = new Set(rule.hits);
    for (const row of fileRows) if (hit.has(row.id)) row.ruleIds.push(rule.id);
  }

  const areas: ComposedPatternArea[] = [];
  for (const row of rows) {
    let area = areas.find((a) => a.label === row.area);
    if (!area) areas.push((area = { label: row.area, rows: [] }));
    area.rows.push(row);
  }
  // The unplaced area always closes the list, even when a classification group shares its name.
  areas.sort((a, b) => Number(a.label === UNPLACED_AREA) - Number(b.label === UNPLACED_AREA));

  const counts = emptyCounts();
  for (const row of fileRows) if (row.quality) counts[row.quality] += 1;

  const filesAnalyzedRaw = stringOrNull(meta.filesAnalyzed);
  let filesAnalyzed: ComposedPatternIntro['filesAnalyzed'] = null;
  if (filesAnalyzedRaw) {
    const text = plain(filesAnalyzedRaw);
    const space = text.search(/\s/);
    filesAnalyzed =
      space === -1
        ? { value: text, qualifier: null }
        : { value: text.slice(0, space), qualifier: text.slice(space).trim() || null };
  }
  const analogsRaw = stringOrNull(meta.analogsFound);
  const phase = stringOrNull(meta.phase);

  const backMatter: ComposedPatternBackEntry[] = arrayOf<{ heading?: unknown; blocks?: unknown }>(raw.other)
    .map((section, index) => ({
      id: `pattern-back-${index}`,
      heading: stringOr(section.heading, ''),
      blocks: arrayOf<Block>(section.blocks),
    }))
    .filter((section) => section.heading !== '' && section.blocks.length > 0)
    .map((section) => ({ ...section, count: blockCount(section.blocks) }));
  const noAnalogNote = arrayOf<Block>(raw.noAnalogNote);
  if (noAnalogNote.length > 0) {
    backMatter.push({
      id: `pattern-back-${backMatter.length}`,
      heading: 'No Analog Found',
      blocks: noAnalogNote,
      count: blockCount(noAnalogNote),
    });
  }

  const ids = headingIds(input);
  const sourceOnly: ComposedPatternSourceOnly[] = [];
  const excerpts = typeof raw.excerpts === 'number' ? raw.excerpts : 0;
  const assignmentsId = idStartingWith(ids, 'pattern assignments') ?? idStartingWith(ids, 'shared patterns');
  if (excerpts > 0) sourceOnly.push({ label: `${excerpts} code excerpts`, targetId: assignmentsId });
  if (assignments.length > 0) {
    sourceOnly.push({ label: 'Line citations', targetId: idStartingWith(ids, 'pattern assignments') });
  }
  sourceOnly.push({ label: 'Data-flow labels', targetId: idStartingWith(ids, 'file classification') });
  if (arrayOf<{ heading?: unknown }>(raw.sections).some((s) => normalizeHeading(stringOr(s.heading, '')).startsWith('metadata'))) {
    sourceOnly.push({ label: 'Metadata', targetId: idStartingWith(ids, 'metadata') });
  }

  const defaultRow = fileRows.find((row) => row.quality === 'none') ?? fileRows[0];

  return {
    intro: {
      eyebrow: phase ? `Pattern map · Phase ${phase}` : 'Pattern map',
      title: stringOrNull(meta.title),
      mapped: stringOrNull(meta.mapped),
      filesAnalyzed,
      analogsFound: analogsRaw ? withoutParenthetical(plain(analogsRaw)) : null,
      scope: stringOrNull(raw.scope),
      scanned: stringOrNull(raw.scanned),
      counts,
      total: fileRows.length,
    },
    notes: arrayOf<Block>(meta.notes),
    areas,
    rows,
    rules,
    defaultSelection: defaultRow.id,
    backMatter,
    sourceOnly,
  };
}
