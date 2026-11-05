// The User setup composer (Phase 10, 10-19, VIEW-11, sketch 049 winner B "Where everything goes"): a pure `ViewInput` ->
// `ComposedUserSetup` merge of `structured.userSetup`, the tolerant reading the handler made of a USER-SETUP.md. The
// first screen answers "how many setup steps are done, and where does everything go?":
//   - the head: the lead "{d} of {t} steps done" over the shared status-meter (one square per step: done `complete`,
//     pending `in-flight`, a step the page cannot classify `quiet`), and the file's own Status line beside the box count
//     - a plain chip when they agree, a quiet dashed pair (never merged) when they disagree;
//   - the map: "Get it from", every dashboard path the file names drawn as a clean tree (the service is the root, the last
//     segment is the leaf's muted prefix, a one-child folder chain is joined, a URL-only item joins the root whose steps
//     share its host, anything else waits under "No place stated"), and "Goes in", one card per destination file with a
//     numbered line per variable;
//   - below, the steps as closed bars by section, then Local Development, Verification and any other section as plain bars
//     (paragraphs, fenced commands as copy rows) and "In the source only".
// A file with no recognisable step or variable composes to the plain model: the head's "Steps not stated" chip over its
// masked sections as headed text. Every string comes from `structured.userSetup`, which the handler has already masked: the composer never reads the
// document HTML, so a value a person pasted into the file cannot reach the page through it (CONTEXT D-11, T-10-33). No
// DOM, no filesystem access, no rendering, no regular expression and no module-level state: two user setup pages open at
// once each compose only from their own input. Returns `null` only when the projection is missing (the page then shows the
// sanctioned empty note, never the document).
import type { ViewInput } from './manifest.ts';
import { VALUE_NOT_SHOWN_MARK, stripControlCharacters } from '../../planning-repo/handlers/withhold-values.ts';

/** The three tones this page writes: done is `complete`, pending `in-flight`, a step it cannot classify `quiet`. */
export type UserSetupTone = 'complete' | 'in-flight' | 'quiet';

export const STEPS_NOT_STATED_LABEL = 'Steps not stated';
export const NO_PLACE_LABEL = 'No place stated';
export const NO_FILE_LABEL = 'No file stated';

/** The most blocks one plain section draws. */
const BLOCK_CAP = 400;

/** The word beside a step's square. */
export const STEP_WORDS: Readonly<Record<UserSetupTone, string>> = {
  complete: 'Done',
  'in-flight': 'Pending',
  quiet: 'Not stated',
};

export interface ComposedUserSetupField {
  key: string;
  text: string;
}

/** One block of a plain section, in file order. Every string is masked text from the handler. */
export type UserSetupBlock =
  | { kind: 'text'; text: string; bullet: boolean }
  | { kind: 'heading'; text: string }
  /** A fenced command line; `copyable` is false when it held a value (the mark is in it), so no copy control is drawn. */
  | { kind: 'command'; text: string; copyable: boolean }
  | { kind: 'note'; text: string };

export interface ComposedPlainSection {
  heading: string;
  blocks: UserSetupBlock[];
}

/** One step, or one variable the file lists without a Status box. */
export interface ComposedUserSetupItem {
  /** The item's position in `items`, the key a selection names. */
  index: number;
  kind: 'variable' | 'account' | 'dashboard';
  title: string;
  /** Null for a variable the file lists without a Status box (not a step: no word, a dashed square). */
  tone: UserSetupTone | null;
  word: string | null;
  group: string;
  hadValue: boolean;
  source: string | null;
  destination: string | null;
  fields: ComposedUserSetupField[];
}

/** A row of the "Get it from" tree: a folder, or the leaf that names a step. */
export interface ComposedTreeRow {
  depth: number;
  /** Nearest shallower row above, or null for a root. */
  parent: number | null;
  /** The folder's name (a joined chain reads "Models → Small"); empty on a leaf. */
  name: string;
  dir: boolean;
  /** A leaf: the item it names. */
  item: number | null;
  /** A leaf: the last path segment, shown muted before the title. */
  at: string | null;
}

export interface ComposedTrayLeaf {
  item: number;
}

export interface ComposedFileCard {
  /** The destination file, or null when the file states none. */
  name: string | null;
  /** "{d} of {t} set", or null when the file has no steps. */
  setLabel: string | null;
  /** Item indexes, one numbered line each. */
  lines: number[];
}

export interface ComposedBarGroup {
  heading: string;
  /** "{d} of {t}" over the group's steps, or null when none is a step. */
  count: string | null;
  items: number[];
}

export interface ComposedStatusLine {
  /** The file's own word. */
  word: string;
  /** True when the word and the boxes disagree. */
  disagrees: boolean;
  /** "3 of 6", the boxes. */
  boxes: string | null;
  /** The one quiet line under the pair, when they disagree. */
  note: string | null;
}

export interface ComposedUserSetup {
  /** `designed` when the file has a step or a variable, else `plain`: the masked sections as headed text. */
  kind: 'designed' | 'plain';
  generated: string | null;
  phase: string | null;
  total: number;
  done: number;
  /** "3 of 6 steps done", or null when the file has no step. */
  lead: string | null;
  /** The count part of the lead ("3 of 6") and the rest (" steps done"). */
  leadCount: string | null;
  /** One tone per step in order, for the shared meter. */
  meter: UserSetupTone[];
  status: ComposedStatusLine | null;
  items: ComposedUserSetupItem[];
  tree: ComposedTreeRow[];
  tray: ComposedTrayLeaf[];
  files: ComposedFileCard[];
  /** The item the dock opens on, or null when none is open or the file has no step. */
  firstOpen: number | null;
  bars: ComposedBarGroup[];
  /** The sections that hold no step or variable (every section of a plain model), as masked blocks. */
  plain: ComposedPlainSection[];
  /** What "In the source only" lists: the intro text and the template's footer. */
  sourceOnly: { intro: boolean; footer: boolean };
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function textOrNull(candidate: unknown): string | null {
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null;
}

function listOf(candidate: unknown): unknown[] {
  return Array.isArray(candidate) ? candidate : [];
}

/** A cell's text without its backticks and bold marks, for places a path is read. */
function plainText(text: string): string {
  return text.split('`').join('').split('**').join('').trim();
}

/** A path split at its arrows, each segment trimmed, empty segments dropped. */
function pathSegments(text: string): string[] {
  const out: string[] = [];
  for (const part of plainText(text).split('→')) {
    const segment = part.trim();
    if (segment !== '') out.push(segment);
  }
  return out;
}

function fieldValue(item: ComposedUserSetupItem, key: string): string | null {
  const lower = key.toLowerCase();
  for (const field of item.fields) if (field.key.toLowerCase() === lower) return field.text;
  return null;
}

/** The host of an item's URL field, or null. */
function hostOf(item: ComposedUserSetupItem): string | null {
  const url = fieldValue(item, 'URL');
  if (url === null) return null;
  const at = url.indexOf('://');
  if (at < 0) return null;
  const scheme = url.slice(0, at).toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') return null;
  let end = at + 3;
  while (end < url.length && url[end] !== '/') end += 1;
  const host = url.slice(at + 3, end);
  return host === '' ? null : host;
}

function pathOf(item: ComposedUserSetupItem): string[] {
  if (item.kind === 'variable') return item.source === null ? [] : pathSegments(item.source);
  const location = fieldValue(item, 'Location');
  return location === null ? [] : pathSegments(location);
}

interface TreeNode {
  kids: Map<string, TreeNode>;
  here: { item: number; at: string | null }[];
}

function newNode(): TreeNode {
  return { kids: new Map(), here: [] };
}

/** The tree the "Get it from" column draws, and the items that have no place. */
function composeTree(items: readonly ComposedUserSetupItem[]): { tree: ComposedTreeRow[]; tray: ComposedTrayLeaf[] } {
  const hostRoot = new Map<string, string>();
  for (const item of items) {
    if (item.kind === 'variable') continue;
    const segments = pathOf(item);
    const host = hostOf(item);
    if (segments.length > 0 && host !== null) hostRoot.set(host, segments[0]);
  }
  const root = newNode();
  const tray: ComposedTrayLeaf[] = [];
  for (const item of items) {
    let segments = pathOf(item);
    if (segments.length === 0) {
      const host = hostOf(item);
      const joined = host === null ? undefined : hostRoot.get(host);
      segments = joined === undefined ? [] : [joined];
    }
    if (segments.length === 0) {
      tray.push({ item: item.index });
      continue;
    }
    const at = segments.length > 1 ? (segments.pop() ?? null) : null;
    let node = root;
    for (const segment of segments) {
      let next = node.kids.get(segment);
      if (next === undefined) {
        next = newNode();
        node.kids.set(segment, next);
      }
      node = next;
    }
    node.here.push({ item: item.index, at });
  }
  const rows: ComposedTreeRow[] = [];
  const walk = (node: TreeNode, depth: number, parent: number | null): void => {
    for (const [name, first] of node.kids) {
      let label = name;
      let child = first;
      // A folder with one sub-folder and nothing of its own joins it ("Models → Small"); a root stays whole.
      while (depth > 0 && child.here.length === 0 && child.kids.size === 1) {
        const [[nextName, next]] = [...child.kids];
        label += ` → ${nextName}`;
        child = next;
      }
      const at = rows.length;
      rows.push({ depth, parent, name: label, dir: true, item: null, at: null });
      for (const leaf of child.here) {
        rows.push({ depth: depth + 1, parent: at, name: '', dir: false, item: leaf.item, at: leaf.at });
      }
      walk(child, depth + 1, at);
    }
  };
  walk(root, 0, null);
  return { tree: rows, tray };
}

function toneOf(done: unknown): UserSetupTone {
  if (done === true) return 'complete';
  if (done === false) return 'in-flight';
  return 'quiet';
}

function kindOf(candidate: unknown): ComposedUserSetupItem['kind'] {
  return candidate === 'variable' || candidate === 'account' ? candidate : 'dashboard';
}

function readFields(candidate: unknown): ComposedUserSetupField[] {
  const out: ComposedUserSetupField[] = [];
  for (const raw of listOf(candidate)) {
    if (!isRecord(raw)) continue;
    const key = textOrNull(raw.key);
    if (key === null) continue;
    out.push({ key, text: typeof raw.text === 'string' ? raw.text : '' });
  }
  return out;
}

function composeItems(raw: Record<string, unknown>): ComposedUserSetupItem[] {
  const items: ComposedUserSetupItem[] = [];
  for (const step of listOf(raw.steps)) {
    if (!isRecord(step)) continue;
    const title = textOrNull(step.title);
    if (title === null) continue;
    const tone = toneOf(step.done);
    items.push({
      index: items.length,
      kind: kindOf(step.kind),
      title,
      tone,
      word: STEP_WORDS[tone],
      group: textOrNull(step.group) ?? '',
      hadValue: step.hadValue === true,
      source: textOrNull(step.source),
      destination: textOrNull(step.destination),
      fields: readFields(step.fields),
    });
  }
  // A variable the file lists without a Status box is not a step, but it still goes somewhere: it is listed, unclassified.
  for (const variable of listOf(raw.variables)) {
    if (!isRecord(variable) || variable.step === true) continue;
    const name = textOrNull(variable.name);
    if (name === null) continue;
    items.push({
      index: items.length,
      kind: 'variable',
      title: name,
      tone: null,
      word: null,
      group: textOrNull(variable.group) ?? 'Environment Variables',
      hadValue: variable.hadValue === true,
      source: textOrNull(variable.source),
      destination: textOrNull(variable.destination),
      fields: [],
    });
  }
  return items;
}

function composeStatus(word: string | null, done: number, total: number): ComposedStatusLine | null {
  if (word === null) return null;
  const lower = word.toLowerCase();
  const incomplete = lower.startsWith('incomplete');
  const complete = !incomplete && lower.startsWith('complete');
  const open = total - done;
  const disagrees = total > 0 && ((complete && open > 0) || (incomplete && open === 0));
  if (!disagrees) return { word, disagrees: false, boxes: null, note: null };
  const tail = open > 0 ? `with ${open} ${open === 1 ? 'box' : 'boxes'} still open` : 'with every box ticked';
  return {
    word,
    disagrees: true,
    boxes: `${done} of ${total}`,
    note: `These disagree: the file is marked ${word} ${tail}. Both are shown as written.`,
  };
}

function composeFiles(items: readonly ComposedUserSetupItem[], hasSteps: boolean): ComposedFileCard[] {
  const cards: ComposedFileCard[] = [];
  for (const item of items) {
    if (item.kind !== 'variable') continue;
    let card = cards.find((c) => c.name === item.destination);
    if (card === undefined) {
      card = { name: item.destination, setLabel: null, lines: [] };
      cards.push(card);
    }
    card.lines.push(item.index);
  }
  if (hasSteps) {
    for (const card of cards) {
      const set = card.lines.filter((index) => items[index].tone === 'complete').length;
      card.setLabel = `${set} of ${card.lines.length} set`;
    }
  }
  return cards;
}

function composeBars(
  items: readonly ComposedUserSetupItem[],
  sectionHeadings: readonly string[],
): ComposedBarGroup[] {
  const barGroups: ComposedBarGroup[] = [];
  const headings = [...sectionHeadings];
  for (const item of items) if (!headings.includes(item.group)) headings.push(item.group);
  for (const heading of headings) {
    const inGroup = items.filter((item) => item.group === heading);
    if (inGroup.length === 0) continue;
    const steps = inGroup.filter((item) => item.tone !== null);
    const done = steps.filter((item) => item.tone === 'complete').length;
    barGroups.push({
      heading,
      count: steps.length === 0 ? null : `${done} of ${steps.length}`,
      items: inGroup.map((item) => item.index),
    });
  }
  return barGroups;
}


function isFenceLine(trimmed: string): boolean {
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

/** A horizontal rule of dashes: the template's footer opens after one. */
function isRuleLine(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  for (let i = 0; i < trimmed.length; i += 1) if (trimmed.charCodeAt(i) !== 45) return false;
  return true;
}

/** A table separator row (`|---|---|`). */
function isSeparatorLine(trimmed: string): boolean {
  if (trimmed.charCodeAt(0) !== 124) return false;
  let dashes = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    const c = trimmed.charCodeAt(i);
    if (c === 45) dashes += 1;
    else if (c !== 124 && c !== 58 && c !== 32) return false;
  }
  return dashes > 0;
}

/** The text of a list item (`- x`, `* x`, `1. x`), or null when the line is not one. */
function listItemText(trimmed: string): string | null {
  const first = trimmed.charCodeAt(0);
  if ((first === 45 || first === 42 || first === 43) && trimmed.charCodeAt(1) === 32) return trimmed.slice(2).trim();
  let i = 0;
  while (i < trimmed.length && trimmed.charCodeAt(i) >= 48 && trimmed.charCodeAt(i) <= 57) i += 1;
  if (i > 0 && i < 4 && (trimmed.charAt(i) === '.' || trimmed.charAt(i) === ')') && trimmed.charCodeAt(i + 1) === 32) {
    return trimmed.slice(i + 2).trim();
  }
  return null;
}

/** The section's lines up to the template's footer rule (outside fences), and whether a footer with text follows it. */
function splitFooter(lines: readonly string[]): { body: readonly string[]; footer: boolean } {
  let fence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (isFenceLine(trimmed)) {
      fence = !fence;
      continue;
    }
    if (fence || i === 0 || !isRuleLine(trimmed)) continue;
    let footer = false;
    for (let j = i + 1; j < lines.length; j += 1) if (lines[j].trim() !== '') footer = true;
    return { body: lines.slice(0, i), footer };
  }
  return { body: lines, footer: false };
}

/** A section's masked lines as blocks: paragraphs, list items, sub-headings, table rows as text, fenced commands and the
 * `#` comment lines inside a fence as notes. */
function blocksOf(lines: readonly string[]): UserSetupBlock[] {
  const blocks: UserSetupBlock[] = [];
  let paragraph: string[] = [];
  let fence = false;
  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ kind: 'text', text: paragraph.join(' '), bullet: false });
    paragraph = [];
  };
  for (const line of lines) {
    if (blocks.length >= BLOCK_CAP) break;
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      flush();
      fence = !fence;
      continue;
    }
    if (fence) {
      if (trimmed === '') continue;
      if (trimmed.charCodeAt(0) === 35) {
        blocks.push({ kind: 'note', text: trimmed });
        continue;
      }
      const command = stripControlCharacters(trimmed);
      blocks.push({ kind: 'command', text: command, copyable: command !== '' && !command.includes(VALUE_NOT_SHOWN_MARK) });
      continue;
    }
    if (trimmed === '') {
      flush();
      continue;
    }
    if (trimmed.charCodeAt(0) === 35) {
      flush();
      let at = 0;
      while (trimmed.charCodeAt(at) === 35) at += 1;
      const text = trimmed.slice(at).trim();
      if (text !== '') blocks.push({ kind: 'heading', text });
      continue;
    }
    if (trimmed.charCodeAt(0) === 124) {
      flush();
      if (isSeparatorLine(trimmed)) continue;
      const cells = trimmed.split('|').map((cell) => cell.trim()).filter((cell) => cell !== '');
      if (cells.length > 0) blocks.push({ kind: 'text', text: cells.join(' · '), bullet: false });
      continue;
    }
    const item = listItemText(trimmed);
    if (item !== null) {
      flush();
      if (item !== '') blocks.push({ kind: 'text', text: item, bullet: true });
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

function composePlain(
  raw: Record<string, unknown>,
  claimed: ReadonlySet<string>,
): { plain: ComposedPlainSection[]; footer: boolean } {
  const plain: ComposedPlainSection[] = [];
  let footer = false;
  for (const section of listOf(raw.sections)) {
    if (!isRecord(section)) continue;
    const heading = textOrNull(section.heading);
    if (heading === null) continue;
    const lines = listOf(section.lines).filter((line): line is string => typeof line === 'string');
    const split = splitFooter(lines);
    if (split.footer) footer = true;
    if (claimed.has(heading)) continue;
    const blocks = blocksOf(split.body);
    if (blocks.length > 0) plain.push({ heading, blocks });
  }
  return { plain, footer };
}

/** Composes the User setup page, or `null` when there is no projection to read. */
export function composeUserSetup(input: ViewInput): ComposedUserSetup | null {
  const raw = input.structured?.userSetup;
  if (!isRecord(raw)) return null;
  const items = composeItems(raw);
  const stepItems = items.filter((item) => item.tone !== null);
  const total = stepItems.length;
  const done = stepItems.filter((item) => item.tone === 'complete').length;
  const sectionHeadings: string[] = [];
  for (const section of listOf(raw.sections)) {
    if (!isRecord(section)) continue;
    const heading = textOrNull(section.heading);
    if (heading !== null) sectionHeadings.push(heading);
  }
  const designed = items.length > 0;
  const bars = composeBars(items, sectionHeadings);
  const claimed = new Set(bars.map((bar) => bar.heading));
  const { plain, footer } = composePlain(raw, designed ? claimed : new Set<string>());
  const { tree, tray } = composeTree(items);
  const firstOpen = stepItems.find((item) => item.tone !== 'complete');
  return {
    kind: designed ? 'designed' : 'plain',
    generated: textOrNull(raw.generated),
    phase: textOrNull(raw.phase),
    total,
    done,
    lead: total > 0 ? `${done} of ${total} steps done` : null,
    leadCount: total > 0 ? `${done} of ${total}` : null,
    meter: stepItems.map((item) => item.tone ?? 'quiet'),
    status: composeStatus(textOrNull(raw.status), done, total),
    items,
    tree,
    tray,
    files: composeFiles(items, total > 0),
    firstOpen: firstOpen === undefined ? null : firstOpen.index,
    bars,
    plain,
    sourceOnly: { intro: raw.hasIntro === true, footer },
  };
}
