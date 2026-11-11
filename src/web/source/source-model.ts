// The Source reader's line model (SRC-01, SRC-02): split a served file into lines, find its nested
// structure (frontmatter, XML-like elements, heading sections, tables, fences, JSON objects and arrays),
// and answer the questions the reader asks of it (which gutter cell is on this line, which lines does a
// fold hide, which blocks contain this line). A port of sketch 062 E's model() and structOf().
//
// Pure: no DOM, no React, no I/O. Every pass is linear in lines plus blocks (T-12-07): the per-line
// innermost-element index replaces the sketch's per-heading search over every block, the next-heading
// scan is a monotonic stack, and the gutter fills each block's own depth column once.

export type SourceLanguage = 'markdown' | 'json' | 'text';

/** `.md` and `.markdown` read as markdown, `.json` as JSON, anything else as plain text. */
export function languageOf(path: string): SourceLanguage {
  const dot = path.lastIndexOf('.');
  const ext = dot < 0 ? '' : path.slice(dot + 1).toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'json') return 'json';
  return 'text';
}

/** Past this many lines the model carries no blocks: numbers and text still render (RESEARCH Pitfall 6). */
export const SOURCE_STRUCTURE_LINE_LIMIT = 10000;

export type SourceBlockKind = 'frontmatter' | 'xml' | 'section' | 'table' | 'fence' | 'json';

export interface SourceBlock {
  /** Index into `SourceModel.blocks`; blocks are ordered by start line, then longest first. */
  id: number;
  /** First line, 1-based. */
  from: number;
  /** Last line, 1-based and inclusive. */
  to: number;
  kind: SourceBlockKind;
  label: string;
  /** The text of the first `<name>` element in an XML-like block's first four lines. */
  name: string | null;
  /** The tag of an XML-like block. */
  tag: string | null;
  /** Nesting level, 0 for an outermost block. */
  depth: number;
}

export interface SourceHeading {
  /** 1 to 6, the number of hashes. */
  depth: number;
  /** The heading as written after the hashes (closing hashes are left for the caller). */
  text: string;
  /** 1-based line. */
  line: number;
}

export interface SourceFrontmatter {
  from: 1;
  to: number;
  keyCount: number;
}

export interface SourceModel {
  lines: string[];
  language: SourceLanguage;
  frontmatter: SourceFrontmatter | null;
  headings: SourceHeading[];
  blocks: SourceBlock[];
  /** The number of gutter columns: the deepest block's depth plus one, 0 without blocks. */
  maxDepth: number;
  /** False when the file was too long for the structure pass; `blocks` is then empty. */
  structured: boolean;
}

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.endsWith('\r')) lines[i] = line.slice(0, -1);
  }
  return lines;
}

const KEY_LINE = /^[\w.-]+:/;
const ATX_HEADING = /^(#{1,6})(?:[ \t]+(.*))?$/;
const NAME_CHARS = /^[\w-]+$/;

function isNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 45 // -
  );
}

interface XmlOpen {
  tag: string;
}

/** `<tag>` or `<tag attr="x">` at the start of a line (leading space allowed) that is not self-closing. */
function xmlOpenOf(line: string): XmlOpen | null {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i += 1;
  if (line.charCodeAt(i) !== 60) return null; // <
  const nameStart = i + 1;
  let j = nameStart;
  while (j < line.length && isNameChar(line.charCodeAt(j))) j += 1;
  if (j === nameStart) return null;
  const next = line.charCodeAt(j);
  let close: number;
  if (next === 62) {
    close = j;
  } else if (next === 32 || next === 9) {
    close = line.indexOf('>', j);
    if (close < 0) return null;
  } else {
    return null;
  }
  if (line.charCodeAt(close - 1) === 47) return null; // "/>" self-closing
  return { tag: line.slice(nameStart, j) };
}

/** The tag named by a closing tag that ends the line, or null. */
function xmlCloseOf(line: string): string | null {
  const trimmed = line.trimEnd();
  if (!trimmed.endsWith('>')) return null;
  const k = trimmed.lastIndexOf('</');
  if (k < 0) return null;
  const name = trimmed.slice(k + 2, -1);
  return NAME_CHARS.test(name) ? name : null;
}

function nameOfBlock(lines: string[], from: number, to: number): string | null {
  const last = Math.min(to, from + 3);
  for (let n = from; n <= last; n += 1) {
    const line = lines[n - 1];
    const open = line.indexOf('<name>');
    if (open < 0) continue;
    const close = line.indexOf('</name>', open + 6);
    if (close >= 0) return line.slice(open + 6, close);
  }
  return null;
}

interface DraftBlock {
  from: number;
  to: number;
  kind: SourceBlockKind;
  label: string;
  name: string | null;
  tag: string | null;
}

function frontmatterOf(lines: string[]): SourceFrontmatter | null {
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 1) return null;
  let keyCount = 0;
  for (let i = 1; i < end; i += 1) if (KEY_LINE.test(lines[i])) keyCount += 1;
  return { from: 1, to: end + 1, keyCount };
}

function headingsOf(lines: string[], start: number): SourceHeading[] {
  const headings: SourceHeading[] = [];
  let inFence = false;
  for (let n = start; n <= lines.length; n += 1) {
    const line = lines[n - 1];
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || line.charCodeAt(0) !== 35) continue; // #
    const match = ATX_HEADING.exec(line);
    if (match) headings.push({ depth: match[1].length, text: (match[2] ?? '').trimEnd(), line: n });
  }
  return headings;
}

/** Fences, XML-like elements and table runs in one pass over the lines after the frontmatter. */
function markdownScan(lines: string[], start: number): DraftBlock[] {
  const drafts: DraftBlock[] = [];
  const open: { from: number; tag: string }[] = [];
  const openCount = new Map<string, number>();
  let fenceStart = 0;
  let tableStart = 0;

  const closeTable = (end: number): void => {
    if (tableStart !== 0 && end > tableStart) {
      drafts.push({
        from: tableStart,
        to: end,
        kind: 'table',
        label: `table · ${Math.max(0, end - tableStart - 1)} rows`,
        name: null,
        tag: null,
      });
    }
    tableStart = 0;
  };

  for (let n = start; n <= lines.length; n += 1) {
    const line = lines[n - 1];
    if (line.startsWith('```')) {
      closeTable(n - 1);
      if (fenceStart === 0) {
        fenceStart = n;
      } else {
        const info = lines[fenceStart - 1].slice(3);
        drafts.push({ from: fenceStart, to: n, kind: 'fence', label: '```' + (info || 'code'), name: null, tag: null });
        fenceStart = 0;
      }
      continue;
    }
    if (fenceStart !== 0) continue;

    if (line.charCodeAt(0) === 124) {
      if (tableStart === 0) tableStart = n;
    } else {
      closeTable(n - 1);
    }

    const opener = xmlOpenOf(line);
    if (opener && !line.includes(`</${opener.tag}>`)) {
      open.push({ from: n, tag: opener.tag });
      openCount.set(opener.tag, (openCount.get(opener.tag) ?? 0) + 1);
      continue;
    }
    const closer = xmlCloseOf(line);
    if (closer !== null && (openCount.get(closer) ?? 0) > 0) {
      let k = open.length - 1;
      while (k >= 0 && open[k].tag !== closer) k -= 1;
      const dropped = open.splice(k);
      for (const entry of dropped) openCount.set(entry.tag, (openCount.get(entry.tag) ?? 1) - 1);
      const { from, tag } = dropped[0];
      drafts.push({
        from,
        to: n,
        kind: 'xml',
        label: `<${tag}>`,
        name: nameOfBlock(lines, from, n),
        tag,
      });
    }
  }
  closeTable(lines.length);
  return drafts;
}

const JSON_OPEN_KEYED = /^"([^"]+)":\s*([[{])$/;
const JSON_CLOSE = /^[\]}],?$/;

function jsonScan(lines: string[]): DraftBlock[] {
  const drafts: DraftBlock[] = [];
  const stack: { from: number; key: string | null; bracket: string }[] = [];
  for (let n = 1; n <= lines.length; n += 1) {
    const t = lines[n - 1].trim();
    if (t === '') continue;
    const last = t.charCodeAt(t.length - 1);
    if (last === 123 || last === 91) {
      // { or [
      if (t.length === 1) {
        stack.push({ from: n, key: null, bracket: t });
        continue;
      }
      const keyed = JSON_OPEN_KEYED.exec(t);
      if (keyed) {
        stack.push({ from: n, key: keyed[1], bracket: keyed[2] });
        continue;
      }
    }
    if (stack.length > 0 && JSON_CLOSE.test(t)) {
      const top = stack.pop();
      if (!top) continue;
      const shape = top.bracket === '{' ? '{…}' : '[…]';
      const label = top.key !== null ? `"${top.key}" ${shape}` : stack.length === 0 ? 'whole file' : shape;
      drafts.push({ from: top.from, to: n, kind: 'json', label, name: null, tag: null });
    }
  }
  return drafts;
}

/** Heading sections, clamped to the enclosing element and cut before a crossing element (sketch 062 E). */
function sectionDrafts(lines: string[], headings: SourceHeading[], xml: DraftBlock[]): DraftBlock[] {
  const total = lines.length;
  // The innermost XML-like element containing each line, and each element's parent, from one sweep.
  const ordered = xml.slice().sort((a, b) => a.from - b.from);
  const innermost = new Int32Array(total + 2).fill(-1);
  const parent = new Int32Array(ordered.length).fill(-1);
  const stack: number[] = [];
  let pointer = 0;
  for (let n = 1; n <= total; n += 1) {
    while (stack.length > 0 && ordered[stack[stack.length - 1]].to < n) stack.pop();
    while (pointer < ordered.length && ordered[pointer].from === n) {
      parent[pointer] = stack.length > 0 ? stack[stack.length - 1] : -1;
      stack.push(pointer);
      pointer += 1;
    }
    innermost[n] = stack.length > 0 ? stack[stack.length - 1] : -1;
  }
  const lastFilled = new Int32Array(total + 1);
  for (let n = 1; n <= total; n += 1) lastFilled[n] = lines[n - 1].trim() === '' ? lastFilled[n - 1] : n;

  // The next heading of the same or a shallower depth, by a monotonic stack from the end.
  const nextSame = new Int32Array(headings.length).fill(-1);
  const pending: number[] = [];
  for (let i = headings.length - 1; i >= 0; i -= 1) {
    while (pending.length > 0 && headings[pending[pending.length - 1]].depth > headings[i].depth) pending.pop();
    nextSame[i] = pending.length > 0 ? pending[pending.length - 1] : -1;
    pending.push(i);
  }

  const drafts: DraftBlock[] = [];
  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    let end = nextSame[i] >= 0 ? headings[nextSame[i]].line - 1 : total;
    const enclosing = innermost[heading.line];
    if (enclosing >= 0) end = Math.min(end, ordered[enclosing].to - 1);
    if (end <= heading.line) continue;
    let crossing = -1;
    for (let b = innermost[end]; b >= 0 && ordered[b].from > heading.line; b = parent[b]) {
      if (ordered[b].to > end) crossing = b;
    }
    if (crossing >= 0) end = ordered[crossing].from - 1;
    end = Math.min(end, lastFilled[end] || heading.line);
    if (end <= heading.line) continue;
    drafts.push({
      from: heading.line,
      to: end,
      kind: 'section',
      label: `${'#'.repeat(heading.depth)} ${heading.text}`,
      name: null,
      tag: null,
    });
  }
  return drafts;
}

/** Order by start line, longest first, then assign nesting depth with a stack. */
function finishBlocks(drafts: DraftBlock[]): { blocks: SourceBlock[]; maxDepth: number } {
  const sorted = drafts.slice().sort((a, b) => a.from - b.from || b.to - a.to);
  const stack: SourceBlock[] = [];
  const blocks: SourceBlock[] = [];
  let maxDepth = 0;
  sorted.forEach((draft, id) => {
    while (stack.length > 0 && stack[stack.length - 1].to < draft.from) stack.pop();
    const block: SourceBlock = { ...draft, id, depth: stack.length };
    maxDepth = Math.max(maxDepth, block.depth + 1);
    stack.push(block);
    blocks.push(block);
  });
  return { blocks, maxDepth };
}

export function buildSourceModel(text: string, language: SourceLanguage): SourceModel {
  const lines = splitLines(text);
  const frontmatter = language === 'markdown' ? frontmatterOf(lines) : null;
  const start = frontmatter ? frontmatter.to + 1 : 1;
  const headings = language === 'markdown' ? headingsOf(lines, start) : [];
  const structured = lines.length <= SOURCE_STRUCTURE_LINE_LIMIT;
  if (!structured) {
    return { lines, language, frontmatter, headings, blocks: [], maxDepth: 0, structured };
  }

  const drafts: DraftBlock[] = [];
  if (language === 'markdown') {
    if (frontmatter) {
      drafts.push({
        from: 1,
        to: frontmatter.to,
        kind: 'frontmatter',
        label: `frontmatter · ${frontmatter.keyCount} keys`,
        name: null,
        tag: null,
      });
    }
    const scanned = markdownScan(lines, start);
    drafts.push(...scanned);
    drafts.push(
      ...sectionDrafts(
        lines,
        headings,
        scanned.filter((d) => d.kind === 'xml'),
      ),
    );
  } else if (language === 'json') {
    drafts.push(...jsonScan(lines));
  }
  const { blocks, maxDepth } = finishBlocks(drafts);
  return { lines, language, frontmatter, headings, blocks, maxDepth, structured };
}

// ---------------------------------------------------------------------------------------------------------------
// Gutter, fold presets and fold state (UI-SPEC "Bracket gutter" and "Folding").
// ---------------------------------------------------------------------------------------------------------------

export type GutterCellState = 'start' | 'mid' | 'end' | 'one';

export interface GutterCell {
  blockId: number;
  state: GutterCellState;
}

/** One row per line (index `line - 1`), one slot per depth column; null where no block sits at that depth. */
export type Gutter = ReadonlyArray<ReadonlyArray<GutterCell | null>>;

const NO_CELLS: ReadonlyArray<GutterCell | null> = [];

/**
 * The gutter cell of every line and depth from one sweep. Blocks at one depth never overlap (the depth
 * stack guarantees it), so filling each block's own column once costs lines times depth, and no line
 * searches the block list.
 */
export function gutterOf(model: SourceModel): Gutter {
  const rows: (GutterCell | null)[][] = [];
  if (model.maxDepth === 0) return model.lines.map(() => NO_CELLS);
  for (let n = 0; n < model.lines.length; n += 1) rows.push(new Array<GutterCell | null>(model.maxDepth).fill(null));
  for (const block of model.blocks) {
    const mid: GutterCell = { blockId: block.id, state: 'mid' };
    for (let n = block.from; n <= block.to; n += 1) {
      const row = rows[n - 1];
      if (!row) continue;
      if (block.from === block.to) row[block.depth] = { blockId: block.id, state: 'one' };
      else if (n === block.from) row[block.depth] = { blockId: block.id, state: 'start' };
      else if (n === block.to) row[block.depth] = { blockId: block.id, state: 'end' };
      else row[block.depth] = mid;
    }
  }
  return rows;
}

export type FoldPresetId = 'none' | 'frontmatter' | 'tasks' | 'tables' | 'sections' | 'objects';

export interface FoldPreset {
  id: FoldPresetId;
  /** The visible word. */
  label: string;
  /** True for the blocks this preset folds. */
  matches: (block: SourceBlock) => boolean;
}

const PRESETS: FoldPreset[] = [
  { id: 'none', label: 'None', matches: () => false },
  { id: 'frontmatter', label: 'Frontmatter', matches: (b) => b.kind === 'frontmatter' },
  { id: 'tasks', label: 'Tasks', matches: (b) => b.kind === 'xml' && b.tag === 'task' },
  { id: 'tables', label: 'Tables', matches: (b) => b.kind === 'table' },
  { id: 'sections', label: 'Sections', matches: (b) => b.kind === 'section' },
  { id: 'objects', label: 'Objects', matches: (b) => b.kind === 'json' && b.depth === 1 },
];

/** None, plus only the presets whose block kind exists in this file. */
export function foldPresetsOf(model: SourceModel): FoldPreset[] {
  return PRESETS.filter((preset) => preset.id === 'none' || model.blocks.some(preset.matches));
}

/** The block ids a preset folds. */
export function foldIdsOf(model: SourceModel, preset: FoldPreset): Set<number> {
  const ids = new Set<number>();
  for (const block of model.blocks) if (preset.matches(block)) ids.add(block.id);
  return ids;
}

/** The frontmatter starts folded; nothing else does. */
export function defaultFolds(model: SourceModel): Set<number> {
  const ids = new Set<number>();
  for (const block of model.blocks) if (block.kind === 'frontmatter') ids.add(block.id);
  return ids;
}

/** Hidden lines as a flag per 1-based line (index 0 is unused): every line after a folded block's first. */
export function hiddenLinesOf(model: SourceModel, folded: ReadonlySet<number>): Uint8Array {
  const total = model.lines.length;
  const delta = new Int32Array(total + 3);
  for (const id of folded) {
    const block = model.blocks[id];
    if (!block || block.to <= block.from) continue;
    delta[block.from + 1] += 1;
    delta[block.to + 1] -= 1;
  }
  const hidden = new Uint8Array(total + 2);
  let running = 0;
  for (let n = 1; n <= total; n += 1) {
    running += delta[n];
    hidden[n] = running > 0 ? 1 : 0;
  }
  return hidden;
}

/**
 * The folded blocks to open before landing on a range: those whose body holds the range's first line
 * (a folded block's own first line stays visible). A fold nested in a folded block is returned with it.
 */
export function unfoldFor(
  model: SourceModel,
  folded: ReadonlySet<number>,
  range: { from: number; to: number },
): number[] {
  const first = Math.min(range.from, range.to);
  const ids: number[] = [];
  for (const id of folded) {
    const block = model.blocks[id];
    if (block && first > block.from && first <= block.to) ids.push(id);
  }
  return ids.sort((a, b) => a - b);
}

/** The blocks containing a line, outermost first. */
export function chainAt(model: SourceModel, line: number): SourceBlock[] {
  const chain = model.blocks.filter((block) => block.from <= line && line <= block.to);
  return chain.sort((a, b) => a.depth - b.depth);
}
