// sketch-004 B3 (quick-260922-3us), extended by quick-260923-jxp: the discussion-log
// DocumentLayoutSpec — one chapter per topic (in first-seen document order), each holding every
// question (JXP-05: none filtered), a numbered/titled answer card (JXP-03/JXP-04), a quiet note
// toggle (JXP-06), declined-area ghost rows (JXP-02), an Endnotes sheet in place of the folded
// Also chapter (JXP-07), and a cover whose every number equals what the page renders (JXP-08).
import type {
  DiscussionQuestion,
  DiscussionTopic,
} from '../../planning-repo/handlers/section-projection.ts';
import { listItemTexts } from './document-sections.ts';
import type {
  ChapterItem,
  ChapterSpec,
  ComposedChapter,
  CoverData,
  CoverGlance,
  DocumentLayoutSpec,
  GhostChapter,
  ItemAnswer,
  ItemNote,
  ItemOption,
  SelectedChapter,
  Tally,
} from './layout.ts';
import type { ViewInput } from './manifest.ts';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** ISO `YYYY-MM-DD` → "Mon D, YYYY" (the same short-month style as `shortQuickDate`,
 * src/presentation/tree-labels.ts). Non-ISO input is left to the caller's frontmatter fallback. */
function formatLogDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTHS[monthIndex]} ${Number(day)}, ${year}`;
}

function stripWordMarks(value: string): string {
  return value
    .trim()
    .replace(/^[*"'`]+|[*"'`]+$/g, '')
    .trim()
    .toLowerCase();
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const match = /^(["'“‘])([\s\S]*)(["'”’])$/.exec(trimmed);
  return match && match[2]!.trim() ? match[2]!.trim() : trimmed;
}

function isYouDecide(value: string | null): boolean {
  return stripWordMarks(value ?? '') === 'you decide';
}

const topicChapters: ChapterSpec = {
  type: 'items',
  id: 'topic',
  select: (input: ViewInput): SelectedChapter[] | null => {
    const questions = Array.isArray(input.structured.questions)
      ? (input.structured.questions as DiscussionQuestion[])
      : [];
    if (questions.length === 0) return null;
    const topics = Array.isArray(input.structured.topics)
      ? (input.structured.topics as DiscussionTopic[])
      : [];

    const order: string[] = [];
    const byTopic = new Map<string, DiscussionQuestion[]>();
    for (const question of questions) {
      if (!byTopic.has(question.topic)) {
        byTopic.set(question.topic, []);
        order.push(question.topic);
      }
      byTopic.get(question.topic)!.push(question);
    }

    const chapters: SelectedChapter[] = order.map((topic) => {
      const topicQuestions = byTopic.get(topic)!;
      const items: ChapterItem[] = topicQuestions.map((question, index) => buildItem(question, index));
      const topicMeta = topics.find(
        (candidate) => candidate.heading.trim().toLowerCase() === topic.trim().toLowerCase(),
      );
      // quick-260923-jxp: a topic's own group stays reachable in the remainder ("More in this
      // document") exactly when it is `leftover` — prose the parse didn't fold into a question.
      const accountsFor =
        topicMeta !== undefined && !topicMeta.leftover
          ? input.groups.filter(
              (group) => (group.heading ?? '').trim().toLowerCase() === topic.trim().toLowerCase(),
            )
          : [];
      return { key: topic, title: topic, items, accountsFor };
    });

    return chapters.length > 0 ? chapters : null;
  },
};

function buildItem(question: DiscussionQuestion, index: number): ChapterItem {
  const claudeChose = question.resolution === 'claude';
  const state: Tally =
    question.resolution === 'claude'
      ? { label: 'Claude chose', tone: 'active', rollup: 'by Claude' }
      : question.resolution === 'custom'
        ? { label: 'Custom answer', tone: 'active', rollup: 'custom' }
        : question.resolution === 'open'
          ? { label: 'Open', tone: 'quiet', rollup: 'open' }
          : { label: 'Chosen', tone: 'active', rollup: 'chosen' };

  let optionPart: ItemOption | null = null;
  if (question.chosenIndex !== null) {
    optionPart = {
      number: question.chosenIndex,
      title: question.chosenOption,
      description: question.chosenDescription || null,
    };
  } else if (question.settled) {
    optionPart = { number: null, title: question.settled.option, description: question.settled.description || null };
  }

  const rawWords = question.userChoice;
  const wordsAreDistinct =
    rawWords !== null &&
    rawWords.trim() !== '' &&
    !isYouDecide(rawWords) &&
    stripWordMarks(rawWords) !== stripWordMarks(optionPart?.title ?? '');
  // The card quotes the words itself (`<q>`), so drop quotes the log already wrapped them in.
  const words = wordsAreDistinct ? unquote(rawWords) : null;

  const answerCard: ItemAnswer | null =
    optionPart || words
      ? {
          option: optionPart,
          qualifier: claudeChose ? null : question.qualifier,
          words,
        }
      : null;

  const otherOptions = question.options
    .map((option, i) => ({ option, number: i + 1 }))
    .filter(({ option }) => !option.chosen);
  const options: ItemOption[] = otherOptions.map(({ option, number }) => ({
    number,
    title: option.option,
    description: option.description || null,
  }));
  const detailLabel =
    options.length > 0
      ? question.chosenIndex !== null
        ? `${options.length} other option${options.length === 1 ? '' : 's'}`
        : `${options.length} option${options.length === 1 ? '' : 's'} offered`
      : null;

  const note: ItemNote | null = question.notes
    ? { label: 'Note', segments: noteSegmentsOf(question.notes) }
    : null;

  return {
    key: `q-${index + 1}`,
    ref: `Q${index + 1}`,
    title: question.question,
    state,
    answerCard,
    detail: detailLabel ? { label: detailLabel, options } : null,
    note,
  };
}

const ACCEPTED_GAP_RE = /^Accepted gap:\s*/i;

/** Splits a notes paragraph into sentence-ish segments so an "Accepted gap:" sentence can carry
 * its own small inline marker (JXP-06) — split on ". " (a sentence boundary), never a
 * whole-document regex. */
function noteSegmentsOf(notes: string): { text: string; mark: string | null }[] {
  const sentences = notes.split(/(?<=\.)\s+/);
  return sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '')
    .map((sentence) => {
      const match = ACCEPTED_GAP_RE.exec(sentence);
      if (match) {
        return { text: sentence.slice(match[0].length).trim(), mark: 'Accepted gap' };
      }
      return { text: sentence, mark: null };
    });
}

function firstClaudeChoiceItem(
  chapters: ComposedChapter[],
): { id: string; title: string; answer?: string | null } | null {
  for (const chapter of chapters) {
    if (!chapter.items) continue;
    const found = chapter.items.find((item) => item.state?.label === 'Claude chose');
    if (found) return found;
  }
  return null;
}

function glanceAnswerOf(item: { answerCard?: ItemAnswer | null } | undefined): string | null {
  const answer = item?.answerCard;
  if (!answer) return null;
  return answer.option?.title ?? answer.words ?? null;
}

function areasDiscussedOf(input: ViewInput, chapterCount: number): number {
  const areas = Array.isArray(input.structured.areasDiscussed) ? (input.structured.areasDiscussed as string[]) : null;
  return areas ? areas.length : chapterCount;
}

function cover(
  input: ViewInput,
  parts: { chapters: ComposedChapter[]; also: import('./layout.ts').ComposedAlsoPanel[]; ghosts: import('./layout.ts').ComposedGhost[] },
): CoverData {
  const allItems = parts.chapters.flatMap((chapter) => chapter.items ?? []);
  const decided = allItems.filter((item) => item.state?.label !== 'Open').length;
  const total = allItems.length;
  const headline = {
    value: String(decided),
    label: total > decided ? `of ${total} questions decided` : 'questions decided',
  };
  const status: Tally = {
    label: `${decided} of ${total} decided`,
    tone: total > 0 && decided === total ? 'complete' : 'in-flight',
  };

  const pills: { value: string; label: string }[] = [];
  if (parts.chapters.length > 0) {
    pills.push({
      value: String(parts.chapters.length),
      label: parts.chapters.length === 1 ? 'Topic' : 'Topics',
    });
  }
  const claudeCount = allItems.filter((item) => item.state?.label === 'Claude chose').length;
  if (claudeCount > 0) pills.push({ value: String(claudeCount), label: 'Left to Claude' });
  const deferredPanel = parts.also.find((panel) => panel.specId === 'deferred');
  if (deferredPanel?.count) pills.push({ value: String(deferredPanel.count), label: 'Deferred' });

  let glance: CoverGlance | null = null;
  const claudeItem = firstClaudeChoiceItem(parts.chapters);
  if (claudeItem) {
    const claudeAnswer = glanceAnswerOf(
      parts.chapters.flatMap((c) => c.items ?? []).find((item) => item.id === claudeItem.id),
    );
    glance = {
      eyebrow: 'Left to Claude',
      title: `${claudeCount} question${claudeCount === 1 ? '' : 's'} you left to Claude`,
      body: claudeAnswer ? `${claudeItem.title} — ${claudeAnswer}` : claudeItem.title,
      action: 'Jump to that question',
      target: claudeItem.id,
    };
  } else {
    const discretionPanel = parts.also.find((panel) => panel.specId === 'discretion');
    if (discretionPanel?.count) {
      const firstBullet = listItemTexts(discretionPanel.html)[0] ?? null;
      glance = {
        eyebrow: 'Left to Claude',
        title: `${discretionPanel.count} decision${discretionPanel.count === 1 ? '' : 's'} left to Claude`,
        body: firstBullet,
        action: 'See the list',
        target: discretionPanel.id,
      };
    }
  }

  // quick-260923-jxp (JXP-01/JXP-08): facts are truthful — Logged from the parsed `date` (falling
  // back to a string frontmatter.date); omitted only when neither is a usable non-empty string. A
  // frontmatter fallback that isn't ISO-formatted is still shown, verbatim, rather than dropped.
  const facts: { label: string; value: string }[] = [];
  const parsedDate = typeof input.structured.date === 'string' ? input.structured.date : null;
  const frontmatterDate =
    typeof input.frontmatter.date === 'string' && (input.frontmatter.date as string).trim() !== ''
      ? (input.frontmatter.date as string)
      : null;
  if (parsedDate) {
    const formatted = formatLogDate(parsedDate);
    if (formatted) facts.push({ label: 'Logged', value: formatted });
  } else if (frontmatterDate) {
    const formatted = formatLogDate(frontmatterDate);
    facts.push({ label: 'Logged', value: formatted ?? frontmatterDate });
  }

  const discussedCount = areasDiscussedOf(input, parts.chapters.length);
  const declinedAreas = Array.isArray(input.structured.declinedAreas)
    ? (input.structured.declinedAreas as string[])
    : [];
  const declinedCount = typeof input.structured.declinedCount === 'number' ? input.structured.declinedCount : null;
  const offeredCount = typeof input.structured.offeredCount === 'number' ? input.structured.offeredCount : null;
  const offeredTotal =
    declinedAreas.length > 0
      ? discussedCount + declinedAreas.length
      : declinedCount !== null
        ? discussedCount + declinedCount
        : (offeredCount ?? discussedCount);
  facts.push({ label: 'Discussed', value: `${discussedCount} of ${offeredTotal} offered areas` });

  return { status, facts, headline, pills, glance };
}

function ghostsOf(input: ViewInput): GhostChapter[] | null {
  const declinedAreas = Array.isArray(input.structured.declinedAreas)
    ? (input.structured.declinedAreas as string[])
    : [];
  if (declinedAreas.length === 0) return null;
  return declinedAreas.map((name) => ({ key: name, title: name, label: 'Not discussed' }));
}

export const discussionLogLayout: DocumentLayoutSpec = {
  chapters: [topicChapters],
  also: [
    { id: 'discretion', heading: /discretion\s*$/i, eyebrow: 'Left to Claude' },
    { id: 'open-questions', heading: /open questions/i, eyebrow: 'Carried forward' },
    { id: 'deferred', heading: /^deferred/i, eyebrow: 'Declined, kept on file' },
  ],
  cover,
  ghosts: ghostsOf,
  alsoStyle: 'endnotes',
};
