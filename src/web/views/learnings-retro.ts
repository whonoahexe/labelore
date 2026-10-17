// The LEARNINGS page composer (quick-261017-k45, sketch 024 winner E): a pure `ViewInput` ->
// `ComposedLearningsRetro` merge of the frontmatter and `structured.learnings` (built by
// `src/planning-repo/handlers/learnings-retro.ts`, with `pathPhase`, `quickId` and `scope` added by the
// handler). It decides the head (eyebrow, title, extraction date, project, missing artifacts), the
// one-sentence lede, the source bar, the four chapters with their numbered entries (title, body, side
// note fields, sources, graduation) and the "Also in this file" chips, and exports the pure filter
// helpers the view uses when one source is picked. No DOM, no filesystem access, no rendering -
// `learnings-retro-components.tsx` is the only consumer. Returns `null` when the projection is missing
// or holds no entry; every other junk value degrades to an omitted part (T-k45-03). Dates are formatted
// by hand in UTC (via `formatStamp`) so Node and the browser agree.
// T-k45-06: the only navigation targets are heading ids taken from `input.headings`, or null; no URL is
// built from document text, and no RegExp is built from it either.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export type LearningsKind = 'decision' | 'lesson' | 'pattern' | 'surprise';

export const KIND_ORDER: readonly LearningsKind[] = ['decision', 'lesson', 'pattern', 'surprise'];

export const CHAPTER_TITLE: Record<LearningsKind, string> = {
  decision: 'What we decided',
  lesson: 'What we learned the hard way',
  pattern: 'What we’ll reuse',
  surprise: 'What surprised us',
};

export const KIND_NOUN: Record<LearningsKind, { one: string; many: string }> = {
  decision: { one: 'decision', many: 'decisions' },
  lesson: { one: 'lesson', many: 'lessons' },
  pattern: { one: 'pattern', many: 'patterns' },
  surprise: { one: 'surprise', many: 'surprises' },
};

/** The labelled field each kind carries, which leads the side note. */
const OWN_FIELD: Record<LearningsKind, string> = {
  decision: 'rationale',
  lesson: 'context',
  pattern: 'when to use',
  surprise: 'impact',
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type LearningsScope = 'phase' | 'project' | 'quick' | 'other';

export interface ComposedLearningsHead {
  eyebrow: string;
  /** The file's title without its "Phase N Learnings:" lead, or null (the view then uses the artifact title). */
  title: string | null;
  /** "8 Aug 2026", or null. */
  extracted: string | null;
  /** The project name, null when absent or equal to the title. */
  project: string | null;
  missing: string[];
}

export interface ComposedLearningsField {
  label: string;
  blocks: Block[];
}

export interface ComposedLearningsSource {
  artifact: string;
  /** The short name: no `.md`, no leading phase prefix. */
  label: string;
  note: string | null;
}

export interface ComposedLearningsGraduated {
  target: string;
  /** "22 Sep 2026", or null. */
  date: string | null;
}

export interface ComposedLearningsEntry {
  /** 1-based document position across the whole file. */
  no: number;
  kind: LearningsKind;
  title: string;
  body: Block[];
  /** The kind's own field first, then the rest in document order. */
  fields: ComposedLearningsField[];
  sources: ComposedLearningsSource[];
  graduated: ComposedLearningsGraduated | null;
  /** The distinct artifacts the entry cites. */
  sourceKeys: string[];
}

export interface ComposedLearningsChapter {
  kind: LearningsKind;
  /** "01", "02", ... by position among the kinds present. */
  number: string;
  title: string;
  entries: ComposedLearningsEntry[];
}

export interface ComposedLearningsSegment {
  artifact: string;
  label: string;
  count: number;
  /** "01-REVIEW.md · 1 learning". */
  title: string;
}

export interface ComposedLearningsAlso {
  label: string;
  targetId: string | null;
}

export interface ComposedLearningsRetro {
  scope: LearningsScope;
  head: ComposedLearningsHead;
  lede: string;
  chapters: ComposedLearningsChapter[];
  /** One segment per distinct source; empty with fewer than two. */
  sources: ComposedLearningsSegment[];
  also: ComposedLearningsAlso[];
}

// ---------------------------------------------------------------------------
// Guarded readers
// ---------------------------------------------------------------------------

function rec(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStr(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function isKind(value: unknown): value is LearningsKind {
  return value === 'decision' || value === 'lesson' || value === 'pattern' || value === 'surprise';
}

function strings(value: unknown): string[] {
  const out: string[] = [];
  for (const item of list(value)) {
    const text = asStr(item);
    if (text !== null) out.push(text);
  }
  return out;
}

function blocksOf(value: unknown): Block[] {
  const out: Block[] = [];
  for (const raw of list(value)) {
    const block = rec(raw);
    if (block === null) continue;
    if (block.kind === 'paragraph' && typeof block.text === 'string') out.push({ kind: 'paragraph', text: block.text });
    else if (block.kind === 'code' && typeof block.text === 'string') out.push({ kind: 'code', text: block.text });
    else if (block.kind === 'list' && Array.isArray(block.items)) {
      out.push({ kind: 'list', ordered: block.ordered === true, items: block.items.filter((i): i is string => typeof i === 'string') });
    } else if (block.kind === 'table' && Array.isArray(block.rows)) {
      const rows: Record<string, string>[] = [];
      for (const r of block.rows) {
        const row = rec(r);
        if (row === null) continue;
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) if (typeof v === 'string') clean[k] = v;
        rows.push(clean);
      }
      out.push({ kind: 'table', rows });
    }
  }
  return out;
}

/** "01" / 1 / "05-per-type" -> "1" / "1" / "5": leading digits (and a dotted tail) with zeros dropped. */
function phaseNumberOf(value: unknown): string | null {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : typeof value === 'string' ? value.trim() : '';
  let i = 0;
  while (i < raw.length && i < 12 && raw[i] >= '0' && raw[i] <= '9') i += 1;
  if (i === 0) return null;
  let end = i;
  while (end < raw.length && end < 12 && raw[end] === '.' && raw[end + 1] >= '0' && raw[end + 1] <= '9') {
    end += 2;
    while (end < raw.length && end < 12 && raw[end] >= '0' && raw[end] <= '9') end += 1;
  }
  const head = raw.slice(0, i).replace(/^0+(?=\d)/, '');
  return head + raw.slice(i, end);
}

function dateText(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return asStr(value);
}

function humanize(slug: string): string {
  const text = slug.slice(0, 200).replace(/[-_]+/g, ' ').trim();
  return text === '' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** The H1 without a leading "Phase N Learnings:", "Quick <id> Learnings:" or "Learnings:". */
function titleOf(h1: string | null): string | null {
  if (h1 === null) return null;
  const text = h1.slice(0, 300).replace(/\s+/g, ' ').trim();
  const stripped = text.replace(/^(?:(?:phase|quick)\s+[^\s:]{1,40}\s+)?learnings?\s*:\s*/i, '').trim();
  return stripped === '' ? null : stripped;
}

/** "01-04-SUMMARY.md" -> "04-SUMMARY"; "01-REVIEW-FIX.md" -> "REVIEW-FIX"; "D-02" -> "D-02". */
export function shortSource(artifact: string): string {
  const base = artifact.endsWith('.md') ? artifact.slice(0, -3) : artifact;
  return base.replace(/^\d+(?:\.\d+)?-(?=\d|[A-Z])/, '');
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function entriesOf(value: unknown): ComposedLearningsEntry[] {
  const out: ComposedLearningsEntry[] = [];
  for (const raw of list(value)) {
    const entry = rec(raw);
    if (entry === null || !isKind(entry.kind)) continue;
    const title = asStr(entry.title);
    if (title === null) continue;
    const kind = entry.kind;

    const parsedFields: ComposedLearningsField[] = [];
    for (const f of list(entry.fields)) {
      const field = rec(f);
      if (field === null) continue;
      const label = asStr(field.label);
      if (label === null) continue;
      parsedFields.push({ label, blocks: blocksOf(field.blocks) });
    }
    const own = parsedFields.filter((f) => f.label.toLowerCase() === OWN_FIELD[kind]);
    const fields = own.concat(parsedFields.filter((f) => f.label.toLowerCase() !== OWN_FIELD[kind]));

    const sources: ComposedLearningsSource[] = [];
    for (const s of list(entry.sources)) {
      const source = rec(s);
      if (source === null) continue;
      const artifact = asStr(source.artifact);
      if (artifact === null) continue;
      sources.push({ artifact, label: shortSource(artifact), note: asStr(source.note) });
    }

    const grad = rec(entry.graduated);
    const target = grad === null ? null : asStr(grad.target);
    const date = grad === null ? null : asStr(grad.date);
    const graduated: ComposedLearningsGraduated | null =
      target === null ? null : { target, date: date === null ? null : formatStamp(date) };

    const sourceKeys: string[] = [];
    for (const s of sources) if (!sourceKeys.includes(s.artifact)) sourceKeys.push(s.artifact);

    out.push({ no: out.length + 1, kind, title, body: blocksOf(entry.body), fields, sources, graduated, sourceKeys });
  }
  return out;
}

function segmentsOf(entries: ComposedLearningsEntry[]): ComposedLearningsSegment[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const key of entry.sourceKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size < 2) return [];
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
    .map(([artifact, count]) => ({
      artifact,
      label: shortSource(artifact),
      count,
      title: `${artifact} · ${plural(count, 'learning', 'learnings')}`,
    }));
}

function ledeOf(entries: ComposedLearningsEntry[], scope: LearningsScope): string {
  const parts: string[] = [];
  for (const kind of KIND_ORDER) {
    const n = entries.filter((e) => e.kind === kind).length;
    if (n > 0) parts.push(plural(n, KIND_NOUN[kind].one, KIND_NOUN[kind].many));
  }
  const where =
    scope === 'phase' ? 'this phase' : scope === 'project' ? 'this project' : scope === 'quick' ? 'this quick task' : 'this file';
  const distinct: string[] = [];
  for (const entry of entries) for (const key of entry.sourceKeys) if (!distinct.includes(key)) distinct.push(key);
  const files = distinct.length > 0 && distinct.every((k) => k.endsWith('.md'));
  const drawn =
    distinct.length > 0 ? `, drawn from ${plural(distinct.length, files ? 'artifact' : 'source', files ? 'artifacts' : 'sources')}` : '';
  return `${plural(entries.length, 'learning', 'learnings')} from ${where}: ${joinAnd(parts)}${drawn}.`;
}

function headingId(headings: ViewInput['headings'], text: string): string | null {
  if (!Array.isArray(headings)) return null;
  const wanted = normalizeHeading(text);
  for (const h of headings) {
    if (h && typeof h.text === 'string' && typeof h.id === 'string' && normalizeHeading(h.text) === wanted) return h.id;
  }
  return null;
}

export function composeLearningsRetro(input: ViewInput): ComposedLearningsRetro | null {
  const report = rec(input.structured?.learnings);
  if (report === null) return null;
  const entries = entriesOf(report.entries);
  if (entries.length === 0) return null;
  const fm = rec(input.frontmatter) ?? {};

  const scopeRaw = report.scope;
  const scope: LearningsScope =
    scopeRaw === 'phase' || scopeRaw === 'project' || scopeRaw === 'quick' ? scopeRaw : 'other';

  // Eyebrow: the frontmatter phase, else the phase in the file's path, else the quick id, else scope.
  const pathPhase = rec(report.pathPhase);
  const phase = phaseNumberOf(fm.phase) ?? (pathPhase === null ? null : phaseNumberOf(pathPhase.number));
  const quickId = asStr(report.quickId);
  const eyebrow =
    phase !== null
      ? `Learnings · Phase ${phase}`
      : quickId !== null
        ? `Learnings · Quick ${quickId}`
        : scope === 'project'
          ? 'Learnings · Project'
          : 'Learnings';

  const phaseName = asStr(fm.phase_name);
  const projectName = asStr(fm.project);
  const title = titleOf(asStr(report.h1)) ?? (phaseName === null ? null : humanize(phaseName)) ?? projectName;
  const generated = dateText(fm.generated);
  const head: ComposedLearningsHead = {
    eyebrow,
    title,
    extracted: generated === null ? null : formatStamp(generated),
    project:
      projectName === null || (title !== null && title.toLowerCase() === projectName.toLowerCase()) ? null : projectName,
    missing: strings(fm.missing_artifacts),
  };

  const present = KIND_ORDER.filter((kind) => entries.some((e) => e.kind === kind));
  const chapters: ComposedLearningsChapter[] = present.map((kind, index) => ({
    kind,
    number: String(index + 1).padStart(2, '0'),
    title: CHAPTER_TITLE[kind],
    entries: entries.filter((e) => e.kind === kind),
  }));

  const also: ComposedLearningsAlso[] = [];
  if (Object.keys(fm).length > 0) also.push({ label: 'Frontmatter', targetId: null });
  for (const raw of list(report.sections)) {
    const section = rec(raw);
    if (section === null) continue;
    const heading = asStr(section.heading);
    if (heading === null) continue;
    const showsIt = isKind(section.kind) ? section.leftover === true : section.blank !== true;
    if (!showsIt) continue;
    also.push({ label: heading, targetId: headingId(input.headings, heading) });
  }

  return { scope, head, lede: ledeOf(entries, scope), chapters, sources: segmentsOf(entries), also };
}

// ---------------------------------------------------------------------------
// Filter helpers (pure; the view holds the picked source in state)
// ---------------------------------------------------------------------------

function inSource(entry: ComposedLearningsEntry, source: string | null): boolean {
  return source === null || entry.sourceKeys.includes(source);
}

export function entriesFor(
  model: ComposedLearningsRetro,
  kind: LearningsKind,
  source: string | null,
): ComposedLearningsEntry[] {
  const chapter = model.chapters.find((c) => c.kind === kind);
  return chapter === undefined ? [] : chapter.entries.filter((e) => inSource(e, source));
}

export function chapterCounts(
  model: ComposedLearningsRetro,
  source: string | null,
): { kind: LearningsKind; shown: number; total: number }[] {
  return model.chapters.map((chapter) => ({
    kind: chapter.kind,
    shown: chapter.entries.filter((e) => inSource(e, source)).length,
    total: chapter.entries.length,
  }));
}

/** The wanted kind when it has entries under the filter, else the first kind that does, else the first chapter. */
export function pickTab(
  model: ComposedLearningsRetro,
  source: string | null,
  wanted: LearningsKind | null,
): LearningsKind | null {
  const counts = chapterCounts(model, source);
  const wantedCount = counts.find((c) => c.kind === wanted);
  if (wantedCount !== undefined && wantedCount.shown > 0) return wantedCount.kind;
  const first = counts.find((c) => c.shown > 0);
  if (first !== undefined) return first.kind;
  return counts.length > 0 ? counts[0].kind : null;
}

/** "Showing the 9 learnings from 01-04-SUMMARY.md" (singular for one), or null without a filter. */
export function filterLine(
  model: ComposedLearningsRetro,
  source: string | null,
): { count: number; text: string } | null {
  if (source === null) return null;
  const count = chapterCounts(model, source).reduce((sum, c) => sum + c.shown, 0);
  return { count, text: `Showing the ${plural(count, 'learning', 'learnings')} from ${source}` };
}
