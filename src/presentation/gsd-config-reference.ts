// The pure parser of GSD's own configuration reference (quick-261114-42r, sketch 065 variant A). Labelore does not copy GSD's
// key list; it reads the installed gsd-core's `references/planning-config.md` (the "Complete Field Reference" tables and the
// "Field Interactions" list) and its two manifests (`bin/shared/config-schema.manifest.json` and
// `bin/shared/config-defaults.manifest.json`), and this module turns those three texts into the one wire shape the settings page
// composes with a project's config.json. The files belong to GSD, so the parse is tolerant: it never throws, a row it cannot
// read is skipped, and a text it cannot use at all answers `{ available: false }` so the page can say so and carry on.
//
// Pure: no filesystem, no environment, no clock, and no imports from server or web. The server reads the three texts
// (src/server/gsd-config-reference.ts) and hands them here. The response carries parsed reference content only: never a path,
// a home directory or an environment value (T-42r-04).

/** One documented key: a row of a Complete Field Reference table. */
export interface GsdReferenceRow {
  /** The key as GSD writes it, backticks removed; an angle-bracket segment (`review.models.<cli>`) stands for any name. */
  key: string;
  /** The Type cell as written (`string|null`, `boolean`, …). */
  type: string;
  /** The Default cell as written, markdown included. */
  defaultText: string;
  /** The Allowed Values literals (backticks removed, quotes kept) when the whole cell is backticked literals; otherwise null. */
  allowed: string[] | null;
  /** The Allowed Values cell as written, markdown included. */
  allowedText: string;
  /** The Description cell as written, markdown included. */
  description: string;
}

/** One `###` section of the Complete Field Reference. */
export interface GsdReferenceSection {
  /** The heading with " Fields" removed (`Core`, `Search & API`, `Hook`). */
  name: string;
  /** The text between the heading and its table; '' when there is none. */
  intro: string;
  rows: GsdReferenceRow[];
}

/** A schema pattern for a family of keys whose name GSD leaves open (`features.<feature_name>`). */
export interface GsdKeyPattern {
  topLevel: string;
  source: string;
  description: string;
}

export interface GsdInteraction {
  title: string;
  text: string;
}

export type GsdConfigReference =
  | {
      available: true;
      sections: GsdReferenceSection[];
      validKeys: string[];
      runtimeKeys: string[];
      patterns: GsdKeyPattern[];
      defaults: Record<string, unknown>;
      interactions: GsdInteraction[];
    }
  | { available: false; reason: 'not-found' | 'unreadable' | 'not-parsed' };

export interface GsdReferenceTexts {
  planningConfig: string;
  schema: string;
  defaults: string | null;
}

/** A pattern source longer than this is dropped: it is compiled into a RegExp, and the file is not ours (T-42r-03). */
export const MAX_PATTERN_SOURCE = 300;

const NOT_PARSED: GsdConfigReference = { available: false, reason: 'not-parsed' };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === 'string') ? (value as string[]) : null;
}

/** The cells of one table row: split on a pipe that is not escaped, an escaped pipe becoming a literal one. */
function cellsOf(line: string): string[] {
  let inner = line.trim();
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|') && !inner.endsWith('\\|')) inner = inner.slice(0, -1);
  return inner.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

const LITERAL_LIST = /^`[^`]*`(?:\s*,\s*`[^`]*`)*$/;

/** The literals of an Allowed Values cell, only when the whole cell is backticked literals separated by commas. */
function literalsOf(cell: string): string[] | null {
  if (!LITERAL_LIST.test(cell)) return null;
  const out: string[] = [];
  for (const match of cell.matchAll(/`([^`]*)`/g)) out.push(match[1] ?? '');
  return out;
}

function sectionBetween(lines: string[], startPattern: RegExp): string[] | null {
  const start = lines.findIndex((line) => startPattern.test(line));
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s/.test(lines[index] ?? '')) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function parseSections(lines: string[]): GsdReferenceSection[] {
  const sections: GsdReferenceSection[] = [];
  const seen = new Set<string>();
  let current: { name: string; intro: string[]; rows: GsdReferenceRow[]; sawTable: boolean; headerSkipped: number } | null = null;
  const close = (): void => {
    if (current === null) return;
    sections.push({ name: current.name, intro: current.intro.join(' ').replace(/\s+/g, ' ').trim(), rows: current.rows });
    current = null;
  };
  for (const raw of lines) {
    const heading = /^###\s+(.+?)\s*$/.exec(raw);
    if (heading !== null) {
      close();
      current = { name: (heading[1] ?? '').replace(/\s+Fields$/i, '').trim(), intro: [], rows: [], sawTable: false, headerSkipped: 0 };
      continue;
    }
    if (current === null) continue;
    const line = raw.trim();
    if (line.startsWith('|')) {
      current.sawTable = true;
      // The first two table lines are the header and its separator.
      if (current.headerSkipped < 2) {
        current.headerSkipped += 1;
        continue;
      }
      const cells = cellsOf(line);
      if (cells.length !== 5) continue;
      const [keyCell = '', type = '', defaultText = '', allowedText = '', description = ''] = cells;
      const key = keyCell.replace(/`/g, '').trim();
      if (key === '' || seen.has(key)) continue;
      seen.add(key);
      current.rows.push({ key, type, defaultText, allowed: literalsOf(allowedText), allowedText, description });
    } else if (!current.sawTable && line !== '' && line !== '---') {
      current.intro.push(line);
    }
  }
  close();
  return sections;
}

function parseInteractions(lines: string[]): GsdInteraction[] {
  const out: GsdInteraction[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const item = /^\d+\.\s+\*\*(.+?)\*\*\s*(?:--|—|:)?\s*(.*)$/.exec(line);
    if (item !== null) {
      out.push({ title: (item[1] ?? '').trim(), text: (item[2] ?? '').trim() });
    } else if (line !== '' && line !== '---' && out.length > 0) {
      const last = out[out.length - 1];
      if (last !== undefined) last.text = `${last.text} ${line}`.trim();
    }
  }
  return out;
}

/** The defaults manifest flattened to dotted keys; top-level keys that start with an underscore (`_comment`) are skipped. */
function flattenDefaults(value: unknown): Record<string, unknown> {
  const out = new Map<string, unknown>();
  const walk = (node: Record<string, unknown>, prefix: string, top: boolean): void => {
    for (const name of Object.keys(node)) {
      if (top && name.startsWith('_')) continue;
      const path = prefix + name;
      const child = node[name];
      if (isPlainObject(child) && Object.keys(child).length > 0) walk(child, `${path}.`, false);
      else out.set(path, child);
    }
  };
  if (isPlainObject(value)) walk(value, '', true);
  return Object.fromEntries(out);
}

function parseJson(text: string | null): unknown {
  if (text === null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function patternsOf(value: unknown): GsdKeyPattern[] {
  if (!Array.isArray(value)) return [];
  const out: GsdKeyPattern[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const { topLevel, source, description } = item;
    if (typeof topLevel !== 'string' || typeof source !== 'string') continue;
    if (source.length > MAX_PATTERN_SOURCE) continue;
    try {
      new RegExp(source);
    } catch {
      continue;
    }
    out.push({ topLevel, source, description: typeof description === 'string' ? description : '' });
  }
  return out;
}

/**
 * The reference parsed from the three texts. Never throws. `{ available: false, reason: 'not-parsed' }` when there is no
 * Complete Field Reference row, or the schema is not JSON holding a string-array `validKeys`; an unusable defaults manifest
 * only means no defaults for undocumented keys.
 */
export function parseGsdConfigReference({ planningConfig, schema, defaults }: GsdReferenceTexts): GsdConfigReference {
  try {
    const lines = planningConfig.split(/\r?\n/);
    const reference = sectionBetween(lines, /^##\s+Complete Field Reference\s*$/);
    if (reference === null) return NOT_PARSED;
    const sections = parseSections(reference).filter((section) => section.rows.length > 0);
    if (sections.length === 0) return NOT_PARSED;

    const manifest = parseJson(schema);
    if (!isPlainObject(manifest)) return NOT_PARSED;
    const validKeys = stringArray(manifest.validKeys);
    if (validKeys === null) return NOT_PARSED;

    const interactionLines = sectionBetween(lines, /^##\s+Field Interactions\s*$/) ?? [];
    return {
      available: true,
      sections,
      validKeys,
      runtimeKeys: stringArray(manifest.runtimeStateKeys) ?? [],
      patterns: patternsOf(manifest.dynamicKeyPatterns),
      defaults: flattenDefaults(parseJson(defaults)),
      interactions: parseInteractions(interactionLines),
    };
  } catch {
    return NOT_PARSED;
  }
}
