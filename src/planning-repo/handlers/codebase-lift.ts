// The codebase-map lift (10-05, VIEW-13, TGT-09). The seven documents `/gsd-map-codebase` writes into
// .planning/codebase/ arrive as a projection the Codebase page and the map-only head both read: when the map
// was made (the stamp), the document's sections in file order with a key where a heading is recognised, and,
// for Stack and Concerns, the chips and counts the panel list shows.
//
// Headings match by fuzzy normalisation (D-02), never by exact name, and a heading that matches nothing stays
// a plain section: nothing in a document is dropped. Lookups use Maps only, so an author heading such as
// `constructor` cannot reach an Object member (RESEARCH Pitfall 16).
//
// structured.codebase holds headings, keys, chips and counts, and (10-12) the few lifted parts a designed panel
// draws itself: the System Overview and Directory Layout fences, the Anti-Patterns entries and each concern's
// own lines. Each is capped (T-10-21). Every other section body stays out: the whole structured record ships to
// the browser (T-10-10).
import { eachLineOutsideFences, fenceMarker, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';
import { parseTree, treeCounts } from '../../rendering/ascii-tree.ts';
import { withholdInText, withholdValue } from './withhold-values.ts';

// ---------------------------------------------------------------------------------------------------------
// Heading normalisation and keys
// ---------------------------------------------------------------------------------------------------------

const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

/**
 * The comparison form of a heading: leading emoji, digits and punctuation dropped, lower-cased, an ampersand
 * read as "and", apostrophes removed, every other non-letter and non-digit read as a space, spaces collapsed,
 * and one trailing plural "s" dropped (but not "ss"). "Languages & Runtimes" gives "languages and runtime".
 * A character scan over a capped text; no regular expression over the whole text.
 */
export function normaliseHeading(text: string): string {
  const lowered = (text.length > 400 ? text.slice(0, 400) : text).toLowerCase();
  let out = '';
  let started = false;
  for (const ch of lowered) {
    const letter = LETTER.test(ch);
    if (!started) {
      // Leading emoji, digits and punctuation are dropped; the text starts at its first letter.
      if (!letter) continue;
      started = true;
    }
    if (ch === '&') out += ' and ';
    else if (ch === "'" || ch === '\u2019') continue;
    else if (letter || DIGIT.test(ch)) out += ch;
    else out += ' ';
  }
  let collapsed = '';
  let lastSpace = true;
  for (const ch of out) {
    if (ch === ' ') {
      if (!lastSpace) collapsed += ' ';
      lastSpace = true;
    } else {
      collapsed += ch;
      lastSpace = false;
    }
  }
  if (collapsed.endsWith(' ')) collapsed = collapsed.slice(0, -1);
  if (collapsed.length > 3 && collapsed.endsWith('s') && !collapsed.endsWith('ss')) collapsed = collapsed.slice(0, -1);
  return collapsed;
}

/** [template heading, key id] per document, in the template's own order. Keys stay the full template texts:
 * a short alias would capture a project's added section of the same first word (10-03 finding 2). */
const KEY_TABLE: ReadonlyArray<readonly [doc: string, entries: ReadonlyArray<readonly [heading: string, key: string]>]> = [
  [
    'stack',
    [
      ['Languages', 'languages'],
      ['Runtime', 'runtime'],
      ['Frameworks', 'frameworks'],
      ['Key Dependencies', 'key-dependencies'],
      ['Configuration', 'configuration'],
      ['Platform Requirements', 'platform-requirements'],
    ],
  ],
  [
    'architecture',
    [
      ['System Overview', 'system-overview'],
      ['Component Responsibilities', 'component-responsibilities'],
      ['Pattern Overview', 'pattern-overview'],
      ['Layers', 'layers'],
      ['Data Flow', 'data-flow'],
      ['Key Abstractions', 'key-abstractions'],
      ['Entry Points', 'entry-points'],
      ['Architectural Constraints', 'architectural-constraints'],
      ['Anti-Patterns', 'anti-patterns'],
      ['Error Handling', 'error-handling'],
      ['Cross-Cutting Concerns', 'cross-cutting-concerns'],
    ],
  ],
  [
    'structure',
    [
      ['Directory Layout', 'directory-layout'],
      ['Directory Purposes', 'directory-purposes'],
      ['Key File Locations', 'key-file-locations'],
      ['Naming Conventions', 'naming-conventions'],
      ['Where to Add New Code', 'where-to-add-new-code'],
      ['Special Directories', 'special-directories'],
    ],
  ],
  [
    'conventions',
    [
      ['Naming Patterns', 'naming-patterns'],
      ['Code Style', 'code-style'],
      ['Import Organization', 'import-organization'],
      ['Error Handling', 'error-handling'],
      ['Logging', 'logging'],
      ['Comments', 'comments'],
      ['Function Design', 'function-design'],
      ['Module Design', 'module-design'],
    ],
  ],
  [
    'testing',
    [
      ['Test Framework', 'test-framework'],
      ['Test File Organization', 'test-file-organization'],
      ['Test Structure', 'test-structure'],
      ['Mocking', 'mocking'],
      ['Fixtures and Factories', 'fixtures-and-factories'],
      ['Coverage', 'coverage'],
      ['Test Types', 'test-types'],
      ['Common Patterns', 'common-patterns'],
    ],
  ],
  [
    'integrations',
    [
      ['APIs & External Services', 'external-services'],
      ['Data Storage', 'data-storage'],
      ['Authentication & Identity', 'authentication'],
      ['Monitoring & Observability', 'monitoring'],
      ['CI/CD & Deployment', 'ci-cd'],
      ['Environment Configuration', 'environment-configuration'],
      ['Webhooks & Callbacks', 'webhooks'],
    ],
  ],
  [
    'concerns',
    [
      ['Tech Debt', 'tech-debt'],
      ['Known Bugs', 'known-bugs'],
      ['Security Considerations', 'security-considerations'],
      ['Performance Bottlenecks', 'performance-bottlenecks'],
      ['Fragile Areas', 'fragile-areas'],
      ['Scaling Limits', 'scaling-limits'],
      ['Dependencies at Risk', 'dependencies-at-risk'],
      ['Missing Critical Features', 'missing-critical-features'],
      ['Test Coverage Gaps', 'test-coverage-gaps'],
    ],
  ],
];

/** One Map per document: normalised known heading to key id. */
export const CODEBASE_KEYS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(
  KEY_TABLE.map(([doc, entries]) => [doc, new Map(entries.map(([heading, key]) => [normaliseHeading(heading), key]))]),
);

/** True when `rest` (the text after a matched prefix) begins a new word, or is the plural "s" of the last one. */
function atWordBoundary(rest: string): boolean {
  if (rest.length === 0 || rest.charCodeAt(0) === 32) return true;
  return rest.charCodeAt(0) === 115 && (rest.length === 1 || rest.charCodeAt(1) === 32);
}

/**
 * The key a heading matches in a document, or null. Equal beats prefix beats whole-word containment; among
 * several keys of one tier the longest wins. Map lookups only.
 */
export function matchKey(doc: string, heading: string): string | null {
  const keys = CODEBASE_KEYS.get(doc);
  if (keys === undefined) return null;
  const norm = normaliseHeading(heading);
  if (norm.length === 0) return null;
  const equal = keys.get(norm);
  if (equal !== undefined) return equal;
  let prefix: string | null = null;
  let prefixLen = 0;
  let contained: string | null = null;
  let containedLen = 0;
  const padded = ` ${norm} `;
  for (const [text, key] of keys) {
    if (text.length > prefixLen && norm.startsWith(text) && atWordBoundary(norm.slice(text.length))) {
      prefix = key;
      prefixLen = text.length;
    }
    if (text.length > containedLen && padded.includes(` ${text} `)) {
      contained = key;
      containedLen = text.length;
    }
  }
  return prefix ?? contained;
}

// ---------------------------------------------------------------------------------------------------------
// The stamp
// ---------------------------------------------------------------------------------------------------------

export type StampSource = 'frontmatter' | 'analysis-date' | 'last-updated' | 'refreshed';

export interface MapStamp {
  /** A UTC calendar day, YYYY-MM-DD, or null. */
  mappedAt: string | null;
  /** The first seven characters of the stamped commit, or null. */
  commit: string | null;
  /** Where mappedAt came from; null when mappedAt is null. */
  source: StampSource | null;
}

function validDay(year: number, month: number, day: number): boolean {
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** A YYYY-MM-DD at the start of `text` (after optional whitespace), or null. A character scan. */
function dayAt(text: string): string | null {
  let i = 0;
  while (i < text.length && (text.charCodeAt(i) === 32 || text.charCodeAt(i) === 9)) i += 1;
  const digits = (from: number, n: number): number => {
    let value = 0;
    for (let k = 0; k < n; k += 1) {
      const c = text.charCodeAt(from + k);
      if (c < 48 || c > 57) return -1;
      value = value * 10 + (c - 48);
    }
    return value;
  };
  const year = digits(i, 4);
  const month = digits(i + 5, 2);
  const day = digits(i + 8, 2);
  if (year < 0 || month < 0 || day < 0) return null;
  if (text.charCodeAt(i + 4) !== 45 || text.charCodeAt(i + 7) !== 45) return null;
  return validDay(year, month, day) ? text.slice(i, i + 10) : null;
}

/** The first day found after `marker` on a line whose trimmed start is `lead`, scanning lines until one hits. */
function dayAfterLead(lines: readonly string[], lead: string): string | null {
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(lead)) continue;
    // Skip to the colon, then any bold or italic closers, then read the day.
    const rest = trimmed.slice(lead.length, lead.length + 80);
    let i = 0;
    while (i < rest.length && (rest.charCodeAt(i) === 58 || rest.charCodeAt(i) === 42 || rest.charCodeAt(i) === 32 || rest.charCodeAt(i) === 9)) {
      i += 1;
    }
    const day = dayAt(rest.slice(i));
    if (day !== null) return day;
  }
  return null;
}

function frontmatterDay(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return dayAt(value);
  return null;
}

/**
 * When the map document was made, and at which commit. Frontmatter `last_mapped_at` wins, read as a UTC
 * calendar day (YAML parses an unquoted date to a Date at UTC midnight, so the day never moves with the
 * machine's zone); then `**Analysis Date:**`, `*Last updated:*` and a `<!-- refreshed: DATE -->` comment.
 * The commit is shown only when frontmatter gives a string of at least seven characters (an unquoted
 * all-digit scalar arrives as a number and counts as no commit, RESEARCH A9). Nothing is invented.
 */
export function readMapStamp(
  frontmatter: Record<string, unknown>,
  body: string,
  lines: readonly string[] = [],
): MapStamp {
  const commitRaw = frontmatter.last_mapped_commit;
  const commit = typeof commitRaw === 'string' && commitRaw.trim().length >= 7 ? commitRaw.trim().slice(0, 7) : null;
  const fromFrontmatter = frontmatterDay(frontmatter.last_mapped_at);
  if (fromFrontmatter !== null) return { mappedAt: fromFrontmatter, commit, source: 'frontmatter' };
  const bodyLines = lines.length > 0 ? lines : splitBodyLines(body);
  const analysis = dayAfterLead(bodyLines, '**Analysis Date:');
  if (analysis !== null) return { mappedAt: analysis, commit, source: 'analysis-date' };
  const updated = dayAfterLead(bodyLines, '*Last updated');
  if (updated !== null) return { mappedAt: updated, commit, source: 'last-updated' };
  const refreshed = dayAfterLead(bodyLines, '<!-- refreshed');
  if (refreshed !== null) return { mappedAt: refreshed, commit, source: 'refreshed' };
  return { mappedAt: null, commit, source: null };
}

// ---------------------------------------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------------------------------------

export interface CodebaseSection {
  heading: string;
  level: 2 | 3;
  /** The known key this heading matched, or null for a plain section. */
  key: string | null;
}

export interface CodebaseBody {
  /** The document name: stack, architecture, structure, conventions, testing, integrations or concerns. */
  doc: string;
  stamp: MapStamp;
  /** Every H2 and H3 section in file order. */
  sections: CodebaseSection[];
  /** The number the panel list shows; null until a document's lift sets it. */
  keyNumber: number | null;
  /** Chips for the Stack panel (document stack only). */
  stack?: StackLift;
  /** Counts for the Concerns panel (document concerns only). */
  concerns?: ConcernsLift;
  /** The System Overview diagram, the Anti-Patterns entries and the component count (document architecture only). */
  architecture?: ArchitectureLift;
  /** The Directory Layout tree and its directory count (document structure only). */
  structure?: StructureLift;
  /** The groups, variable names and Environment Configuration (document integrations only). */
  integrations?: IntegrationsLift;
  /** What `keyNumber` counts when it is not the panel's usual unit: Architecture counts layers when the
   * document has no component table. */
  keyUnit?: 'layer';
}

/** A section with its range and the key it claimed. */
export interface KeyedSection extends FencedSection {
  key: string | null;
}

/** Keys the H2 sections of a document; the first heading to claim a key takes the slot and a later heading
 * matching the same key falls through as a plain section (10-03 finding 1). H3 sections are never keyed. */
export function keySections(doc: string, sections: readonly FencedSection[]): KeyedSection[] {
  const claimed = new Set<string>();
  return sections.map((section) => {
    let key: string | null = null;
    if (section.level === 2) {
      const matched = matchKey(doc, section.heading);
      if (matched !== null && !claimed.has(matched)) {
        claimed.add(matched);
        key = matched;
      }
    }
    return { ...section, key };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Line shapes shared by the Stack and Concerns lifts
// ---------------------------------------------------------------------------------------------------------

/** The most characters of one line the lifts read. */
const LINE_CAP = 600;

/** The label of a line that is only a bold run (`**Label:**`, `**Label**:`, `**Label (Low):**`), else null. */
function boldLabel(line: string): string | null {
  let indent = 0;
  while (indent < line.length && line.charCodeAt(indent) === 32) indent += 1;
  if (indent > 3) return null;
  let t = (line.length > LINE_CAP ? line.slice(0, LINE_CAP) : line).trim();
  if (t.length < 5 || !t.startsWith('**')) return null;
  if (t.endsWith(':')) t = t.slice(0, -1);
  if (!t.endsWith('**')) return null;
  const inner = t.slice(2, -2);
  if (inner.includes('**')) return null;
  const label = (inner.endsWith(':') ? inner.slice(0, -1) : inner).trim();
  return label.length === 0 ? null : label;
}

/** The text of a top-level list item (a marker at column 0), else null. */
function topBullet(line: string): string | null {
  const c = line.charCodeAt(0);
  if ((c === 45 || c === 42 || c === 43) && line.charCodeAt(1) === 32) {
    return (line.length > LINE_CAP ? line.slice(2, LINE_CAP) : line.slice(2)).trim();
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// The Stack lift
// ---------------------------------------------------------------------------------------------------------

export type StackChipGroup = 'primary' | 'secondary' | 'runtime' | 'core' | 'testing' | 'build-dev';

export interface StackChip {
  name: string;
  /** The version as written (`5.9.3`, `>=22.18.0`, `^1.7.0`), or null when the bullet names none. */
  version: string | null;
  group: StackChipGroup;
}

/** One Key Dependencies row (10-14): a package name, its version and the purpose the line gives it. */
export interface StackDependency {
  name: string;
  version: string | null;
  purpose: string | null;
}

/** The Key Dependencies under one bold label (Critical, Infrastructure, ...). */
export interface StackDependencySet {
  label: string;
  deps: StackDependency[];
}

export interface StackLift {
  languages: StackChip[];
  runtime: StackChip[];
  frameworks: StackChip[];
  /** The Key Dependencies, one set per bold label (10-14). */
  keyDependencies: StackDependencySet[];
  /** The names a `**Not present:**` line lists, as the document words them (10-14). */
  notPresent: string[];
}

/** The most Key Dependencies kept across all sets, the longest purpose, and the most Not present names. */
export const STACK_DEPENDENCY_CAP = 80;
export const STACK_PURPOSE_CAP = 400;
export const STACK_ABSENT_CAP = 20;

/** The most chips the Stack lift keeps, across all three lists. */
export const STACK_CHIP_CAP = 60;
/** The longest chip name or version kept. */
export const STACK_CHIP_TEXT_CAP = 120;

const VERSION_TOKEN = /^[v^~<>=]*\d[\w.+-]*$/;

/** The version a left-of-dash token names, or null. A token inside a parenthetical that opened earlier
 * (`2024)` in "Rust (edition 2024)") is not a version. */
function versionOf(token: string): string | null {
  let core = token;
  const opened = core.startsWith('(');
  if (opened) core = core.slice(1);
  if (core.endsWith(')')) {
    if (!opened) return null;
    core = core.slice(0, -1);
  }
  while (core.endsWith(',') || core.endsWith(';') || core.endsWith(':')) core = core.slice(0, -1);
  return VERSION_TOKEN.test(core) ? core : null;
}

function firstSpacedDash(text: string): number {
  let best = -1;
  for (const dash of [' - ', ' – ', ' — ']) {
    const at = text.indexOf(dash);
    if (at >= 0 && (best < 0 || at < best)) best = at;
  }
  return best;
}

/** One "Name Version - purpose" bullet as a chip. The text splits at the first spaced dash; the version is
 * the first digit-led token on the left after the first word. A bullet with no spaced dash is all name. */
function chipOf(text: string, group: StackChipGroup): StackChip | null {
  const clean = text.replaceAll('`', '').replaceAll('*', '').trim();
  if (clean.length === 0) return null;
  const dash = firstSpacedDash(clean);
  if (dash < 0) return { name: clean.slice(0, STACK_CHIP_TEXT_CAP), version: null, group };
  const left = clean.slice(0, dash).trim();
  const tokens = left.split(' ').filter((t) => t.length > 0);
  let depth = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    // Anything inside a parenthetical that opened on an earlier token is a qualifier, not the version.
    const inside = depth > 0;
    for (let c = 0; c < token.length; c += 1) {
      if (token.charCodeAt(c) === 40) depth += 1;
      else if (token.charCodeAt(c) === 41 && depth > 0) depth -= 1;
    }
    if (i === 0 || inside) continue;
    const version = versionOf(token);
    if (version !== null) {
      return {
        name: tokens.slice(0, i).join(' ').slice(0, STACK_CHIP_TEXT_CAP),
        version: version.slice(0, STACK_CHIP_TEXT_CAP),
        group,
      };
    }
  }
  return { name: left.slice(0, STACK_CHIP_TEXT_CAP), version: null, group };
}

/** `text` cut at its top-level commas: a comma inside parentheses or backticks does not split. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let tick = false;
  let current = '';
  for (const ch of text) {
    if (ch === '`') tick = !tick;
    else if (!tick && ch === '(') depth += 1;
    else if (!tick && ch === ')' && depth > 0) depth -= 1;
    if (ch === ',' && depth === 0 && !tick) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** One package in a Key Dependencies bullet: the name, then the first digit-led token after the first word
 * outside any parenthetical as its version (a comparator allowed). A part with no version is a name alone. */
function dependencyOf(part: string, purpose: string | null): StackDependency | null {
  const clean = part.replaceAll('`', '').replaceAll('*', '').trim();
  if (clean.length === 0) return null;
  const tokens = clean.split(' ').filter((token) => token.length > 0);
  let depth = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const inside = depth > 0;
    for (let c = 0; c < token.length; c += 1) {
      if (token.charCodeAt(c) === 40) depth += 1;
      else if (token.charCodeAt(c) === 41 && depth > 0) depth -= 1;
    }
    if (i === 0 || inside) continue;
    const version = versionOf(token);
    if (version !== null) {
      return {
        name: tokens.slice(0, i).join(' ').slice(0, STACK_CHIP_TEXT_CAP),
        version: version.slice(0, STACK_CHIP_TEXT_CAP),
        purpose,
      };
    }
  }
  const paren = clean.indexOf(' (');
  let name = (paren > 0 ? clean.slice(0, paren) : clean).trim();
  while (name.endsWith(';') || name.endsWith(',') || name.endsWith('.') || name.endsWith(':')) name = name.slice(0, -1);
  return name.length === 0 ? null : { name: name.slice(0, STACK_CHIP_TEXT_CAP), version: null, purpose };
}

/** The names of a `**Not present:** No A, B, or C is installed.` line: the leading "No" and the trailing
 * "is/are installed" dropped, split at commas and "or". */
function absentNames(text: string): string[] {
  let body = text.trim();
  if (body.toLowerCase().startsWith('no ')) body = body.slice(3);
  for (const tail of [' is installed.', ' are installed.', ' is installed', ' are installed', '.']) {
    if (body.toLowerCase().endsWith(tail)) {
      body = body.slice(0, body.length - tail.length);
      break;
    }
  }
  const names: string[] = [];
  for (const piece of body.split(',')) {
    for (const part of piece.split(' or ')) {
      const name = part.replaceAll('`', '').trim();
      if (name.length > 0 && name.length <= 80) names.push(name);
    }
  }
  return names.slice(0, STACK_ABSENT_CAP);
}

/** The Key Dependencies section: each top-level bullet is one or more packages (split at top-level commas on
 * the left of the first spaced dash, the right being their purpose), grouped under the bold label above them. */
function liftKeyDependencies(lines: readonly string[], section: KeyedSection, lift: StackLift): void {
  let set: StackDependencySet = { label: 'Dependencies', deps: [] };
  let total = lift.keyDependencies.reduce((sum, s) => sum + s.deps.length, 0);
  const flush = (): void => {
    if (set.deps.length > 0) lift.keyDependencies.push(set);
  };
  eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
    const label = boldLabel(line);
    if (label !== null) {
      flush();
      set = { label: label.replaceAll('`', '').replaceAll('*', '').slice(0, 80), deps: [] };
      return;
    }
    const labelled = labelledLine(line);
    if (labelled !== null && normaliseHeading(labelled.label).startsWith('not present')) {
      lift.notPresent = absentNames(labelled.text);
      return;
    }
    const bullet = topBullet(line);
    if (bullet === null || total >= STACK_DEPENDENCY_CAP) return;
    const clean = bullet.replaceAll('*', '');
    const dash = firstSpacedDash(clean);
    const left = dash < 0 ? clean : clean.slice(0, dash);
    const purposeText = dash < 0 ? '' : clean.slice(dash + 3).replaceAll('`', '').trim();
    const purpose = purposeText.length === 0 ? null : purposeText.slice(0, STACK_PURPOSE_CAP);
    for (const part of splitTopLevel(left)) {
      if (total >= STACK_DEPENDENCY_CAP) break;
      const dep = dependencyOf(part, purpose);
      if (dep === null) continue;
      set.deps.push(dep);
      total += 1;
    }
  });
  flush();
}

/**
 * Languages, runtime and frameworks as chips. The Languages section's `Runtime` group (a combined
 * "Languages & Runtimes" heading) and a Runtime section both feed the runtime list; a `Package Manager`
 * group feeds nothing. Frameworks group by their bold label (core, testing, build and dev).
 */
export function liftStack(sections: readonly KeyedSection[], lines: readonly string[]): StackLift {
  const lift: StackLift = { languages: [], runtime: [], frameworks: [], keyDependencies: [], notPresent: [] };
  let total = 0;
  for (const section of sections) {
    if (section.level !== 2) continue;
    const key = section.key;
    if (key === 'key-dependencies') {
      liftKeyDependencies(lines, section, lift);
      continue;
    }
    if (key !== 'languages' && key !== 'runtime' && key !== 'frameworks') continue;
    let group: StackChipGroup = key === 'languages' ? 'primary' : key === 'runtime' ? 'runtime' : 'core';
    let target: StackChip[] | null =
      key === 'frameworks' ? lift.frameworks : key === 'runtime' ? lift.runtime : lift.languages;
    eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
      const label = boldLabel(line);
      if (label !== null) {
        const norm = normaliseHeading(label);
        if (norm.includes('package')) {
          target = null;
        } else if (key !== 'frameworks' && norm.includes('runtime')) {
          target = lift.runtime;
          group = 'runtime';
        } else if (key === 'languages') {
          target = lift.languages;
          group = norm.includes('secondary') ? 'secondary' : 'primary';
        } else if (key === 'runtime') {
          target = lift.runtime;
          group = 'runtime';
        } else {
          target = lift.frameworks;
          group = norm.includes('test') ? 'testing' : norm.includes('build') || norm.includes('dev') ? 'build-dev' : 'core';
        }
        return;
      }
      if (target === null || total >= STACK_CHIP_CAP) return;
      const bullet = topBullet(line);
      if (bullet === null) return;
      const chip = chipOf(bullet, group);
      if (chip === null) return;
      target.push(chip);
      total += 1;
    });
  }
  return lift;
}

// ---------------------------------------------------------------------------------------------------------
// The Concerns lift
// ---------------------------------------------------------------------------------------------------------

/** One concern, as the document wrote it: a bold label, a `###` heading or a table row's first cell as its
 * label (null for a plain bullet, whose text is the first line), then its own lines (field bullets and
 * continuations) so the panel can show it in full. Blank lines are left out. */
export interface ConcernItem {
  label: string | null;
  lines: string[];
}

/** The most concerns kept per section; the count stays true when a section holds more. */
export const CONCERN_ITEM_CAP = 500;
/** The most lines kept per concern, and the most characters kept per line. */
export const CONCERN_LINES_CAP = 60;
export const CONCERN_LINE_CHARS = 2000;

export interface ConcernCount {
  /** The known key, or null for a section the template does not have. */
  key: string | null;
  heading: string;
  count: number;
  /** The concerns counted, in document order (at most CONCERN_ITEM_CAP); `items.length === count` below the cap. */
  items: ConcernItem[];
}

export interface ConcernsLift {
  /** Known sections first in file order, then the others in file order. */
  sections: ConcernCount[];
  total: number;
  /** The known keys the document has no section for; the page shows each as 0. */
  missing: string[];
}

/** Field labels (the text before the first colon of a bullet), lower-cased: a bullet beginning with one is a
 * field of a concern, not a concern (RESEARCH Pitfall 1, widened by 10-03). A label starting with
 * "what's not tested" also counts. */
const FIELD_LABELS: ReadonlySet<string> = new Set([
  'issue',
  'files',
  'impact',
  'fix approach',
  'fix',
  'symptoms',
  'trigger',
  'workaround',
  'risk',
  'current mitigation',
  'mitigation',
  'recommendations',
  'recommendation',
  'current behaviour',
  'current behavior',
  'concern',
  'note',
  'problem',
  'cause',
  'improvement path',
  'why fragile',
  'safe modification',
  'test coverage',
  'current capacity',
  'limit',
  'scaling path',
  'migration plan',
  'blocks',
  'priority',
]);

function isFieldBullet(text: string): boolean {
  const colon = text.indexOf(':');
  if (colon <= 0 || colon > 80) return false;
  const label = text.slice(0, colon).replaceAll('*', '').replaceAll('`', '').replaceAll('’', "'").trim().toLowerCase();
  return FIELD_LABELS.has(label) || label.startsWith("what's not tested");
}

/** True when a field value says there is nothing: it begins with None, Not detected or Not applicable.
 * "None of ..." is a sentence about something, not an empty marker. */
function isEmptyMarker(value: string): boolean {
  const v = value.trimStart().slice(0, 40).toLowerCase();
  for (const prefix of ['none', 'not detected', 'not applicable']) {
    if (!v.startsWith(prefix)) continue;
    const next = v.charCodeAt(prefix.length);
    if (Number.isNaN(next)) return true;
    if (next >= 97 && next <= 122) continue;
    return !v.startsWith('none of ');
  }
  return false;
}

/** The first field value of a unit: the text after the colon of its first bullet (the whole bullet when it
 * has no colon near its start). */
function firstFieldValue(text: string): string {
  const colon = text.indexOf(':');
  return colon >= 0 && colon <= 40 ? text.slice(colon + 1) : text;
}

interface BulletAt {
  index: number;
  text: string;
}

/** The first bullet whose line index is in [from, to), by binary search over the sorted list. */
function firstBulletIn(bullets: readonly BulletAt[], from: number, to: number): BulletAt | null {
  let lo = 0;
  let hi = bullets.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bullets[mid].index < from) lo = mid + 1;
    else hi = mid;
  }
  return lo < bullets.length && bullets[lo].index < to ? bullets[lo] : null;
}

function isTableSeparator(trimmed: string): boolean {
  for (let i = 0; i < trimmed.length; i += 1) {
    const c = trimmed.charCodeAt(i);
    if (c !== 124 && c !== 45 && c !== 58 && c !== 32 && c !== 9) return false;
  }
  return true;
}

/** The non-blank lines of [from, to) outside fences, each capped, at most CONCERN_LINES_CAP of them. Fenced code
 * in a concern stays in the Source view, as it stays out of the count. */
function unitLines(lines: readonly string[], from: number, to: number): string[] {
  const out: string[] = [];
  eachLineOutsideFences(lines, from, to, (line) => {
    if (out.length >= CONCERN_LINES_CAP || line.length === 0 || line.trim().length === 0) return;
    out.push(line.length > CONCERN_LINE_CHARS ? line.slice(0, CONCERN_LINE_CHARS) : line.trimEnd());
  });
  return out;
}

/** The cells of one table row, outer pipes dropped, each trimmed and capped. */
function rowCells(trimmed: string): string[] {
  const cells = (trimmed.length > LINE_CAP ? trimmed.slice(0, LINE_CAP) : trimmed).split('|').map((cell) => cell.trim());
  if (cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

interface CountedUnits {
  count: number;
  items: ConcernItem[];
}

/**
 * The concerns of one `##` section, by the rule 10-03-SUMMARY.md records (RESEARCH C3, adjusted): try `###`
 * subsections, then bold-label lines (one or more), then top-level bullets that do not begin with a field
 * label, then table rows, and use the first that yields a unit; a unit whose first field value is None, Not
 * detected or Not applicable counts 0. A section with no unit counts 0 whatever prose it holds. The count and
 * the items come from the same pass, so the items listed are exactly the ones counted (to the item cap).
 */
function sectionUnits(lines: readonly string[], sections: readonly KeyedSection[], at: number): CountedUnits {
  const section = sections[at];
  const from = section.startLine + 1;
  const to = section.endLine;
  const subsections: FencedSection[] = [];
  for (let i = at + 1; i < sections.length && sections[i].level === 3 && sections[i].startLine < to; i += 1) {
    subsections.push(sections[i]);
  }
  const labels: number[] = [];
  const bullets: BulletAt[] = [];
  const rows: { index: number; trimmed: string; header: string }[] = [];
  let header = '';
  let previousWasRow = false;
  eachLineOutsideFences(lines, from, to, (line, index) => {
    const label = boldLabel(line);
    if (label !== null) {
      labels.push(index);
      previousWasRow = false;
      return;
    }
    const bullet = topBullet(line);
    if (bullet !== null) {
      bullets.push({ index, text: bullet });
      previousWasRow = false;
      return;
    }
    const trimmed = line.trimStart();
    if (trimmed.charCodeAt(0) === 124) {
      // The first row of a block is the header; separator rows are never data.
      const head = trimmed.length > LINE_CAP ? trimmed.slice(0, LINE_CAP) : trimmed;
      if (!previousWasRow) header = head;
      else if (!isTableSeparator(head)) rows.push({ index, trimmed: head, header });
      previousWasRow = true;
      return;
    }
    previousWasRow = false;
  });

  const zeroOf = (unitFrom: number, unitTo: number): boolean => {
    const first = firstBulletIn(bullets, unitFrom, unitTo);
    return first !== null && isEmptyMarker(firstFieldValue(first.text));
  };

  const items: ConcernItem[] = [];
  let count = 0;
  const keep = (make: () => ConcernItem): void => {
    count += 1;
    if (items.length < CONCERN_ITEM_CAP) items.push(make());
  };

  if (subsections.length > 0) {
    for (const sub of subsections) {
      if (zeroOf(sub.startLine + 1, sub.endLine)) continue;
      keep(() => ({ label: sub.heading, lines: unitLines(lines, sub.startLine + 1, sub.endLine) }));
    }
    return { count, items };
  }
  if (labels.length > 0) {
    for (let k = 0; k < labels.length; k += 1) {
      const end = k + 1 < labels.length ? labels[k + 1] : to;
      if (zeroOf(labels[k] + 1, end)) continue;
      keep(() => ({ label: boldLabel(lines[labels[k]]), lines: unitLines(lines, labels[k] + 1, end) }));
    }
    return { count, items };
  }
  const concernBullets = bullets.filter((b) => !isFieldBullet(b.text));
  if (concernBullets.length > 0) {
    for (let k = 0; k < concernBullets.length; k += 1) {
      const bullet = concernBullets[k];
      if (isEmptyMarker(bullet.text)) continue;
      const end = k + 1 < concernBullets.length ? concernBullets[k + 1].index : to;
      keep(() => ({ label: null, lines: [bullet.text.slice(0, CONCERN_LINE_CHARS), ...unitLines(lines, bullet.index + 1, end)] }));
    }
    return { count, items };
  }
  for (const row of rows) {
    const cells = rowCells(row.trimmed);
    if (isEmptyMarker(cells.find((cell) => cell.length > 0) ?? '')) continue;
    keep(() => {
      const names = rowCells(row.header);
      const first = cells.findIndex((cell) => cell.length > 0);
      const rest: string[] = [];
      for (let c = 0; c < cells.length && rest.length < CONCERN_LINES_CAP; c += 1) {
        if (c === first || cells[c].length === 0) continue;
        const name = names[c] ?? '';
        rest.push(name.length > 0 ? `${name}: ${cells[c]}` : cells[c]);
      }
      return { label: cells[first] ?? null, lines: rest };
    });
  }
  return { count, items };
}

/** The ids of the nine known concern sections, in template order. */
const CONCERN_KEY_IDS: readonly string[] = [...(CODEBASE_KEYS.get('concerns')?.values() ?? [])];

/** Counts per concerns section: the known ones in file order, then any other `##` section by the same rule;
 * the total includes both. */
export function countConcerns(sections: readonly KeyedSection[], lines: readonly string[]): ConcernsLift {
  const known: ConcernCount[] = [];
  const extra: ConcernCount[] = [];
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    if (section.level !== 2) continue;
    const { count, items } = sectionUnits(lines, sections, i);
    const entry: ConcernCount = { key: section.key, heading: section.heading, count, items };
    (section.key === null ? extra : known).push(entry);
  }
  const present = new Set(known.map((k) => k.key));
  const all = [...known, ...extra];
  return {
    sections: all,
    total: all.reduce((sum, s) => sum + s.count, 0),
    missing: CONCERN_KEY_IDS.filter((id) => !present.has(id)),
  };
}

// ---------------------------------------------------------------------------------------------------------
// The Architecture and Structure lifts (10-12)
// ---------------------------------------------------------------------------------------------------------

/** A figure over this many characters or lines stays a plain section: the page renders it in full from the
 * document, so nothing is cut and nothing is shipped twice. */
export const FIGURE_TEXT_CAP = 20_000;
export const FIGURE_LINES_CAP = 2_000;
/** The most Anti-Patterns entries and the most characters of one part of an entry. */
export const ANTI_PATTERN_CAP = 100;
export const ANTI_PATTERN_TEXT_CAP = 2_000;

/** One fenced block: its info string (lower-cased, first word, capped) and its text. */
export interface FigureFence {
  info: string;
  text: string;
}

export interface AntiPatternLift {
  name: string;
  whatHappens: string | null;
  whyWrong: string | null;
  doInstead: string;
  /** Any other labelled part the entry carries, so a part the page has no slot for is still shown. */
  more: { label: string; text: string }[];
}

export interface ArchitectureLift {
  /** The System Overview's fenced block, when that section holds nothing else; else null. */
  diagram: FigureFence | null;
  /** Rows of the Component Responsibilities table. */
  components: number;
  /** `###` entries (else bold-label groups) under Layers, or null. */
  layers: number | null;
  /** The Anti-Patterns entries, all of them or none: a section the swap shape cannot hold stays plain. */
  antiPatterns: AntiPatternLift[];
}

export interface StructureLift {
  /** The Directory Layout's fenced block, when that section holds nothing else; else null. */
  tree: FigureFence | null;
  /** Directories in that tree. */
  directories: number;
}

function infoOf(line: string): string {
  const marker = fenceMarker(line);
  if (marker === null) return '';
  const rest = line.trimStart().slice(marker.length).trim();
  const space = rest.indexOf(' ');
  return (space < 0 ? rest : rest.slice(0, space)).toLowerCase().slice(0, 20);
}

/** The info strings a fence may carry and still be a figure candidate (figure-detect's own list): a fence tagged
 * with a real language stays code, and `mermaid` stays Mermaid, drawn by the document's own renderer. */
const PLAIN_INFOS: ReadonlySet<string> = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'ascii']);

/** The section's one fenced block when it holds exactly one fence and nothing else but blank lines, within
 * the figure caps; else null. A section with prose or a second fence stays a plain section, which already
 * draws its fence as a figure. */
function soleFence(lines: readonly string[], section: FencedSection): FigureFence | null {
  let open: ReturnType<typeof fenceMarker> = null;
  let info = '';
  const body: string[] = [];
  let chars = 0;
  let fences = 0;
  for (let i = section.startLine + 1; i < section.endLine; i += 1) {
    const line = lines[i];
    const marker = fenceMarker(line);
    if (open !== null) {
      if (marker !== null && marker.bare && marker.char === open.char && marker.length >= open.length) {
        open = null;
        continue;
      }
      chars += line.length + 1;
      if (chars > FIGURE_TEXT_CAP || body.length >= FIGURE_LINES_CAP) return null;
      body.push(line);
      continue;
    }
    if (marker !== null) {
      fences += 1;
      if (fences > 1) return null;
      open = marker;
      info = infoOf(line);
      if (!PLAIN_INFOS.has(info)) return null;
      continue;
    }
    if (line.trim().length > 0) return null;
  }
  return fences === 1 && body.length > 0 ? { info, text: body.join('\n') } : null;
}

/** The rows of the first table in [from, to): every row after the header and its separator. */
function countTableRows(lines: readonly string[], from: number, to: number): number {
  let rows = 0;
  let previousWasRow = false;
  eachLineOutsideFences(lines, from, to, (line) => {
    const trimmed = line.trimStart();
    if (trimmed.charCodeAt(0) !== 124) {
      previousWasRow = false;
      return;
    }
    const head = trimmed.length > LINE_CAP ? trimmed.slice(0, LINE_CAP) : trimmed;
    if (previousWasRow && !isTableSeparator(head)) rows += 1;
    previousWasRow = true;
  });
  return rows;
}

/** A line that opens with a bold run (`**Label:** text`, `**Label**: text`): the label and the text after it. */
function labelledLine(line: string): { label: string; text: string } | null {
  let indent = 0;
  while (indent < line.length && line.charCodeAt(indent) === 32) indent += 1;
  if (indent > 3) return null;
  const t = line.length > ANTI_PATTERN_TEXT_CAP + 200 ? line.slice(0, ANTI_PATTERN_TEXT_CAP + 200) : line;
  if (t.charCodeAt(indent) !== 42 || t.charCodeAt(indent + 1) !== 42) return null;
  const close = t.indexOf('**', indent + 2);
  if (close < 0) return null;
  const inner = t.slice(indent + 2, close).trim();
  const label = (inner.endsWith(':') ? inner.slice(0, -1) : inner).trim();
  if (label.length === 0) return null;
  let rest = t.slice(close + 2).trimStart();
  if (rest.charCodeAt(0) === 58) rest = rest.slice(1);
  return { label, text: rest.trim() };
}

function clip(text: string): string {
  return text.length > ANTI_PATTERN_TEXT_CAP ? text.slice(0, ANTI_PATTERN_TEXT_CAP) : text;
}

type AntiRole = 'what' | 'why' | 'instead';

function antiRole(label: string): AntiRole | null {
  const norm = normaliseHeading(label);
  if (norm.includes('instead') || norm.startsWith('fix') || norm.startsWith('use ') || norm === 'prefer') return 'instead';
  if (norm.includes('wrong') || norm.startsWith('why')) return 'why';
  if (norm.includes('happen') || norm.includes('people do') || norm === 'problem') return 'what';
  return null;
}

/** The Anti-Patterns entries: every `###` entry as a name, up to three recognised bold-label parts (what
 * happens, why it is wrong, do this instead) and any other labelled part. All or nothing: prose before the
 * first entry, a fence in an entry, or an entry with no "do this instead" leaves the section plain. */
function liftAntiPatterns(lines: readonly string[], sections: readonly KeyedSection[], at: number): AntiPatternLift[] {
  const section = sections[at];
  const subs: FencedSection[] = [];
  for (let i = at + 1; i < sections.length && sections[i].level === 3 && sections[i].startLine < section.endLine; i += 1) {
    subs.push(sections[i]);
  }
  if (subs.length === 0 || subs.length > ANTI_PATTERN_CAP) return [];
  for (let i = section.startLine + 1; i < subs[0].startLine; i += 1) {
    if (lines[i].trim().length > 0) return [];
  }
  const out: AntiPatternLift[] = [];
  for (const sub of subs) {
    const parts: { label: string; text: string }[] = [];
    for (let i = sub.startLine + 1; i < sub.endLine; i += 1) {
      const line = lines[i];
      if (line.trim().length === 0) continue;
      if (fenceMarker(line) !== null) return [];
      const labelled = labelledLine(line);
      if (labelled !== null) {
        parts.push(labelled);
        continue;
      }
      const text = line.trim();
      if (parts.length === 0) parts.push({ label: '', text });
      else if (parts[parts.length - 1].text.length < ANTI_PATTERN_TEXT_CAP) parts[parts.length - 1].text += ` ${text}`;
    }
    const entry: AntiPatternLift = { name: sub.heading, whatHappens: null, whyWrong: null, doInstead: '', more: [] };
    let instead: string | null = null;
    for (const part of parts) {
      const role = part.label === '' ? null : antiRole(part.label);
      if (role === 'what' && entry.whatHappens === null) entry.whatHappens = clip(part.text);
      else if (role === 'why' && entry.whyWrong === null) entry.whyWrong = clip(part.text);
      else if (role === 'instead' && instead === null) instead = clip(part.text);
      else entry.more.push({ label: part.label === '' ? 'Note' : part.label.slice(0, 80), text: clip(part.text) });
    }
    if (instead === null || instead.length === 0) return [];
    entry.doInstead = instead;
    out.push(entry);
  }
  return out;
}

/** The System Overview diagram, the component count, the layer count and the Anti-Patterns entries. */
export function liftArchitecture(sections: readonly KeyedSection[], lines: readonly string[]): ArchitectureLift {
  const lift: ArchitectureLift = { diagram: null, components: 0, layers: null, antiPatterns: [] };
  sections.forEach((section, at) => {
    if (section.level !== 2) return;
    if (section.key === 'system-overview') lift.diagram = soleFence(lines, section);
    else if (section.key === 'component-responsibilities') {
      lift.components = countTableRows(lines, section.startLine + 1, section.endLine);
    } else if (section.key === 'layers') {
      let entries = 0;
      for (let i = at + 1; i < sections.length && sections[i].level === 3 && sections[i].startLine < section.endLine; i += 1) {
        entries += 1;
      }
      if (entries === 0) {
        eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
          if (boldLabel(line) !== null) entries += 1;
        });
      }
      lift.layers = entries > 0 ? entries : null;
    } else if (section.key === 'anti-patterns') lift.antiPatterns = liftAntiPatterns(lines, sections, at);
  });
  return lift;
}

/** The Directory Layout tree and how many directories it names. */
export function liftStructure(sections: readonly KeyedSection[], lines: readonly string[]): StructureLift {
  const lift: StructureLift = { tree: null, directories: 0 };
  for (const section of sections) {
    if (section.level !== 2 || section.key !== 'directory-layout') continue;
    lift.tree = soleFence(lines, section);
    if (lift.tree !== null) lift.directories = treeCounts(parseTree(lift.tree.text)).folders;
  }
  return lift;
}

// ---------------------------------------------------------------------------------------------------------
// The Integrations lift (10-14)
// ---------------------------------------------------------------------------------------------------------

/** One service row of a group: the first bullet's words, and the lines under it that name its client and its
 * credential variable. Only a variable's name is kept (T-10-24). */
export interface IntegrationRow {
  service: string;
  use: string | null;
  sdk: string | null;
  authVariable: string | null;
}

export interface IntegrationGroup {
  /** The known section key (external-services, data-storage, authentication, monitoring, ci-cd, webhooks), or null
   * for a section the template does not have. */
  section: string | null;
  sectionHeading: string;
  /** The bold label the group sits under; the section's heading for bullets that follow no label. */
  label: string;
  /** False when the group's first line says None, Not detected, Not applicable, Not implemented, Not hosted or No. */
  inUse: boolean;
  /** The group's first line, for a title on a quiet chip. */
  firstLine: string;
  rows: IntegrationRow[];
  /** The group's bullets and sub-bullets with every variable value removed, for the node's details. */
  lines: string[];
}

export type VariableKind = 'required' | 'conditional' | 'optional' | 'named';

export interface IntegrationVariable {
  name: string;
  /** True when the document writes a value beside the name; the value is never kept. */
  hadValue: boolean;
  kind: VariableKind;
}

export interface EnvironmentGroup {
  label: string;
  names: string[];
  /** The group's lines with every value removed. */
  lines: string[];
}

export interface IntegrationsLift {
  groups: IntegrationGroup[];
  variables: IntegrationVariable[];
  /** The Environment Configuration section as names and cleaned lines; `whole` when nothing in the section is left
   * out (no fence, no table), so the page may draw it in place of the plain section. */
  environment: { heading: string; groups: EnvironmentGroup[]; whole: boolean } | null;
  /** The known section keys the document lacks. */
  missing: string[];
  /** Groups in use: the key number. */
  services: number;
}

export const INTEGRATION_GROUP_CAP = 60;
export const INTEGRATION_ROW_CAP = 30;
export const INTEGRATION_LINE_CAP = 12;
export const INTEGRATION_TEXT_CAP = 300;
export const INTEGRATION_VARIABLE_CAP = 60;

const INTEGRATION_KEYS: readonly string[] = [...(CODEBASE_KEYS.get('integrations')?.values() ?? [])];

const ABSENT_OPENINGS: readonly string[] = ['none', 'not detected', 'not applicable', 'not implemented', 'not hosted', 'no'];

/** True when a line opens with an absence marker as a whole word ("None.", "Not detected. No AI SDK ...", "No Sentry"). */
function saysAbsent(text: string): boolean {
  const lower = text.replaceAll('`', '').replaceAll('*', '').trimStart().slice(0, 40).toLowerCase();
  for (const opening of ABSENT_OPENINGS) {
    if (!lower.startsWith(opening)) continue;
    const next = lower.charCodeAt(opening.length);
    if (!Number.isNaN(next) && ((next >= 97 && next <= 122) || (next >= 48 && next <= 57))) continue;
    if (lower.startsWith('none of ')) continue;
    return true;
  }
  return false;
}

/** True when a line names a path under a person's home folder: a private detail the lifted rows leave out. */
function hasHomePath(text: string): boolean {
  return text.includes('/home/') || text.includes('/Users/') || text.includes(':\\Users\\') || text.includes('/root/');
}

/** The text of an indented list item (a marker after leading spaces), else null. */
function nestedBullet(line: string): string | null {
  let i = 0;
  while (i < line.length && line.charCodeAt(i) === 32) i += 1;
  if (i < 2) return null;
  const c = line.charCodeAt(i);
  if ((c === 45 || c === 42 || c === 43) && line.charCodeAt(i + 1) === 32) {
    return (line.length > LINE_CAP ? line.slice(i + 2, LINE_CAP) : line.slice(i + 2)).trim();
  }
  return null;
}

/** The contents of every backtick span in `text`, in order. */
function tickSpans(text: string): string[] {
  const spans: string[] = [];
  let from = 0;
  for (;;) {
    const open = text.indexOf('`', from);
    if (open < 0) break;
    const close = text.indexOf('`', open + 1);
    if (close < 0) break;
    spans.push(text.slice(open + 1, close));
    from = close + 1;
  }
  return spans;
}

function cleanText(text: string): string {
  const scrubbed = withholdInText(text).text;
  return scrubbed.length > INTEGRATION_TEXT_CAP ? scrubbed.slice(0, INTEGRATION_TEXT_CAP) : scrubbed;
}

const KIND_RANK: Readonly<Record<VariableKind, number>> = { required: 3, conditional: 2, optional: 1, named: 0 };

/** The variables found so far, by name: a repeat keeps a value flag once set and the strongest kind. */
function addVariable(book: Map<string, IntegrationVariable>, name: string, hadValue: boolean, kind: VariableKind): void {
  const found = book.get(name);
  if (found === undefined) {
    if (book.size < INTEGRATION_VARIABLE_CAP) book.set(name, { name, hadValue, kind });
    return;
  }
  if (hadValue) found.hadValue = true;
  if (KIND_RANK[kind] > KIND_RANK[found.kind]) found.kind = kind;
}

/** Variable names in one bullet: its leading token and every backticked span (on the left of the first spaced dash, for
 * the Environment section; anywhere for a group's bullet, where only names with an underscore count). */
function namesIn(text: string, needsUnderscore: boolean): { name: string; hadValue: boolean }[] {
  // A group's bullet may name a variable anywhere in it; the Environment section names them on the left of the dash.
  const dash = needsUnderscore ? -1 : firstSpacedDash(text);
  const left = dash < 0 ? text : text.slice(0, dash);
  const found: { name: string; hadValue: boolean }[] = [];
  const keep = (name: string, hadValue: boolean): void => {
    if (needsUnderscore && !name.includes('_')) return;
    const known = found.find((entry) => entry.name === name);
    if (known === undefined) found.push({ name, hadValue });
    else if (hadValue) known.hadValue = true;
  };
  const lead = withholdValue(left);
  if (lead !== null) keep(lead.name, lead.hadValue);
  for (const span of tickSpans(left)) {
    const read = withholdValue(span);
    if (read !== null) keep(read.name, read.hadValue);
  }
  return found;
}

function variableKind(label: string, text: string): VariableKind {
  const lower = `${label} ${text.slice(0, 40)}`.toLowerCase();
  if (lower.includes('optional')) return 'optional';
  if (lower.includes('conditional')) return 'conditional';
  if (lower.includes('required')) return 'required';
  return 'named';
}

function groupRow(top: string, subs: readonly string[]): IntegrationRow {
  const dash = firstSpacedDash(top);
  const service = cleanText(dash < 0 ? top : top.slice(0, dash)).slice(0, 120);
  const use = dash < 0 ? null : cleanText(top.slice(dash + 3)) || null;
  let sdk: string | null = null;
  let authVariable: string | null = null;
  for (const sub of subs) {
    const colon = sub.indexOf(':');
    if (colon <= 0 || colon > 20) continue;
    const label = sub.slice(0, colon).replaceAll('*', '').trim().toLowerCase();
    const value = sub.slice(colon + 1).trim();
    if (sdk === null && (label === 'sdk/client' || label === 'client' || label === 'connection')) {
      sdk = cleanText(value) || null;
    } else if (authVariable === null && label === 'auth') {
      for (const span of tickSpans(value)) {
        const read = withholdValue(span);
        if (read !== null) {
          authVariable = read.name;
          break;
        }
      }
    }
  }
  return { service, use, sdk, authVariable };
}

/**
 * The Integrations document as groups (one per bold label under a section, or per section when its bullets follow
 * no label), the variable names and the Environment Configuration section. Every variable passes through
 * `withholdValue` or `withholdInText`, so no value is stored; a line naming a path under a home folder is left out.
 */
export function liftIntegrations(sections: readonly KeyedSection[], lines: readonly string[]): IntegrationsLift {
  const lift: IntegrationsLift = { groups: [], variables: [], environment: null, missing: [], services: 0 };
  const book = new Map<string, IntegrationVariable>();
  const present = new Set<string>();
  for (const section of sections) {
    if (section.level !== 2) continue;
    if (section.key !== null) present.add(section.key);
    if (section.key === 'environment-configuration') {
      liftEnvironment(lines, section, lift, book);
      continue;
    }
    const state: { group: IntegrationGroup | null; top: string | null; subs: string[] } = { group: null, top: null, subs: [] };
    const finishRow = (): void => {
      const { group, top } = state;
      if (group !== null && top !== null && group.rows.length < INTEGRATION_ROW_CAP) {
        group.rows.push(groupRow(top, state.subs));
        if (group.lines.length < INTEGRATION_LINE_CAP) group.lines.push(cleanText(top));
        for (const sub of state.subs) if (group.lines.length < INTEGRATION_LINE_CAP) group.lines.push(cleanText(sub));
      }
      state.top = null;
      state.subs = [];
    };
    const finishGroup = (): void => {
      finishRow();
      if (state.group !== null && state.group.rows.length > 0 && lift.groups.length < INTEGRATION_GROUP_CAP) {
        lift.groups.push(state.group);
      }
      state.group = null;
    };
    const startGroup = (label: string): IntegrationGroup => {
      finishGroup();
      const group: IntegrationGroup = {
        section: section.key,
        sectionHeading: section.heading,
        label: label.replaceAll('`', '').replaceAll('*', '').slice(0, 120),
        inUse: true,
        firstLine: '',
        rows: [],
        lines: [],
      };
      state.group = group;
      return group;
    };
    eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
      const label = boldLabel(line);
      if (label !== null) {
        startGroup(label);
        return;
      }
      const bullet = topBullet(line);
      if (bullet !== null) {
        for (const name of namesIn(bullet, true)) addVariable(book, name.name, name.hadValue, 'named');
        finishRow();
        const group = state.group ?? startGroup(section.heading);
        if (group.firstLine === '') {
          group.firstLine = cleanText(bullet);
          group.inUse = !saysAbsent(bullet);
        }
        state.top = hasHomePath(bullet) ? null : bullet;
        return;
      }
      const nested = nestedBullet(line);
      if (nested !== null && state.top !== null) {
        for (const name of namesIn(nested, true)) addVariable(book, name.name, name.hadValue, 'named');
        if (!hasHomePath(nested)) state.subs.push(nested);
      }
    });
    finishGroup();
  }
  lift.missing = INTEGRATION_KEYS.filter((key) => !present.has(key));
  lift.variables = [...book.values()];
  lift.services = lift.groups.filter((entry) => entry.inUse).length;
  return lift;
}

function liftEnvironment(
  lines: readonly string[],
  section: KeyedSection,
  lift: IntegrationsLift,
  book: Map<string, IntegrationVariable>,
): void {
  const groups: EnvironmentGroup[] = [];
  let current: EnvironmentGroup = { label: '', names: [], lines: [] };
  let label = '';
  let whole = true;
  const flush = (): void => {
    if (current.names.length > 0 || current.lines.length > 0) groups.push(current);
  };
  for (let i = section.startLine + 1; i < section.endLine; i += 1) {
    const line = lines[i];
    if (fenceMarker(line) !== null || line.trimStart().charCodeAt(0) === 124) whole = false;
  }
  eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
    const bold = boldLabel(line);
    if (bold !== null) {
      flush();
      label = bold.replaceAll('`', '').replaceAll('*', '').slice(0, 120);
      current = { label, names: [], lines: [] };
      return;
    }
    const text = topBullet(line) ?? nestedBullet(line);
    if (text === null) {
      const plain = line.trim();
      const footer = plain.startsWith('*') && plain.endsWith('*');
      if (plain.length > 0 && !plain.startsWith('---') && !footer && current.lines.length < INTEGRATION_LINE_CAP) {
        current.lines.push(cleanText(plain));
      }
      return;
    }
    const names = namesIn(text, false);
    const kind = variableKind(label, text);
    for (const name of names) {
      addVariable(book, name.name, name.hadValue, kind);
      if (!current.names.includes(name.name)) current.names.push(name.name);
    }
    const rest = text
      .split('`')
      .filter((_, index) => index % 2 === 0)
      .join('')
      .replaceAll(',', '')
      .trim();
    if ((names.length === 0 || rest.length > 0) && !hasHomePath(text) && current.lines.length < INTEGRATION_LINE_CAP) {
      current.lines.push(cleanText(text));
    }
  });
  flush();
  lift.environment = { heading: section.heading, groups, whole };
}

export function extractCodebase(doc: string, frontmatter: Record<string, unknown>, body: string): CodebaseBody {
  const lines = splitBodyLines(body);
  const keyed = keySections(doc, scanFencedLines(lines));
  const result: CodebaseBody = {
    doc,
    stamp: readMapStamp(frontmatter, body, lines),
    sections: keyed.map((s) => ({ heading: s.heading, level: s.level, key: s.key })),
    keyNumber: null,
  };
  if (doc === 'stack') {
    const stack = liftStack(keyed, lines);
    result.stack = stack;
    result.keyNumber = stack.languages.length + stack.frameworks.length;
  } else if (doc === 'architecture') {
    const architecture = liftArchitecture(keyed, lines);
    result.architecture = architecture;
    if (architecture.components > 0) {
      result.keyNumber = architecture.components;
    } else if (architecture.layers !== null) {
      result.keyNumber = architecture.layers;
      result.keyUnit = 'layer';
    }
  } else if (doc === 'structure') {
    const structure = liftStructure(keyed, lines);
    result.structure = structure;
    if (structure.tree !== null && structure.directories > 0) result.keyNumber = structure.directories;
  } else if (doc === 'integrations') {
    const integrations = liftIntegrations(keyed, lines);
    result.integrations = integrations;
    result.keyNumber = integrations.services;
  } else if (doc === 'concerns') {
    const concerns = countConcerns(keyed, lines);
    result.concerns = concerns;
    result.keyNumber = concerns.total;
  }
  return result;
}
