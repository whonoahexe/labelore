// The one fence-aware H2 and H3 scanner every Phase 10 extractor uses (10-05, RESEARCH Pitfall 2).
// `splitSections` in markdown-sections.ts keeps no fence state, so a `##` line inside a code block (a shell
// comment, a diagram label) starts a section there; this scanner does not. A fence opens on a line whose
// trimmed start is three or more backticks or tildes and closes on a line made only of the same character
// repeated at least as many times; an unclosed fence runs to the end of the body. Fence markers may be
// indented (a fence inside a list item).
//
// One pass over the lines, no regular expression over the whole body. The body is capped, the section count
// is capped, and the heading text is capped, so author text of any size costs a bounded, linear scan.

/** The most characters of a body the scan reads. */
export const FENCED_BODY_CAP = 250_000;
/** The most sections the scan returns. */
export const FENCED_SECTION_CAP = 400;
/** The longest heading text kept. */
export const FENCED_HEADING_CAP = 300;

export interface FencedSection {
  level: 2 | 3;
  heading: string;
  /** Zero-based index of the heading line. */
  startLine: number;
  /** Zero-based index one past the section's last line: the next heading of the same or a higher level
   * (an H2 runs through its H3s), else the line count. */
  endLine: number;
}

export interface FenceMarker {
  char: '`' | '~';
  length: number;
  /** True when nothing but whitespace follows the run (a line that can close a fence). */
  bare: boolean;
}

/** The fence marker a line carries, or null. A backtick run whose info string holds another backtick is
 * inline code, not a fence. */
export function fenceMarker(line: string): FenceMarker | null {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i += 1;
  const code = line.charCodeAt(i);
  if (code !== 96 && code !== 126) return null;
  let run = 0;
  while (line.charCodeAt(i + run) === code) run += 1;
  if (run < 3) return null;
  let bare = true;
  for (let j = i + run; j < line.length; j += 1) {
    const c = line.charCodeAt(j);
    if (c === 96 && code === 96) return null;
    if (c !== 32 && c !== 9 && c !== 13) bare = false;
  }
  return { char: code === 96 ? '`' : '~', length: run, bare };
}

/** Walks the lines of [from, to) and calls `visit` for each line outside a fence. Fence marker lines are
 * not visited. The scan starts outside a fence at `from`, so callers pass a section's own range. */
export function eachLineOutsideFences(
  lines: readonly string[],
  from: number,
  to: number,
  visit: (line: string, index: number) => void,
): void {
  let open: FenceMarker | null = null;
  for (let i = from; i < to; i += 1) {
    const line = lines[i];
    const marker = fenceMarker(line);
    if (open !== null) {
      if (marker !== null && marker.bare && marker.char === open.char && marker.length >= open.length) open = null;
      continue;
    }
    if (marker !== null) {
      open = marker;
      continue;
    }
    visit(line, i);
  }
}

/** The body capped at FENCED_BODY_CAP characters and split into lines, trailing carriage returns removed. */
export function splitBodyLines(body: string): string[] {
  const capped = body.length > FENCED_BODY_CAP ? body.slice(0, FENCED_BODY_CAP) : body;
  const lines = capped.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length > 0 && line.charCodeAt(line.length - 1) === 13) lines[i] = line.slice(0, -1);
  }
  return lines;
}

/** The text of a heading line: the hashes dropped, a closing hash run dropped, capped. */
function headingText(line: string, hashes: number): string {
  let text = line.slice(hashes).trim();
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 35) end -= 1;
  if (end < text.length && (end === 0 || text.charCodeAt(end - 1) === 32)) text = text.slice(0, end).trim();
  return text.length > FENCED_HEADING_CAP ? text.slice(0, FENCED_HEADING_CAP) : text;
}

/** H2 and H3 sections over already-split lines. */
export function scanFencedLines(lines: readonly string[]): FencedSection[] {
  const sections: FencedSection[] = [];
  const open: FencedSection[] = [];
  let fence: FenceMarker | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const marker = fenceMarker(line);
    if (fence !== null) {
      if (marker !== null && marker.bare && marker.char === fence.char && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker !== null) {
      fence = marker;
      continue;
    }
    if (line.charCodeAt(0) !== 35 || line.charCodeAt(1) !== 35) continue;
    let level: 2 | 3;
    let hashes: number;
    if (line.charCodeAt(2) === 32 || line.charCodeAt(2) === 9) {
      level = 2;
      hashes = 2;
    } else if (line.charCodeAt(2) === 35 && (line.charCodeAt(3) === 32 || line.charCodeAt(3) === 9)) {
      level = 3;
      hashes = 3;
    } else {
      continue;
    }
    const heading = headingText(line, hashes);
    if (heading.length === 0) continue;
    // Past the cap the scan stops; the sections still open run to the end of the body.
    if (sections.length >= FENCED_SECTION_CAP) break;
    // A new heading closes every open section of its level or deeper.
    while (open.length > 0 && open[open.length - 1].level >= level) {
      open.pop()!.endLine = i;
    }
    const section: FencedSection = { level, heading, startLine: i, endLine: lines.length };
    sections.push(section);
    open.push(section);
  }
  return sections;
}

/** The H2 and H3 sections of a body, fences honoured. */
export function splitFencedSections(body: string): FencedSection[] {
  return scanFencedLines(splitBodyLines(body));
}
