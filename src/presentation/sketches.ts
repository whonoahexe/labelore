// Pure view-model for the Sketches page (todo 001, quick-261023-4wn). It reads the GSD sketch
// MANIFEST.md table and falls back, per field, to each sketch's README.md frontmatter, so a missing
// manifest, a missing row or a blank cell degrades instead of breaking. No node:* imports and no
// import from src/server - inputs are typed structurally, like shell-header.ts.

export const SKETCHES_DIR = '.planning/sketches';
export const SKETCH_MANIFEST_PATH = '.planning/sketches/MANIFEST.md';

export interface SketchArtifactRef {
  path: string;
  /** The artifact's in-app URL (the document page for this file). */
  key: string;
  title: string;
  frontmatter: Record<string, unknown>;
}

export interface SketchManifestRow {
  number: string | null;
  name: string | null;
  question: string | null;
  winner: string | null;
  tags: string[];
}

export interface SketchManifest {
  direction: string | null;
  rows: SketchManifestRow[];
}

export interface SketchRow {
  number: string;
  name: string;
  question: string | null;
  winner: string | null;
  decided: boolean;
  tags: string[];
  folder: string | null;
  /** `/sketches/<folder>/` on the server; null when the folder has no index.html. */
  viewUrl: string | null;
  /** The README's document page; null when the sketch has no README. */
  readmeUrl: string | null;
}

export interface SketchesViewModel {
  available: boolean;
  direction: string | null;
  manifestUrl: string | null;
  decidedCount: number;
  sketches: SketchRow[];
}

// ---------------------------------------------------------------------------------------------
// MANIFEST.md

function splitCells(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\' && text[index + 1] === '|') {
      current += '|';
      index += 1;
    } else if (char === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  // A trailing pipe closes the last cell and leaves nothing behind; text after the last pipe is a cell.
  if (current.trim() !== '' || !text.trimEnd().endsWith('|')) cells.push(current.trim());
  return cells;
}

function isAlignmentRow(line: string): boolean {
  if (!line.trim().startsWith('|')) return false;
  const cells = splitCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function headerName(cell: string): string {
  return cell.replace(/[*`]/g, '').trim().toLowerCase();
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseDirection(lines: string[]): string | null {
  const start = lines.findIndex((line) => /^##\s+design direction\s*$/i.test(line.trim()));
  if (start < 0) return null;
  const collected: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#/.test(line.trim())) break;
    collected.push(line);
  }
  const text = collected.join(' ').replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

/** Reads the first Sketches table out of a MANIFEST.md body. Never throws. */
export function parseSketchManifest(body: string): SketchManifest {
  const lines = body.split(/\r?\n/);
  const direction = parseDirection(lines);
  const rows: SketchManifestRow[] = [];

  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isAlignmentRow(lines[index + 1])) continue;
    const headers = splitCells(lines[index]).map(headerName);
    const numberCol = headers.findIndex((h) => ['#', 'number', 'no', 'no.', 'sketch'].includes(h));
    const nameCol = headers.indexOf('name');
    if (numberCol < 0 || nameCol < 0) continue;
    const questionCol = headers.findIndex((h) => h.includes('question'));
    const winnerCol = headers.findIndex((h) => h.includes('winner'));
    const tagsCol = headers.findIndex((h) => h === 'tags' || h === 'tag');

    for (const line of lines.slice(index + 2)) {
      if (!line.trim().startsWith('|')) break;
      const cells = splitCells(line);
      if (cells.every((cell) => cell === '')) continue;
      rows.push({
        number: blankToNull(cells[numberCol]),
        name: blankToNull(cells[nameCol]),
        question: questionCol < 0 ? null : blankToNull(cells[questionCol]),
        winner: winnerCol < 0 ? null : blankToNull(cells[winnerCol]),
        tags: tagsCol < 0 ? [] : splitTags(cells[tagsCol] ?? ''),
      });
    }
    break;
  }
  return { direction, rows };
}

// ---------------------------------------------------------------------------------------------
// Which artifacts are sketches

const FOLDER_FILE = new RegExp(`^${SKETCHES_DIR.replace(/[.]/g, '\\.')}/([^/]+)/(README\\.md|index\\.html)$`);

/** True when the project has a sketch manifest, or a sketch folder holding a README or an index. */
export function projectHasSketches(artifacts: readonly { path: string }[]): boolean {
  return artifacts.some((artifact) => artifact.path === SKETCH_MANIFEST_PATH || FOLDER_FILE.test(artifact.path));
}

export function sketchViewUrl(folder: string): string {
  return `/sketches/${encodeURIComponent(folder)}/`;
}

// ---------------------------------------------------------------------------------------------
// The view model

interface FolderInfo {
  folder: string;
  number: string | null;
  name: string;
  readme: SketchArtifactRef | null;
  hasIndex: boolean;
}

function collectFolders(artifacts: readonly SketchArtifactRef[]): FolderInfo[] {
  const byFolder = new Map<string, FolderInfo>();
  for (const artifact of artifacts) {
    const match = FOLDER_FILE.exec(artifact.path);
    if (!match) continue;
    const folder = match[1];
    let info = byFolder.get(folder);
    if (!info) {
      const parts = /^(\d+)-(.+)$/.exec(folder);
      info = { folder, number: parts?.[1] ?? null, name: parts?.[2] ?? folder, readme: null, hasIndex: false };
      byFolder.set(folder, info);
    }
    if (match[2] === 'README.md') info.readme = artifact;
    else info.hasIndex = true;
  }
  return [...byFolder.values()];
}

function numeric(value: string | null): number | null {
  if (value === null) return null;
  const match = /^\s*(\d+)\s*$/.exec(value);
  return match ? Number.parseInt(match[1], 10) : null;
}

function sameName(a: string | null, b: string): boolean {
  return a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function matchFolder(row: SketchManifestRow, folders: FolderInfo[], claimed: Set<string>): FolderInfo | null {
  const free = folders.filter((f) => !claimed.has(f.folder));
  if (row.number !== null && row.name !== null) {
    const exact = free.find((f) => f.folder === `${row.number}-${row.name}`);
    if (exact) return exact;
  }
  const rowNumber = numeric(row.number);
  if (rowNumber !== null) {
    const byNumber = free.filter((f) => numeric(f.number) === rowNumber);
    if (byNumber.length === 1) return byNumber[0];
    if (byNumber.length > 1) {
      const narrowed = byNumber.filter((f) => sameName(row.name, f.name));
      return narrowed.length === 1 ? narrowed[0] : null;
    }
  }
  if (row.name !== null) {
    const byName = free.filter((f) => sameName(row.name, f.name));
    if (byName.length === 1) return byName[0];
  }
  return null;
}

function frontmatterString(frontmatter: Record<string, unknown>, key: string): string | null {
  const value = frontmatter[key];
  if (typeof value === 'string') return blankToNull(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function frontmatterTags(frontmatter: Record<string, unknown>): string[] {
  const value = frontmatter.tags;
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string').flatMap((tag) => splitTags(tag));
  }
  return typeof value === 'string' ? splitTags(value) : [];
}

function normalizeWinner(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '~' || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function isDecided(winner: string | null): boolean {
  if (winner === null) return false;
  const text = winner.trim().toLowerCase();
  if (/^[-–—]+$/.test(text)) return false;
  return !(text.startsWith('none') || text.startsWith('tbd') || text.startsWith('pending'));
}

function buildRow(manifestRow: SketchManifestRow | null, folder: FolderInfo | null): SketchRow {
  const fm = folder?.readme?.frontmatter ?? {};
  const fmSketch = fm.sketch;
  const fmNumber =
    typeof fmSketch === 'number' && Number.isInteger(fmSketch) && fmSketch >= 0
      ? String(fmSketch).padStart(3, '0')
      : frontmatterString(fm, 'sketch');
  const winner = normalizeWinner(manifestRow?.winner ?? null) ?? normalizeWinner(frontmatterString(fm, 'winner'));
  const tags = manifestRow && manifestRow.tags.length > 0 ? manifestRow.tags : frontmatterTags(fm);
  return {
    number: manifestRow?.number ?? folder?.number ?? fmNumber ?? '',
    name: manifestRow?.name ?? frontmatterString(fm, 'name') ?? folder?.name ?? '',
    question: manifestRow?.question ?? frontmatterString(fm, 'question'),
    winner,
    decided: isDecided(winner),
    tags,
    folder: folder?.folder ?? null,
    viewUrl: folder?.hasIndex ? sketchViewUrl(folder.folder) : null,
    readmeUrl: folder?.readme?.key ?? null,
  };
}

export function buildSketchesViewModel(input: {
  manifestBody: string | null;
  artifacts: readonly SketchArtifactRef[];
}): SketchesViewModel {
  const manifest = input.manifestBody === null ? { direction: null, rows: [] } : parseSketchManifest(input.manifestBody);
  const folders = collectFolders(input.artifacts);
  const claimed = new Set<string>();
  const rows: SketchRow[] = [];

  for (const manifestRow of manifest.rows) {
    const folder = matchFolder(manifestRow, folders, claimed);
    if (folder) claimed.add(folder.folder);
    rows.push(buildRow(manifestRow, folder));
  }
  for (const folder of folders) {
    if (!claimed.has(folder.folder)) rows.push(buildRow(null, folder));
  }

  const order = rows
    .map((row, position) => ({ row, position, n: numeric(row.number) }))
    .sort((a, b) => {
      if (a.n === null && b.n === null) return a.position - b.position;
      if (a.n === null) return 1;
      if (b.n === null) return -1;
      return b.n - a.n || a.position - b.position;
    })
    .map((entry) => entry.row);

  const manifestArtifact = input.artifacts.find((artifact) => artifact.path === SKETCH_MANIFEST_PATH);
  return {
    available: projectHasSketches(input.artifacts),
    direction: manifest.direction,
    manifestUrl: manifestArtifact?.key ?? null,
    decidedCount: order.filter((row) => row.decided).length,
    sketches: order,
  };
}
