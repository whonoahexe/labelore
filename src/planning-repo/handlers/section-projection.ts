// Section-projection extractors: per-kind functions that turn an artifact's markdown body into
// structured data (`Artifact.structured`), composed exclusively from the shared, line-scanning
// primitives in `markdown-sections.ts` (T-01-11: never a single whole-document regex). Called from
// a handler's `parse()` — never from `match()`, which must stay content-blind (DATA-02).
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';

export interface DiscussionOption {
  option: string;
  description: string;
  chosen: boolean;
}

export interface DiscussionQuestion {
  topic: string;
  question: string;
  options: DiscussionOption[];
  chosenOption: string;
  chosenDescription: string;
  /** Tolerant enrichment only — never the resolution anchor. The `✓` table cell decides which
   * option is chosen; this is just the free-text line authors sometimes add underneath. */
  userChoice: string | null;
}

export interface DiscussionTopic {
  heading: string;
  questionCount: number;
  resolvedCount: number;
}

export type SectionProjection = (body: string) => Record<string, unknown>;

export interface DecisionEntry {
  id: string;
  text: string;
}

export interface ReviewWarning {
  id: string;
  title: string;
}

// Bounded, single-line pattern (T-05-01: no nested unbounded groups) — matches both apostrophe
// spellings the corpus has used (straight `'` and curly `’`) for the `**User's choice:**` prose
// line. `[^*]*` tolerates parenthetical asides between "choice" and the closing `:**` without
// ever becoming the resolution anchor — that is always the `✓` table cell (D-06, 12/12 audited).
const USER_CHOICE_LINE_RE = /^\*\*User[’']s choice[^*]*:\*\*\s*(.*)$/;

function extractUserChoice(questionBody: string): string | null {
  for (const rawLine of questionBody.split('\n')) {
    const line = rawLine.trim();
    const match = USER_CHOICE_LINE_RE.exec(line);
    if (match) return match[1].trim() || null;
  }
  return null;
}

/**
 * Composes `splitSections` → `splitSubsections` → `parseMarkdownTable` (RESEARCH.md § Code
 * Examples): each `##` topic holds `###` questions, each question holds an option table. A
 * question resolves when some row's `Selected` cell is `✓` — the first such row wins (D-06,
 * stable `Array.prototype.find`); unresolved questions are omitted from `questions` entirely but
 * still counted in their topic's `questionCount`.
 */
export function extractDiscussionLog(body: string): {
  questions: DiscussionQuestion[];
  topics: DiscussionTopic[];
} {
  const questions: DiscussionQuestion[] = [];
  const topics: DiscussionTopic[] = [];

  for (const topicSection of splitSections(body)) {
    let questionCount = 0;
    let resolvedCount = 0;

    for (const questionSection of splitSubsections(topicSection.body)) {
      const rows = parseMarkdownTable(questionSection.body);
      if (rows.length === 0) continue;
      questionCount += 1;

      const chosenRow = rows.find((row) => row['Selected']?.trim() === '✓');
      if (!chosenRow) continue;
      resolvedCount += 1;

      const options: DiscussionOption[] = rows.map((row) => ({
        option: row['Option'] ?? '',
        description: row['Description'] ?? '',
        chosen: row === chosenRow,
      }));

      questions.push({
        topic: topicSection.heading,
        question: questionSection.heading,
        options,
        chosenOption: chosenRow['Option'] ?? '',
        chosenDescription: chosenRow['Description'] ?? '',
        userChoice: extractUserChoice(questionSection.body),
      });
    }

    topics.push({ heading: topicSection.heading, questionCount, resolvedCount });
  }

  return { questions, topics };
}

// Bounded, single-line pattern (T-05-07: no nested unbounded groups) matching a phase CONTEXT.md
// decision bullet — `- **D-NN:**` — opening a new entry. A phase's `<decisions>` tag body is a
// line-scanned sequence of such bullets, each optionally followed by indented continuation lines
// (including `— **Reversibility:**` sub-lines), never a single whole-body regex.
const DECISION_BULLET_RE = /^- \*\*(D-\d+):\*\*\s*(.*)$/;

/**
 * Line-scans a phase CONTEXT.md's `<decisions>` tag body (BACK-02, D-14/D-15) into per-decision
 * entries, in document order. A `- **D-NN:**` bullet opens an entry; any subsequent indented
 * (whitespace-prefixed) line is a continuation, folded into the same entry's `text` joined by a
 * single space — this is what pulls a `— **Reversibility:**` sub-line into its owning decision's
 * text (BACK-02 truth). A blank line, a heading, or a non-decision bullet closes the currently
 * open entry without starting a new one. Null/empty input, or a body with no `D-NN` bullets,
 * returns `[]` — never throws.
 */
export function parseDecisionEntries(text: string | null): DecisionEntry[] {
  if (!text) return [];

  const entries: DecisionEntry[] = [];
  let current: { id: string; parts: string[] } | null = null;

  const closeCurrent = (): void => {
    if (!current) return;
    entries.push({ id: current.id, text: current.parts.join(' ').trim() });
    current = null;
  };

  for (const line of text.split('\n')) {
    const bulletMatch = DECISION_BULLET_RE.exec(line);
    if (bulletMatch) {
      closeCurrent();
      const [, id, rest] = bulletMatch;
      current = { id, parts: rest.trim() ? [rest.trim()] : [] };
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      current.parts.push(line.trim());
      continue;
    }
    closeCurrent();
  }
  closeCurrent();

  return entries;
}

// Bounded, single-line pattern matching a REVIEW.md `### WR-NN: title` (or ` — `/` - ` separated)
// subsection heading — the same discipline as DECISION_BULLET_RE above.
const WARNING_HEADING_RE = /^(WR-\d+)(?::| — | - )\s*(.*)$/;

/**
 * Line-scans a phase REVIEW.md body (BACK-02) for its `## Warnings` section, then each `### WR-NN:
 * title` subsection within it, in document order. No `## Warnings` section (or no body) yields
 * `{ warnings: [] }` — never throws.
 */
export function extractReviewWarnings(body: string): { warnings: ReviewWarning[] } {
  const warningsSection = splitSections(body).find(
    (section) => section.heading.trim().toLowerCase() === 'warnings',
  );
  if (!warningsSection) return { warnings: [] };

  const warnings: ReviewWarning[] = [];
  for (const subsection of splitSubsections(warningsSection.body)) {
    const match = WARNING_HEADING_RE.exec(subsection.heading);
    if (!match) continue;
    const [, id, title] = match;
    warnings.push({ id, title: title.trim() });
  }
  return { warnings };
}

/** Keyed on the wire `artifact.kind` string (already granular — RESEARCH.md § Corrected
 * Understanding). Frozen so a later plan cannot mutate the registry in place; extend it by adding
 * a new key, never by patching an existing entry. */
export const SECTION_PROJECTIONS: Readonly<Record<string, SectionProjection>> = Object.freeze({
  'discussion-log': extractDiscussionLog,
  review: extractReviewWarnings,
});

/** Never throws — every composed primitive is a pure line-scanner, and a kind with no registered
 * projection returns `{}` rather than `null`/`undefined`, matching `parseWithRegistry`'s
 * `structured: parsed.structured ?? {}` contract. */
export function projectSections(kind: string, body: string): Record<string, unknown> {
  return SECTION_PROJECTIONS[kind]?.(body) ?? {};
}
