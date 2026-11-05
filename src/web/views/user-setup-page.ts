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
//   - below, the steps as closed bars by section.
// Every string comes from `structured.userSetup`, which the handler has already masked: the composer never reads the
// document HTML, so a value a person pasted into the file cannot reach the page through it (CONTEXT D-11, T-10-33). No
// DOM, no filesystem access, no rendering, no regular expression and no module-level state: two user setup pages open at
// once each compose only from their own input. Returns `null` when the projection is missing (the page then shows the
// sanctioned empty note, never the document).
import type { ViewInput } from './manifest.ts';

/** The three tones this page writes: done is `complete`, pending `in-flight`, a step it cannot classify `quiet`. */
export type UserSetupTone = 'complete' | 'in-flight' | 'quiet';

export const STEPS_NOT_STATED_LABEL = 'Steps not stated';
export const NO_PLACE_LABEL = 'No place stated';
export const NO_FILE_LABEL = 'No file stated';

/** The word beside a step's square. */
export const STEP_WORDS: Readonly<Record<UserSetupTone, string>> = {
  complete: 'Done',
  'in-flight': 'Pending',
  quiet: 'Not stated',
};

export interface ComposedUserSetupField {
  key: string;
  value: string;
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
  for (const field of item.fields) if (field.key.toLowerCase() === lower) return field.value;
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

function kindOf(value: unknown): ComposedUserSetupItem['kind'] {
  return value === 'variable' || value === 'account' ? value : 'dashboard';
}

function readFields(value: unknown): ComposedUserSetupField[] {
  const out: ComposedUserSetupField[] = [];
  for (const raw of listOf(value)) {
    if (!isRecord(raw)) continue;
    const key = textOrNull(raw.key);
    if (key === null) continue;
    out.push({ key, value: typeof raw.value === 'string' ? raw.value : '' });
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
  const groups: ComposedBarGroup[] = [];
  const headings = [...sectionHeadings];
  for (const item of items) if (!headings.includes(item.group)) headings.push(item.group);
  for (const heading of headings) {
    const inGroup = items.filter((item) => item.group === heading);
    if (inGroup.length === 0) continue;
    const steps = inGroup.filter((item) => item.tone !== null);
    const done = steps.filter((item) => item.tone === 'complete').length;
    groups.push({
      heading,
      count: steps.length === 0 ? null : `${done} of ${steps.length}`,
      items: inGroup.map((item) => item.index),
    });
  }
  return groups;
}

/** Composes the User setup page, or `null` when there is no projection to read. */
export function composeUserSetup(input: ViewInput): ComposedUserSetup | null {
  const raw = input.structured?.userSetup;
  if (!isRecord(raw)) return null;
  const items = composeItems(raw);
  if (items.length === 0) return null;
  const stepItems = items.filter((item) => item.tone !== null);
  const total = stepItems.length;
  const done = stepItems.filter((item) => item.tone === 'complete').length;
  const sectionHeadings: string[] = [];
  for (const section of listOf(raw.sections)) {
    if (!isRecord(section)) continue;
    const heading = textOrNull(section.heading);
    if (heading !== null) sectionHeadings.push(heading);
  }
  const { tree, tray } = composeTree(items);
  const firstOpen = stepItems.find((item) => item.tone !== 'complete');
  return {
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
    bars: composeBars(items, sectionHeadings),
  };
}
