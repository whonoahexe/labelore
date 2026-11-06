// The made-up example rule as code (VIEW-21, D-10, D-13). Every document type with no real example on this
// machine is built and tested against a made-up example derived from GSD's own template or writer. The file
// carries its own label (a marker), one index lists every example, and a test fails when either is missing.
// The UI never reads the marker; only the tests do.
//
// Scans here are character scans over committed test files; no regular expression is built from file text.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Artifact, Project } from '../../src/domain/model.ts';
import { tryParseJson } from '../../src/planning-repo/frontmatter.ts';
import { loadProject } from './fixture-project.ts';

/**
 * The artifact kinds the rule binds. Phase 11 appends its kinds here (D-13): a new type with no real example
 * adds its kind, a marker in each example and a row in test/fixtures/README.md. The test fails, never skips,
 * when a later type is added without a marker.
 */
export const MADE_UP_EXAMPLE_KINDS: ReadonlySet<string> = new Set([
  'spec',
  'ai-spec',
  'user-setup',
  'eval-review',
  'dom-verify',
  'reviews',
  'codebase-stack',
  'codebase-architecture',
  'codebase-structure',
  'codebase-conventions',
  'codebase-testing',
  'codebase-integrations',
  'codebase-concerns',
  'intel',
  'graph',
  'handoff',
  'continue-here',
]);

export interface ExemptRoot {
  /** Repo-relative root, empty string for the repository itself. */
  path: string;
  reason: string;
}

/** Roots the marker test does not check, each by name with a reason. */
export const EXEMPT_ROOTS: readonly ExemptRoot[] = [
  {
    path: 'fixtures/dense',
    reason: 'frozen golden test/__golden__/dense.json; its own index is fixtures/README.md',
  },
  { path: '', reason: "Labelore's own real planning files, not made-up examples" },
];

export interface MadeUpMarker {
  derivedFrom: string;
  version: string;
}

export interface IndexRow {
  path: string;
  type: string;
  derivedFrom: string;
  version: string;
  shape: string;
}

export type MadeUpProblemKind = 'missing-marker' | 'not-indexed' | 'indexed-file-missing' | 'duplicate-index-row';

export interface MadeUpProblem {
  /** Repo-relative path, forward slashes. */
  path: string;
  kind: MadeUpProblemKind;
}

const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';
const COMMENT_LEAD = 'made-up example';
const MIDDLE_DOT = ' \u00b7 ';
const DERIVED_LEAD = 'derived from ';
const VERSION_LEAD = 'gsd-core ';

function firstLine(text: string): string {
  const stripped = text.startsWith('\ufeff') ? text.slice(1) : text;
  const end = stripped.indexOf('\n');
  return (end === -1 ? stripped : stripped.slice(0, end)).replace(/\r$/, '');
}

function markerFromFrontmatter(frontmatter: Record<string, unknown>): MadeUpMarker | null {
  if (frontmatter.made_up_example !== true) return null;
  const derivedFrom = frontmatter.derived_from;
  const version = frontmatter.gsd_core_version;
  if (typeof derivedFrom !== 'string' || typeof version !== 'string') return null;
  if (derivedFrom.trim() === '' || version.trim() === '') return null;
  return { derivedFrom: derivedFrom.trim(), version: version.trim() };
}

function markerFromComment(rawText: string): MadeUpMarker | null {
  const line = firstLine(rawText).trim();
  if (!line.startsWith(COMMENT_OPEN) || !line.endsWith(COMMENT_CLOSE)) return null;
  const inner = line.slice(COMMENT_OPEN.length, line.length - COMMENT_CLOSE.length).trim();
  if (!inner.startsWith(COMMENT_LEAD)) return null;
  const parts = inner.split(MIDDLE_DOT).map((part) => part.trim());
  let derivedFrom: string | null = null;
  let version: string | null = null;
  for (const part of parts) {
    if (part.startsWith(DERIVED_LEAD)) derivedFrom = part.slice(DERIVED_LEAD.length).trim();
    else if (part.startsWith(VERSION_LEAD)) version = part.slice(VERSION_LEAD.length).trim();
  }
  if (!derivedFrom || !version) return null;
  return { derivedFrom, version };
}

/**
 * The marker in a raw JSON file (D-15, RESEARCH C13): the three keys at the top level, else inside a top-level
 * `_meta` object (the intel writer's shape). Read through the guarded JSON reader, so invalid JSON is a missing
 * marker and never a throw.
 */
export function markerFromJson(rawText: string): MadeUpMarker | null {
  const trimmed = (rawText.startsWith('\ufeff') ? rawText.slice(1) : rawText).trim();
  if (!trimmed.startsWith('{')) return null;
  const { data, warning } = tryParseJson(trimmed);
  if (warning) return null;
  const top = markerFromFrontmatter(data);
  if (top) return top;
  const meta = data._meta;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) return markerFromFrontmatter(meta as Record<string, unknown>);
  return null;
}

const FENCE = '---';

function fenceLineValue(line: string, key: string): string | null {
  const lead = `${key}:`;
  if (!line.startsWith(lead)) return null;
  let value = line.slice(lead.length).trim();
  if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'")) && value.endsWith(value[0] as string)) value = value.slice(1, -1);
  return value;
}

/**
 * The marker read from the `key: value` lines inside a leading `---` frontmatter fence, by a line scan, so a
 * file whose YAML elsewhere fails to parse still carries a readable marker.
 */
export function markerFromFenceLines(rawText: string): MadeUpMarker | null {
  const lines = (rawText.startsWith('\ufeff') ? rawText.slice(1) : rawText).split('\n').map((line) => line.replace(/\r$/, ''));
  if (lines[0]?.trim() !== FENCE) return null;
  let madeUp = false;
  let derivedFrom = '';
  let version = '';
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (line.trim() === FENCE) break;
    if (fenceLineValue(line, 'made_up_example') === 'true') madeUp = true;
    derivedFrom = fenceLineValue(line, 'derived_from') ?? derivedFrom;
    version = fenceLineValue(line, 'gsd_core_version') ?? version;
  }
  if (!madeUp || derivedFrom === '' || version === '') return null;
  return { derivedFrom, version };
}

/**
 * The marker a file carries, or null. Forms, tried in order: parsed frontmatter keys made_up_example true,
 * derived_from and gsd_core_version; the same three `key: value` lines inside a frontmatter fence when the
 * YAML elsewhere fails to parse; a first-line HTML comment
 * `<!-- made-up example · derived from {path} · gsd-core {version} -->`; the three keys in a raw JSON file,
 * at the top level or inside `_meta`. A file carrying more than one form is one marked example (first wins).
 */
export function readMadeUpMarker(frontmatter: Record<string, unknown>, rawText: string): MadeUpMarker | null {
  return markerFromFrontmatter(frontmatter) ?? markerFromFenceLines(rawText) ?? markerFromComment(rawText) ?? markerFromJson(rawText);
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(trimmed.startsWith('|') ? 1 : 0, trimmed.endsWith('|') ? trimmed.length - 1 : trimmed.length);
  return inner.split('|').map((cell) => cell.trim());
}

function stripTicks(cell: string): string {
  return cell.length >= 2 && cell.startsWith('`') && cell.endsWith('`') ? cell.slice(1, -1) : cell;
}

function isSeparatorRow(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => cell.length > 0 && [...cell].every((ch) => ch === '-' || ch === ':' || ch === ' '));
}

/**
 * The rows of the first table whose header starts with the Path column, in file order. Duplicates are kept
 * so they can be reported. The table ends at the first line that is not a table row.
 */
export function parseMadeUpIndex(markdown: string): IndexRow[] {
  const lines = markdown.split('\n');
  const rows: IndexRow[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (!trimmed.startsWith('|')) continue;
      const header = splitRow(trimmed);
      if (header[0]?.toLowerCase() === 'path') inTable = true;
      continue;
    }
    if (!trimmed.startsWith('|')) break;
    const cells = splitRow(trimmed);
    if (isSeparatorRow(cells)) continue;
    rows.push({
      path: stripTicks(cells[0] ?? ''),
      type: stripTicks(cells[1] ?? ''),
      derivedFrom: stripTicks(cells[2] ?? ''),
      version: stripTicks(cells[3] ?? ''),
      shape: cells[4] ?? '',
    });
  }
  return rows;
}

function* allArtifacts(project: Project): Generator<Artifact> {
  const seen = new Set<string>();
  const pools: Record<string, Artifact>[] = [
    project.artifacts,
    ...project.phases.map((phase) => phase.artifacts),
    ...project.quickTasks.map((task) => task.artifacts),
  ];
  for (const pool of pools) {
    for (const artifact of Object.values(pool)) {
      if (seen.has(artifact.path)) continue;
      seen.add(artifact.path);
      yield artifact;
    }
  }
}

function posix(path: string): string {
  return path.split('\\').join('/');
}

function compareProblems(a: MadeUpProblem, b: MadeUpProblem): number {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1;
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  return 0;
}

/** The problem list as one readable block, for a failure message. */
export function formatProblems(problems: readonly MadeUpProblem[]): string {
  return problems.map((problem) => `${problem.kind}: ${problem.path}`).join('\n');
}

/**
 * Loads each root through the real repository, takes every artifact whose kind is in the rule's set, and
 * compares it with the marker it carries and the index rows. Problems come back sorted by repo-relative path,
 * then problem kind, so a failure prints the same from run to run.
 */
export async function findMadeUpProblems(args: {
  roots: readonly string[];
  indexRows: readonly IndexRow[];
  repoRoot: string;
}): Promise<MadeUpProblem[]> {
  const { roots, indexRows, repoRoot } = args;
  const problems: MadeUpProblem[] = [];
  const indexed = new Map<string, number>();
  for (const row of indexRows) indexed.set(row.path, (indexed.get(row.path) ?? 0) + 1);

  const present = new Set<string>();
  for (const root of roots) {
    const { snapshot } = await loadProject(root);
    if (!snapshot.project) continue;
    for (const artifact of allArtifacts(snapshot.project)) {
      if (!MADE_UP_EXAMPLE_KINDS.has(artifact.kind)) continue;
      const absolute = join(root, artifact.path);
      const repoPath = posix(relative(repoRoot, absolute));
      present.add(repoPath);
      const rawText = existsSync(absolute) ? readFileSync(absolute, 'utf8') : artifact.body;
      if (!readMadeUpMarker(artifact.frontmatter, rawText)) problems.push({ path: repoPath, kind: 'missing-marker' });
      if (!indexed.has(repoPath)) problems.push({ path: repoPath, kind: 'not-indexed' });
    }
  }

  for (const [path, count] of indexed) {
    if (!existsSync(join(repoRoot, path))) problems.push({ path, kind: 'indexed-file-missing' });
    if (count > 1) problems.push({ path, kind: 'duplicate-index-row' });
  }

  return problems.sort(compareProblems);
}
