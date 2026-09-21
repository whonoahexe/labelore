// sketch-004 B3 (quick-260922-3us): the discussion-log DocumentLayoutSpec — the first adopter of
// the shared cover/chapter-index/folded-chapter layout. One chapter per topic (in first-seen
// document order), each holding its resolved questions; discretion/open-questions/deferred panels
// round out the Also chapter.
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
  SelectedChapter,
  Tally,
} from './layout.ts';
import type { ViewInput } from './manifest.ts';

function isYouDecide(value: string | null): boolean {
  return (value ?? '').trim().toLowerCase() === 'you decide';
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
      const items: ChapterItem[] = topicQuestions.map((question, index) => {
        const claudeChose = isYouDecide(question.userChoice) || isYouDecide(question.chosenOption);
        const state: Tally = claudeChose
          ? { label: 'Claude chose', tone: 'active', rollup: 'by Claude' }
          : { label: 'Chosen', tone: 'active', rollup: 'chosen' };
        const otherOptions = question.options.filter((option) => !option.chosen);
        const hasNote =
          question.userChoice !== null &&
          question.userChoice.trim() !== '' &&
          question.userChoice.trim() !== question.chosenOption.trim();
        const showDetail = otherOptions.length > 0 || hasNote;
        const detailLabel = showDetail
          ? `${otherOptions.length} other option${otherOptions.length === 1 ? '' : 's'}${hasNote ? ' · note' : ''}`
          : null;
        const rows: { label?: string; text: string }[] = otherOptions.map((option) => ({
          text: option.description || option.option,
        }));
        if (hasNote) rows.push({ label: 'Your words', text: question.userChoice as string });
        return {
          key: `q-${index + 1}`,
          ref: `Q${index + 1}`,
          title: question.question,
          state,
          answer: question.chosenDescription || question.chosenOption,
          detail: showDetail && detailLabel ? { label: detailLabel, rows } : null,
        };
      });
      const topicMeta = topics.find(
        (candidate) => candidate.heading.trim().toLowerCase() === topic.trim().toLowerCase(),
      );
      const fullyResolved =
        topicMeta !== undefined &&
        topicMeta.resolvedCount > 0 &&
        topicMeta.resolvedCount === topicMeta.questionCount;
      const accountsFor = fullyResolved
        ? input.groups.filter(
            (group) => (group.heading ?? '').trim().toLowerCase() === topic.trim().toLowerCase(),
          )
        : [];
      return { key: topic, title: topic, items, accountsFor };
    });

    return chapters.length > 0 ? chapters : null;
  },
};

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

function cover(
  input: ViewInput,
  parts: { chapters: ComposedChapter[]; also: import('./layout.ts').ComposedAlsoPanel[] },
): CoverData {
  const questions = Array.isArray(input.structured.questions)
    ? (input.structured.questions as DiscussionQuestion[])
    : [];
  const topics = Array.isArray(input.structured.topics)
    ? (input.structured.topics as DiscussionTopic[])
    : [];

  const resolved = questions.length;
  const total = topics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const headline = {
    value: String(resolved),
    label: total > resolved ? `of ${total} questions decided` : 'questions decided',
  };
  const status: Tally = {
    label: `${resolved} of ${total} decided`,
    tone: total > 0 && resolved === total ? 'complete' : 'in-flight',
  };

  const pills: { value: string; label: string }[] = [];
  if (topics.length > 0) {
    pills.push({ value: String(topics.length), label: topics.length === 1 ? 'Topic' : 'Topics' });
  }
  const claudeCount = questions.filter(
    (question) => isYouDecide(question.userChoice) || isYouDecide(question.chosenOption),
  ).length;
  if (claudeCount > 0) pills.push({ value: String(claudeCount), label: 'Left to Claude' });
  const deferredPanel = parts.also.find((panel) => panel.specId === 'deferred');
  if (deferredPanel?.count) pills.push({ value: String(deferredPanel.count), label: 'Deferred' });

  let glance: CoverGlance | null = null;
  const claudeItem = firstClaudeChoiceItem(parts.chapters);
  if (claudeItem) {
    glance = {
      eyebrow: 'Left to Claude',
      title: `${claudeCount} question${claudeCount === 1 ? '' : 's'} you left to Claude`,
      body: claudeItem.answer ? `${claudeItem.title} — ${claudeItem.answer}` : claudeItem.title,
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

  return { status, facts: [], headline, pills, glance };
}

export const discussionLogLayout: DocumentLayoutSpec = {
  chapters: [topicChapters],
  also: [
    { id: 'discretion', heading: /discretion\s*$/i, eyebrow: 'Left to Claude' },
    { id: 'open-questions', heading: /open questions/i, eyebrow: 'Carried forward' },
    { id: 'deferred', heading: /^deferred/i, eyebrow: 'Declined, kept on file' },
  ],
  cover,
};
