// The settings page's composer (quick-261114-42r, SET-01, sketch 065 variant A "Reference doc"): a pure function from GSD's
// parsed configuration reference, the project's already-masked config.json and its source text to the sections, entries, counts
// and lines the page draws. Every key GSD understands is on the page, set or not, so the page reads as a reference for what can
// be configured, with this project's value and line beside each key.
//
// Three tiers. A documented key has a row in GSD's Complete Field Reference (description, type, default, allowed values). An
// accepted key is in GSD's schema but has no description there; it folds at its section's foot. A key in config.json that GSD's
// schema does not know is not recognised and is shown as written. The reference is shown whatever the config is: a missing or
// unreadable config.json just means no values.
//
// The walk is the 063 composer's, tightened: descend into a plain object only where some key GSD knows sits below it, a key whose
// own name holds a dot is never matched (it stays unknown under its literal path), keys match exactly and case-sensitively, only
// own keys are read, and null counts as set. It reads the handler's masked frontmatter only (D-08), so a secret that reached this
// function is already masked; the masked kind is read from the one masking list (SECRET_CONFIG_KEYS).
//
// Pure: no DOM, no filesystem, no clock, no module-level mutable state, so equal inputs give deep-equal output.
import { SECRET_CONFIG_KEYS } from '../../planning-repo/secret-mask.ts';
import {
  SETTINGS_CATALOGUE,
  SETTINGS_SECTION_NAMES,
  SETTINGS_SECTION_ORDER,
  UNDOCUMENTED_HOMES,
} from '../../presentation/settings-catalogue.ts';
import type { GsdConfigReference, GsdInteraction, GsdReferenceRow } from '../../presentation/gsd-config-reference.ts';
import type { SourceParseError } from '../../server/source-text.ts';

/** What the page is a page of: the project's config.json, or the reason there is none to read. */
export type SettingsSubject = { state: 'ready'; config: Record<string, unknown> } | { state: 'unreadable' } | { state: 'missing' };

/** A value in the shape it arrives in. */
export type SettingsValue =
  | { kind: 'boolean'; on: boolean }
  | { kind: 'null' }
  | { kind: 'masked'; text: string }
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'list'; value: unknown[] }
  | { kind: 'object'; value: Record<string, unknown> };

export interface AllowedOption {
  text: string;
  /** This project's value, lit. */
  current: boolean;
  /** GSD's default, labelled under the option. */
  isDefault: boolean;
}

export interface RelatedNote {
  title: string;
  first: string;
}

export interface SettingsEntry {
  /** The key as GSD writes it (a documented angle-bracket row keeps its `<cli>`), or the path as written for an unknown one. */
  key: string;
  /** The element id: `k-` + the key, `u-` + the path for a key GSD does not recognise. */
  id: string;
  label: string | null;
  tier: 'documented' | 'accepted' | 'unknown';
  type: string;
  defaultText: string;
  allowed: AllowedOption[] | null;
  allowedText: string;
  first: string;
  rest: string;
  related: RelatedNote[];
  set: boolean;
  value: SettingsValue | null;
  line: number | null;
  /** True for an object with more than one key and for a non-empty list: the value takes the entry's full width. */
  wide: boolean;
}

export interface SettingsSection {
  id: string;
  name: string;
  intro: string;
  /** Documented keys, in GSD's table order. */
  entries: SettingsEntry[];
  /** Keys GSD accepts but does not describe, plus matches of GSD's open-name patterns. */
  accepted: SettingsEntry[];
  setCount: number;
  total: number;
}

export interface SettingsCounts {
  understood: number;
  set: number;
  notSet: number;
  notRecognised: number;
}

export type ConfigState = 'ready' | 'missing' | 'unreadable';

export type SettingsModel =
  | {
      state: 'reference';
      config: ConfigState;
      parseError: SourceParseError | null;
      sections: SettingsSection[];
      unknown: SettingsEntry[];
      counts: SettingsCounts;
    }
  | { state: 'values-only'; config: ConfigState; parseError: SourceParseError | null; entries: SettingsEntry[] };

export interface SettingsSource {
  text: string;
  parseError: SourceParseError | null;
}

interface SettingsSubjectOptions {
  /** The workstream scope; anything but null means this is a workstream's own config.json, a plain file (D-11). */
  scope: string | null;
  /** True when the config.json did not parse (D-11). */
  unreadable: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The subject the page is about, from the document's parsed frontmatter: unreadable for a file that did not parse, null for a
 * workstream's own config.json or data that is not an object (the plain-file view stays), otherwise ready. */
export function settingsSubjectOf(frontmatter: unknown, options: SettingsSubjectOptions): SettingsSubject | null {
  if (options.unreadable) return { state: 'unreadable' };
  if (options.scope !== null) return null;
  if (!isPlainObject(frontmatter)) return null;
  return { state: 'ready', config: frontmatter };
}

// ---------------------------------------------------------------------------------------------------------
// Text helpers (ported from the sketch)
// ---------------------------------------------------------------------------------------------------------

/** GSD's description without its issue references and its italic `_Alias:_`-style tail. */
function clean(text: string): string {
  return text
    .replace(/\s*\((?:#\d+[^)]*|ADR-[^)]*)\)/g, '')
    .replace(/\s*_[A-Za-z][A-Za-z ]*:_.*$/s, '')
    .trim();
}

/** The first sentence, and the rest. */
function split(text: string): { first: string; rest: string } {
  const cleaned = clean(text);
  const match = /^(.+?[.!?])(\s+[A-Z`(].*)?$/s.exec(cleaned);
  return match === null ? { first: cleaned, rest: '' } : { first: (match[1] ?? '').trim(), rest: (match[2] ?? '').trim() };
}

function relatedNotes(key: string, interactions: readonly GsdInteraction[]): RelatedNote[] {
  const leaf = key.split('.').pop() ?? key;
  return interactions
    .filter(
      (note) =>
        note.title.includes(leaf) || (leaf.length > 6 && note.text.includes(`\`${key}\``)) || note.text.includes(`\`${leaf}\``),
    )
    .slice(0, 2)
    .map((note) => ({ title: note.title, first: split(note.text).first }));
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function holdsString(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.some(holdsString);
  if (isPlainObject(value)) return Object.values(value).some(holdsString);
  return false;
}

function valueOf(value: unknown, top: string): SettingsValue {
  if (SECRET_CONFIG_KEYS.has(top) && holdsString(value)) {
    return { kind: 'masked', text: typeof value === 'string' ? value : JSON.stringify(value) };
  }
  if (typeof value === 'boolean') return { kind: 'boolean', on: value };
  if (value === null) return { kind: 'null' };
  if (typeof value === 'number') return { kind: 'number', text: String(value) };
  if (typeof value === 'string') return { kind: 'string', text: value };
  if (Array.isArray(value)) return { kind: 'list', value };
  if (isPlainObject(value)) return { kind: 'object', value };
  return { kind: 'string', text: String(value) };
}

function isWide(value: SettingsValue | null): boolean {
  if (value === null) return false;
  if (value.kind === 'object') return Object.keys(value.value).length > 1;
  return value.kind === 'list' && value.value.length > 0;
}

/** A value as the filter reads it. */
function valueText(value: SettingsValue | null): string {
  if (value === null) return '';
  switch (value.kind) {
    case 'boolean':
      return String(value.on);
    case 'null':
      return 'null';
    case 'masked':
    case 'number':
    case 'string':
      return value.text;
    case 'list':
    case 'object':
      return JSON.stringify(value.value);
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Line lookup
// ---------------------------------------------------------------------------------------------------------

/**
 * The 1-based line of every object key in a JSON text, by its dotted path (nested objects only, never into arrays). The first
 * occurrence of a path wins. A tolerant scan, not a parser: it never throws, and on a text that is not valid JSON it gives the
 * lines of what it could read.
 */
export function jsonKeyLines(text: string): Map<string, number> {
  const lines = new Map<string, number>();
  interface Frame {
    kind: 'o' | 'a';
    /** The dotted path of this object; null inside an array, where nothing is tracked. */
    path: string | null;
    expectKey: boolean;
    key: string | null;
  }
  const stack: Frame[] = [];
  let line = 1;
  let index = 0;
  const childPath = (): string | null => {
    const top = stack[stack.length - 1];
    if (top === undefined) return '';
    if (top.kind === 'a' || top.path === null || top.key === null) return null;
    return top.path === '' ? top.key : `${top.path}.${top.key}`;
  };
  while (index < text.length) {
    const char = text[index] ?? '';
    if (char === '\n') {
      line += 1;
      index += 1;
    } else if (char === '"') {
      let value = '';
      index += 1;
      while (index < text.length) {
        const next = text[index] ?? '';
        if (next === '\\') {
          value += text.slice(index, index + 2);
          index += 2;
        } else if (next === '"' || next === '\n') {
          break;
        } else {
          value += next;
          index += 1;
        }
      }
      if (text[index] === '"') index += 1;
      const top = stack[stack.length - 1];
      if (top !== undefined && top.kind === 'o' && top.expectKey) {
        let decoded = value;
        try {
          decoded = JSON.parse(`"${value}"`) as string;
        } catch {
          // keep the raw text
        }
        top.key = decoded;
        top.expectKey = false;
        if (top.path !== null) {
          const path = top.path === '' ? decoded : `${top.path}.${decoded}`;
          if (!lines.has(path)) lines.set(path, line);
        }
      }
    } else if (char === '{') {
      stack.push({ kind: 'o', path: childPath(), expectKey: true, key: null });
      index += 1;
    } else if (char === '[') {
      stack.push({ kind: 'a', path: null, expectKey: false, key: null });
      index += 1;
    } else if (char === '}' || char === ']') {
      stack.pop();
      index += 1;
    } else if (char === ',') {
      const top = stack[stack.length - 1];
      if (top !== undefined && top.kind === 'o') {
        top.expectKey = true;
        top.key = null;
      }
      index += 1;
    } else {
      index += 1;
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------------------------------------

interface Hit {
  path: string;
  top: string;
  value: unknown;
}

type Classification = 'dotted' | 'fixed' | 'doc-pattern' | 'schema-pattern' | 'descend' | 'unknown';

/**
 * Walks the object into leaf entries, in the order the parsed object lists them. `classify` says what each own key is; the walk
 * itself only recurses where it says `descend`.
 */
function walkConfig(
  root: Record<string, unknown>,
  classify: (path: string, name: string, value: unknown) => Classification,
): Array<Hit & { kind: Exclude<Classification, 'descend'> }> {
  const out: Array<Hit & { kind: Exclude<Classification, 'descend'> }> = [];
  const visit = (object: Record<string, unknown>, prefix: string, top: string | null): void => {
    for (const name of Object.keys(object)) {
      const value = object[name];
      const path = prefix + name;
      const topKey = top ?? name;
      const kind = classify(path, name, value);
      if (kind === 'descend' && isPlainObject(value)) visit(value, `${path}.`, topKey);
      else out.push({ path, top: topKey, value, kind: kind === 'descend' ? 'unknown' : kind });
    }
  };
  visit(root, '', null);
  return out;
}

const LABELS: ReadonlyMap<string, string> = new Map(SETTINGS_CATALOGUE.map((entry) => [entry.key, entry.label]));

function labelOf(key: string): string | null {
  return LABELS.get(key) ?? null;
}

/** Every proper dotted prefix of a key: the paths a walk has to open to reach it. */
function addPrefixes(into: Set<string>, key: string): void {
  const parts = key.split('.');
  for (let length = 1; length < parts.length; length += 1) into.add(parts.slice(0, length).join('.'));
}

function firstBackticked(text: string): string | null {
  const match = /`([^`]*)`/.exec(text);
  return match === null ? null : (match[1] ?? '');
}

const stripQuotes = (literal: string): string => literal.replace(/^"|"$/g, '');

function literalMatches(literal: string, value: unknown): boolean {
  try {
    return JSON.stringify(JSON.parse(literal)) === JSON.stringify(value);
  } catch {
    return literal === JSON.stringify(value);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------------------------------------

interface SectionBuilder {
  name: string;
  intro: string;
  entries: SettingsEntry[];
  accepted: SettingsEntry[];
}

function emptyCounts(): SettingsCounts {
  return { understood: 0, set: 0, notSet: 0, notRecognised: 0 };
}

/** The values-only shape: no reference to compose with, so only the values this project's config.json sets. */
function composeValuesOnly(subject: SettingsSubject | null, source: SettingsSource | null): SettingsModel {
  const config: ConfigState = subject === null ? 'missing' : subject.state;
  const parseError = source?.parseError ?? null;
  if (subject === null || subject.state !== 'ready') return { state: 'values-only', config, parseError, entries: [] };
  const known = new Set(SETTINGS_CATALOGUE.map((entry) => entry.key));
  const prefixes = new Set<string>();
  for (const key of known) addPrefixes(prefixes, key);
  const lines = source === null ? null : jsonKeyLines(source.text);
  const hits = walkConfig(subject.config, (path, name, value) => {
    if (name.includes('.')) return 'dotted';
    if (known.has(path)) return 'fixed';
    return isPlainObject(value) && prefixes.has(path) ? 'descend' : 'unknown';
  });
  const entries = hits.map((hit): SettingsEntry => {
    const value = valueOf(hit.value, hit.top);
    return {
      key: hit.path,
      id: `k-${hit.path}`,
      label: labelOf(hit.path),
      tier: 'documented',
      type: '',
      defaultText: '',
      allowed: null,
      allowedText: '',
      first: '',
      rest: '',
      related: [],
      set: true,
      value,
      line: lines?.get(hit.path) ?? null,
      wide: isWide(value),
    };
  });
  return { state: 'values-only', config, parseError, entries };
}

/**
 * Composes the reference, the masked config.json and its source text into the settings model. `subject` is null or missing when
 * there is no config.json, and unreadable when it did not parse: the reference is composed the same either way, only without
 * values. A null or unavailable `reference` gives the values-only shape. Never throws.
 */
export function composeSettingsReference(
  subject: SettingsSubject | null,
  reference: GsdConfigReference | null,
  source: SettingsSource | null,
): SettingsModel {
  if (reference === null || !reference.available) return composeValuesOnly(subject, source);

  const config: ConfigState = subject === null ? 'missing' : subject.state;
  const ready = subject !== null && subject.state === 'ready' ? subject.config : null;
  const parseError = source?.parseError ?? null;
  const lines = ready !== null && source !== null ? jsonKeyLines(source.text) : null;

  // The universe: documented rows, the schema's valid and runtime-state keys, and the open-name families.
  const rows = new Map<string, { row: GsdReferenceRow; section: string }>();
  for (const section of reference.sections) for (const row of section.rows) if (!rows.has(row.key)) rows.set(row.key, { row, section: section.name });
  const fixed = new Set<string>();
  const docPatterns: Array<{ key: string; regex: RegExp }> = [];
  for (const key of rows.keys()) {
    if (!key.includes('<')) {
      fixed.add(key);
      continue;
    }
    try {
      docPatterns.push({ key, regex: new RegExp(`^${key.split(/<[^>]*>/).map(escapeRegExp).join('([^.]+)')}$`) });
    } catch {
      // a row that does not compile is just never matched
    }
  }
  for (const key of reference.validKeys) fixed.add(key);
  for (const key of reference.runtimeKeys) fixed.add(key);
  const schemaPatterns: Array<{ topLevel: string; regex: RegExp }> = [];
  for (const pattern of reference.patterns) {
    try {
      schemaPatterns.push({ topLevel: pattern.topLevel, regex: new RegExp(pattern.source) });
    } catch {
      // dropped
    }
  }
  const prefixes = new Set<string>();
  for (const key of fixed) addPrefixes(prefixes, key);
  for (const { key } of docPatterns) addPrefixes(prefixes, key);
  const topLevels = new Set(schemaPatterns.map((pattern) => pattern.topLevel));

  // The walk.
  const fixedHits = new Map<string, Hit>();
  const docHits = new Map<string, Array<Hit & { remainder: string }>>();
  const schemaHits: Hit[] = [];
  const unknownHits: Hit[] = [];
  if (ready !== null) {
    const docMatch = (path: string): { key: string; remainder: string } | null => {
      for (const pattern of docPatterns) {
        const match = pattern.regex.exec(path);
        if (match !== null) return { key: pattern.key, remainder: match.slice(1).join('.') };
      }
      return null;
    };
    const hits = walkConfig(ready, (path, name, value) => {
      if (name.includes('.')) return 'dotted';
      if (fixed.has(path)) return 'fixed';
      if (docMatch(path) !== null) return 'doc-pattern';
      if (schemaPatterns.some((pattern) => pattern.regex.test(path))) return 'schema-pattern';
      if (isPlainObject(value) && (prefixes.has(path) || topLevels.has(path.split('.')[0] ?? ''))) return 'descend';
      return 'unknown';
    });
    for (const hit of hits) {
      if (hit.kind === 'fixed') fixedHits.set(hit.path, hit);
      else if (hit.kind === 'doc-pattern') {
        const matched = docMatch(hit.path);
        if (matched === null) continue;
        const list = docHits.get(matched.key) ?? [];
        list.push({ ...hit, remainder: matched.remainder });
        docHits.set(matched.key, list);
      } else if (hit.kind === 'schema-pattern') schemaHits.push(hit);
      else unknownHits.push(hit);
    }
  }

  // Which sections hold what: GSD's own sections, plus the homes for keys it has no table for.
  const namespaceHome = new Map<string, string>();
  for (const section of reference.sections) {
    for (const match of section.intro.matchAll(/`([A-Za-z0-9_]+)\.\*`/g)) {
      const namespace = match[1] ?? '';
      if (!namespaceHome.has(namespace)) namespaceHome.set(namespace, section.name);
    }
  }
  const homeOf = (path: string): string => {
    const top = path.split('.')[0] ?? path;
    if (Object.hasOwn(UNDOCUMENTED_HOMES, top)) return UNDOCUMENTED_HOMES[top] ?? 'Advanced';
    if (!path.includes('.')) return 'Core';
    return namespaceHome.get(top) ?? 'Advanced';
  };
  const builders = new Map<string, SectionBuilder>();
  const builderFor = (name: string): SectionBuilder => {
    let builder = builders.get(name);
    if (builder === undefined) {
      builder = { name, intro: '', entries: [], accepted: [] };
      builders.set(name, builder);
    }
    return builder;
  };
  for (const section of reference.sections) builderFor(section.name).intro = section.intro;

  const defaultTextOf = (key: string): string =>
    Object.hasOwn(reference.defaults, key) ? `\`${JSON.stringify(reference.defaults[key])}\`` : '';

  const entryOf = (
    key: string,
    tier: 'documented' | 'accepted',
    row: GsdReferenceRow | null,
    hit: { value: SettingsValue; line: number | null; raw: unknown } | null,
  ): SettingsEntry => {
    const defaultText = row === null ? defaultTextOf(key) : row.defaultText;
    const defaultLiteral = firstBackticked(defaultText);
    const { first, rest } = row === null ? { first: '', rest: '' } : split(row.description);
    const allowed =
      row?.allowed == null
        ? null
        : row.allowed.map(
            (literal): AllowedOption => ({
              text: stripQuotes(literal),
              current: hit !== null && hit.value.kind !== 'masked' && literalMatches(literal, hit.raw),
              isDefault: defaultLiteral !== null && literal === defaultLiteral,
            }),
          );
    return {
      key,
      id: `k-${key}`,
      label: labelOf(key),
      tier,
      type: row?.type ?? '',
      defaultText,
      allowed,
      allowedText: row?.allowedText ?? '',
      first,
      rest,
      related: row === null ? [] : relatedNotes(key, reference.interactions),
      set: hit !== null,
      value: hit?.value ?? null,
      line: hit?.line ?? null,
      wide: isWide(hit?.value ?? null),
    };
  };

  const fixedEntry = (key: string, tier: 'documented' | 'accepted', row: GsdReferenceRow | null): SettingsEntry => {
    const found = fixedHits.get(key);
    const hit = found === undefined ? null : { value: valueOf(found.value, found.top), line: lines?.get(key) ?? null, raw: found.value };
    return entryOf(key, tier, row, hit);
  };

  for (const [key, { row, section }] of rows) {
    const builder = builderFor(section);
    if (!key.includes('<')) {
      builder.entries.push(fixedEntry(key, 'documented', row));
      continue;
    }
    const matched = docHits.get(key);
    if (matched === undefined || matched.length === 0) {
      builder.entries.push(entryOf(key, 'documented', row, null));
      continue;
    }
    const object = Object.fromEntries(matched.map((hit) => [hit.remainder, hit.value]));
    const first = matched[0];
    builder.entries.push(
      entryOf(key, 'documented', row, {
        value: { kind: 'object', value: object },
        line: first === undefined ? null : (lines?.get(first.path) ?? null),
        raw: object,
      }),
    );
  }
  for (const key of [...reference.validKeys, ...reference.runtimeKeys]) {
    if (rows.has(key)) continue;
    const builder = builderFor(homeOf(key));
    if (builder.accepted.some((entry) => entry.key === key)) continue;
    builder.accepted.push(fixedEntry(key, 'accepted', null));
  }
  for (const hit of schemaHits) {
    builderFor(homeOf(hit.path)).accepted.push(
      entryOf(hit.path, 'accepted', null, { value: valueOf(hit.value, hit.top), line: lines?.get(hit.path) ?? null, raw: hit.value }),
    );
  }

  // Order: Labelore's list; a section GSD adds sits just before Advanced; a section with nothing in it is dropped.
  const ordered = SETTINGS_SECTION_ORDER.filter((name) => builders.has(name));
  const extra = [...builders.keys()].filter((name) => !SETTINGS_SECTION_ORDER.includes(name));
  const advanced = ordered.indexOf('Advanced');
  const names = advanced === -1 ? [...ordered, ...extra] : [...ordered.slice(0, advanced), ...extra, ...ordered.slice(advanced)];
  const sections: SettingsSection[] = [];
  for (const name of names) {
    const builder = builders.get(name);
    if (builder === undefined || builder.entries.length + builder.accepted.length === 0) continue;
    const display = Object.hasOwn(SETTINGS_SECTION_NAMES, name) ? (SETTINGS_SECTION_NAMES[name] ?? name) : name;
    sections.push({
      id: `s-${slug(display)}`,
      name: display,
      intro: builder.intro,
      entries: builder.entries,
      accepted: builder.accepted,
      setCount: [...builder.entries, ...builder.accepted].filter((entry) => entry.set).length,
      total: builder.entries.length + builder.accepted.length,
    });
  }

  const unknown = unknownHits.map((hit): SettingsEntry => {
    const value = valueOf(hit.value, hit.top);
    return {
      key: hit.path,
      id: `u-${hit.path}`,
      label: null,
      tier: 'unknown',
      type: '',
      defaultText: '',
      allowed: null,
      allowedText: '',
      first: '',
      rest: '',
      related: [],
      set: true,
      value,
      line: lines?.get(hit.path) ?? null,
      wide: isWide(value),
    };
  });

  const counts = emptyCounts();
  for (const section of sections) {
    counts.understood += section.total;
    counts.set += section.setCount;
  }
  counts.notSet = counts.understood - counts.set;
  counts.notRecognised = unknown.length;
  return { state: 'reference', config, parseError, sections, unknown, counts };
}

// ---------------------------------------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------------------------------------

export type StatusFilter = 'all' | 'set' | 'unset' | 'unknown';

export interface FilterState {
  query: string;
  status: StatusFilter;
}

export interface FilteredSection {
  section: SettingsSection;
  /** The documented entries that match. */
  entries: SettingsEntry[];
  /** The accepted keys that match. */
  accepted: SettingsEntry[];
  /** Whether the accepted-keys fold opens on its own: a query, or no documented entry left to read. */
  foldOpen: boolean;
  /** What the "On this page" row reads: set/total with no filter, otherwise the visible count. */
  rail: string;
  /** True when nothing in the section matches. */
  dim: boolean;
}

export interface FilteredSettings {
  sections: FilteredSection[];
  unknown: SettingsEntry[];
  unknownRail: string;
  unknownDim: boolean;
  /** True when nothing on the page matches. */
  empty: boolean;
}

function entryMatches(entry: SettingsEntry, { query, status }: FilterState): boolean {
  if (status === 'set' && !(entry.set && entry.tier !== 'unknown')) return false;
  if (status === 'unset' && entry.set) return false;
  if (status === 'unknown' && entry.tier !== 'unknown') return false;
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const haystack = [entry.key, entry.label ?? '', entry.first, entry.rest, entry.set ? valueText(entry.value) : ''].join(' ').toLowerCase();
  return haystack.includes(needle);
}

/** The reference model narrowed by the filter box and the status filter. */
export function filterSettings(
  model: Extract<SettingsModel, { state: 'reference' }>,
  state: FilterState,
): FilteredSettings {
  const unfiltered = state.query.trim() === '' && state.status === 'all';
  const sections = model.sections.map((section): FilteredSection => {
    const entries = section.entries.filter((entry) => entryMatches(entry, state));
    const accepted = section.accepted.filter((entry) => entryMatches(entry, state));
    const visible = entries.length + accepted.length;
    return {
      section,
      entries,
      accepted,
      foldOpen: state.query.trim() !== '' || entries.length === 0,
      rail: unfiltered ? `${section.setCount}/${section.total}` : String(visible),
      dim: visible === 0,
    };
  });
  const unknown = model.unknown.filter((entry) => entryMatches(entry, state));
  const empty = sections.every((section) => section.dim) && unknown.length === 0;
  return {
    sections,
    unknown,
    unknownRail: String(unfiltered ? model.unknown.length : unknown.length),
    unknownDim: unknown.length === 0,
    empty,
  };
}
