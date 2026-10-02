// The UI-REVIEW scorecard composer (quick-261003-528, sketch 018 B): a pure `ViewInput` ->
// `ComposedUiReview` merge of the frontmatter and `structured.uiReview` (built by
// `src/planning-repo/handlers/ui-review-audit.ts`, with `pathPhase` added by the handler). It
// decides the header (eyebrow, title, Audited / Phase / Fixes), the score and the verdict sentence,
// the radar geometry, every pillar's found / held split and score squares, the fixes and the
// pillars they belong to, the method chips, the review history bars, the folded back matter and
// the "In the source only" targets. No DOM, no rendering — `ui-review-components.tsx` is the only
// consumer. Returns `null` when the audit is missing or holds no pillar, and the page then keeps the
// pre-existing promoted-block view (T-528-04). Dates are formatted by hand in UTC (via
// `formatStamp`) so Node and the browser agree, and an unparseable date renders as written.
// T-528-03: author-written paths, baselines and history text are never turned into an href here.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  UiReviewAudit,
  UiReviewBack,
  UiReviewFact,
  UiReviewFileGroup,
  UiReviewFix,
  UiReviewGroup,
  UiReviewHistoryEntry,
  UiReviewItem,
  UiReviewItemKind,
  UiReviewPillar,
} from '../../planning-repo/handlers/ui-review-audit.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a score, a finding, a status or a chip becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from — never the parse-degradation tones
 * (`destructive` / `warning`), which stay reserved for the artifact-parse badge alone. */
export type UiReviewTone = 'complete' | 'in-flight' | 'missing' | 'quiet' | 'active';

/** 4/4 -> complete, 3/4 -> in-flight, anything lower -> missing. */
export function pillarTone(score: number): UiReviewTone {
  if (score >= 4) return 'complete';
  if (score === 3) return 'in-flight';
  return 'missing';
}

export const ITEM_TONE: Record<UiReviewItemKind, UiReviewTone> = {
  pass: 'complete',
  flag: 'in-flight',
  fail: 'missing',
  note: 'quiet',
};

export const ITEM_MARK: Record<UiReviewItemKind, string> = {
  pass: '✓',
  flag: '!',
  fail: '✗',
  note: '·',
};

export type ShotsClass = 'yes' | 'partial' | 'none' | 'unknown';

export const SHOTS: Record<ShotsClass, { label: string; tone: UiReviewTone }> = {
  yes: { label: 'Seen in a browser', tone: 'complete' },
  partial: { label: 'Partly seen in a browser', tone: 'in-flight' },
  none: { label: 'Code only · not seen in a browser', tone: 'in-flight' },
  unknown: { label: 'Screenshots not stated', tone: 'quiet' },
};

/** The status chip: pass / complete -> Passed, gap / fail -> Gaps found, other text as written. */
export function statusChip(raw: string): { label: string; tone: UiReviewTone } | null {
  const text = raw.trim();
  if (text === '') return null;
  const lower = text.toLowerCase();
  if (lower.includes('pass') || lower.includes('complete')) return { label: 'Passed', tone: 'complete' };
  if (lower.includes('gap') || lower.includes('fail')) return { label: 'Gaps found', tone: 'in-flight' };
  return { label: text, tone: 'quiet' };
}

export const FIX_TONE: UiReviewTone = 'in-flight';
export const HUMAN_TONE: UiReviewTone = 'in-flight';
export const SUPERSEDES_TONE: UiReviewTone = 'quiet';
export const BASELINE_TONE: UiReviewTone = 'quiet';
export const SELECTED_TONE: UiReviewTone = 'active';

/** Screenshot facts: partial before none, then any other text counts as seen. */
export function classifyShots(text: string | null, capturedFlag: boolean): ShotsClass {
  if (text !== null) {
    const lower = text.toLowerCase();
    if (lower.includes('wide only') || lower.includes('partial') || lower.includes('narrow widths not')) return 'partial';
    if (lower.includes('not captured') || lower.includes('code-only') || lower.includes('code only')) return 'none';
    return 'yes';
  }
  return capturedFlag ? 'yes' : 'unknown';
}

const SHORT: Record<string, string> = {
  Copywriting: 'Copy',
  Visuals: 'Visuals',
  Color: 'Color',
  Typography: 'Type',
  Spacing: 'Spacing',
  'Experience Design': 'Experience',
};

export function shortName(name: string): string {
  return SHORT[name] ?? (name.length > 12 ? name.slice(0, 12) : name);
}

// ---------------------------------------------------------------------------
// Radar geometry
// ---------------------------------------------------------------------------

export interface RadarGeometry {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  /** Four ring polygons (a quarter, half, three quarters and the full radius), as point strings. */
  rings: string[];
  spokes: { x1: number; y1: number; x2: number; y2: number }[];
  /** The score polygon's point string. */
  shape: string;
  dots: { x: number; y: number }[];
  /** Where each axis label is centred (radius + 46). */
  labels: { x: number; y: number }[];
}

const RADAR_SIZE = 400;
const RADAR_RADIUS = 118;
const LABEL_REACH = 46;

function one(n: number): string {
  return n.toFixed(1);
}

/** Six axes (or however many scores), the first pointing straight up, a score of `max` on the outer
 * ring and 0 at the centre; scores outside 0..max clamp. */
export function radarGeometry(scores: readonly number[], max = 4): RadarGeometry {
  const count = scores.length;
  const cx = RADAR_SIZE / 2;
  const cy = RADAR_SIZE / 2;
  const angle = (i: number): number => ((-90 + (i * 360) / count) * Math.PI) / 180;
  const point = (i: number, r: number): { x: number; y: number } => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });
  const polygon = (r: (i: number) => number): string =>
    scores.map((_, i) => `${one(point(i, r(i)).x)},${one(point(i, r(i)).y)}`).join(' ');
  const ratio = (score: number): number => (max > 0 ? Math.min(Math.max(score, 0), max) / max : 0);
  return {
    size: RADAR_SIZE,
    cx,
    cy,
    radius: RADAR_RADIUS,
    rings: [1, 2, 3, 4].map((k) => polygon(() => (RADAR_RADIUS * k) / 4)),
    spokes: scores.map((_, i) => {
      const end = point(i, RADAR_RADIUS);
      return { x1: cx, y1: cy, x2: Number(one(end.x)), y2: Number(one(end.y)) };
    }),
    shape: polygon((i) => RADAR_RADIUS * ratio(scores[i])),
    dots: scores.map((score, i) => {
      const p = point(i, RADAR_RADIUS * ratio(score));
      return { x: Number(one(p.x)), y: Number(one(p.y)) };
    }),
    labels: scores.map((_, i) => {
      const p = point(i, RADAR_RADIUS + LABEL_REACH);
      return { x: Number(one(p.x)), y: Number(one(p.y)) };
    }),
  };
}

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedUiReviewIntro {
  eyebrow: string;
  title: string | null;
  audited: string | null;
  phase: string | null;
  fixCount: number;
}

export interface ComposedUiReviewItem {
  text: string;
  kind: UiReviewItemKind;
  tone: UiReviewTone;
  mark: string;
  sub: string[];
  code: string | null;
}

export interface ComposedUiReviewHeld {
  title: string | null;
  items: ComposedUiReviewItem[];
}

export interface ComposedUiReviewPillar {
  n: number;
  name: string;
  short: string;
  score: number;
  tone: UiReviewTone;
  /** Four entries, `on` for each point earned. */
  squares: { on: boolean }[];
  key: string;
  verdict: { label: string; text: string } | null;
  found: ComposedUiReviewItem[];
  held: ComposedUiReviewHeld[];
  heldCount: number;
  notesPresent: boolean;
  fixNumbers: number[];
  fixLabel: string | null;
  tabId: string;
  panelId: string;
}

export interface ComposedUiReviewFix {
  n: number;
  title: string;
  context: string | null;
  contextLong: boolean;
  impact: string | null;
  fix: string | null;
  refs: string[];
  pillarNumbers: number[];
  anchorId: string;
}

export interface ComposedUiReviewChip {
  label: string;
  tone: UiReviewTone;
  title: string | null;
}

export interface ComposedUiReviewMethod {
  /** The tones of the chips whose tone is fixed per kind (never chosen by the components). */
  tones: { baseline: UiReviewTone; human: UiReviewTone; supersedes: UiReviewTone };
  status: { label: string; tone: UiReviewTone } | null;
  shots: ComposedUiReviewChip;
  baseline: { label: string; title: string; url: string | null } | null;
  human: boolean;
  supersedes: number;
  extraFacts: { key: string; value: string }[];
}

export interface ComposedUiReviewBar {
  label: string;
  score: number;
  ratio: number;
  now: boolean;
  title: string;
}

export interface ComposedUiReviewBack {
  id: string;
  heading: string;
  parts: { heading: string | null; blocks: Block[] }[];
  files: { groups: UiReviewFileGroup[] } | null;
}

export interface ComposedUiReviewSourceOnly {
  label: string;
  /** The heading id to scroll to in Source mode; null = the top (the frontmatter). */
  targetId: string | null;
}

export interface ComposedUiReview {
  intro: ComposedUiReviewIntro;
  score: number;
  max: number;
  lost: number;
  verdict: { line: string; fixesLine: string | null };
  noFixes: { kind: 'clear' | 'quiet'; note: string | null } | null;
  radar: {
    geometry: RadarGeometry;
    labels: { n: number; short: string; name: string; score: number; tone: UiReviewTone; fixLabel: string | null }[];
  } | null;
  pillars: ComposedUiReviewPillar[];
  initialPillar: number;
  fixes: ComposedUiReviewFix[];
  unlinkedFixes: ComposedUiReviewFix[];
  method: ComposedUiReviewMethod;
  history: ComposedUiReviewBar[] | null;
  back: ComposedUiReviewBack[];
  sourceOnly: ComposedUiReviewSourceOnly[];
}

// ---------------------------------------------------------------------------
// Defensive readers
// ---------------------------------------------------------------------------

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Frontmatter arrives as strings, numbers, booleans or (from other loaders) Date instances. */
function scalarText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

/** One trailing parenthetical removed: "04-UI-SPEC.md (Design Contract)" -> "04-UI-SPEC.md". */
function withoutParenthetical(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.endsWith(')')) return trimmed;
  const open = trimmed.lastIndexOf(' (');
  return open > 0 ? trimmed.slice(0, open).trim() : trimmed;
}

/** "03-file-browsing" or "03" -> "3", "02.1-x" -> "2.1" (leading zeros stripped, as the other covers do). */
function phaseNumber(phase: string): string | null {
  let i = 0;
  while (i < phase.length && phase[i] >= '0' && phase[i] <= '9') i += 1;
  if (i === 0) return null;
  let whole = phase.slice(0, i).replace(/^0+(?=\d)/, '');
  if (phase[i] === '.') {
    let j = i + 1;
    while (j < phase.length && phase[j] >= '0' && phase[j] <= '9') j += 1;
    if (j > i + 1) whole = `${whole}.${phase.slice(i + 1, j)}`;
  }
  return whole;
}

/** "run-sheet-views" -> "Run sheet views"; null when no words remain. */
function slugTitle(slug: string): string | null {
  const words = slug.split('-').join(' ').trim();
  return words === '' ? null : words[0].toUpperCase() + words.slice(1);
}

function factValue(facts: UiReviewFact[], key: string): string | null {
  const lower = key.toLowerCase();
  for (const fact of facts) {
    if (stringOr(fact.key, '').toLowerCase() === lower) return nonEmpty(fact.value);
  }
  return null;
}

function itemOf(item: UiReviewItem): ComposedUiReviewItem {
  const kind: UiReviewItemKind = item.kind in ITEM_TONE ? item.kind : 'note';
  return {
    text: stringOr(item.text, ''),
    kind,
    tone: ITEM_TONE[kind],
    mark: ITEM_MARK[kind],
    sub: arrayOf<string>(item.sub).filter((s) => typeof s === 'string'),
    code: typeof item.code === 'string' ? item.code : null,
  };
}

function headingId(input: ViewInput, prefix: string): string | null {
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 2) continue;
    if (normalizeHeading(heading.text).startsWith(prefix)) return heading.id;
  }
  for (const group of input.groups ?? []) {
    if (group.heading === null || group.id === null) continue;
    if (normalizeHeading(group.heading).startsWith(prefix)) return group.id;
  }
  return null;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function pillarOf(raw: UiReviewPillar, max: number): ComposedUiReviewPillar {
  const score = Math.min(Math.max(numberOr(raw.score, 0), 0), max);
  const found: ComposedUiReviewItem[] = [];
  const held: ComposedUiReviewHeld[] = [];
  let heldCount = 0;
  for (const group of arrayOf<UiReviewGroup>(raw.groups)) {
    const heldItems: ComposedUiReviewItem[] = [];
    for (const rawItem of arrayOf<UiReviewItem>(group.items)) {
      const item = itemOf(rawItem);
      if (item.kind === 'fail' || item.kind === 'flag') found.push(item);
      else heldItems.push(item);
    }
    if (heldItems.length > 0) {
      held.push({ title: nonEmpty(group.title), items: heldItems });
      heldCount += heldItems.length;
    }
  }
  const fixNumbers = arrayOf<number>(raw.fixes).filter((n) => typeof n === 'number');
  const name = stringOr(raw.name, `Pillar ${raw.n}`);
  const verdict =
    raw.verdict && typeof raw.verdict === 'object' && nonEmpty(raw.verdict.text) !== null
      ? { label: stringOr(raw.verdict.label, 'Finding'), text: raw.verdict.text }
      : null;
  return {
    n: raw.n,
    name,
    short: shortName(name),
    score,
    tone: pillarTone(score),
    squares: [1, 2, 3, 4].map((point) => ({ on: point <= score })),
    key: stringOr(raw.key, ''),
    verdict,
    found,
    held,
    heldCount,
    notesPresent: arrayOf(raw.notes).length > 0,
    fixNumbers,
    fixLabel: fixNumbers.length > 0 ? `fix ${fixNumbers.join(', ')}` : null,
    tabId: `ui-review-tab-${raw.n}`,
    panelId: 'ui-review-inspector',
  };
}

function backOf(raw: UiReviewBack, index: number): ComposedUiReviewBack {
  return {
    id: `ui-review-back-${index}`,
    heading: stringOr(raw.heading, ''),
    parts: arrayOf<{ heading: string | null; blocks: Block[] }>(raw.parts).map((part) => ({
      heading: nonEmpty(part.heading),
      blocks: arrayOf<Block>(part.blocks),
    })),
    files:
      raw.files && typeof raw.files === 'object'
        ? { groups: arrayOf<UiReviewFileGroup>(raw.files.groups) }
        : null,
  };
}

export function composeUiReview(input: ViewInput): ComposedUiReview | null {
  const raw = input.structured?.uiReview as
    | (Partial<UiReviewAudit> & { pathPhase?: { number?: unknown; slug?: unknown } | null })
    | undefined
    | null;
  if (!raw || typeof raw !== 'object') return null;
  const rawPillars = arrayOf<UiReviewPillar>(raw.pillars);
  if (rawPillars.length === 0) return null;
  const fm = input.frontmatter ?? {};
  const facts = arrayOf<UiReviewFact>(raw.facts);
  const pathPhase = raw.pathPhase && typeof raw.pathPhase === 'object' ? raw.pathPhase : null;

  // ---- pillars, score ----------------------------------------------------------------------
  const rawMax = numberOr(raw.overall?.max, 4 * rawPillars.length);
  const max = rawMax > 0 ? rawMax : 4 * rawPillars.length;
  const pillars = rawPillars.map((pillar) => pillarOf(pillar, 4));
  const score = numberOr(raw.overall?.score, pillars.reduce((total, p) => total + p.score, 0));
  const lostPillars = pillars.filter((p) => p.score < 4);
  let lost = max - score;
  if (lost <= 0 && lostPillars.length > 0) lost = lostPillars.reduce((total, p) => total + (4 - p.score), 0);
  if (lost < 0) lost = 0;

  // ---- fixes -------------------------------------------------------------------------------
  const fixes: ComposedUiReviewFix[] = arrayOf<UiReviewFix>(raw.fixes)
    .filter((fix) => !fix.none)
    .map((fix) => ({
      n: fix.n,
      title: stringOr(fix.title, ''),
      context: nonEmpty(fix.context),
      contextLong: stringOr(fix.context, '').length > 240,
      impact: nonEmpty(fix.impact),
      fix: nonEmpty(fix.fix),
      refs: arrayOf<string>(fix.refs).filter((r) => typeof r === 'string'),
      pillarNumbers: pillars.filter((p) => p.fixNumbers.includes(fix.n)).map((p) => p.n),
      anchorId: `ui-review-fix-${fix.n}`,
    }));
  const droppedFix = arrayOf<UiReviewFix>(raw.fixes).some((fix) => fix.none);
  const unlinkedFixes = fixes.filter((fix) => fix.pillarNumbers.length === 0);

  // ---- intro -------------------------------------------------------------------------------
  const fmPhase = scalarText(fm.phase);
  const phaseText =
    (fmPhase !== null ? phaseNumber(fmPhase) : null) ??
    (pathPhase && typeof pathPhase.number === 'string' ? phaseNumber(pathPhase.number) : null) ??
    (typeof raw.h1Phase === 'string' ? phaseNumber(raw.h1Phase) : null);
  const slug =
    scalarText(fm.slug) ?? (pathPhase && typeof pathPhase.slug === 'string' ? nonEmpty(pathPhase.slug) : null);
  const auditedRaw =
    factValue(facts, 'Audited') ?? scalarText(fm.reviewed) ?? scalarText(fm.audit_date);
  const audited = auditedRaw === null ? null : formatStamp(withoutParenthetical(auditedRaw));
  const intro: ComposedUiReviewIntro = {
    eyebrow: phaseText === null ? 'UI Review' : `UI Review · Phase ${phaseText}`,
    title: slug === null ? null : slugTitle(slug),
    audited,
    phase: phaseText,
    fixCount: fixes.length,
  };

  // ---- verdict -----------------------------------------------------------------------------
  const names = lostPillars.map((p) => p.name);
  const line =
    lost === 0 && lostPillars.length === 0
      ? 'Full marks. Nothing to fix.'
      : `${lost} point${lost === 1 ? '' : 's'} lost${names.length > 0 ? `, in ${joinNames(names)}` : ''}.`;
  const verdict = {
    line,
    fixesLine: fixes.length > 0 ? `${fixes.length} fix${fixes.length === 1 ? '' : 'es'} asked for.` : null,
  };
  const note = nonEmpty(raw.fixesNote);
  const noFixes: ComposedUiReview['noFixes'] =
    fixes.length > 0
      ? null
      : lost === 0 && lostPillars.length === 0
        ? { kind: 'clear', note }
        : { kind: 'quiet', note: null };

  // ---- radar -------------------------------------------------------------------------------
  const radar =
    pillars.length >= 3 && pillars.length <= 8
      ? {
          geometry: radarGeometry(
            pillars.map((p) => p.score),
            4,
          ),
          labels: pillars.map((p) => ({
            n: p.n,
            short: p.short,
            name: p.name,
            score: p.score,
            tone: p.tone,
            fixLabel: p.fixLabel,
          })),
        }
      : null;

  // ---- method chips ------------------------------------------------------------------------
  const history = arrayOf<UiReviewHistoryEntry>(raw.history);
  const shotsText = factValue(facts, 'Screenshots');
  const shotsClass = classifyShots(shotsText, fm.screenshots_captured === true || fm.screenshots_captured === 'true');
  const baselineRaw = factValue(facts, 'Baseline') ?? scalarText(fm.baseline);
  const baselineLabel = baselineRaw === null ? null : withoutParenthetical(baselineRaw);
  const uiSpecSibling = (input.siblingArtifacts ?? []).find((s) => s.kind === 'ui-spec');
  const hiddenFacts = new Set(['audited', 'baseline', 'screenshots']);
  const method: ComposedUiReviewMethod = {
    tones: { baseline: BASELINE_TONE, human: HUMAN_TONE, supersedes: SUPERSEDES_TONE },
    status: statusChip(scalarText(fm.status) ?? ''),
    shots: { ...SHOTS[shotsClass], title: shotsText },
    baseline:
      baselineLabel === null || baselineLabel === ''
        ? null
        : { label: `Against ${baselineLabel}`, title: baselineRaw ?? baselineLabel, url: uiSpecSibling ? uiSpecSibling.url : null },
    human: fm.needs_human_review === true || fm.needs_human_review === 'true',
    supersedes: history.length,
    extraFacts: facts
      .filter((fact) => {
        const key = stringOr(fact.key, '').toLowerCase();
        return !hiddenFacts.has(key) && !key.startsWith('prior reviews') && nonEmpty(fact.value) !== null;
      })
      .map((fact) => ({ key: fact.key, value: fact.value.trim() })),
  };

  // ---- history bars ------------------------------------------------------------------------
  const bars: ComposedUiReviewBar[] | null =
    history.length === 0
      ? null
      : [
          ...history.map((h) => ({
            label: stringOr(h.when, ''),
            score: numberOr(h.score, 0),
            ratio: Math.min(Math.max(numberOr(h.score, 0) / max, 0), 1),
            now: false,
            title: nonEmpty(h.why) ? `${stringOr(h.when, '')} — ${h.why}` : stringOr(h.when, ''),
          })),
          {
            label: audited ?? 'This review',
            score,
            ratio: Math.min(Math.max(score / max, 0), 1),
            now: true,
            title: audited ?? 'This review',
          },
        ];

  // ---- initial pillar ----------------------------------------------------------------------
  let initial = pillars[0];
  for (const pillar of pillars) if (pillar.score < initial.score) initial = pillar;

  // ---- back matter, source-only ------------------------------------------------------------
  const back = arrayOf<UiReviewBack>(raw.back).map((section, index) => backOf(section, index));
  const sections = arrayOf<{ heading: string }>(raw.sections);
  const sourceOnly: ComposedUiReviewSourceOnly[] = [];
  if (Object.keys(fm).length > 0) sourceOnly.push({ label: 'Frontmatter', targetId: null });
  if (sections.some((s) => normalizeHeading(stringOr(s.heading, '')).startsWith('pillar scores'))) {
    sourceOnly.push({ label: 'Pillar Scores table', targetId: headingId(input, 'pillar scores') });
  }
  if (droppedFix) {
    sourceOnly.push({
      label: 'Top 3 Priority Fixes (as written)',
      targetId: headingId(input, 'top 3 priority fixes') ?? headingId(input, 'top priority fixes'),
    });
  }
  if (pillars.some((p) => p.notesPresent)) {
    sourceOnly.push({ label: 'Audit method notes', targetId: headingId(input, 'detailed findings') });
  }

  return {
    intro,
    score,
    max,
    lost,
    verdict,
    noFixes,
    radar,
    pillars,
    initialPillar: initial.n,
    fixes,
    unlinkedFixes,
    method,
    history: bars,
    back,
    sourceOnly,
  };
}
