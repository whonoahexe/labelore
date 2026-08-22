// Shared, line-scanning (never single-whole-document-regex, per T-01-11's linear-parsing
// mitigation) markdown structure helpers used by several typed handlers. Structured extraction
// only — never a replacement for rendering the raw body, per PITFALLS #3.

export interface MarkdownSection {
  heading: string;
  body: string;
}

/** Splits a markdown body into its sections at a given heading `level` (2 = `## `, 3 = `### `), in document order. */
export function splitByHeadingLevel(body: string, level: number): MarkdownSection[] {
  const marker = '#'.repeat(level);
  const re = new RegExp(`^${marker}\\s+(.+?)\\s*$`);
  const lines = body.split('\n');
  const sections: MarkdownSection[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      if (current) sections.push({ heading: current.heading, body: current.lines.join('\n').trim() });
      current = { heading: m[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.lines.join('\n').trim() });
  return sections;
}

/** Splits a markdown body into its top-level `## ` sections, in document order. */
export function splitSections(body: string): MarkdownSection[] {
  return splitByHeadingLevel(body, 2);
}

/** Splits a section's body into its `### ` subsections, in document order. */
export function splitSubsections(body: string): MarkdownSection[] {
  return splitByHeadingLevel(body, 3);
}

/** Parses a GFM pipe table into an array of row objects keyed by header cell text. */
export function parseMarkdownTable(sectionBody: string): Record<string, string>[] {
  const lines = sectionBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));
  if (lines.length < 2) return [];

  const headerCells = lines[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  // lines[1] is the `|---|---|` separator row — skip it.
  return lines.slice(2).map((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    const row: Record<string, string> = {};
    headerCells.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

export interface ChecklistItem {
  checked: boolean;
  text: string;
}

/** GFM checkbox convention: `- [ ] text` / `- [x] text` (never uppercase `[X]` per GSD-DOMAIN.md). */
export function parseChecklistItems(text: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const re = /^\s*-\s*\[([ xX])\]\s*(.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    items.push({ checked: m[1].toLowerCase() === 'x', text: m[2].trim() });
  }
  return items;
}
