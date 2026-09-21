// sketch-004 B3 (quick-260922-3us Task 2): the verification DocumentLayoutSpec — Roadmap success
// criteria (read off the Observable Truths table via `extractTableRows`), Gaps to close, and
// Needs a human chapters; human-verification/gaps-summary/earlier-passes/requirements-coverage
// panels in the Also chapter; cover built from `score`/`status`/the gap and human-check counts.
import { humanizeKey, toFrontmatterValueView } from '../../rendering/frontmatter-views.ts';
import { extractTableRows, type DocumentSectionGroup, type TableRow } from './document-sections.ts';
import type {
  ChapterItem,
  ChapterSpec,
  ComposedAlsoPanel,
  ComposedChapter,
  CoverData,
  CoverFact,
  CoverGlance,
  DocumentLayoutSpec,
  Tally,
} from './layout.ts';
import { factValueText } from './layout.ts';
import type { ViewInput } from './manifest.ts';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

// ---------------------------------------------------------------------------
// Roadmap success criteria — read off the Observable Truths table
// ---------------------------------------------------------------------------

const OBSERVABLE_TRUTHS_HEADING = /observable truths/i;

function findCriteriaRows(groups: DocumentSectionGroup[]): TableRow[] {
  for (const group of groups) {
    const rows = extractTableRows(group.html, OBSERVABLE_TRUTHS_HEADING);
    if (rows.length > 0) return rows;
  }
  return [];
}

function findColumnIndex(header: string[], pattern: RegExp, fallback: number): number {
  const index = header.findIndex((cell) => pattern.test(cell));
  return index !== -1 ? index : fallback;
}

function criteriaState(statusText: string): Tally | null {
  const trimmed = statusText.trim();
  if (trimmed === '') return null;
  if (trimmed.includes('✓') || /verified|pass/i.test(trimmed)) return { label: 'Verified', tone: 'complete' };
  if (trimmed.includes('✗') || /fail/i.test(trimmed)) return { label: 'Failed', tone: 'missing' };
  if (/partial|uncertain/i.test(trimmed)) return { label: trimmed, tone: 'quiet' };
  return { label: trimmed, tone: 'quiet' };
}

/** Pure row-to-item mapping, exported so unit tests can drive it directly with synthetic
 * `TableRow[]` literals — Node has no `DOMParser`, so `extractTableRows` itself always returns
 * `[]` there; this is the seam that stays testable regardless. */
export function mapCriteriaRows(rows: TableRow[]): ChapterItem[] {
  return rows.map((row, index) => {
    const truthIdx = findColumnIndex(row.header, /truth|criteri/i, 1);
    const statusIdx = findColumnIndex(row.header, /status/i, 2);
    const evidenceIdx = findColumnIndex(row.header, /evidence/i, 3);
    const numberIdx = findColumnIndex(row.header, /^#$|number/i, 0);
    const truthText = row.cells[truthIdx]?.text ?? '';
    const statusText = row.cells[statusIdx]?.text ?? '';
    const evidenceCell = row.cells[evidenceIdx];
    const numberText = row.cells[numberIdx]?.text || String(index + 1);
    return {
      key: `criterion-${index + 1}`,
      ref: `R${numberText}`,
      title: truthText,
      state: criteriaState(statusText),
      detail: evidenceCell?.html ? { label: 'Evidence', html: evidenceCell.html } : null,
    };
  });
}

const criteriaChapter: ChapterSpec = {
  type: 'items',
  id: 'criteria',
  select: (input: ViewInput) => {
    const rows = findCriteriaRows(input.groups);
    if (rows.length === 0) return null;
    const items = mapCriteriaRows(rows);
    // No `accountsFor` — the whole "Goal Achievement" group stays in the remainder unconsumed.
    return [{ key: 'criteria', title: 'Roadmap success criteria', items }];
  },
};

// ---------------------------------------------------------------------------
// Gaps to close
// ---------------------------------------------------------------------------

interface GapEntry {
  truth?: unknown;
  status?: unknown;
  reason?: unknown;
  missing?: unknown;
  artifacts?: unknown;
}

interface GapArtifact {
  path?: unknown;
  issue?: unknown;
}

function gapState(statusRaw: string | null): Tally {
  const lower = statusRaw?.toLowerCase() ?? null;
  if (lower === 'failed') return { label: 'Failed', tone: 'missing' };
  if (lower === 'partial') return { label: 'Partial', tone: 'quiet' };
  return { label: statusRaw ?? 'Unknown', tone: 'quiet' };
}

const gapsChapter: ChapterSpec = {
  type: 'items',
  id: 'gaps',
  select: (input: ViewInput) => {
    const raw = input.frontmatter.gaps;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const items: ChapterItem[] = [];
    raw.forEach((entry: unknown, index: number) => {
      if (typeof entry !== 'object' || entry === null) return;
      const gap = entry as GapEntry;
      const truth = asString(gap.truth);
      if (!truth) return;
      const rows: { label?: string; text: string }[] = [];
      const reason = asString(gap.reason);
      if (reason) rows.push({ text: reason });
      const missing = Array.isArray(gap.missing) ? gap.missing : [];
      for (const entryText of missing) {
        const text = asString(entryText);
        if (text) rows.push({ text });
      }
      const artifacts = Array.isArray(gap.artifacts) ? gap.artifacts : [];
      for (const rawArtifact of artifacts) {
        if (typeof rawArtifact !== 'object' || rawArtifact === null) continue;
        const artifact = rawArtifact as GapArtifact;
        const path = asString(artifact.path);
        const issue = asString(artifact.issue);
        if (path || issue) {
          rows.push({ text: [path, issue].filter((value): value is string => value !== null).join(' — ') });
        }
      }
      items.push({
        key: `gap-${index + 1}`,
        ref: `Gap ${index + 1}`,
        title: truth,
        state: gapState(asString(gap.status)),
        detail: rows.length > 0 ? { label: 'Why it failed · what to fix', rows } : null,
      });
    });
    return items.length > 0 ? [{ key: 'gaps', title: 'Gaps to close', items }] : null;
  },
};

// ---------------------------------------------------------------------------
// Needs a human
// ---------------------------------------------------------------------------

interface HumanCheck {
  test?: unknown;
  expected?: unknown;
  why_human?: unknown;
}

const humanChecksChapter: ChapterSpec = {
  type: 'items',
  id: 'human-checks',
  select: (input: ViewInput) => {
    const raw = input.frontmatter.human_verification;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const items: ChapterItem[] = [];
    raw.forEach((entry: unknown, index: number) => {
      if (typeof entry !== 'object' || entry === null) return;
      const check = entry as HumanCheck;
      const test = asString(check.test);
      if (!test) return;
      const expected = asString(check.expected);
      const whyHuman = asString(check.why_human);
      const rows: { label?: string; text: string }[] = [];
      if (expected) rows.push({ label: 'Expected', text: expected });
      if (whyHuman) rows.push({ label: 'Why a person', text: whyHuman });
      items.push({
        key: `check-${index + 1}`,
        ref: `Check ${index + 1}`,
        title: test,
        state: null,
        tally: { label: 'Check', tone: 'quiet', rollup: 'checks' },
        detail: rows.length > 0 ? { label: 'What to expect · why a person', rows } : null,
      });
    });
    return items.length > 0 ? [{ key: 'human-checks', title: 'Needs a human', items }] : null;
  },
};

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

/** "5/7 truths verified" -> `{ value: '5/7', label: 'truths verified' }`; "5/5 roadmap success
 * criteria verified (39/39 …)" -> the label stops before the first "(" or ";"; unparseable or
 * absent input yields `null` (no headline). */
function parseScore(score: unknown): { value: string; label: string } | null {
  if (typeof score !== 'string') return null;
  const match = /^(\d+\/\d+)\s+(.*)$/.exec(score.trim());
  if (!match) return null;
  const [, value, rest] = match;
  const cutCandidates = ['(', ';']
    .map((marker) => rest.indexOf(marker))
    .filter((index) => index !== -1);
  const cutIndex = cutCandidates.length > 0 ? Math.min(...cutCandidates) : -1;
  const label = (cutIndex !== -1 ? rest.slice(0, cutIndex) : rest).trim();
  return label ? { value, label } : null;
}

function statusTally(status: unknown): Tally | null {
  const value = asString(status);
  if (!value) return null;
  if (value === 'passed') return { label: 'Passed', tone: 'complete' };
  if (value === 'gaps_found') return { label: 'Gaps found', tone: 'missing' };
  if (value === 'human_needed') return { label: 'Needs a human', tone: 'in-flight' };
  return { label: humanizeKey(value), tone: 'quiet' };
}

function cover(
  input: ViewInput,
  parts: { chapters: ComposedChapter[]; also: ComposedAlsoPanel[] },
): CoverData {
  const headline = parseScore(input.frontmatter.score);
  const status = statusTally(input.frontmatter.status);

  const pills: { value: string; label: string }[] = [];
  if (Array.isArray(input.frontmatter.gaps)) {
    pills.push({ value: String(input.frontmatter.gaps.length), label: 'Gaps' });
  }
  if (Array.isArray(input.frontmatter.human_verification)) {
    pills.push({ value: String(input.frontmatter.human_verification.length), label: 'Need a human' });
  }
  if (typeof input.frontmatter.behavior_unverified === 'number') {
    pills.push({ value: String(input.frontmatter.behavior_unverified), label: 'Unverified behaviours' });
  }
  if (typeof input.frontmatter.overrides_applied === 'number') {
    pills.push({ value: String(input.frontmatter.overrides_applied), label: 'Overrides' });
  }

  let glance: CoverGlance | null = null;
  const humanChapter = parts.chapters.find((chapter) => chapter.specId === 'human-checks');
  if (humanChapter?.count) {
    const firstItem = humanChapter.items?.[0] ?? null;
    glance = {
      eyebrow: 'Needs a human',
      title: `${humanChapter.count} check${humanChapter.count === 1 ? '' : 's'} only a person can run`,
      body: firstItem ? firstItem.title : null,
      action: 'See the checks',
      target: humanChapter.id,
    };
  }

  const facts: CoverFact[] = [];
  for (const key of ['verified', 're_verification']) {
    if (!Object.hasOwn(input.frontmatter, key)) continue;
    const text = factValueText(toFrontmatterValueView(input.frontmatter[key]));
    if (text !== null) facts.push({ label: humanizeKey(key), value: text });
  }

  return { status, facts, headline, pills, glance };
}

export const verificationLayout: DocumentLayoutSpec = {
  chapters: [criteriaChapter, gapsChapter, humanChecksChapter],
  also: [
    { id: 'human-verification', heading: /^human verification/i, eyebrow: 'Human checks' },
    { id: 'gaps-summary', heading: /^gaps summary/i, eyebrow: 'Gaps' },
    { id: 'earlier-passes', heading: /re-verification|prior gaps/i, eyebrow: 'Earlier passes', all: true },
    { id: 'requirements-coverage', heading: /^requirements coverage/i, eyebrow: 'Requirements' },
  ],
  cover,
};
