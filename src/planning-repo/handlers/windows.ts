// WINDOWS.md — the broken-windows ledger. Triple-encoded (YAML frontmatter counts, a
// human-readable markdown table, and a fenced ```json block repeating the same rows); the fenced
// JSON block is preferred over the markdown table when both are present, since it's the
// authoritative-shaped source and the two encode identical rows.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter, tryParseJson } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseMarkdownTable } from './markdown-sections.ts';

function extractFencedJson(body: string): unknown[] | null {
  const m = body.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  const parsed = tryParseJson(m[1]);
  return Array.isArray(parsed.data) ? (parsed.data as unknown[]) : null;
}

export const WindowsHandler: ArtifactHandler = {
  kind: 'windows',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'WINDOWS.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    const fencedRows = extractFencedJson(fm.body);
    const rows = fencedRows ?? parseMarkdownTable(fm.body);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: { rows, rowSource: fencedRows ? 'json' : 'table' },
    };
  },
};
