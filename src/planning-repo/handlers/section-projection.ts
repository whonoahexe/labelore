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

/** quick-260923-jxp (JXP-05): how a question was settled. 'chosen' — a ✓ row in the option table
 * (any qualifier that doesn't name Claude). 'claude' — the qualifier names Claude, or the user's
 * words / chosen option literally read "you decide". 'custom' — no ✓ row, but a free-text choice
 * line. 'open' — nothing resolves it; still returned (JXP-05: no dropped questions). */
export type DiscussionResolution = 'chosen' | 'claude' | 'custom' | 'open';

export interface DiscussionQuestion {
  topic: string;
  question: string;
  options: DiscussionOption[];
  chosenOption: string;
  chosenDescription: string;
  /** Tolerant enrichment only — never the sole resolution anchor for a 'chosen' question. The `✓`
   * table cell decides a 'chosen' question; this is the free-text line authors sometimes add
   * underneath, and it is the resolution anchor itself for a 'custom' question (JXP-05). */
  userChoice: string | null;
  /** 1-based source-table row of the first ✓-prefixed cell in the option table; null when the
   * option table has no ✓ row (or there is no option table at all). */
  chosenIndex: number | null;
  /** The parenthetical after a `✓ (…)` cell — `'renamed'`, `"Claude's call"`, `'superseded'`, … —
   * capped at 60 characters; null when the cell is a bare `✓` or there is no ✓ row. */
  qualifier: string | null;
  resolution: DiscussionResolution;
  /** The ✓ row of a *later* table in the same question block, used only when the option table
   * itself has no ✓ (S3's "no-✓ table, then a bold-label follow-up table with a ✓ row" shape). */
  settled: { option: string; description: string; prompt: string | null } | null;
  /** The `**Notes:**`/`**Note:**` paragraph, continuation lines joined by a single space; null
   * when absent. */
  notes: string | null;
}

export interface DiscussionTopic {
  heading: string;
  questionCount: number;
  resolvedCount: number;
  /** True when the `##` section holds any non-blank content outside recognised question material
   * (a preamble, a non-question `###` block, …) — that content stays reachable in the document's
   * remainder rather than being silently dropped (quick-260923-jxp). */
  leftover: boolean;
}

export interface DiscussionLogProjection {
  questions: DiscussionQuestion[];
  topics: DiscussionTopic[];
  date: string | null;
  areasDiscussed: string[] | null;
  offeredCount: number | null;
  declinedCount: number | null;
  declinedAreas: string[];
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

// ---------------------------------------------------------------------------
// quick-260923-jxp (JXP-05): tolerant discussion-log extraction. Every pattern below is bounded
// (single line, or a paragraph capped at a few hundred characters) — never a whole-document regex
// (T-01-11/T-05-01, T-jxp-02).
// ---------------------------------------------------------------------------

// Bounded, single-line pattern (T-05-01: no nested unbounded groups) — matches both apostrophe
// spellings the corpus has used (straight `'` and curly `’`) for the `**User's choice:**` prose
// line, tolerating a parenthetical aside such as `(free text)` between "choice" and the closing
// `:**`.
const USER_CHOICE_LINE_RE = /^\*\*User[’']s choice[^*]{0,40}:\*\*\s*(.*)$/;
const NOTES_LINE_RE = /^\*\*Notes?:\*\*\s*(.*)$/;
/** Any bold-led label line ending in a colon inside the closing `**` — `**Notes:**`,
 * `**User's choice:**`, `**Follow-up — confirming how to record it:**`, `**Clarification asked:**`
 * — used both to stop a continuation paragraph and to find a follow-up table's own prompt line. */
const BOLD_LABEL_LINE_RE = /^\*\*([^*]{1,120}?):\*\*\s*(.*)$/;
/** `**Q<digits>[:.]? <title>**` — S3's bold question line. Trailing text on the same line (after
 * the closing `**`) carries an inline `— **User: "…"**` enrichment for table-less questions. */
const BOLD_Q_LINE_RE = /^\*\*Q(\d{1,3})[:.]?\s*([^*]{0,300})\*\*(.*)$/;
/** The inline `— **User: "you decide"**` (or unquoted) trailer on a table-less S3 bold-Q line. */
const INLINE_USER_RE = /[—-]\s*\*\*User:\s*"?([^"*]{0,200}?)"?\*\*\s*$/;
/** A ✓-prefixed Selected cell, capped qualifier capture (T-jxp-02). */
const CHECK_CELL_RE = /^✓\s*(?:\(([^)]{1,60})\))?/;

function stripQuotesAndMarks(value: string): string {
  return value.trim().replace(/^[*"'`]+|[*"'`]+$/g, '').trim();
}

function readsYouDecide(value: string | null): boolean {
  if (!value) return false;
  return /^you decide\b/i.test(stripQuotesAndMarks(value));
}

/** Strips a single matched pair of markdown italic asterisks (`*"…"*`) wrapping the whole value —
 * never a bold `**…**` pair, since those are excluded from the captured text upstream anyway. */
function stripItalicWrapper(text: string): string {
  const trimmed = text.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith('*') &&
    trimmed.endsWith('*') &&
    !trimmed.startsWith('**') &&
    !trimmed.endsWith('**')
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Splits `text` into runs of consecutive pipe-table lines (blank/non-pipe lines end a run) — so
 * a question block holding two separate tables never has both fed to `parseMarkdownTable` at
 * once (which would merge the second table's rows under the first table's header). */
function splitIntoTableRuns(lines: string[]): { text: string; startIndex: number; endIndex: number }[] {
  const runs: { text: string; startIndex: number; endIndex: number }[] = [];
  let current: string[] = [];
  let currentStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      if (current.length === 0) currentStart = i;
      current.push(lines[i]);
    } else if (current.length > 0) {
      runs.push({ text: current.join('\n'), startIndex: currentStart, endIndex: i - 1 });
      current = [];
    }
  }
  if (current.length > 0) {
    runs.push({ text: current.join('\n'), startIndex: currentStart, endIndex: lines.length - 1 });
  }
  return runs;
}

function tableHasOptionAndSelected(headerLine: string): boolean {
  const cells = headerLine
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim().toLowerCase());
  return cells.includes('option') && cells.includes('selected');
}

/** The first ✓-prefixed `Selected` cell in `rows`, its 1-based index, and its bounded qualifier. */
function findChosen(
  rows: Record<string, string>[],
): { row: Record<string, string>; index: number; qualifier: string | null } | null {
  for (let i = 0; i < rows.length; i++) {
    const cell = (rows[i]['Selected'] ?? '').trim();
    if (cell.startsWith('✓')) {
      const match = CHECK_CELL_RE.exec(cell);
      return { row: rows[i], index: i + 1, qualifier: match?.[1]?.trim() || null };
    }
  }
  return null;
}

/** Collects a bold-label paragraph's continuation lines (joined by a single space) starting right
 * after `startIndex`, stopping at a blank line, the next bold-label line, or a `---` rule. Also
 * marks every consumed line index in `consumed`. */
function collectParagraph(
  lines: string[],
  startIndex: number,
  firstLineRest: string,
  consumed: Set<number>,
): string | null {
  const parts: string[] = [];
  consumed.add(startIndex);
  if (firstLineRest.trim()) parts.push(firstLineRest.trim());
  let i = startIndex + 1;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed === '---') break;
    if (BOLD_LABEL_LINE_RE.test(trimmed)) break;
    parts.push(trimmed);
    consumed.add(i);
    i++;
  }
  const joined = parts.join(' ').trim();
  return joined || null;
}

interface QuestionBlockResult {
  question: Omit<DiscussionQuestion, 'topic'>;
  /** True when this block held any non-blank line the scan above didn't recognise. */
  hasLeftover: boolean;
}

/** Parses one question block's lines (the body after a `###`/bold-Q heading, or a whole S2
 * section) into a `DiscussionQuestion` (minus `topic`, filled by the caller) plus whether the
 * block held unrecognised content. `title` is the question's own heading/bold text; `inlineUser`
 * is S3's inline `— **User: "…"**` trailer, when present (no table in that case). */
function parseQuestionBlock(title: string, bodyLines: string[], inlineUser: string | null): QuestionBlockResult {
  const consumed = new Set<number>();
  const tableRuns = splitIntoTableRuns(bodyLines);

  let optionTableIndex = -1;
  for (let i = 0; i < tableRuns.length; i++) {
    const headerLine = tableRuns[i].text.split('\n')[0] ?? '';
    if (tableHasOptionAndSelected(headerLine)) {
      optionTableIndex = i;
      break;
    }
  }

  let options: DiscussionOption[] = [];
  let chosenOption = '';
  let chosenDescription = '';
  let chosenIndex: number | null = null;
  let qualifier: string | null = null;

  if (optionTableIndex !== -1) {
    const run = tableRuns[optionTableIndex];
    for (let i = run.startIndex; i <= run.endIndex; i++) consumed.add(i);
    const rows = parseMarkdownTable(run.text);
    const chosen = findChosen(rows);
    options = rows.map((row, i) => ({
      option: row['Option'] ?? '',
      description: row['Description'] ?? '',
      chosen: chosen !== null && i === chosen.index - 1,
    }));
    if (chosen) {
      chosenOption = chosen.row['Option'] ?? '';
      chosenDescription = chosen.row['Description'] ?? '';
      chosenIndex = chosen.index;
      qualifier = chosen.qualifier;
    }
  }

  // A later table in the block, used only when the option table has no ✓ (or there is no option
  // table at all): the first ✓ row of the first such later table settles the question. Its prompt
  // is the bold-label line directly above that table (blank lines skipped).
  let settled: DiscussionQuestion['settled'] = null;
  if (chosenIndex === null) {
    for (let i = optionTableIndex + 1; i < tableRuns.length; i++) {
      const run = tableRuns[i];
      const rows = parseMarkdownTable(run.text);
      const chosen = findChosen(rows);
      if (!chosen) continue;
      for (let j = run.startIndex; j <= run.endIndex; j++) consumed.add(j);
      let promptLine = -1;
      for (let j = run.startIndex - 1; j >= 0; j--) {
        const trimmed = bodyLines[j].trim();
        if (trimmed === '') continue;
        const labelMatch = BOLD_LABEL_LINE_RE.exec(trimmed);
        if (labelMatch) promptLine = j;
        break;
      }
      let prompt: string | null = null;
      if (promptLine !== -1) {
        const labelMatch = BOLD_LABEL_LINE_RE.exec(bodyLines[promptLine].trim())!;
        prompt = labelMatch[1].trim();
        consumed.add(promptLine);
      }
      settled = { option: chosen.row['Option'] ?? '', description: chosen.row['Description'] ?? '', prompt };
      break;
    }
  }

  // User's choice / Notes — line-scanned, continuation-joined, bold-label lines mark themselves
  // consumed via collectParagraph.
  let userChoice: string | null = inlineUser;
  let notes: string | null = null;
  for (let i = 0; i < bodyLines.length; i++) {
    if (consumed.has(i)) continue;
    const trimmed = bodyLines[i].trim();
    if (trimmed === '') continue;
    if (trimmed === '---') {
      consumed.add(i);
      continue;
    }
    const choiceMatch = USER_CHOICE_LINE_RE.exec(trimmed);
    if (choiceMatch && userChoice === null) {
      userChoice = collectParagraph(bodyLines, i, choiceMatch[1], consumed);
      continue;
    }
    const notesMatch = NOTES_LINE_RE.exec(trimmed);
    if (notesMatch && notes === null) {
      notes = collectParagraph(bodyLines, i, notesMatch[1], consumed);
      continue;
    }
    // A generic bold-label line (e.g. the follow-up prompt already claimed above, or a
    // recognised-but-unused label) that precedes a table already consumed above.
    if (BOLD_LABEL_LINE_RE.test(trimmed) && tableRuns.some((run) => run.startIndex === i + 1 || (i + 1 < bodyLines.length && bodyLines[i + 1].trim() === '' && run.startIndex === i + 2))) {
      consumed.add(i);
      continue;
    }
  }

  const hasLeftover = bodyLines.some((line, i) => line.trim() !== '' && !consumed.has(i));

  // A `**User's choice:**` line's value is sometimes wrapped in markdown italics (`*"…"*`) —
  // strip a single matched pair so the stored text reads as plain quoted prose either way.
  if (userChoice !== null) userChoice = stripItalicWrapper(userChoice);

  let resolution: DiscussionResolution;
  if (qualifier !== null && /claude/i.test(qualifier)) {
    resolution = 'claude';
  } else if (readsYouDecide(userChoice) || readsYouDecide(chosenOption)) {
    resolution = 'claude';
  } else if (chosenIndex !== null) {
    resolution = 'chosen';
  } else if (userChoice !== null && userChoice.trim() !== '') {
    resolution = 'custom';
  } else {
    resolution = 'open';
  }

  return {
    question: {
      question: title,
      options,
      chosenOption,
      chosenDescription,
      userChoice,
      chosenIndex,
      qualifier,
      resolution,
      settled,
      notes,
    },
    hasLeftover,
  };
}

/** S1: `###` subsections holding an option table are questions; a `###` with no table is leftover. */
function extractS1Topic(section: { heading: string; body: string }): {
  questions: DiscussionQuestion[];
  leftover: boolean;
} {
  const questions: DiscussionQuestion[] = [];
  let leftover = false;
  const subsections = splitSubsections(section.body);

  // Prose before the first `###` (a preamble) is leftover.
  const firstSubHeadingIndex = section.body.search(/^###\s+/m);
  const beforeFirst = firstSubHeadingIndex === -1 ? section.body : section.body.slice(0, firstSubHeadingIndex);
  if (beforeFirst.split('\n').some((l) => l.trim() !== '')) leftover = true;

  for (const sub of subsections) {
    const lines = sub.body.split('\n');
    const hasTable = lines.some((l) => l.trim().startsWith('|'));
    if (!hasTable) {
      leftover = true;
      continue;
    }
    const result = parseQuestionBlock(sub.heading, lines, null);
    questions.push({ topic: section.heading, ...result.question });
    if (result.hasLeftover) leftover = true;
  }

  return { questions, leftover };
}

/** S3: bold `**Q<n>[:.]? …**` lines split the section body into question blocks. */
function extractS3Topic(section: { heading: string; body: string }): {
  questions: DiscussionQuestion[];
  leftover: boolean;
} {
  const lines = section.body.split('\n');
  const qLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (BOLD_Q_LINE_RE.test(lines[i].trim())) qLineIndices.push(i);
  }

  let leftover = false;
  // Prose before the first Q line is a preamble.
  if (qLineIndices.length > 0) {
    for (let i = 0; i < qLineIndices[0]; i++) {
      if (lines[i].trim() !== '') leftover = true;
    }
  }

  const questions: DiscussionQuestion[] = [];
  for (let q = 0; q < qLineIndices.length; q++) {
    const start = qLineIndices[q];
    const end = q + 1 < qLineIndices.length ? qLineIndices[q + 1] : lines.length;
    const headMatch = BOLD_Q_LINE_RE.exec(lines[start].trim())!;
    const title = headMatch[2].trim();
    const trailing = headMatch[3] ?? '';
    const inlineMatch = INLINE_USER_RE.exec(trailing.trim());
    const inlineUser = inlineMatch ? inlineMatch[1].trim() || null : null;
    if (inlineMatch === null && trailing.trim() !== '') leftover = true;

    const blockLines = lines.slice(start + 1, end);
    const result = parseQuestionBlock(title, blockLines, inlineUser);
    questions.push({ topic: section.heading, ...result.question });
    if (result.hasLeftover) leftover = true;
  }

  return { questions, leftover };
}

/** S2: the canonical GSD template — an option table directly under `##`, no `###`. One question,
 * titled by the section's own heading. */
function extractS2Topic(section: { heading: string; body: string }): {
  questions: DiscussionQuestion[];
  leftover: boolean;
} {
  const lines = section.body.split('\n');
  const result = parseQuestionBlock(section.heading, lines, null);
  return { questions: [{ topic: section.heading, ...result.question }], leftover: result.hasLeftover };
}

/**
 * Composes `splitSections` → `splitSubsections` → `parseMarkdownTable` over every corpus question
 * shape (JXP-05): S1 (`##` topic → `###` question → option table), S2 (the canonical GSD template
 * — a table directly under `##`, no `###`), and S3 (bold `**Q<n>:**` lines inside a `##` topic,
 * some table-less). No question is dropped — an unresolved question still comes back with
 * `resolution: 'open'`.
 */
export function extractDiscussionLog(body: string): DiscussionLogProjection {
  const questions: DiscussionQuestion[] = [];
  const topics: DiscussionTopic[] = [];

  for (const section of splitSections(body)) {
    const subsections = splitSubsections(section.body);
    const hasTableSubsection = subsections.some((sub) =>
      sub.body.split('\n').some((l) => l.trim().startsWith('|')),
    );
    const hasBoldQLine = section.body.split('\n').some((l) => BOLD_Q_LINE_RE.test(l.trim()));
    const hasDirectTable = section.body.split('\n').some((l) => l.trim().startsWith('|'));

    let extracted: { questions: DiscussionQuestion[]; leftover: boolean };
    if (subsections.length > 0 && hasTableSubsection) {
      extracted = extractS1Topic(section);
    } else if (hasBoldQLine) {
      extracted = extractS3Topic(section);
    } else if (hasDirectTable && subsections.length === 0) {
      extracted = extractS2Topic(section);
    } else {
      // Non-topic section (Claude's Discretion, Deferred Ideas, …) — no questions at all. Meta
      // scanning over these sections happens separately, below.
      continue;
    }

    if (extracted.questions.length === 0) continue;
    questions.push(...extracted.questions);
    topics.push({
      heading: section.heading,
      questionCount: extracted.questions.length,
      resolvedCount: extracted.questions.filter((q) => q.resolution !== 'open').length,
      leftover: extracted.leftover,
    });
  }

  const meta = extractDiscussionMeta(body, topics);

  return { questions, topics, ...meta };
}

// ---------------------------------------------------------------------------
// quick-260923-jxp Task 2 (JXP-01, JXP-02, JXP-08): log-level meta — date, areas discussed, the
// offered/declined gray-area counts and names. Every pattern bounded per-line/per-paragraph
// (T-jxp-02).
// ---------------------------------------------------------------------------

const DATE_LINE_RE = /^\*\*Date:\*\*\s*(\S+)/;
const AREAS_DISCUSSED_LINE_RE = /^\*\*Areas discussed:\*\*\s*(.*)$/;
/** Shape (a): `**Areas offered but not selected for discussion:** …` (continuation lines joined). */
const AREAS_OFFERED_LINE_RE = /^\*\*Areas offered but not selected[^*]{0,60}:\*\*\s*(.*)$/;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function parseNumberWord(token: string): number | null {
  if (/^\d{1,2}$/.test(token)) return Number(token);
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

/** Splits a comma list (with an optional trailing "and") into trimmed, first-letter-uppercased
 * names. Bounded: only ever called against an already-capped substring. */
function splitNameList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim().replace(/^and\s+/i, '').trim())
    .filter((part) => part !== '')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part));
}

/** Header region: every line before the first `## ` heading. */
function headerRegion(body: string): string {
  const match = body.match(/^##\s+/m);
  return match && match.index !== undefined ? body.slice(0, match.index) : body;
}

const ALL_OFFERED_SENTENCE_RE =
  /\ball\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;

/** All three corpus sentence templates place "all <NUM>" somewhere in the same sentence as "gray
 * area(s)", "offered" and "selected" — but not in a fixed relative order ("The user selected all
 * four offered gray areas." puts "selected" *before* "all"). Checked against the whole (bounded —
 * a single header line, capped) sentence rather than a forward-only window from the match. */
function findOfferedCount(headerText: string): number | null {
  for (const rawLine of headerText.split(/\n+/)) {
    const sentence = rawLine.trim().slice(0, 400);
    if (sentence === '') continue;
    if (!/gray area/i.test(sentence) || !/offered/i.test(sentence) || !/selected/i.test(sentence)) continue;
    const match = ALL_OFFERED_SENTENCE_RE.exec(sentence);
    if (!match) continue;
    const n = parseNumberWord(match[1]);
    if (n !== null) return n;
  }
  return null;
}

const DECLINED_COUNT_SENTENCE_RE =
  /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+gray areas?\s+(?:were|was)\b/i;

/** `<N> gray area(s) were … offered … declined/left open/rather than discuss/not selected`,
 * scanned paragraph by paragraph (bounded to the first ~300 chars after the match). */
function findDeclinedCount(paragraph: string): number | null {
  const match = DECLINED_COUNT_SENTENCE_RE.exec(paragraph);
  if (!match) return null;
  const window = paragraph.slice(match.index, match.index + 300);
  if (!/\boffered\b/i.test(window)) return null;
  if (!/(declined|left open|rather than discuss|not selected|not discussed)/i.test(window)) return null;
  return parseNumberWord(match[1]);
}

/** Shape (b): "… offered … declined: A, B, and C." — text after "declined:" up to the sentence end. */
const SHAPE_B_RE = /\boffered\b[^.]{0,120}\bdeclined:\s*([^.]{1,500})\./i;

function findShapeB(paragraph: string): string[] {
  const match = SHAPE_B_RE.exec(paragraph);
  if (!match) return [];
  return splitNameList(match[1]);
}

/** Shape (c): a "gray area(s) … offered … left open/declined/…" paragraph followed by a list
 * whose items start with a **bold** name — `- **Name** — …`. */
const BOLD_BULLET_RE = /^-\s+\*\*([^*]{1,120})\*\*/;

function findShapeC(paragraph: string, followingLines: string[]): string[] {
  if (!/gray area/i.test(paragraph)) return [];
  if (!/\boffered\b/i.test(paragraph)) return [];
  if (!/(left open|declined|not selected|not discussed)/i.test(paragraph)) return [];
  const names: string[] = [];
  for (const line of followingLines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (names.length > 0) break; // blank line ends the list once it has started
      continue; // blank line(s) before the first bullet — keep scanning
    }
    const match = BOLD_BULLET_RE.exec(trimmed);
    if (match) {
      const name = match[1].trim();
      names.push(name.length > 0 ? name[0].toUpperCase() + name.slice(1) : name);
      continue;
    }
    // An indented, non-bullet line is a wrapped continuation of the bullet just pushed.
    if (names.length > 0 && /^\s+\S/.test(line)) continue;
    break;
  }
  return names;
}

/** Splits `text` into blank-line-delimited paragraphs, each paragraph's lines joined with a
 * single space (T-jxp-02: bounded per-paragraph scan, never whole-document). Returns each
 * paragraph alongside the raw lines immediately following it (for shape (c)'s bullet list). */
function paragraphsWithFollowing(text: string): { paragraph: string; following: string[] }[] {
  const lines = text.split('\n');
  const out: { paragraph: string; following: string[] }[] = [];
  let current: string[] = [];
  let currentStart = 0;
  for (let i = 0; i <= lines.length; i++) {
    const line = i < lines.length ? lines[i] : '';
    if (i === lines.length || line.trim() === '') {
      if (current.length > 0) {
        out.push({ paragraph: current.join(' '), following: lines.slice(currentStart + current.length) });
      }
      current = [];
      currentStart = i + 1;
    } else {
      current.push(line);
    }
  }
  return out;
}

function extractDiscussionMeta(
  body: string,
  topics: DiscussionTopic[],
): Pick<DiscussionLogProjection, 'date' | 'areasDiscussed' | 'offeredCount' | 'declinedCount' | 'declinedAreas'> {
  const header = headerRegion(body);

  let date: string | null = null;
  let areasDiscussed: string[] | null = null;
  let areasOffered: string | null = null;
  for (const rawLine of header.split('\n')) {
    const line = rawLine.trim();
    const dateMatch = DATE_LINE_RE.exec(line);
    if (dateMatch && date === null) date = dateMatch[1].trim();
    const areasMatch = AREAS_DISCUSSED_LINE_RE.exec(line);
    if (areasMatch && areasDiscussed === null) {
      areasDiscussed = splitNameList(areasMatch[1]).map((n) => n); // discussed-area names keep source casing intent
    }
  }
  // Shape (a) continuation lines can wrap — line-scan with a small join window.
  const headerLines = header.split('\n');
  for (let i = 0; i < headerLines.length; i++) {
    const match = AREAS_OFFERED_LINE_RE.exec(headerLines[i].trim());
    if (!match) continue;
    const parts = [match[1].trim()];
    let j = i + 1;
    while (j < headerLines.length && headerLines[j].trim() !== '' && !BOLD_LABEL_LINE_RE.test(headerLines[j].trim())) {
      parts.push(headerLines[j].trim());
      j++;
    }
    areasOffered = parts.join(' ').trim();
    break;
  }

  const offeredCount = findOfferedCount(header);

  const topicHeadings = new Set(topics.map((t) => t.heading.trim().toLowerCase()));
  let declinedCount: number | null = null;
  let declinedAreas: string[] = [];
  let shapeBAreas: string[] = [];
  let shapeCAreas: string[] = [];

  for (const section of splitSections(body)) {
    if (topicHeadings.has(section.heading.trim().toLowerCase())) continue; // topic section — skip
    for (const scanBody of [section.body, ...splitSubsections(section.body).map((s) => s.body)]) {
      for (const { paragraph, following } of paragraphsWithFollowing(scanBody)) {
        if (shapeBAreas.length === 0) {
          const found = findShapeB(paragraph);
          if (found.length > 0) shapeBAreas = found;
        }
        if (shapeCAreas.length === 0) {
          const found = findShapeC(paragraph, following);
          if (found.length > 0) shapeCAreas = found;
        }
        if (declinedCount === null) {
          const found = findDeclinedCount(paragraph);
          if (found !== null) declinedCount = found;
        }
      }
    }
  }

  if (shapeBAreas.length > 0) declinedAreas = shapeBAreas;
  else if (shapeCAreas.length > 0) declinedAreas = shapeCAreas;
  else if (areasOffered) declinedAreas = splitNameList(areasOffered.split(/\.\s/)[0] ?? areasOffered);

  return { date, areasDiscussed, offeredCount, declinedCount, declinedAreas };
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
  'discussion-log': extractDiscussionLog as unknown as SectionProjection,
  review: extractReviewWarnings,
});

/** Never throws — every composed primitive is a pure line-scanner, and a kind with no registered
 * projection returns `{}` rather than `null`/`undefined`, matching `parseWithRegistry`'s
 * `structured: parsed.structured ?? {}` contract. */
export function projectSections(kind: string, body: string): Record<string, unknown> {
  return SECTION_PROJECTIONS[kind]?.(body) ?? {};
}
