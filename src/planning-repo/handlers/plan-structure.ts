// The PLAN projection (quick-261006-iz6, sketch 019 B): a tolerant, server-side read of a PLAN body
// into `PlanStructure` — the objective split into title / rest / why / you-get, every task with its
// fields as blocks, the done-when lists, every block the page leaves to Source mode, loose notes and
// the wrapper-warning count. It reuses `segmentPlanBody` (the renderer's own segmenter, over the same
// body) so each projected block carries the anchor `plan-at-<offset>` of the section the renderer
// prints for it. Pure and never throws on any string: every text operation works per line or per
// segment body, uses no nested unbounded quantifier and constructs no regular-expression object.
// Called from `PlanHandler.parse` inside a try/catch (T-iz6-05). The body itself stays verbatim.
import { segmentPlanBody } from '../../rendering/plan-segments.ts';
import type { PlanSegment } from '../../rendering/plan-segments.ts';
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export const PLAN_ANCHOR_PREFIX = 'plan-at-';

export interface PlanText {
  anchor: string;
  text: string;
}

export interface PlanBlocks {
  anchor: string;
  blocks: Block[];
  chars: number;
  words: number;
}

export interface PlanList {
  anchor: string;
  /** A colon-ended paragraph directly before the list — shown muted, never an item. */
  lead: string | null;
  items: string[];
}

export interface PlanOption {
  name: string | null;
  description: string | null;
  pros: string | null;
  cons: string | null;
}

export interface PlanOptions {
  anchor: string;
  items: PlanOption[];
}

export interface PlanVerifyItem {
  /** `automated`, `fails_when`, `human-check`, any other child tag, or `text`. */
  kind: string;
  text: string;
}

export interface PlanVerify {
  anchor: string;
  items: PlanVerifyItem[];
}

export interface PlanReversibility {
  anchor: string;
  rating: string | null;
  text: string;
}

export interface PlanTaskFields {
  action: PlanBlocks | null;
  context: PlanBlocks | null;
  whatBuilt: PlanBlocks | null;
  howToVerify: PlanBlocks | null;
  instructions: PlanBlocks | null;
  verification: PlanBlocks | null;
  behavior: PlanList | null;
  acceptance: PlanList | null;
  done: PlanText | null;
  decision: PlanText | null;
  options: PlanOptions | null;
  reversibility: PlanReversibility | null;
  verify: PlanVerify | null;
}

export interface PlanSourceChild {
  tag: string;
  anchor: string;
}

export interface PlanTask {
  n: number;
  anchor: string;
  /** Lower-cased `type` attribute, `auto` when absent. */
  type: string;
  gate: string | null;
  tdd: boolean;
  name: string | null;
  files: string[];
  fields: PlanTaskFields;
  /** read_first, precondition, pre-condition, resume-signal and every unknown child, in document order. */
  sourceChildren: PlanSourceChild[];
}

export interface PlanObjective {
  anchor: string;
  /** The first sentence of the lead, as plain text — the page's h1. */
  title: string | null;
  /** The rest of the lead, capitalised; empty when the first sentence was the whole lead. */
  rest: Block[];
  why: Block[] | null;
  youGet: Block[] | null;
}

export interface PlanDoneList {
  anchor: string;
  lead: string | null;
  items: string[];
}

export interface PlanSourceBlock {
  tag: string;
  anchor: string;
  /** Lines starting with `@` — only for `context` and `execution_context`. */
  fileCount: number | null;
}

export interface PlanLooseNote {
  kind: 'heading' | 'between' | 'trailing';
  /** The heading text for `heading`, null otherwise. */
  heading: string | null;
}

export interface PlanStructure {
  objective: PlanObjective | null;
  tasks: PlanTask[];
  success: PlanDoneList | null;
  verification: PlanDoneList | null;
  sourceBlocks: PlanSourceBlock[];
  loose: PlanLooseNote[];
  wrapperWarnings: number;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function anchorOf(segment: PlanSegment): string {
  return `${PLAN_ANCHOR_PREFIX}${segment.start}`;
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

function indentOf(line: string): number {
  let count = 0;
  while (count < line.length && (line[count] === ' ' || line[count] === '\t')) count += 1;
  return count;
}

function decodeEntities(text: string): string {
  return text.split('&lt;').join('<').split('&gt;').join('>').split('&amp;').join('&');
}

/** Drops leading / trailing blank lines and the indentation every non-blank line shares. */
function dedent(text: string): string {
  const lines = text.split('\n');
  let first = 0;
  let last = lines.length - 1;
  while (first <= last && isBlank(lines[first])) first += 1;
  while (last >= first && isBlank(lines[last])) last -= 1;
  const kept = lines.slice(first, last + 1);
  let min = Number.POSITIVE_INFINITY;
  for (const line of kept) {
    if (isBlank(line)) continue;
    const indent = indentOf(line);
    if (indent < min) min = indent;
  }
  const cut = Number.isFinite(min) ? min : 0;
  return decodeEntities(kept.map((line) => (isBlank(line) ? '' : line.slice(cut).trimEnd())).join('\n'));
}

function oneLine(text: string): string {
  return text.split('\n').map((line) => line.trim()).filter((line) => line !== '').join(' ');
}

function countWords(text: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i += 1) {
    const space = text[i] === ' ' || text[i] === '\n' || text[i] === '\t' || text[i] === '\r';
    if (space) inWord = false;
    else if (!inWord) {
      inWord = true;
      count += 1;
    }
  }
  return count;
}

/** The first lower-case letter of `text` (after any markdown / quote marks) upper-cased. */
function capitalize(text: string): string {
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '*' || ch === '_' || ch === '`' || ch === '"' || ch === "'" || ch === '(' || ch === '[' || ch === ' ') continue;
    if (ch >= 'a' && ch <= 'z') return text.slice(0, i) + ch.toUpperCase() + text.slice(i + 1);
    return text;
  }
  return text;
}

/** Plain text of a markdown fragment: bold / code / emphasis markers and link wrappers removed. */
function plainText(text: string): string {
  let out = text.split('**').join('').split('`').join('').split('__').join('');
  // [label](url) -> label, by scanning for "](" pairs.
  let from = 0;
  for (;;) {
    const open = out.indexOf('[', from);
    if (open < 0) break;
    const close = out.indexOf('](', open);
    const end = close < 0 ? -1 : out.indexOf(')', close);
    if (close < 0 || end < 0 || out.slice(open + 1, close).includes('\n')) {
      from = open + 1;
      continue;
    }
    out = out.slice(0, open) + out.slice(open + 1, close) + out.slice(end + 1);
    from = open;
  }
  return out.split(' ').filter((part) => part !== '').join(' ').trim();
}

const ABBREVIATIONS = ['e.g.', 'i.e.', 'etc.', 'vs.', 'cf.'];

/**
 * Splits `text` at its first sentence terminator (`.` `:` `!` `?` followed by whitespace or the end),
 * skipping any inside a backtick span or a `**` bold run. A terminating `.` or `:` is dropped from the
 * sentence, a `!` or `?` is kept. No terminator means the whole text and an empty remainder.
 */
function splitSentence(text: string): [string, string] {
  let ticks = 0;
  let bold = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '`') {
      ticks += 1;
      continue;
    }
    if (ch === '*' && text[i + 1] === '*') {
      bold += 1;
      i += 1;
      continue;
    }
    if (ticks % 2 === 1 || bold % 2 === 1) continue;
    if (ch !== '.' && ch !== ':' && ch !== '!' && ch !== '?') continue;
    const next = text[i + 1];
    if (next !== undefined && next !== ' ' && next !== '\n' && next !== '\t') continue;
    if (ch === '.') {
      const tail = text.slice(Math.max(0, i - 3), i + 1).toLowerCase();
      if (ABBREVIATIONS.some((abbr) => tail.endsWith(abbr))) continue;
    }
    const end = ch === '!' || ch === '?' ? i + 1 : i;
    return [text.slice(0, end).trim(), text.slice(i + 1).trim()];
  }
  return [text.trim(), ''];
}

function splitParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of text.split('\n')) {
    if (isBlank(line)) {
      if (current.length > 0) paragraphs.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current.join('\n'));
  return paragraphs;
}

/** Splits on every top-level `sep` — never inside backticks or parentheses. */
function splitOutside(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inCode = false;
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '`') inCode = !inCode;
    if (!inCode) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(0, depth - 1);
    }
    if (!inCode && depth === 0 && ch === sep) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

interface Bullet {
  indent: number;
  text: string;
}

/** A bullet (`-` `*` `+`) or numbered (`1.` `1)`) line, with any checkbox removed; null otherwise. */
function bulletOf(line: string): Bullet | null {
  const indent = indentOf(line);
  const rest = line.slice(indent);
  let marker = 0;
  if ((rest[0] === '-' || rest[0] === '*' || rest[0] === '+') && (rest[1] === ' ' || rest[1] === '\t')) {
    marker = 1;
  } else {
    let digits = 0;
    while (digits < rest.length && digits < 3 && rest[digits] >= '0' && rest[digits] <= '9') digits += 1;
    if (digits > 0 && (rest[digits] === '.' || rest[digits] === ')') && (rest[digits + 1] === ' ' || rest[digits + 1] === '\t')) {
      marker = digits + 1;
    }
  }
  if (marker === 0) return null;
  let text = rest.slice(marker).trim();
  if (text.length >= 3 && text[0] === '[' && text[2] === ']' && (text[1] === ' ' || text[1] === 'x' || text[1] === 'X')) {
    text = text.slice(3).trim();
  }
  return { indent, text };
}

/**
 * A list field: bullets, numbered items and checkboxes become items; an indented (or directly
 * following) continuation line joins its item; a nested bullet joins its parent; a prose paragraph is
 * one item; a colon-ended paragraph right before a list is that list's muted lead.
 */
function parseListText(text: string): { lead: string | null; items: string[] } {
  const lines = text.split('\n');
  const items: string[] = [];
  let lead: string | null = null;
  let paragraph: string[] = [];
  let current: string | null = null;
  let baseIndent = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const bullet = bulletOf(line);
    if (bullet !== null && bullet.indent < baseIndent) baseIndent = bullet.indent;
  }

  const flushParagraph = (nextIsBullet: boolean): void => {
    if (paragraph.length === 0) return;
    const joined = paragraph.join(' ').trim();
    paragraph = [];
    if (nextIsBullet && joined.endsWith(':') && lead === null && items.length === 0 && current === null) lead = joined;
    else items.push(joined);
  };
  const flushCurrent = (): void => {
    if (current !== null) items.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isBlank(line)) {
      flushCurrent();
      // A blank line followed by a bullet closes the paragraph as a possible lead.
      let j = i + 1;
      while (j < lines.length && isBlank(lines[j])) j += 1;
      flushParagraph(j < lines.length && bulletOf(lines[j]) !== null);
      continue;
    }
    const bullet = bulletOf(line);
    if (bullet !== null) {
      if (current !== null && bullet.indent > baseIndent) {
        const parent: string = current;
        current = `${parent}${parent.endsWith(':') ? ' ' : '; '}${bullet.text}`;
        continue;
      }
      flushParagraph(true);
      flushCurrent();
      current = bullet.text;
      continue;
    }
    if (current !== null) {
      // An indented or lazy continuation of the open item.
      current = `${current} ${line.trim()}`;
      continue;
    }
    paragraph.push(line.trim());
  }
  flushCurrent();
  flushParagraph(false);
  return { lead, items: items.filter((item) => item !== '') };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** A task's `<files>`: newlines and top-level commas separate entries; bullets, backticks and a
 * trailing " (note)" / " — note" are removed. */
function parseFiles(text: string): string[] {
  const files: string[] = [];
  for (const line of text.split('\n')) {
    let entry = line.trim();
    if (entry === '') continue;
    const bullet = bulletOf(entry);
    if (bullet !== null) entry = bullet.text;
    for (const part of splitOutside(entry, ',')) {
      let path = part.trim();
      const note = path.indexOf(' — ');
      if (note >= 0) path = path.slice(0, note);
      const paren = path.indexOf(' (');
      if (paren >= 0) path = path.slice(0, paren);
      path = path.split('`').join('').trim();
      if (path.endsWith('.') && path.length > 1 && !path.endsWith('..')) path = path.slice(0, -1);
      if (path !== '') files.push(path);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Segment tree (well-formed segments only, linear)
// ---------------------------------------------------------------------------

interface Node {
  segment: PlanSegment;
  parent: Node | null;
  children: Node[];
}

function buildTree(segments: PlanSegment[]): Node[] {
  const nodes: Node[] = [];
  const stack: Node[] = [];
  for (const segment of segments) {
    if (segment.malformed) continue;
    while (stack.length > 0 && stack[stack.length - 1].segment.end <= segment.start) stack.pop();
    const parent = stack.length > 0 ? stack[stack.length - 1] : null;
    const node: Node = { segment, parent, children: [] };
    if (parent !== null) parent.children.push(node);
    nodes.push(node);
    stack.push(node);
  }
  return nodes;
}

function hasAncestor(node: Node, tag: string): boolean {
  for (let up = node.parent; up !== null; up = up.parent) {
    if (up.segment.tag === tag) return true;
  }
  return false;
}

/** The text of a segment's body outside its (well-formed) child segments. */
function ownText(node: Node): string {
  const { segment } = node;
  const parts: string[] = [];
  let cursor = segment.contentStart;
  for (const child of node.children) {
    if (child.segment.start > cursor) parts.push(segment.body.slice(cursor - segment.contentStart, child.segment.start - segment.contentStart));
    cursor = Math.max(cursor, child.segment.end);
  }
  if (cursor < segment.contentEnd) parts.push(segment.body.slice(cursor - segment.contentStart));
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Objective
// ---------------------------------------------------------------------------

interface Label {
  name: 'Purpose' | 'Output';
  start: number;
  end: number;
}

function findLabel(text: string, name: 'Purpose' | 'Output'): Label | null {
  let from = 0;
  for (;;) {
    const at = text.indexOf(name, from);
    if (at < 0) return null;
    from = at + name.length;
    const afterName = at + name.length;
    const boldBefore = at >= 2 && text[at - 1] === '*' && text[at - 2] === '*';
    let start = -1;
    let end = -1;
    if (text[afterName] === ':') {
      end = afterName + 1;
      start = at;
      if (boldBefore && text[end] === '*' && text[end + 1] === '*') {
        start = at - 2;
        end += 2;
      }
    } else if (boldBefore && text[afterName] === '*' && text[afterName + 1] === '*' && text[afterName + 2] === ':') {
      start = at - 2;
      end = afterName + 3;
    }
    if (start < 0) continue;
    const before = start === 0 ? '\n' : text[start - 1];
    if (before !== '\n' && before !== ' ' && before !== '\t') continue;
    return { name, start, end };
  }
}

function blocksOf(text: string): Block[] {
  return parseBlocks(capitalize(text.trim()));
}

function extractObjective(node: Node): PlanObjective {
  const text = dedent(node.segment.body);
  const labels = [findLabel(text, 'Purpose'), findLabel(text, 'Output')]
    .filter((label): label is Label => label !== null)
    .sort((a, b) => a.start - b.start);
  const leadEnd = labels.length > 0 ? labels[0].start : text.length;
  const lead = text.slice(0, leadEnd).trim();
  let why: string | null = null;
  let youGet: string | null = null;
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const stop = index + 1 < labels.length ? labels[index + 1].start : text.length;
    const section = text.slice(label.end, stop).trim();
    if (section === '') continue;
    if (label.name === 'Purpose') why = section;
    else youGet = section;
  }

  let title: string | null = null;
  let restText = '';
  if (lead !== '') {
    const paragraphs = splitParagraphs(lead);
    const [sentence, remainder] = splitSentence(oneLine(paragraphs[0]));
    const plain = plainText(sentence);
    title = plain === '' ? null : plain;
    restText = [remainder, ...paragraphs.slice(1)].filter((part) => part !== '').join('\n\n');
  }
  return {
    anchor: anchorOf(node.segment),
    title,
    rest: restText === '' ? [] : blocksOf(restText),
    why: why === null ? null : blocksOf(why),
    youGet: youGet === null ? null : blocksOf(youGet),
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

function blocksField(node: Node): PlanBlocks {
  const text = dedent(node.segment.body);
  return { anchor: anchorOf(node.segment), blocks: parseBlocks(text), chars: text.length, words: countWords(text) };
}

function listField(node: Node): PlanList {
  const { lead, items } = parseListText(dedent(node.segment.body));
  return { anchor: anchorOf(node.segment), lead, items };
}

function textField(node: Node): PlanText {
  return { anchor: anchorOf(node.segment), text: oneLine(dedent(node.segment.body)) };
}

/** `rating="costly"` read from the child's own opening tag (segment attributes keep only type / gate / tdd). */
function ratingOf(segment: PlanSegment): string | null {
  const close = segment.raw.indexOf('>');
  const opening = segment.raw.slice(0, close < 0 ? 0 : Math.min(close, 2048));
  for (const quote of ['"', "'"]) {
    const at = opening.indexOf(`rating=${quote}`);
    if (at < 0) continue;
    const from = at + 8;
    const to = opening.indexOf(quote, from);
    if (to > from) return opening.slice(from, to).trim().toLowerCase();
  }
  return null;
}

function optionsField(node: Node): PlanOptions {
  const items: PlanOption[] = [];
  const optionNodes = node.children.filter((child) => child.segment.tag === 'option');
  if (optionNodes.length > 0) {
    for (const option of optionNodes) {
      const pick = (tag: string): string | null => {
        const found = option.children.find((child) => child.segment.tag === tag);
        if (!found) return null;
        const text = oneLine(dedent(found.segment.body));
        return text === '' ? null : text;
      };
      const remaining = oneLine(dedent(ownText(option)));
      items.push({
        name: pick('name'),
        description: remaining === '' ? null : remaining,
        pros: pick('pros'),
        cons: pick('cons'),
      });
    }
    return { anchor: anchorOf(node.segment), items };
  }
  const text = dedent(node.segment.body);
  const lines = text.split('\n');
  const bulleted = lines.filter((line) => bulletOf(line) !== null);
  const entries =
    bulleted.length >= 2
      ? bulleted.map((line) => bulletOf(line)?.text ?? '')
      : splitOutside(oneLine(text), ';');
  for (const raw of entries) {
    const entry = raw.trim();
    if (entry === '') continue;
    const dash = entry.indexOf(' — ');
    const name = dash >= 0 ? entry.slice(0, dash).trim() : entry;
    let description = dash >= 0 ? entry.slice(dash + 3).trim() : '';
    if (description.endsWith('.')) description = description.slice(0, -1).trim();
    items.push({ name: name === '' ? null : name, description: description === '' ? null : description, pros: null, cons: null });
  }
  return { anchor: anchorOf(node.segment), items };
}

function verifyField(node: Node): PlanVerify {
  const items: PlanVerifyItem[] = [];
  if (node.children.length === 0) {
    const text = dedent(node.segment.body);
    if (text !== '') items.push({ kind: 'text', text });
    return { anchor: anchorOf(node.segment), items };
  }
  const { segment } = node;
  let cursor = segment.contentStart;
  const pushText = (from: number, to: number): void => {
    if (to <= from) return;
    const text = dedent(segment.body.slice(from - segment.contentStart, to - segment.contentStart));
    if (text !== '') items.push({ kind: 'text', text });
  };
  for (const child of node.children) {
    pushText(cursor, child.segment.start);
    const text = dedent(child.segment.body);
    if (text !== '') items.push({ kind: child.segment.tag, text });
    cursor = Math.max(cursor, child.segment.end);
  }
  pushText(cursor, segment.contentEnd);
  return { anchor: anchorOf(node.segment), items };
}

const SOURCE_CHILD_TAGS = new Set(['read_first', 'precondition', 'pre-condition', 'resume-signal']);

function derivedName(whatBuilt: PlanBlocks | null): string | null {
  if (whatBuilt === null) return null;
  const text = whatBuilt.blocks
    .map((block) => (block.kind === 'paragraph' || block.kind === 'code' ? block.text : block.kind === 'list' ? block.items.join(' ') : ''))
    .join(' ');
  const collapsed = oneLine(text);
  let ticks = 0;
  const limit = Math.min(collapsed.length, 91);
  for (let i = 0; i < limit; i += 1) {
    const ch = collapsed[i];
    if (ch === '`') ticks += 1;
    if (ticks % 2 === 1) continue;
    const colon = ch === ':';
    const dash = ch === ' ' && collapsed[i + 1] === '—';
    if ((colon || dash) && i >= 8) return collapsed.slice(0, i).trim();
  }
  return null;
}

function leadingTaskNumberRemoved(name: string): string {
  if (!name.startsWith('Task ')) return name;
  let i = 5;
  while (i < name.length && name[i] >= '0' && name[i] <= '9') i += 1;
  if (i === 5) return name;
  // "Task 1 (tracer): …" — a short parenthetical between the number and the colon goes too.
  if (name[i] === ' ' && name[i + 1] === '(') {
    const close = name.indexOf(')', i);
    if (close > 0 && close - i < 24) i = close + 1;
  }
  if (name[i] === ':') return name.slice(i + 1).trim();
  return name;
}

function extractTask(node: Node, n: number): PlanTask {
  const fields: PlanTaskFields = {
    action: null,
    context: null,
    whatBuilt: null,
    howToVerify: null,
    instructions: null,
    verification: null,
    behavior: null,
    acceptance: null,
    done: null,
    decision: null,
    options: null,
    reversibility: null,
    verify: null,
  };
  let name: string | null = null;
  let files: string[] | null = null;
  const sourceChildren: PlanSourceChild[] = [];
  const overflow = (child: Node): void => {
    sourceChildren.push({ tag: child.segment.tag, anchor: anchorOf(child.segment) });
  };

  for (const child of node.children) {
    const tag = child.segment.tag;
    if (SOURCE_CHILD_TAGS.has(tag)) {
      overflow(child);
      continue;
    }
    switch (tag) {
      case 'name': {
        if (name !== null) overflow(child);
        else name = oneLine(dedent(child.segment.body)) || null;
        break;
      }
      case 'files': {
        if (files !== null) overflow(child);
        else files = parseFiles(dedent(child.segment.body));
        break;
      }
      case 'action':
        if (fields.action) overflow(child);
        else fields.action = blocksField(child);
        break;
      case 'context':
        if (fields.context) overflow(child);
        else fields.context = blocksField(child);
        break;
      case 'what-built':
        if (fields.whatBuilt) overflow(child);
        else fields.whatBuilt = blocksField(child);
        break;
      case 'how-to-verify':
        if (fields.howToVerify) overflow(child);
        else fields.howToVerify = blocksField(child);
        break;
      case 'instructions':
        if (fields.instructions) overflow(child);
        else fields.instructions = blocksField(child);
        break;
      case 'verification':
        if (fields.verification) overflow(child);
        else fields.verification = blocksField(child);
        break;
      case 'behavior':
        if (fields.behavior) overflow(child);
        else fields.behavior = listField(child);
        break;
      case 'acceptance_criteria':
        if (fields.acceptance) overflow(child);
        else fields.acceptance = listField(child);
        break;
      case 'done':
        if (fields.done) overflow(child);
        else fields.done = textField(child);
        break;
      case 'decision':
        if (fields.decision) overflow(child);
        else fields.decision = textField(child);
        break;
      case 'options':
        if (fields.options) overflow(child);
        else fields.options = optionsField(child);
        break;
      case 'reversibility':
        if (fields.reversibility) overflow(child);
        else
          fields.reversibility = {
            anchor: anchorOf(child.segment),
            rating: ratingOf(child.segment),
            text: oneLine(dedent(child.segment.body)),
          };
        break;
      case 'verify':
        if (fields.verify) overflow(child);
        else fields.verify = verifyField(child);
        break;
      default:
        overflow(child);
    }
  }

  const { attributes } = node.segment;
  const cleanedName = name === null ? null : leadingTaskNumberRemoved(name);
  return {
    n,
    anchor: anchorOf(node.segment),
    type: (attributes.type ?? '').trim().toLowerCase() || 'auto',
    gate: attributes.gate?.trim().toLowerCase() || null,
    tdd: (attributes.tdd ?? '').trim().toLowerCase() === 'true',
    name: cleanedName === null || cleanedName === '' ? derivedName(fields.whatBuilt) : cleanedName,
    files: files ?? [],
    fields,
    sourceChildren,
  };
}

// ---------------------------------------------------------------------------
// Done when
// ---------------------------------------------------------------------------

function doneList(node: Node | undefined): PlanDoneList | null {
  if (!node) return null;
  const { lead, items } = parseListText(dedent(node.segment.body));
  if (lead === null && items.length === 0) return null;
  return { anchor: anchorOf(node.segment), lead, items };
}

// ---------------------------------------------------------------------------
// Loose text
// ---------------------------------------------------------------------------

function withoutComments(text: string): string {
  let out = '';
  let cursor = 0;
  for (;;) {
    const open = text.indexOf('<!--', cursor);
    if (open < 0) break;
    const close = text.indexOf('-->', open + 4);
    out += text.slice(cursor, open);
    if (close < 0) {
      cursor = text.length;
      break;
    }
    cursor = close + 3;
  }
  return out + text.slice(cursor);
}

function isRule(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  const ch = trimmed[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (const c of trimmed) if (c !== ch && c !== ' ') return false;
  return true;
}

function headingOf(line: string): string | null {
  let hashes = 0;
  while (hashes < line.length && line[hashes] === '#') hashes += 1;
  if (hashes === 0 || hashes > 6 || (line[hashes] !== ' ' && line[hashes] !== '\t')) return null;
  const text = line.slice(hashes).trim();
  return text === '' ? null : text;
}

function looseNotes(body: string, covered: [number, number][], lastEnd: number): PlanLooseNote[] {
  const notes: PlanLooseNote[] = [];
  const merged: [number, number][] = [];
  for (const span of [...covered].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  let cursor = 0;
  const regions: [number, number][] = [];
  for (const [from, to] of merged) {
    if (from > cursor) regions.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < body.length) regions.push([cursor, body.length]);

  for (const [from, to] of regions) {
    const text = withoutComments(body.slice(from, to));
    const trailing = from >= lastEnd;
    let fenced = false;
    let plainSeen = false;
    let headingSeen = false;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        fenced = !fenced;
        if (!headingSeen && !plainSeen) {
          plainSeen = true;
          notes.push({ kind: trailing ? 'trailing' : 'between', heading: null });
        }
        continue;
      }
      if (fenced) continue;
      if (trimmed === '' || isRule(trimmed)) continue;
      const heading = headingOf(trimmed);
      if (heading !== null) {
        headingSeen = true;
        notes.push({ kind: 'heading', heading: plainText(heading) });
        continue;
      }
      if (!headingSeen && !plainSeen) {
        plainSeen = true;
        notes.push({ kind: trailing ? 'trailing' : 'between', heading: null });
      }
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// extractPlanStructure
// ---------------------------------------------------------------------------

const NOT_SOURCE_TAGS = new Set(['objective', 'tasks', 'task', 'verification', 'success_criteria']);

function countContextFiles(segment: PlanSegment): number {
  let count = 0;
  for (const line of segment.body.split('\n')) if (line.trim().startsWith('@')) count += 1;
  return count;
}

/** The tolerant projection of a PLAN body. Never throws; an empty or tag-less body gives zero tasks. */
export function extractPlanStructure(body: string): PlanStructure {
  const segments = segmentPlanBody(body);
  const nodes = buildTree(segments);
  const wrapperWarnings = segments.filter((segment) => segment.malformed).length;

  const objectiveNode = nodes.find((node) => node.segment.tag === 'objective' && node.parent === null)
    ?? nodes.find((node) => node.segment.tag === 'objective');
  const taskNodes = nodes.filter((node) => node.segment.tag === 'task' && !hasAncestor(node, 'task'));
  const tasks = taskNodes.map((node, index) => extractTask(node, index + 1));

  const outsideTasks = (node: Node): boolean => node.segment.tag !== 'task' && !hasAncestor(node, 'task');
  const success = doneList(nodes.find((node) => node.segment.tag === 'success_criteria' && outsideTasks(node)));
  const verification = doneList(nodes.find((node) => node.segment.tag === 'verification' && outsideTasks(node)));

  const sourceBlocks: PlanSourceBlock[] = [];
  for (const node of nodes) {
    const tag = node.segment.tag;
    if (NOT_SOURCE_TAGS.has(tag) || !outsideTasks(node)) continue;
    sourceBlocks.push({
      tag,
      anchor: anchorOf(node.segment),
      fileCount: tag === 'context' || tag === 'execution_context' ? countContextFiles(node.segment) : null,
    });
  }

  const covered: [number, number][] = [];
  let lastEnd = 0;
  for (const node of nodes) {
    if (node.parent === null) {
      covered.push([node.segment.start, node.segment.end]);
      lastEnd = Math.max(lastEnd, node.segment.end);
    }
  }
  for (const segment of segments) {
    if (segment.malformed) covered.push([segment.start, segment.end]);
  }

  return {
    objective: objectiveNode ? extractObjective(objectiveNode) : null,
    tasks,
    success,
    verification,
    sourceBlocks,
    loose: looseNotes(body, covered, lastEnd),
    wrapperWarnings,
  };
}
