// The UI-SPEC page composer (quick-261001-qk6, sketch 014 winner: B's shadcn card + A's no copy
// section): a pure `ViewInput` -> `ComposedUiSpec` interpretation over `structured.uiSpec` (built by
// `src/planning-repo/handlers/ui-spec-contract.ts`). It turns the contract's tables into what a
// person reads — the sign-off summary, the design-system choice cards, a spacing ruler, a type
// ladder, the 60/30/10 colour split with role cards, the element x state coverage matrix, the
// registry verdict — and lists everything the page leaves to Source mode. No DOM, no rendering —
// `ui-spec-components.tsx` is the only consumer. Returns `null` when the contract is missing or
// holds none of the recognised sections, and the page then keeps the pre-existing promoted-block
// view (T-qk6-05).
// T-qk6-04: author-written text is matched by hand-written string logic and regex *literals* on
// cells the extractor already clipped; this module never builds a regular expression from
// document text. T-qk6-03: colour values reach a style only through `safeColor`.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  UiSpecConsiderations,
  UiSpecContract,
  UiSpecDimension,
  UiSpecStatus,
  UiSpecTable,
  UiSpecVerdict,
} from '../../planning-repo/handlers/ui-spec-contract.ts';
import type { ViewInput } from './manifest.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a verdict, status, gate or state becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from — never the parse-degradation tones
 * (`destructive`/`warning`), which stay reserved for the artifact-parse badge alone. */
export type UiSpecTone = 'complete' | 'quiet' | 'in-flight' | 'missing';

export const VERDICT_TONE: Record<UiSpecVerdict, UiSpecTone> = {
  PASS: 'complete',
  FLAG: 'in-flight',
  BLOCK: 'missing',
  FAIL: 'missing',
  PENDING: 'quiet',
};

export const VERDICT_GLYPH: Record<UiSpecVerdict, string> = {
  PASS: '✓',
  FLAG: '⚑',
  BLOCK: '✗',
  FAIL: '✗',
  PENDING: '○',
};

export const STATUS_TONE: Record<UiSpecStatus, UiSpecTone> = {
  covered: 'complete',
  backstop: 'in-flight',
  unresolved: 'missing',
  dismissed: 'quiet',
};

export const STATUS_LABEL: Record<UiSpecStatus, string> = {
  covered: 'Covered',
  backstop: 'Backstop',
  unresolved: 'Unresolved',
  dismissed: 'Dismissed',
};

export const STATUS_HINT: Record<UiSpecStatus, string | null> = {
  covered: null,
  backstop: 'a person checks this at verify time',
  unresolved: 'the planner treats it as an assumption',
  dismissed: null,
};

export const STATUS_ORDER: readonly UiSpecStatus[] = ['covered', 'backstop', 'unresolved', 'dismissed'];

export const INITIALIZED_TONE = { yes: 'complete', no: 'quiet' } as const satisfies Record<string, UiSpecTone>;
export const REGISTRY_TONE = { required: 'in-flight', clear: 'complete' } as const satisfies Record<string, UiSpecTone>;
export const GATE_TONE = { required: 'in-flight', other: 'quiet' } as const satisfies Record<string, UiSpecTone>;
export const NEVER_TONE: UiSpecTone = 'missing';

export const CATEGORIES: readonly string[] = [
  'empty',
  'loading',
  'error',
  'populated',
  'partial',
  'overflow',
  'zero-one-many',
  'long-text',
];

export const CATEGORY_SHORT: Record<string, string> = {
  'zero-one-many': '0·1·n',
  'long-text': 'long',
  populated: 'full',
  overflow: 'ovfl',
  loading: 'load',
};

const WORST_ORDER: readonly UiSpecStatus[] = ['unresolved', 'backstop', 'covered', 'dismissed'];

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedSignoffDim {
  n: number;
  name: string;
  /** "Not run" for a pending dimension, else the verdict. */
  verdict: string;
  glyph: string;
  tone: UiSpecTone;
  qualifier: string | null;
  note: string | null;
}

export interface ComposedSignoff {
  label: string;
  tone: UiSpecTone;
  dims: ComposedSignoffDim[];
  approval: string | null;
}

export interface ComposedUiSpecIntro {
  eyebrow: string;
  title: string;
  created: string | null;
  /** The frontmatter status, only when it is not an approval. */
  status: string | null;
  signoff: ComposedSignoff | null;
}

export interface ComposedShadcnCard {
  shadcn: boolean;
  tone: UiSpecTone;
  locked: boolean;
  code: string | null;
  kv: [string, string][];
}

export interface ComposedChoiceCard {
  label: string;
  head: string;
  rest: string;
  none: boolean;
}

export interface ComposedFontFace {
  family: string;
  role: string;
  /** `sans` / `mono` for the two faces the app loads, else null (drawn in the inherited face). */
  face: 'sans' | 'mono' | null;
}

export interface ComposedFontCard {
  families: ComposedFontFace[];
  /** The cell text when no known family is named. */
  text: string;
  none: boolean;
}

export interface ComposedChoices {
  shadcn: ComposedShadcnCard;
  component: ComposedChoiceCard | null;
  icon: ComposedChoiceCard | null;
  font: ComposedFontCard | null;
}

export interface ComposedSpacingTick {
  token: string;
  /** "16px" or "16–24px". */
  value: string;
  min: number;
  max: number;
  fluid: boolean;
  /** Percent of the largest step. */
  left: number;
  width: number;
  usage: string;
  alt: boolean;
}

export interface ComposedSpacing {
  count: number;
  ticks: ComposedSpacingTick[];
  prose: Block[];
}

export interface ComposedTypeRung {
  role: string;
  sizeLabel: string;
  /** Pixel size of the sample, capped at 72; null for a role with no size. */
  size: number | null;
  weight: number | null;
  lineHeight: number | null;
  mono: boolean;
  upper: boolean;
  na: boolean;
  sample: string;
  spec: string;
}

export interface ComposedTypography {
  count: number;
  rungs: ComposedTypeRung[];
  prose: Block[];
}

export interface ComposedSwatch {
  tokens: string[];
  /** Validated CSS colour values, or null when the document states none. */
  light: string | null;
  dark: string | null;
}

export interface ComposedColourRole {
  name: string;
  pct: number | null;
  accent: boolean;
  swatches: ComposedSwatch[];
  never: string[];
  note: string | null;
  usage: string;
  reserved: string[] | null;
}

export interface ComposedColourShare {
  name: string;
  pct: number;
  light: string | null;
  dark: string | null;
}

export interface ComposedColour {
  roles: ComposedColourRole[];
  split: ComposedColourShare[];
  notShare: string[];
  prose: Block[];
  hasContrastTable: boolean;
}

export interface ComposedConsiderationRow {
  label: string;
  status: UiSpecStatus;
  statusLabel: string;
  tone: UiSpecTone;
  tag: string | null;
  /** The element cell as written, only when it differs from the element's name. */
  target: string | null;
  note: string;
}

export interface ComposedCell {
  key: string;
  elementKey: string;
  category: string;
  worst: UiSpecStatus;
  rows: ComposedConsiderationRow[];
  /** "error: Covered, Backstop" — the hover title and the accessible name. */
  title: string;
}

export interface ComposedElement {
  key: string;
  code: string | null;
  name: string;
  kinds: string | null;
  cells: Record<string, ComposedCell>;
}

export interface ComposedNeed {
  key: string;
  label: string;
  status: UiSpecStatus;
  tone: UiSpecTone;
}

export interface ComposedConsiderations {
  total: number;
  counts: Record<UiSpecStatus, number>;
  elements: ComposedElement[];
  columns: string[];
  needs: ComposedNeed[];
  coverage: string | null;
}

export interface ComposedRegistryGroup {
  label: string;
  names: string[];
}

export interface ComposedRegistryCard {
  name: string;
  gateLabel: string;
  gateTone: UiSpecTone;
  required: boolean;
  groups: ComposedRegistryGroup[];
  /** Block text shown as text when no block is named (or the registry holds none). */
  text: string | null;
  why: string | null;
}

export interface ComposedRegistry {
  required: boolean;
  tone: UiSpecTone;
  verdict: string;
  sentence: string;
  blocks: number;
  cards: ComposedRegistryCard[];
  note: string | null;
}

export type UiSpecChapterId = 'design' | 'considerations' | 'registry';

export interface ComposedUiSpecChapter {
  id: UiSpecChapterId;
  number: string;
  title: string;
  aside: string;
}

export interface ComposedUiSpecSourceOnly {
  label: string;
  /** The rendered heading's id, or null for the top of Source mode. */
  targetId: string | null;
}

export interface ComposedUiSpec {
  intro: ComposedUiSpecIntro;
  chapters: ComposedUiSpecChapter[];
  choices: ComposedChoices;
  spacing: ComposedSpacing | null;
  typography: ComposedTypography | null;
  colour: ComposedColour | null;
  considerations: ComposedConsiderations | null;
  registry: ComposedRegistry | null;
  sourceOnly: ComposedUiSpecSourceOnly[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

function normalizeHeading(text: string): string {
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function str(value: unknown, fallback = ''): string {
  return isString(value) ? value : fallback;
}

function humanize(slug: string): string {
  const text = slug.replace(/-/g, ' ').trim();
  return text === '' ? '' : text[0].toUpperCase() + text.slice(1);
}

/** The first sentence of `text` with markdown markers dropped — what a one-line note shows. */
export function firstSentence(text: string): string {
  const t = plain(text).replace(/\s+/g, ' ').trim();
  for (let i = 19; i < Math.min(t.length - 1, 180); i++) {
    const ch = t[i];
    if ((ch === '.' || ch === ';' || ch === ':') && t[i + 1] === ' ') return t.slice(0, i + 1);
  }
  return t.length > 180 ? `${t.slice(0, 178)}…` : t;
}

/** A document colour value that is safe to hand to CSS as a custom-property value: a hex colour
 * with 3, 4, 6 or 8 digits, or an `oklch(…)` of digits, dots, percent signs, spaces, slashes,
 * minus signs or the word `none`, at most 64 characters. Everything else is null (T-qk6-03). */
export function safeColor(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 64) return null;
  if (v[0] === '#') {
    const digits = v.slice(1);
    if (![3, 4, 6, 8].includes(digits.length)) return null;
    for (const ch of digits) if (!/[0-9a-fA-F]/.test(ch)) return null;
    return v;
  }
  if (v.startsWith('oklch(') && v.endsWith(')')) {
    const inner = v.slice(6, -1);
    if (inner.trim() === '') return null;
    const stripped = inner.split('none').join('');
    for (const ch of stripped) if (!/[0-9.% /+-]/.test(ch)) return null;
    return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Value parsing — sizes, weights, swatches
// ---------------------------------------------------------------------------

interface SizePx {
  min: number;
  max: number;
  fluid: boolean;
}

export function sizePx(text: string): SizePx | null {
  const t = plain(text);
  let m = t.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*px/);
  if (m) return { min: Number(m[1]), max: Number(m[2]), fluid: true };
  m = t.match(/(\d+(?:\.\d+)?)\s*px/);
  if (m) return { min: Number(m[1]), max: Number(m[1]), fluid: false };
  m = t.match(/clamp\(\s*(\d*\.?\d+)rem\s*,[^,]+,\s*(\d*\.?\d+)rem/);
  if (m) return { min: Number(m[1]) * 16, max: Number(m[2]) * 16, fluid: true };
  m = t.match(/(\d*\.?\d+)rem\s*[–-]\s*(\d*\.?\d+)rem/);
  if (m) return { min: Number(m[1]) * 16, max: Number(m[2]) * 16, fluid: true };
  m = t.match(/(\d*\.?\d+)rem/);
  if (m) return { min: Number(m[1]) * 16, max: Number(m[1]) * 16, fluid: false };
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPx(px: SizePx): string {
  return px.fluid ? `${round1(px.min)}–${round1(px.max)}px` : `${round1(px.min)}px`;
}

function weightOf(text: string): number | null {
  const m = plain(text).match(/\b([1-9]00|650|550|450)\b/);
  return m ? Number(m[1]) : null;
}

function lineHeightOf(text: string): number | null {
  const m = plain(text).match(/(\d(?:\.\d+)?)/);
  if (!m) return null;
  const value = Number(m[1]);
  return value >= 0.8 && value <= 3 ? value : null;
}

interface RawSwatch {
  tokens: string[];
  light: string | null;
  dark: string | null;
}

interface SwatchScan {
  swatches: RawSwatch[];
  avoid: string[];
}

function scanSwatches(cell: string): SwatchScan {
  const swatches: RawSwatch[] = [];
  const avoid: string[] = [];
  const re = /`(--[\w-]+)`|(#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|oklch\([^)]*\))\s*`?\s*(light|dark)?/gi;
  let current: RawSwatch | null = null;
  let lastToken = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cell)) !== null) {
    if (m[1]) {
      const before = cell.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
      const trimmed = before.replace(/[\s\W]+$/, '');
      if (trimmed.endsWith('never') || trimmed.endsWith('not') || trimmed.endsWith('instead of')) {
        avoid.push(m[1]);
        continue;
      }
      if (!current || !lastToken || current.light || current.dark) {
        current = { tokens: [], light: null, dark: null };
        swatches.push(current);
      }
      current.tokens.push(m[1]);
      lastToken = true;
    } else {
      if (!current) {
        current = { tokens: [], light: null, dark: null };
        swatches.push(current);
      }
      const which = (m[3] ?? '').toLowerCase();
      if (which === 'dark' || (current.light && !which)) current.dark = current.dark ?? m[2];
      else current.light = current.light ?? m[2];
      lastToken = false;
    }
  }
  return { swatches, avoid };
}

function swatchesOf(cell: string, darkCell: string | null): SwatchScan {
  const scan = scanSwatches(cell);
  if (darkCell) {
    for (const group of scanSwatches(darkCell).swatches) {
      const target =
        scan.swatches.find((o) => group.tokens.some((t) => o.tokens.includes(t))) ??
        (group.tokens.length > 0 ? null : scan.swatches.find((o) => !o.dark));
      if (target) target.dark = target.dark ?? group.light;
      else scan.swatches.push({ tokens: group.tokens, light: null, dark: group.light });
    }
  }
  return scan;
}

function safeSwatch(raw: RawSwatch): ComposedSwatch {
  return { tokens: raw.tokens, light: safeColor(raw.light), dark: safeColor(raw.dark) };
}

// ---------------------------------------------------------------------------
// Intro and sign-off
// ---------------------------------------------------------------------------

interface SignoffSummary {
  label: string;
  tone: UiSpecTone;
}

function signoffSummary(verdicts: (UiSpecVerdict | null)[]): SignoffSummary {
  const n = verdicts.length;
  const count = (v: UiSpecVerdict): number => verdicts.filter((x) => x === v).length;
  if (n === 0) return { label: 'No sign-off', tone: 'quiet' };
  const blocked = count('BLOCK') + count('FAIL');
  if (blocked > 0) return { label: `Sign-off · ${blocked} blocked`, tone: 'missing' };
  if (count('PENDING') === n) return { label: 'Sign-off not run', tone: 'quiet' };
  if (count('FLAG') > 0) return { label: `Sign-off ${count('PASS')}/${n} · ${count('FLAG')} flag`, tone: 'in-flight' };
  if (count('PENDING') > 0) return { label: `Sign-off ${count('PASS')}/${n}`, tone: 'quiet' };
  return { label: `Signed off ${n}/${n}`, tone: 'complete' };
}

function composeSignoff(contract: UiSpecContract): ComposedSignoff | null {
  const signoff = contract.signoff;
  if (!signoff || arrayOf(signoff.dims).length === 0) return null;
  const dims = arrayOf<UiSpecDimension>(signoff.dims);
  const summary = signoffSummary(dims.map((d) => d.verdict));
  return {
    label: summary.label,
    tone: summary.tone,
    dims: dims.map((d) => {
      const verdict: UiSpecVerdict = d.verdict ?? 'PENDING';
      return {
        n: d.n,
        name: plain(str(d.name)),
        verdict: verdict === 'PENDING' ? 'Not run' : verdict,
        glyph: VERDICT_GLYPH[verdict],
        tone: VERDICT_TONE[verdict],
        qualifier: d.qual ? str(d.qual) : null,
        note: str(d.note).trim() === '' ? null : str(d.note),
      };
    }),
    approval: signoff.approval ? str(signoff.approval) : null,
  };
}

function composeTitle(contract: UiSpecContract): string {
  const slug = contract.meta.slug;
  if (slug) {
    const fromSlug = humanize(slug);
    if (fromSlug !== '') return fromSlug;
  }
  const h1 = (contract.title ?? '').trim();
  let title = h1.replace(/^Phase \S+\s*[—–-]\s*/, '');
  title = title.replace(/\s*[—–-]\s*UI Design Contract.*$/i, '').trim();
  return title === '' ? 'UI design contract' : title;
}

// ---------------------------------------------------------------------------
// Design system: choice cards
// ---------------------------------------------------------------------------

function designRows(contract: UiSpecContract): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const row of arrayOf<{ key: string; value: string }>(contract.designSystem)) {
    const key = plain(str(row.key)).toLowerCase();
    if (key !== '' && !(key in rows)) rows[key] = str(row.value);
  }
  return rows;
}

function presetInfo(contract: UiSpecContract, rows: Record<string, string>): ComposedShadcnCard {
  const meta = contract.meta;
  const shadcn = meta.shadcnInitialized === 'true';
  const raw = rows.preset ?? '';
  const ticked = raw.match(/`([^`]+)`/);
  const fallback = plain(meta.preset ?? '').split(/[\s(]/)[0];
  const code = ticked ? ticked[1] : fallback;
  const usable = code !== '' && !/^(none|not applicable)$/i.test(code);
  const kv: [string, string][] = [];
  const re = /\b(style|base color|baseColor|base|theme|radius)\s+[`"]([\w-]+)[`"]|`(style|baseColor|base|theme|radius):\s*([\w-]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = (m[1] ?? m[3]).replace(/Color$/, '').replace(/ color$/, '');
    kv.push([name, m[2] ?? m[4]]);
  }
  if (!kv.some((pair) => pair[0] === 'style')) {
    const st = raw.match(/`(base-[\w-]+|sera|new-york|default)`/);
    if (st) kv.unshift(['style', st[1]]);
  }
  const unique = kv.filter((pair, i, all) => all.findIndex((other) => other[0] === pair[0]) === i).slice(0, 4);
  return {
    shadcn,
    tone: shadcn ? INITIALIZED_TONE.yes : INITIALIZED_TONE.no,
    locked: /locked|non-negotiable|standing directive/i.test(raw),
    code: usable ? code : null,
    kv: unique,
  };
}

function choiceOf(value: string): { head: string; rest: string } {
  const t = value;
  const tick = t.match(/`([^`]+)`/);
  const text = plain(t);
  const lead = text.split(/\s+[—(]|\s+-\s|,\s/)[0].trim();
  let head: string;
  const bold = t.match(/\*\*([^*]+)\*\*/);
  if (t.startsWith('**') && bold) head = plain(bold[1]);
  else if (lead.length > 0 && lead.length < 40) head = lead;
  else head = tick ? tick[1] : lead.slice(0, 38);
  head = head.replace(/\s*\(.*$/, '');
  const at = text.indexOf(head);
  const afterHead = at === -1 ? text : text.slice(at + head.length);
  const rest = afterHead.replace(/^[\s—:,(-]+/, '').replace(/\)$/, '');
  return { head, rest };
}

const LOADED_FACES: Record<string, 'sans' | 'mono'> = { 'space grotesk': 'sans', 'jetbrains mono': 'mono' };

function fontsOf(value: string): ComposedFontFace[] {
  const t = plain(value);
  const found: string[] = [];
  const re = /(Space Grotesk|JetBrains Mono|Inter|Geist(?: Mono)?|IBM Plex \w+|Roboto(?: Mono)?|system-ui)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) if (!found.includes(m[1])) found.push(m[1]);
  return found.map((family) => {
    const at = t.indexOf(family);
    const after = t.slice(at + family.length, at + family.length + 140);
    const paren = after.match(/\(([^)]*)\)/);
    const token = after.match(/--font-[\w-]+/);
    const role = (paren ? paren[1] : token ? token[0] : '').replace(/^[\s—-]+/, '');
    return { family, role, face: LOADED_FACES[family.toLowerCase()] ?? null };
  });
}

function composeChoices(contract: UiSpecContract): ComposedChoices {
  const rows = designRows(contract);
  const card = (label: string, value: string | undefined): ComposedChoiceCard | null => {
    if (!value) return null;
    const c = choiceOf(value);
    const none = /^none$/i.test(c.head);
    return { label, head: none ? 'None' : c.head, rest: c.rest, none };
  };
  let font: ComposedFontCard | null = null;
  if (rows.font) {
    const families = fontsOf(rows.font);
    font = { families, text: plain(rows.font), none: families.length === 0 };
  }
  return {
    shadcn: presetInfo(contract, rows),
    component: card('Component library', rows['component library']),
    icon: card('Icon library', rows['icon library']),
    font,
  };
}

// ---------------------------------------------------------------------------
// Design system: scales
// ---------------------------------------------------------------------------

function columnOf(table: UiSpecTable, test: (head: string) => boolean): number {
  return table.head.findIndex((h) => test(plain(h).toLowerCase()));
}

function composeSpacing(table: UiSpecTable | null): ComposedSpacing | null {
  if (!table || table.rows.length === 0) return null;
  const vi = Math.max(columnOf(table, (h) => h.includes('value')), 0) || 1;
  const ui = columnOf(table, (h) => h.includes('usage'));
  const rows = table.rows.map((r) => ({
    token: plain(r[0] ?? ''),
    px: sizePx(r[vi] ?? ''),
    usage: r[ui === -1 ? 2 : ui] ?? '',
  }));
  const ok = rows.filter((r): r is typeof r & { px: SizePx } => r.px !== null);
  const max = Math.max(...ok.map((r) => r.px.max), 1);
  return {
    count: table.rows.length,
    ticks: ok.map((r, i) => ({
      token: r.token,
      value: formatPx(r.px),
      min: r.px.min,
      max: r.px.max,
      fluid: r.px.fluid,
      left: (100 * r.px.min) / max,
      width: (100 * (r.px.max - r.px.min)) / max,
      usage: r.usage,
      alt: i % 2 === 1,
    })),
    prose: arrayOf<Block>(table.prose),
  };
}

const SAMPLES: Record<string, string> = {
  display: '',
  heading: 'Where the work stands',
  body: 'Open the dashboard and know where the work stands without reading a single file by hand.',
  label: 'Last seen 14:32 · 6 min ago',
};
const PANGRAM = 'The quick brown fox jumps over the lazy dog';

function sampleFor(role: string, title: string): string {
  const lower = role.toLowerCase();
  const key = Object.keys(SAMPLES).find((k) => lower.includes(k));
  if (key === 'display') return title;
  return key ? SAMPLES[key] : PANGRAM;
}

function composeTypography(table: UiSpecTable | null, title: string): ComposedTypography | null {
  if (!table || table.rows.length === 0) return null;
  const ri = Math.max(columnOf(table, (h) => h.includes('role')), 0);
  const si = columnOf(table, (h) => h.includes('size'));
  const wi = columnOf(table, (h) => h.includes('weight'));
  const li = columnOf(table, (h) => h.includes('line'));
  const fi = columnOf(table, (h) => h.startsWith('font'));
  const rungs = table.rows.map((r): ComposedTypeRung => {
    const sizeCell = r[si] ?? '';
    const px = sizePx(sizeCell);
    const weight = weightOf(r[wi] ?? '');
    const lineHeight = lineHeightOf(r[li] ?? '');
    const fontCell = fi >= 0 ? (r[fi] ?? '') : '';
    const mono = /mono|heading/i.test(fontCell) && !/sans/i.test(fontCell);
    const upper = /uppercase/i.test(sizeCell);
    const role = plain(r[ri] ?? '');
    const na = px === null;
    return {
      role,
      sizeLabel: plain(sizeCell),
      size: px ? Math.min(px.max, 72) : null,
      weight,
      lineHeight,
      mono,
      upper,
      na,
      sample: sampleFor(role, title),
      spec: px ? `${formatPx(px)} / ${lineHeight ?? '—'} · ${weight ?? '—'}${mono ? ' · mono' : ''}` : plain(sizeCell),
    };
  });
  rungs.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  return { count: table.rows.length, rungs, prose: arrayOf<Block>(table.prose) };
}

const LITERAL_RE = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|oklch\([^)]*\)/gi;

function composeColour(table: UiSpecTable | null, reserved: Record<string, string[]>): ComposedColour | null {
  if (!table || table.rows.length === 0) return null;
  const lightI = columnOf(table, (h) => h.includes('value'));
  const darkI = columnOf(table, (h) => h.includes('dark') && !h.includes('light'));
  const useI = columnOf(table, (h) => h.includes('usage'));
  const roles = table.rows.map((r): ComposedColourRole => {
    const rawName = plain(r[0] ?? '');
    const name = rawName.replace(/\s*\(.*\)\s*/, '').trim();
    const pctMatch = (r[0] ?? '').match(/(\d+)%/);
    const pct = pctMatch ? Number(pctMatch[1]) || null : null;
    const valueCell = r[lightI] ?? '';
    const scan = swatchesOf(valueCell, darkI > lightI ? (r[darkI] ?? null) : null);
    const noteSource = plain(valueCell)
      .replace(LITERAL_RE, '')
      .replace(/--[\w-]+/g, '')
      .replace(/[—\-/,:()]+/g, ' ')
      .replace(/\b(light|dark)\b/gi, '')
      .replace(/\b(never|not)\b/gi, '')
      .trim();
    const note = noteSource.length > 3 && !/see note/i.test(noteSource) ? noteSource : null;
    const key = name.toLowerCase().split(' ')[0];
    return {
      name,
      pct,
      accent: key === 'accent',
      swatches: scan.swatches.map(safeSwatch),
      never: scan.avoid,
      note,
      usage: r[useI] ?? '',
      reserved: reserved[key] ?? null,
    };
  });
  const split: ComposedColourShare[] = roles
    .filter((r) => r.pct !== null)
    .map((r) => {
      const first = r.swatches.find((s) => s.light || s.dark);
      return {
        name: r.name,
        pct: r.pct ?? 0,
        light: first ? (first.light ?? first.dark) : null,
        dark: first ? (first.dark ?? first.light) : null,
      };
    });
  const prose = arrayOf<Block>(table.prose);
  return {
    roles,
    split,
    notShare: roles.filter((r) => r.pct === null).map((r) => r.name),
    prose,
    hasContrastTable: prose.some((b) => b.kind === 'table'),
  };
}

// ---------------------------------------------------------------------------
// UI considerations
// ---------------------------------------------------------------------------

/** The status label the row's note opens with, dropped — the chip already says it. */
function tidy(note: string): string {
  return note.replace(/^\s*(⚠|✅|🧪|⊘)?\s*\**\s*(unresolved|backstop|covered|dismissed)\b[^.]{0,60}\.\**\s*/i, '');
}

function worstOf(rows: { status: UiSpecStatus }[]): UiSpecStatus {
  return WORST_ORDER.find((s) => rows.some((r) => r.status === s)) ?? 'dismissed';
}

function composeConsiderations(c: UiSpecConsiderations | null): ComposedConsiderations | null {
  if (!c) return null;
  const elements = arrayOf<UiSpecConsiderations['elements'][number]>(c.elements);
  const counts: Record<UiSpecStatus, number> = { covered: 0, backstop: 0, unresolved: 0, dismissed: 0 };
  let total = 0;
  let usesOther = false;
  const needs: ComposedNeed[] = [];
  const composed = elements.map((el): ComposedElement => {
    const cells: Record<string, ComposedCell> = {};
    const elRows = arrayOf<UiSpecConsiderationsRow>(el.rows);
    for (const row of elRows) {
      counts[row.status] += 1;
      total += 1;
      if (row.cats[0] === 'other') usesOther = true;
      if (row.status === 'backstop' || row.status === 'unresolved') {
        const cat = row.cats[0] ?? 'other';
        needs.push({
          key: `${el.key}|${cat}`,
          label: `${el.code ?? plain(el.name).slice(0, 14)} · ${CATEGORY_SHORT[cat] ?? cat}`,
          status: row.status,
          tone: STATUS_TONE[row.status],
        });
      }
    }
    const categories = [...CATEGORIES, 'other'];
    for (const category of categories) {
      const hit = elRows.filter((r) => r.cats.includes(category));
      if (hit.length === 0) continue;
      const worst = worstOf(hit);
      cells[category] = {
        key: `${el.key}|${category}`,
        elementKey: el.key,
        category,
        worst,
        title: `${category}: ${hit.map((r) => STATUS_LABEL[r.status]).join(', ')}`,
        rows: hit.map((r) => ({
          label: r.label,
          status: r.status,
          statusLabel: STATUS_LABEL[r.status],
          tone: STATUS_TONE[r.status],
          tag: r.tag,
          target: r.target && r.target !== el.name ? r.target : null,
          note: tidy(r.note),
        })),
      };
    }
    return { key: el.key, code: el.code, name: plain(el.name), kinds: el.kinds, cells };
  });
  return {
    total,
    counts,
    elements: composed,
    columns: usesOther ? [...CATEGORIES, 'other'] : [...CATEGORIES],
    needs,
    coverage: c.coverage ? plain(c.coverage) : null,
  };
}

type UiSpecConsiderationsRow = UiSpecConsiderations['elements'][number]['rows'][number];

// ---------------------------------------------------------------------------
// Registry safety
// ---------------------------------------------------------------------------

function parentheticals(part: string): { labels: string[]; bare: string } {
  const labels: string[] = [];
  let bare = '';
  let i = 0;
  while (i < part.length) {
    if (part[i] === '(') {
      const close = part.indexOf(')', i);
      if (close === -1) {
        bare += part.slice(i);
        break;
      }
      labels.push(part.slice(i + 1, close));
      i = close + 1;
      continue;
    }
    bare += part[i];
    i += 1;
  }
  return { labels, bare };
}

function groupLabel(label: string | null): string {
  if (!label) return 'Blocks';
  if (/new|install|added|to be added/i.test(label)) return 'New this phase';
  if (/already|reuse/i.test(label)) return 'Reused';
  return label;
}

function composeRegistry(table: UiSpecTable | null): ComposedRegistry | null {
  if (!table || table.rows.length === 0) return null;
  const ni = Math.max(columnOf(table, (h) => h.includes('registry')), 0);
  const bi = columnOf(table, (h) => h.includes('block'));
  const gi = columnOf(table, (h) => h.includes('gate'));
  const regs = table.rows.map((r) => {
    const blocks = r[bi === -1 ? 1 : bi] ?? '';
    const gate = plain(r[gi === -1 ? 2 : gi] ?? '');
    const required = /required/i.test(gate) && !/not required/i.test(gate);
    const none = /^(none|not applicable|n\/a)\b/i.test(plain(blocks));
    const groups: ComposedRegistryGroup[] = [];
    const texts: string[] = [];
    if (!none) {
      for (const part of blocks.split(';')) {
        const { labels, bare } = parentheticals(part.trim());
        const label = labels.find((l) => /new|install|added|already|reuse/i.test(l)) ?? null;
        const ticks: string[] = [];
        const tickRe = /`([^`]+)`/g;
        let m: RegExpExecArray | null;
        while ((m = tickRe.exec(bare)) !== null) ticks.push(m[1]);
        let names = ticks;
        if (names.length === 0 && /^[A-Z]\w+(,\s*[A-Z]\w+)+/.test(plain(bare))) {
          names = plain(bare)
            .split(/,\s*/)
            .map((x) => x.trim())
            .filter((x) => /^[A-Z]\w+$/.test(x));
        }
        texts.push(plain(part));
        if (names.length > 0) groups.push({ label: groupLabel(label), names });
      }
    }
    return {
      name: plain(r[ni] ?? ''),
      groups,
      text: none ? plain(blocks) : texts.join('; '),
      none,
      gate,
      required,
      official: /official/i.test(r[ni] ?? ''),
    };
  });
  const third = regs.filter((r) => !r.official);
  const anyRequired = regs.some((r) => r.required);
  const blockTotal = regs.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.names.length, 0), 0);
  const sentence = anyRequired
    ? 'A third-party registry is in use — its blocks need `shadcn view` + diff before use.'
    : third.every((r) => r.none)
      ? `Official shadcn registry only${third.length > 0 ? ' — no third-party registries declared' : ''}.`
      : 'No third-party registry needs a gate.';
  const cards = regs
    .filter((r) => !r.none || r.official)
    .map((r): ComposedRegistryCard => {
      const dash = r.gate.indexOf(' — ');
      const head = dash === -1 ? r.gate : r.gate.slice(0, dash);
      return {
        name: r.name,
        gateLabel: r.required ? 'Gate: view + diff' : head.slice(0, 26) || '—',
        gateTone: r.required ? GATE_TONE.required : GATE_TONE.other,
        required: r.required,
        groups: r.groups,
        text: r.none || r.groups.length === 0 ? r.text : null,
        why: dash === -1 ? null : r.gate.slice(dash + 3),
      };
    });
  const proseText = arrayOf<Block>(table.prose).find((b) => b.kind === 'paragraph');
  return {
    required: anyRequired,
    tone: anyRequired ? REGISTRY_TONE.required : REGISTRY_TONE.clear,
    verdict: anyRequired ? 'Vetting required' : 'No vetting needed',
    sentence,
    blocks: blockTotal,
    cards,
    note: proseText && proseText.kind === 'paragraph' ? firstSentence(proseText.text) : null,
  };
}

// ---------------------------------------------------------------------------
// Chapters and the source-only strip
// ---------------------------------------------------------------------------

function headingIds(input: ViewInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 2) continue;
    const key = normalizeHeading(heading.text);
    if (!ids.has(key)) ids.set(key, heading.id);
  }
  for (const group of input.groups ?? []) {
    if (group.heading === null || group.id === null) continue;
    const key = normalizeHeading(group.heading);
    if (!ids.has(key)) ids.set(key, group.id);
  }
  return ids;
}

function idStartingWith(ids: Map<string, string>, prefix: string): string | null {
  for (const [key, id] of ids) if (key.startsWith(prefix)) return id;
  return null;
}

function composeSourceOnly(contract: UiSpecContract, input: ViewInput): ComposedUiSpecSourceOnly[] {
  const ids = headingIds(input);
  const out: ComposedUiSpecSourceOnly[] = [];
  const sections = arrayOf<UiSpecContract['sections'][number]>(contract.sections);
  const copy = sections.find((s) => !s.claimed && normalizeHeading(s.heading).startsWith('copywriting contract'));
  for (const s of sections) {
    if (s.claimed || s === copy) continue;
    const label = s.heading.replace(/\s*\(Revision[^)]*\)/, '').trim();
    out.push({ label: label === '' ? s.heading : label, targetId: ids.get(normalizeHeading(s.heading)) ?? null });
  }
  if (copy) out.push({ label: 'Copywriting Contract', targetId: ids.get(normalizeHeading(copy.heading)) ?? null });
  const considerationsId = idStartingWith(ids, 'ui considerations');
  if (contract.signoff?.hasNotes) out.push({ label: "Checker's notes", targetId: idStartingWith(ids, 'checker sign-off') });
  const c = contract.considerations;
  if (c && (arrayOf(c.intro).length > 0 || arrayOf(c.notes).length > 0)) {
    out.push({ label: 'How coverage was probed', targetId: considerationsId });
  }
  if (c?.quote) out.push({ label: 'UI Considerations lift rule', targetId: considerationsId });
  if (c && arrayOf(c.comments).length > 0) out.push({ label: 'Status vocabulary', targetId: considerationsId });
  if (arrayOf(contract.scope).length > 0) out.push({ label: 'Scope note', targetId: null });
  if (contract.tagline) out.push({ label: 'Generator note', targetId: null });
  const meta = contract.meta;
  if (Object.values(meta).some((v) => v !== null)) out.push({ label: 'Frontmatter', targetId: null });
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function composeUiSpec(input: ViewInput): ComposedUiSpec | null {
  const raw = input.structured?.uiSpec as Partial<UiSpecContract> | undefined | null;
  if (!raw || typeof raw !== 'object') return null;
  const contract: UiSpecContract = {
    meta: { phase: null, slug: null, status: null, created: null, shadcnInitialized: null, preset: null, ...(raw.meta ?? {}) },
    title: raw.title ?? null,
    tagline: raw.tagline ?? null,
    scope: arrayOf<Block>(raw.scope),
    designSystem: Array.isArray(raw.designSystem) ? raw.designSystem : null,
    spacing: raw.spacing ?? null,
    typography: raw.typography ?? null,
    color: raw.color ?? null,
    reserved: raw.reserved && typeof raw.reserved === 'object' ? raw.reserved : {},
    considerations: raw.considerations ?? null,
    registry: raw.registry ?? null,
    signoff: raw.signoff ?? null,
    sections: arrayOf<UiSpecContract['sections'][number]>(raw.sections),
  };
  const hasDesignRows = (contract.designSystem?.length ?? 0) > 0;
  const hasAnything =
    hasDesignRows ||
    contract.spacing !== null ||
    contract.typography !== null ||
    contract.color !== null ||
    contract.considerations !== null ||
    contract.registry !== null ||
    contract.signoff !== null;
  if (!hasAnything) return null;

  const title = composeTitle(contract);
  const meta = contract.meta;
  const spacing = composeSpacing(contract.spacing);
  const typography = composeTypography(contract.typography, title);
  const colour = composeColour(contract.color, contract.reserved);
  const considerations = composeConsiderations(contract.considerations);
  const registry = composeRegistry(contract.registry);
  const hasDesign = hasDesignRows || spacing !== null || typography !== null || colour !== null;

  const chapters: ComposedUiSpecChapter[] = [];
  const add = (id: UiSpecChapterId, chapterTitle: string, aside: string): void => {
    chapters.push({ id, number: String(chapters.length + 1).padStart(2, '0'), title: chapterTitle, aside });
  };
  if (hasDesign) add('design', 'Design system', 'The choices, then the scales');
  if (considerations) add('considerations', 'UI considerations', 'Element × state · click a square');
  if (registry) add('registry', 'Registry safety', 'Where the components come from');

  const status = meta.status && !/approved/i.test(meta.status) ? meta.status : null;
  return {
    intro: {
      eyebrow: meta.phase ? `UI design contract · Phase ${meta.phase}` : 'UI design contract',
      title,
      created: meta.created,
      status,
      signoff: composeSignoff(contract),
    },
    chapters,
    choices: composeChoices(contract),
    spacing,
    typography,
    colour,
    considerations,
    registry,
    sourceOnly: composeSourceOnly(contract, input),
  };
}
