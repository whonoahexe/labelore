// The codebase-map lift (10-05, VIEW-13, TGT-09). The seven documents `/gsd-map-codebase` writes into
// .planning/codebase/ arrive as a projection the Codebase page and the map-only head both read: when the map
// was made (the stamp), the document's sections in file order with a key where a heading is recognised, and,
// for Stack and Concerns, the chips and counts the panel list shows.
//
// Headings match by fuzzy normalisation (D-02), never by exact name, and a heading that matches nothing stays
// a plain section: nothing in a document is dropped. Lookups use Maps only, so an author heading such as
// `constructor` cannot reach an Object member (RESEARCH Pitfall 16).
//
// structured.codebase holds headings, keys, chips and counts, never a section body: the whole structured
// record ships to the browser (T-10-10).
import { scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';

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
export function readMapStamp(frontmatter: Record<string, unknown>, body: string): MapStamp {
  const commitRaw = frontmatter.last_mapped_commit;
  const commit = typeof commitRaw === 'string' && commitRaw.trim().length >= 7 ? commitRaw.trim().slice(0, 7) : null;
  const fromFrontmatter = frontmatterDay(frontmatter.last_mapped_at);
  if (fromFrontmatter !== null) return { mappedAt: fromFrontmatter, commit, source: 'frontmatter' };
  const lines = splitBodyLines(body);
  const analysis = dayAfterLead(lines, '**Analysis Date:');
  if (analysis !== null) return { mappedAt: analysis, commit, source: 'analysis-date' };
  const updated = dayAfterLead(lines, '*Last updated');
  if (updated !== null) return { mappedAt: updated, commit, source: 'last-updated' };
  const refreshed = dayAfterLead(lines, '<!-- refreshed');
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

export function extractCodebase(doc: string, frontmatter: Record<string, unknown>, body: string): CodebaseBody {
  const lines = splitBodyLines(body);
  const keyed = keySections(doc, scanFencedLines(lines));
  return {
    doc,
    stamp: readMapStamp(frontmatter, body),
    sections: keyed.map((s) => ({ heading: s.heading, level: s.level, key: s.key })),
    keyNumber: null,
  };
}
