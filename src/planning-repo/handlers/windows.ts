// WINDOWS.md — the broken-windows ledger. Triple-encoded (YAML frontmatter counts, a
// human-readable markdown table, and a fenced ```json block repeating the same rows); the fenced
// JSON block is preferred over the markdown table when both are present, since it's the
// authoritative-shaped source and the two encode identical rows.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter, tryParseJson } from '../frontmatter.ts';
import type { JsonParseResult } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseMarkdownTable } from './markdown-sections.ts';

/** Returns null when no fenced json block is present at all — distinct from a present-but-malformed block, whose JsonParseResult (including its warning) is returned instead. */
function extractFencedJson(body: string): JsonParseResult | null {
  const m = body.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  return tryParseJson(m[1]);
}

export const WindowsHandler: ArtifactHandler = {
  kind: 'windows',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'WINDOWS.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    const jsonResult = extractFencedJson(fm.body);
    const fencedRows = jsonResult && Array.isArray(jsonResult.data) ? (jsonResult.data as unknown[]) : null;
    const rows = fencedRows ?? parseMarkdownTable(fm.body);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      // A malformed fenced JSON block is the authoritative-shaped source failing to parse — that
      // warning must surface even though the table fallback silently produces usable rows.
      // Frontmatter-stage failures take priority when both occur (fm.warning first).
      warning: fm.warning ?? jsonResult?.warning,
      structured: { rows, rowSource: fencedRows ? 'json' : 'table' },
    };
  },
};
