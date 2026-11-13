// The guarded gray-matter call PITFALLS #4 requires. gray-matter throws on malformed YAML by
// default — the raw gray-matter import below has exactly one unguarded call site anywhere in
// this codebase; every other call path is guarded try/catch.
import matter from 'gray-matter';
import type { ParseWarning } from './types.ts';

export interface FrontmatterResult {
  data: Record<string, unknown>;
  body: string;
  warning?: Omit<ParseWarning, 'path'>;
}

// T-12-35: gray-matter picks a parser from the text after the opening fence, and its built-in `javascript` engine
// (reached by `---js`, `---JS`, `---javascript`, ...: every spelling is lower-cased onto that one key) runs the
// frontmatter through `eval`. A target `.planning/` file must never run code in this process, so that engine is
// replaced by one that refuses; the refusal is caught below and the file reads as malformed frontmatter.
const REFUSE_CODE_ENGINE = {
  parse: (): never => {
    throw new Error('executable frontmatter is not read');
  },
};
const MATTER_OPTIONS = { engines: { javascript: REFUSE_CODE_ENGINE, js: REFUSE_CODE_ENGINE } };

// CR-01: gray-matter looks the language up in a plain object that inherits `Object.prototype`, so `---constructor`,
// `---toString`, `---valueOf` and `---hasOwnProperty` select a built-in function as the "engine" and hand back a String
// wrapper, a string or a boolean as `data`, which every handler's key-based mask then walks character by character. Only the
// languages that are meant to be read are allowed (the empty one is YAML, the default); any other name reads as malformed
// frontmatter, and the refusing engines above stay as defence in depth.
const ALLOWED_LANGUAGES: ReadonlySet<string> = new Set(['', 'yaml', 'yml', 'json']);

/**
 * True when gray-matter would look up an engine for a language this file does not allow: it names one on the opening fence
 * line (cut out the way gray-matter cuts it, so a file with no line break after the fence reads the same here) and text
 * follows it for an engine to parse. When nothing follows the language gray-matter parses nothing and looks nothing up
 * (a CR-only file, whose whole text it takes as the language), so the file is left to read as it always did.
 */
function namesUnreadLanguage(content: string): boolean {
  const start = content.startsWith('\uFEFF') ? 1 : 0;
  if (!content.startsWith('---', start)) return false;
  const rest = content.slice(start + 3);
  const language = rest.slice(0, rest.search(/\r?\n/));
  if (ALLOWED_LANGUAGES.has(language.trim().toLowerCase())) return false;
  return rest.slice(language.length).trim() !== '';
}

export const tryParseFrontmatter = (content: string): FrontmatterResult => {
  try {
    // gray-matter caches its internal `file` object by raw content string BEFORE attempting the
    // YAML parse, but ONLY when called with no options object (`matter.cache[file.content] = file`
    // runs unconditionally inside the `if (!options)` branch, ahead of the `parseMatter()` call
    // that can throw). For malformed YAML this means: the FIRST parse of a given bad content string
    // throws correctly (this catch block runs), but that pre-parse `file` object is already cached
    // — so a SECOND parse of the byte-identical content within the same process (a second
    // refresh(), a second PlanningRepository over the same fixture, this project's own test suite
    // loading the same fixture from multiple test files) hits the cache and returns the stale
    // object WITHOUT re-throwing, silently dropping the warning. This directly violates this
    // project's own refresh-seam guarantee (DATA-04: refresh() must be safe to call repeatedly and
    // produce byte-identical output for an unchanged tree) and D-11/D-12's "every parse is
    // wrapped, every failure produces a warning" contract. Passing any options object (here
    // MATTER_OPTIONS, which also refuses the code engine) bypasses the cache path entirely — see
    // node_modules/gray-matter/index.js's `if (!options)` guard — so every call re-parses fresh.
    if (namesUnreadLanguage(content)) throw new Error('frontmatter language not read');
    const parsed = matter(content, MATTER_OPTIONS);
    const data: unknown = parsed.data;
    // Every handler assumes a plain map; a list, a scalar or a non-plain object is malformed frontmatter.
    if (typeof data !== 'object' || data === null || Array.isArray(data) || Object.getPrototypeOf(data) !== Object.prototype) {
      throw new Error('frontmatter is not a map');
    }
    return { data: data as Record<string, unknown>, body: parsed.content };
  } catch {
    // D-11: stage = 'frontmatter', salvage = 'body intact, frontmatter unavailable'
    return {
      data: {},
      body: content,
      warning: {
        stage: 'frontmatter',
        message: 'YAML frontmatter failed to parse',
        salvage: 'body intact, frontmatter unavailable',
      },
    };
  }
};

export interface JsonParseResult {
  data: Record<string, unknown>;
  warning?: Omit<ParseWarning, 'path'>;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively strips __proto__/constructor/prototype keys at every depth so an open-map read of
 * an untrusted config.json/HANDOFF.json cannot reach an object prototype.
 */
function stripDangerousKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripDangerousKeys);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      result[key] = stripDangerousKeys(val);
    }
    return result;
  }
  return value;
}

export function tryParseJson(content: string): JsonParseResult {
  try {
    const parsed: unknown = JSON.parse(content);
    const safe = stripDangerousKeys(parsed);
    return { data: (safe ?? {}) as Record<string, unknown> };
  } catch {
    return {
      data: {},
      warning: {
        stage: 'structured-extraction',
        message: 'JSON failed to parse',
        salvage: 'nothing readable',
      },
    };
  }
}
