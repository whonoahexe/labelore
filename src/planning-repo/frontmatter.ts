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
    // wrapped, every failure produces a warning" contract. Passing a (behaviorally identical, per
    // gray-matter's own defaults()) empty options object bypasses the cache path entirely — see
    // node_modules/gray-matter/index.js's `if (!options)` guard — so every call re-parses fresh.
    const parsed = matter(content, {});
    return { data: parsed.data as Record<string, unknown>, body: parsed.content };
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
