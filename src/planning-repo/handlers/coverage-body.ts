// The COVERAGE.md extractor (Phase 9, 09-15, VIEW-10), kept apart from the handler so a throwing extractor is
// provable. `extractCoverage` reads the two shapes GSD writes:
//   - the "No external API integration: <why>" declaration, usually the whole file, sometimes one paragraph of a
//     longer file (research Pitfall 9d); and
//   - a capability matrix: the first markdown table with a decision column. Columns are found by header text, case
//     insensitive (decision: 'decision' or 'row'; capability: 'capability', else the first header naming a
//     capability, method or feature, else the first remaining column; reason: a header starting 'reason'). A table
//     with no decision column (a made-up "Capability | Covered by | Status" file) is not an integration matrix
//     and yields no matrix at all, so it is never dressed up as one.
// When both a matrix and a declaration exist the matrix wins. Line scans only (no regular expression, none built
// from document text), a body cap, a row cap and a cell cap (T-09-30).

/** The most body text the extractor reads. */
export const COVERAGE_BODY_CAP = 50_000;
/** The most matrix rows kept. */
export const COVERAGE_ROW_CAP = 500;
/** The most characters kept of one cell or lead line. */
export const COVERAGE_CELL_CAP = 2000;
/** The most lead lines kept. */
export const COVERAGE_LEAD_CAP = 6;

const NONE_PREFIX = 'no external api integration';

export interface CoverageNone {
  /** The text after the first colon, else the whole paragraph; null when the file gives no reason. */
  reason: string | null;
}

export type CoverageDecision = 'integrate' | 'opt-out' | 'other';

export interface CoverageRow {
  capability: string;
  decision: CoverageDecision;
  /** The decision cell with bold markers and backticks removed, as written. */
  decisionRaw: string;
  /** The reason cell; null for an empty cell or a dash. */
  reason: string | null;
}

export interface CoverageMatrix {
  /** The non-heading text lines between the H1 and the table, blockquote markers dropped. */
  lead: string[];
  rows: CoverageRow[];
}

export interface CoverageBody {
  /** The first `# ` heading, or null. */
  h1: string | null;
  /** The "No external API integration" declaration, or null (always null when a matrix exists). */
  none: CoverageNone | null;
  matrix: CoverageMatrix | null;
}

function stripQuote(line: string): string {
  let text = line.trimStart();
  while (text.startsWith('>')) text = text.slice(1).trimStart();
  return text.trimEnd();
}

function cap(text: string): string {
  return text.length > COVERAGE_CELL_CAP ? text.slice(0, COVERAGE_CELL_CAP) : text;
}

/** Splits a table line into trimmed cells at unescaped pipes; the outer pipes are dropped. */
function splitCells(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current);
      current = '';
    } else if (current.length <= COVERAGE_CELL_CAP) {
      current += ch;
    }
  }
  cells.push(current);
  if (cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((cell) => cell.trim());
}

/** A separator row: every cell is only dashes and optional alignment colons. */
function isSeparator(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((cell) => {
    if (cell === '') return false;
    let dashes = 0;
    for (const ch of cell) {
      if (ch === '-') dashes += 1;
      else if (ch !== ':') return false;
    }
    return dashes > 0;
  });
}

/** Removes bold markers and backticks. */
function plain(text: string): string {
  return text.split('**').join('').split('`').join('').trim();
}

function classify(raw: string): CoverageDecision {
  const key = raw.toLowerCase().split('_').join('-').split(' ').join('-');
  if (key.startsWith('integrat')) return 'integrate';
  if (key.startsWith('opt-out') || key.startsWith('optout')) return 'opt-out';
  return 'other';
}

function isDash(text: string): boolean {
  return text === '' || text === '—' || text === '–' || text === '-';
}

function findDecisionColumn(headers: string[]): number {
  const decision = headers.indexOf('decision');
  return decision !== -1 ? decision : headers.indexOf('row');
}

function findCapabilityColumn(headers: string[], skip: number[]): number {
  const exact = headers.indexOf('capability');
  if (exact !== -1 && !skip.includes(exact)) return exact;
  for (let i = 0; i < headers.length; i += 1) {
    if (skip.includes(i)) continue;
    const header = headers[i];
    if (header.includes('capability') || header.includes('method') || header.includes('feature')) return i;
  }
  for (let i = 0; i < headers.length; i += 1) {
    if (!skip.includes(i)) return i;
  }
  return -1;
}

function findReasonColumn(headers: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    if (headers[i].startsWith('reason')) return i;
  }
  return -1;
}

/** The first table with a decision column, read into rows; `null` when there is none or it has no row. */
function extractMatrix(lines: string[]): CoverageMatrix | null {
  const lead: string[] = [];
  let seenH1 = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripQuote(lines[index]);
    if (line.startsWith('|')) {
      const headerCells = splitCells(line);
      const next = index + 1 < lines.length ? splitCells(stripQuote(lines[index + 1])) : [];
      if (!stripQuote(lines[index + 1] ?? '').startsWith('|') || !isSeparator(next)) continue;
      const headers = headerCells.map((cell) => plain(cell).toLowerCase());
      const decisionCol = findDecisionColumn(headers);
      if (decisionCol === -1) {
        // Not a coverage matrix: skip the whole table and look for another one.
        let end = index + 2;
        while (end < lines.length && stripQuote(lines[end]).startsWith('|')) end += 1;
        index = end - 1;
        continue;
      }
      const reasonCol = findReasonColumn(headers);
      const capabilityCol = findCapabilityColumn(headers, [decisionCol, reasonCol]);
      const rows: CoverageRow[] = [];
      let end = index + 2;
      while (end < lines.length) {
        const rowLine = stripQuote(lines[end]);
        if (!rowLine.startsWith('|')) break;
        end += 1;
        if (rows.length >= COVERAGE_ROW_CAP) continue;
        const cells = splitCells(rowLine);
        const decisionRaw = cap(plain(cells[decisionCol] ?? ''));
        const capability = cap(capabilityCol === -1 ? '' : plain(cells[capabilityCol] ?? ''));
        if (decisionRaw === '' && capability === '') continue;
        const reasonText = reasonCol === -1 ? '' : cap((cells[reasonCol] ?? '').trim());
        rows.push({
          capability,
          decision: classify(decisionRaw),
          decisionRaw,
          reason: isDash(reasonText) ? null : reasonText,
        });
      }
      return rows.length === 0 ? null : { lead, rows };
    }
    if (line === '') continue;
    if (line.startsWith('#')) {
      if (!seenH1 && line.startsWith('# ')) {
        seenH1 = true;
        lead.length = 0;
      }
      continue;
    }
    if (lead.length < COVERAGE_LEAD_CAP) lead.push(cap(line));
  }
  return null;
}

/** Reads a COVERAGE.md body. Never throws on text input; the handler still guards it. */
export function extractCoverage(body: string): CoverageBody {
  const text = body.length > COVERAGE_BODY_CAP ? body.slice(0, COVERAGE_BODY_CAP) : body;
  const lines = text.split('\n');
  let h1: string | null = null;
  let none: CoverageNone | null = null;
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    const joined = paragraph.join(' ').trim();
    paragraph = [];
    if (none !== null || !joined.toLowerCase().startsWith(NONE_PREFIX)) return;
    const colon = joined.indexOf(':');
    const reason = (colon === -1 ? joined : joined.slice(colon + 1)).trim();
    none = { reason: reason === '' ? null : cap(reason) };
  };

  for (const raw of lines) {
    const line = stripQuote(raw);
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('#')) {
      flush();
      if (h1 === null && line.startsWith('# ')) h1 = line.slice(2).trim() || null;
      continue;
    }
    if (line.startsWith('|')) {
      flush();
      continue;
    }
    paragraph.push(line);
  }
  flush();

  const matrix = extractMatrix(lines);
  return { h1, none: matrix === null ? none : null, matrix };
}
