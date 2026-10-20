// MILESTONES.md — the log of shipped milestones, one `## vX.Y Name (Shipped: YYYY-MM-DD)` section
// per entry, newest first. Each entry is a run of `**Label:** value` fields; a value is the rest of
// its line plus any wrapped lines under it, or a bullet list. The template's labels (Delivered,
// Phases completed, Key accomplishments, Stats, Git range, What's next) are picked out by name;
// every other label a project adds (Closeout, Archive, Deferred at close, ...) is kept in order as
// an extra field, so nothing the author wrote is dropped.
//
// Every scan below is one linear pass over lines with bounded, single-line patterns, and section,
// entry and field sizes are capped before any of it runs.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections } from './markdown-sections.ts';

const MAX_SECTION_CHARS = 100_000;
const MAX_ENTRIES = 200;
const MAX_FIELDS = 40;
const MAX_ITEMS = 200;
const MAX_TEXT_CHARS = 4_000;

export interface MilestoneField {
  /** The bold label without its colon: `Delivered`, `Key accomplishments`, `Closeout`. */
  label: string;
  /** The value's prose, wrapped lines joined by a space; empty when the value is only a list. */
  text: string;
  /** The value's bullet list, one entry per `- ` / `* ` / `1. ` item. */
  items: string[];
}

export interface MilestoneEntry {
  /** `v1.1`, as the heading wrote it. */
  version: string;
  /** The heading's name, without the version or the parenthetical. */
  name: string;
  /** The `Shipped:` date as YYYY-MM-DD, or null when the heading carries none. */
  shipped: string | null;
  /** The heading's parenthetical when it is not a ship date, e.g. `In Progress`. */
  status: string | null;
  /** `Delivered:` (or `Delivering:` on an entry still in progress). */
  delivered: string | null;
  /** `Phases completed:` (or `Phases in progress:`). */
  phases: string | null;
  accomplishments: string[];
  stats: MilestoneField | null;
  gitRange: string | null;
  whatsNext: string | null;
  /** Every other labelled field, in document order. */
  extra: MilestoneField[];
}

// `v1.1 Legible Documents (Shipped: 2026-09-21)` — the parenthetical is optional and must close the
// line. Both captures are bounded so a long heading cannot backtrack.
const ENTRY_HEADING_RE = /^(v\d+(?:\.\d+){0,3})\b[\s:—–-]*([^()]{0,200}?)\s*(?:\(([^()]{1,120})\))?\s*$/i;
const SHIPPED_RE = /^shipped:?\s*(\d{4}-\d{2}-\d{2})\b/i;
// `**Delivered:** text` and the less common `**Delivered**: text`.
const FIELD_LINE_RE = /^\*\*([^*]{1,80}?)(?::\*\*|\*\*:)\s*(.*)$/;
const ITEM_LINE_RE = /^\s*(?:[-*]|\d{1,3}[.)])\s+(.*)$/;

function cap(text: string): string {
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS - 1)}…` : text;
}

function readFields(body: string): MilestoneField[] {
  const fields: MilestoneField[] = [];
  let current: MilestoneField | null = null;
  let lastItem = -1;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (/^-{3,}$/.test(trimmed)) break;
    const field = trimmed.match(FIELD_LINE_RE);
    if (field) {
      if (fields.length >= MAX_FIELDS) break;
      current = { label: field[1].trim(), text: field[2].trim(), items: [] };
      fields.push(current);
      lastItem = -1;
      continue;
    }
    if (!current || trimmed === '') continue;
    const item = line.match(ITEM_LINE_RE);
    if (item) {
      if (current.items.length < MAX_ITEMS) current.items.push(item[1].trim());
      lastItem = current.items.length - 1;
      continue;
    }
    // An indented line under a bullet wraps that bullet; anything else wraps the prose.
    if (lastItem >= 0 && /^\s{2,}/.test(line)) {
      current.items[lastItem] = `${current.items[lastItem]} ${trimmed}`;
    } else {
      current.text = current.text ? `${current.text} ${trimmed}` : trimmed;
    }
  }

  return fields.map((entry) => ({
    label: entry.label,
    text: cap(entry.text),
    items: entry.items.map(cap),
  }));
}

/** The field's prose, or its list joined into one line when it has no prose. */
function fieldText(field: MilestoneField | undefined): string | null {
  if (!field) return null;
  const text = field.text || field.items.join('; ');
  return text || null;
}

const KNOWN: Record<string, RegExp> = {
  delivered: /^deliver(?:ed|ing)$/i,
  phases: /^phases?\b/i,
  accomplishments: /^key accomplishments$/i,
  stats: /^stats$/i,
  gitRange: /^git range$/i,
  whatsNext: /^what[’']?s next$/i,
};

function readEntry(heading: string, body: string): MilestoneEntry | null {
  const match = heading.match(ENTRY_HEADING_RE);
  if (!match) return null;
  const paren = match[3]?.trim() ?? null;
  const shipped = paren?.match(SHIPPED_RE)?.[1] ?? null;

  const fields = readFields(body.slice(0, MAX_SECTION_CHARS));
  const claimed = new Set<MilestoneField>();
  const take = (key: keyof typeof KNOWN): MilestoneField | undefined => {
    const field = fields.find((candidate) => !claimed.has(candidate) && KNOWN[key].test(candidate.label));
    if (field) claimed.add(field);
    return field;
  };

  const delivered = take('delivered');
  const phases = take('phases');
  const accomplishments = take('accomplishments');
  const stats = take('stats');
  const gitRange = take('gitRange');
  const whatsNext = take('whatsNext');

  return {
    version: match[1],
    name: match[2].trim(),
    shipped,
    status: shipped ? null : paren,
    delivered: fieldText(delivered),
    phases: fieldText(phases),
    accomplishments: accomplishments
      ? accomplishments.items.length > 0
        ? accomplishments.items
        : accomplishments.text
          ? [accomplishments.text]
          : []
      : [],
    stats: stats ?? null,
    gitRange: fieldText(gitRange),
    whatsNext: fieldText(whatsNext),
    extra: fields.filter((field) => !claimed.has(field)),
  };
}

export function parseMilestoneEntries(body: string): MilestoneEntry[] {
  const entries: MilestoneEntry[] = [];
  for (const section of splitSections(body)) {
    if (entries.length >= MAX_ENTRIES) break;
    const entry = readEntry(section.heading, section.body);
    if (entry) entries.push(entry);
  }
  return entries;
}

export const MilestonesHandler: ArtifactHandler = {
  kind: 'milestones',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'MILESTONES.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: { entries: parseMilestoneEntries(fm.body) },
    };
  },
};
