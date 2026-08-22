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
    const parsed = matter(content);
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
