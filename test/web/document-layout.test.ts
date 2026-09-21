// sketch-004 B3 "folded chapters" layout contract and composer (quick-260922-3us). Node has no
// DOMParser, so any behavior routed through document-sections.ts's browser adapters
// (stripLeadingHeading, countListItems, listItemTexts) is exercised here through their documented
// node fallbacks (html unchanged; a regex `<li` count; `[]`).
import { describe, expect, it } from 'vitest';
import {
  ALSO_CHAPTER_TITLE,
  chapterForTarget,
  composeDocumentLayout,
  factValueText,
  rollupOf,
  type ChapterItem,
  type ChapterSpec,
  type ComposedDocumentLayout,
  type DocumentLayoutSpec,
  type SelectedChapter,
} from '../../src/web/views/layout.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';
import { discussionLogLayout } from '../../src/web/views/layout-discussion-log.ts';
import type {
  DiscussionQuestion,
  DiscussionTopic,
} from '../../src/planning-repo/handlers/section-projection.ts';

function group(overrides: Partial<DocumentSectionGroup> & Pick<DocumentSectionGroup, 'heading'>): DocumentSectionGroup {
  return { id: null, html: '', ...overrides };
}

function baseInput(overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'test-kind',
    frontmatter: {},
    structured: {},
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

describe('composeDocumentLayout', () => {
  const groups: DocumentSectionGroup[] = [
    group({ id: null, heading: null, html: '<p>Intro</p>' }),
    group({ id: 'notes', heading: 'Notes', html: '<h2>Notes</h2><p>n</p>' }),
    group({ id: 'side', heading: 'Side notes', html: '<h2>Side notes</h2><ul><li>a</li><li>b</li></ul>' }),
    group({ id: 'gone', heading: 'Nothing to see', html: '<h2>Nothing to see</h2><p>x</p>' }),
  ];

  function itemsSpec(id: string, select: (input: ViewInput) => SelectedChapter[] | null): ChapterSpec {
    return { type: 'items', id, select };
  }

  it('numbers chapters 01..N in spec order, dropping a spec whose select returns null/[] and a section spec with no match', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [
        itemsSpec('empty', () => null),
        itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [{ key: 'i1', ref: null, title: 'Item', state: null }] }]),
        { type: 'section', id: 'missing', heading: 'Does not exist' },
        { type: 'section', id: 'notes', heading: 'Notes' },
      ],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }));
    expect(composed).not.toBeNull();
    expect(composed!.chapters.map((c) => [c.number, c.specId])).toEqual([
      ['01', 'one'],
      ['02', 'notes'],
    ]);
  });

  it('returns null when the manifest has no layout', () => {
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [] };
    expect(composeDocumentLayout(manifest, baseInput({ groups }))).toBeNull();
  });

  it('returns null when zero chapters compose', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('empty', () => null), { type: 'section', id: 'missing', heading: 'Nope' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    expect(composeDocumentLayout(manifest, baseInput({ groups }))).toBeNull();
  });

  it('the Also chapter holds one panel per AlsoSpec match plus the remainder, numbered one past the last chapter', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }));
    expect(composed!.also).not.toBeNull();
    expect(composed!.also!.number).toBe('02');
    expect(composed!.also!.panels).toHaveLength(1);
    expect(composed!.also!.panels[0]).toMatchObject({ id: 'also-side', eyebrow: 'Side', count: 2 });
    // "Notes" and "Nothing to see" stay in the remainder — never consumed by anything.
    expect(composed!.also!.remainder.map((g) => g.heading)).toEqual(['Introduction', 'Notes', 'Nothing to see']);
  });

  it('the Also chapter is null when it would hold neither a panel nor a remainder group', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [{ type: 'section', id: 'all', heading: /.*/, all: true }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const fullGroups = groups.slice(1); // drop the leading no-heading group, which no `section` spec ever matches
    const composed = composeDocumentLayout(manifest, baseInput({ groups: fullGroups }));
    expect(composed!.also).toBeNull();
  });

  it('the remainder excludes groups consumed by section chapters and by accountsFor, and relabels the leading group Introduction', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [
        itemsSpec('accounted', () => [
          { key: 'a', title: 'Accounted', items: [], accountsFor: [groups[1]] },
        ]),
        { type: 'section', id: 'side', heading: 'Side notes' },
      ],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }));
    expect(composed!.also!.remainder.map((g) => g.heading)).toEqual(['Introduction', 'Nothing to see']);
  });

  it('calls cover(input, parts) last, so the cover can reference composed chapter/panel ids', () => {
    let seenChapterIds: string[] = [];
    let seenPanelIds: string[] = [];
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: (_input, parts) => {
        seenChapterIds = parts.chapters.map((c) => c.id);
        seenPanelIds = parts.also.map((p) => p.id);
        return { status: null, facts: [], headline: null, pills: [], glance: null };
      },
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    composeDocumentLayout(manifest, baseInput({ groups }));
    expect(seenChapterIds).toEqual(['chapter-one']);
    expect(seenPanelIds).toEqual(['also-side']);
  });
});

describe('rollupOf', () => {
  function item(overrides: Partial<ChapterItem> & Pick<ChapterItem, 'key'>): ChapterItem {
    return { ref: null, title: 't', state: null, ...overrides };
  }

  it('groups items by (tally ?? state) label+tone in first-seen order, using the rollup override when present', () => {
    const items: ChapterItem[] = [
      item({ key: 'a', state: { label: 'Chosen', tone: 'active', rollup: 'chosen' } }),
      item({ key: 'b', state: { label: 'Chosen', tone: 'active', rollup: 'chosen' } }),
      item({ key: 'c', state: { label: 'Failed', tone: 'missing' } }),
    ];
    expect(rollupOf(items)).toEqual([
      { text: '2 chosen', tone: 'active' },
      { text: '1 failed', tone: 'missing' },
    ]);
  });

  it('falls back to the lowercased label when no rollup override is given', () => {
    expect(rollupOf([item({ key: 'a', state: { label: 'Verified', tone: 'complete' } })])).toEqual([
      { text: '1 verified', tone: 'complete' },
    ]);
  });

  it('prefers tally over state when both are present', () => {
    expect(
      rollupOf([
        item({
          key: 'a',
          state: { label: 'Chosen', tone: 'active' },
          tally: { label: 'Done', tone: 'complete', rollup: 'done' },
        }),
      ]),
    ).toEqual([{ text: '1 done', tone: 'complete' }]);
  });

  it('collapses every item with neither a tally nor a state into one quiet "N items" group', () => {
    expect(rollupOf([item({ key: 'a' }), item({ key: 'b' })])).toEqual([{ text: '2 items', tone: 'quiet' }]);
  });

  it('interleaves the stateless group at its own first-seen position', () => {
    const items: ChapterItem[] = [
      item({ key: 'a', state: { label: 'Chosen', tone: 'active' } }),
      item({ key: 'b' }),
      item({ key: 'c', state: { label: 'Chosen', tone: 'active' } }),
    ];
    expect(rollupOf(items)).toEqual([
      { text: '2 chosen', tone: 'active' },
      { text: '1 items', tone: 'quiet' },
    ]);
  });
});

describe('factValueText', () => {
  it('returns a scalar value verbatim, or null when empty', () => {
    expect(factValueText({ kind: 'scalar', value: 'hello' })).toBe('hello');
    expect(factValueText({ kind: 'scalar', value: '' })).toBeNull();
  });

  it('comma-joins a scalar-only list', () => {
    expect(
      factValueText({
        kind: 'list',
        items: [
          { kind: 'scalar', value: 'a' },
          { kind: 'scalar', value: 'b' },
        ],
      }),
    ).toBe('a, b');
  });

  it('returns null for an empty list, a list containing a non-scalar item, or a record', () => {
    expect(factValueText({ kind: 'list', items: [] })).toBeNull();
    expect(
      factValueText({ kind: 'list', items: [{ kind: 'record', entries: [] }] }),
    ).toBeNull();
    expect(factValueText({ kind: 'record', entries: [] })).toBeNull();
  });
});

describe('chapterForTarget', () => {
  function makeLayout(): ComposedDocumentLayout {
    return {
      cover: { status: null, facts: [], headline: null, pills: [], glance: null },
      chapters: [
        {
          id: 'chapter-topic-a',
          specId: 'topic',
          number: '01',
          title: 'Topic A',
          items: [
            {
              id: 'chapter-topic-a-q1',
              key: 'q1',
              ref: 'Q1',
              title: 'Question',
              state: null,
              detail: { label: 'detail', html: '<p id="embedded-in-detail">x</p>' },
            },
          ],
          html: null,
          rollup: [],
          count: 1,
          anchorIds: ['topic-a-anchor'],
        },
        {
          id: 'chapter-section',
          specId: 'section',
          number: '02',
          title: 'A section',
          items: null,
          html: '<p id="embedded-in-section">y</p>',
          rollup: [],
          count: null,
          anchorIds: ['section-anchor'],
        },
      ],
      also: {
        id: 'chapter-also',
        number: '03',
        panels: [{ id: 'also-discretion', specId: 'discretion', eyebrow: 'Left to Claude', html: '<p id="embedded-in-panel">z</p>', count: 2 }],
        remainder: [group({ id: 'leftover', heading: 'Leftover', html: '<p id="embedded-in-remainder">r</p>' })],
        rollup: [],
      },
    };
  }

  it('resolves a chapter id', () => {
    expect(chapterForTarget(makeLayout(), 'chapter-topic-a')).toEqual({
      chapterId: 'chapter-topic-a',
      itemId: null,
    });
  });

  it('resolves an item id, returning its own itemId', () => {
    expect(chapterForTarget(makeLayout(), 'chapter-topic-a-q1')).toEqual({
      chapterId: 'chapter-topic-a',
      itemId: 'chapter-topic-a-q1',
    });
  });

  it('resolves a panel id (Also chapter)', () => {
    expect(chapterForTarget(makeLayout(), 'also-discretion')).toEqual({
      chapterId: 'chapter-also',
      itemId: 'also-discretion',
    });
  });

  it('resolves an anchorId back to its owning chapter', () => {
    expect(chapterForTarget(makeLayout(), 'topic-a-anchor')).toEqual({
      chapterId: 'chapter-topic-a',
      itemId: null,
    });
    expect(chapterForTarget(makeLayout(), 'section-anchor')).toEqual({
      chapterId: 'chapter-section',
      itemId: null,
    });
  });

  it('finds an id="x" embedded inside a section chapter\'s html, an item\'s detail html, a panel\'s html, or a remainder group\'s html', () => {
    expect(chapterForTarget(makeLayout(), 'embedded-in-section')).toEqual({
      chapterId: 'chapter-section',
      itemId: null,
    });
    expect(chapterForTarget(makeLayout(), 'embedded-in-detail')).toEqual({
      chapterId: 'chapter-topic-a',
      itemId: 'chapter-topic-a-q1',
    });
    expect(chapterForTarget(makeLayout(), 'embedded-in-panel')).toEqual({
      chapterId: 'chapter-also',
      itemId: 'also-discretion',
    });
    expect(chapterForTarget(makeLayout(), 'embedded-in-remainder')).toEqual({
      chapterId: 'chapter-also',
      itemId: null,
    });
  });

  it('returns null for an unknown target', () => {
    expect(chapterForTarget(makeLayout(), 'nothing-like-this-exists')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Discussion-log layout data (layout-discussion-log.ts)
// ---------------------------------------------------------------------------

function discussionQuestion(overrides: Partial<DiscussionQuestion> & Pick<DiscussionQuestion, 'topic' | 'question'>): DiscussionQuestion {
  return {
    options: [{ option: 'A', description: 'Option A', chosen: true }],
    chosenOption: 'A',
    chosenDescription: 'Option A',
    userChoice: null,
    ...overrides,
  };
}

describe('discussionLogLayout', () => {
  function manifestWith(structured: Record<string, unknown>, groups: DocumentSectionGroup[] = []): {
    manifest: ViewManifest;
    input: ViewInput;
  } {
    const manifest: ViewManifest = {
      kind: 'discussion-log',
      lead: 'lead.',
      promote: [],
      layout: discussionLogLayout,
    };
    return { manifest, input: baseInput({ kind: 'discussion-log', structured, groups }) };
  }

  it('composes one chapter per topic, in first-seen order, holding only resolved questions as Q1..Qn', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'Topic One', question: 'Q1?' }),
      discussionQuestion({ topic: 'Topic One', question: 'Q2?' }),
      discussionQuestion({ topic: 'Topic Two', question: 'Q1?' }),
    ];
    const topics: DiscussionTopic[] = [
      { heading: 'Topic One', questionCount: 2, resolvedCount: 2 },
      { heading: 'Topic Two', questionCount: 3, resolvedCount: 1 },
    ];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.chapters.map((c) => c.title)).toEqual(['Topic One', 'Topic Two']);
    expect(composed!.chapters[0].items!.map((i) => i.ref)).toEqual(['Q1', 'Q2']);
    expect(composed!.chapters[1].items!.map((i) => i.ref)).toEqual(['Q1']);
  });

  it('marks a fully-resolved topic Chosen (rollup "chosen"), and a "you decide" answer/userChoice Claude chose (rollup "by Claude")', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'T', question: 'Normal?' }),
      discussionQuestion({
        topic: 'T',
        question: 'Left to Claude?',
        chosenOption: 'You decide',
        chosenDescription: 'You decide',
      }),
      discussionQuestion({
        topic: 'T',
        question: 'User wrote you decide?',
        userChoice: 'you decide',
      }),
    ];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 3, resolvedCount: 3 }];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].state).toMatchObject({ label: 'Chosen', tone: 'active', rollup: 'chosen' });
    expect(items[1].state).toMatchObject({ label: 'Claude chose', tone: 'active', rollup: 'by Claude' });
    expect(items[2].state).toMatchObject({ label: 'Claude chose', tone: 'active', rollup: 'by Claude' });
  });

  it('detail: "N other option(s)" plus " · note" and a Your words row when userChoice differs from the chosen option', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({
        topic: 'T',
        question: 'Q?',
        options: [
          { option: 'A', description: 'Option A', chosen: true },
          { option: 'B', description: 'Option B', chosen: false },
          { option: 'C', description: 'Option C', chosen: false },
        ],
        userChoice: 'My own words',
      }),
    ];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 1, resolvedCount: 1 }];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    const item = composed!.chapters[0].items![0];
    expect(item.detail!.label).toBe('2 other options · note');
    expect(item.detail!.rows).toEqual([
      { text: 'Option B' },
      { text: 'Option C' },
      { label: 'Your words', text: 'My own words' },
    ]);
  });

  it('omits the detail entirely when there are no other options and no distinguishing note', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q?' })];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 1, resolvedCount: 1 }];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.chapters[0].items![0].detail).toBeNull();
  });

  it("accounts for a fully-resolved topic's group, leaving a partially-resolved topic's group in the remainder", () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'Full', question: 'Q1?' }),
      discussionQuestion({ topic: 'Partial', question: 'Q1?' }),
    ];
    const topics: DiscussionTopic[] = [
      { heading: 'Full', questionCount: 1, resolvedCount: 1 },
      { heading: 'Partial', questionCount: 2, resolvedCount: 1 },
    ];
    const groups: DocumentSectionGroup[] = [
      group({ id: 'full', heading: 'Full', html: '<h2>Full</h2>' }),
      group({ id: 'partial', heading: 'Partial', html: '<h2>Partial</h2>' }),
    ];
    const { manifest, input } = manifestWith({ questions, topics }, groups);
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.also!.remainder.map((g) => g.heading)).toEqual(['Partial']);
  });

  it('cover: headline shows "of T questions decided" only when some questions are unresolved', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topicsPartial: DiscussionTopic[] = [{ heading: 'T', questionCount: 2, resolvedCount: 1 }];
    const { manifest, input } = manifestWith({ questions, topics: topicsPartial });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.cover.headline).toEqual({ value: '1', label: 'of 2 questions decided' });
    expect(composed!.cover.status).toMatchObject({ tone: 'in-flight' });

    const topicsFull: DiscussionTopic[] = [{ heading: 'T', questionCount: 1, resolvedCount: 1 }];
    const { manifest: manifest2, input: input2 } = manifestWith({ questions, topics: topicsFull });
    const composed2 = composeDocumentLayout(manifest2, input2);
    expect(composed2!.cover.headline).toEqual({ value: '1', label: 'questions decided' });
    expect(composed2!.cover.status).toMatchObject({ tone: 'complete' });
  });

  it('cover facts is always empty', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 1, resolvedCount: 1 }];
    const { manifest, input } = manifestWith({ questions, topics });
    expect(composeDocumentLayout(manifest, input)!.cover.facts).toEqual([]);
  });

  it('cover glance prefers a you-decide question, jumping to its composed item id', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'T', question: 'Normal?' }),
      discussionQuestion({
        topic: 'T',
        question: 'Left to Claude?',
        chosenOption: 'you decide',
        chosenDescription: 'Manifest is the contract',
      }),
    ];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 2, resolvedCount: 2 }];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input)!;
    const claudeItem = composed.chapters[0].items!.find((i) => i.state?.label === 'Claude chose')!;
    expect(composed.cover.glance).toMatchObject({
      eyebrow: 'Left to Claude',
      action: 'Jump to that question',
      target: claudeItem.id,
    });
  });

  it('cover glance falls back to the discretion panel\'s list count, then to null', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [{ heading: 'T', questionCount: 1, resolvedCount: 1 }];
    const discretionGroup = group({
      id: 'discretion',
      heading: "Claude's Discretion",
      html: '<h2>Discretion</h2><ul><li>First bullet</li><li>Second bullet</li></ul>',
    });
    const { manifest, input } = manifestWith({ questions, topics }, [discretionGroup]);
    const composed = composeDocumentLayout(manifest, input)!;
    expect(composed.cover.glance).toMatchObject({
      eyebrow: 'Left to Claude',
      title: '2 decisions left to Claude',
      action: 'See the list',
    });

    const { manifest: manifestNoDiscretion, input: inputNoDiscretion } = manifestWith({ questions, topics });
    const composedNoDiscretion = composeDocumentLayout(manifestNoDiscretion, inputNoDiscretion)!;
    expect(composedNoDiscretion.cover.glance).toBeNull();
  });

  it('ALSO_CHAPTER_TITLE is the shared "Also in this document" string', () => {
    expect(ALSO_CHAPTER_TITLE).toBe('Also in this document');
  });
});
