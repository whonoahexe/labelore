// sketch-004 B3 "folded chapters" layout contract and composer (quick-260922-3us). Node has no
// DOMParser, so any behavior routed through document-sections.ts's browser adapters
// (stripLeadingHeading, countListItems, listItemTexts) is exercised here through their documented
// node fallbacks (html unchanged; a regex `<li` count; `[]`).
import { describe, expect, it } from 'vitest';
import {
  ALSO_CHAPTER_TITLE,
  ENDNOTES_TITLE,
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

  // -------------------------------------------------------------------------
  // quick-260923-jxp Task 2: ghosts, alsoStyle, panel heading/bodyHtml.
  // -------------------------------------------------------------------------

  it('ghosts: composed with ids `ghost-<slug(key)>`, neither numbered nor counted; null/[] gives []', () => {
    let seenGhostIds: string[] = [];
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      cover: (_input, parts) => {
        seenGhostIds = parts.ghosts.map((g) => g.id);
        return { status: null, facts: [], headline: null, pills: [], glance: null };
      },
      ghosts: () => [{ key: 'Path targeting (TGT-01)', title: 'Path targeting (TGT-01)', label: 'Not discussed' }],
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }));
    expect(composed!.ghosts).toEqual([
      { key: 'Path targeting (TGT-01)', title: 'Path targeting (TGT-01)', label: 'Not discussed', id: 'ghost-path-targeting-tgt-01' },
    ]);
    expect(seenGhostIds).toEqual(['ghost-path-targeting-tgt-01']);

    const specNoGhosts: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifestNoGhosts: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: specNoGhosts };
    expect(composeDocumentLayout(manifestNoGhosts, baseInput({ groups }))!.ghosts).toEqual([]);
  });

  it('ghosts alone never make a layout on their own — zero chapters still returns null', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('empty', () => null)],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
      ghosts: () => [{ key: 'a', title: 'A', label: 'Not discussed' }],
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    expect(composeDocumentLayout(manifest, baseInput({ groups }))).toBeNull();
  });

  it('alsoStyle "endnotes" gives also.style "endnotes" and title ENDNOTES_TITLE; default/"fold" give "fold" and ALSO_CHAPTER_TITLE', () => {
    const specEndnotes: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
      alsoStyle: 'endnotes',
    };
    const manifestEndnotes: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: specEndnotes };
    const composedEndnotes = composeDocumentLayout(manifestEndnotes, baseInput({ groups }));
    expect(composedEndnotes!.also).toMatchObject({ style: 'endnotes', title: ENDNOTES_TITLE });

    const specDefault: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifestDefault: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: specDefault };
    const composedDefault = composeDocumentLayout(manifestDefault, baseInput({ groups }));
    expect(composedDefault!.also).toMatchObject({ style: 'fold', title: ALSO_CHAPTER_TITLE });
  });

  it('each Also panel carries heading (group heading) and bodyHtml (stripLeadingHeading of its html)', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }));
    // Node has no DOMParser — stripLeadingHeading falls back to returning html unchanged.
    expect(composed!.also!.panels[0]).toMatchObject({
      heading: 'Side notes',
      bodyHtml: '<h2>Side notes</h2><ul><li>a</li><li>b</li></ul>',
    });
  });

  it('chapterForTarget still resolves chapter-also/also-<spec>/embedded ids under alsoStyle "endnotes"', () => {
    const spec: DocumentLayoutSpec = {
      chapters: [itemsSpec('one', () => [{ key: 'a', title: 'Chapter A', items: [] }])],
      also: [{ id: 'side', heading: 'Side notes', eyebrow: 'Side' }],
      cover: () => ({ status: null, facts: [], headline: null, pills: [], glance: null }),
      alsoStyle: 'endnotes',
    };
    const manifest: ViewManifest = { kind: 'test-kind', lead: 'lead.', promote: [], layout: spec };
    const composed = composeDocumentLayout(manifest, baseInput({ groups }))!;
    expect(chapterForTarget(composed, 'chapter-also')).toEqual({ chapterId: 'chapter-also', itemId: null });
    expect(chapterForTarget(composed, 'also-side')).toEqual({ chapterId: 'chapter-also', itemId: 'also-side' });
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
        panels: [
          {
            id: 'also-discretion',
            specId: 'discretion',
            eyebrow: 'Left to Claude',
            html: '<p id="embedded-in-panel">z</p>',
            count: 2,
            heading: 'Discretion',
            bodyHtml: '<p id="embedded-in-panel">z</p>',
          },
        ],
        remainder: [group({ id: 'leftover', heading: 'Leftover', html: '<p id="embedded-in-remainder">r</p>' })],
        rollup: [],
        style: 'fold',
        title: ALSO_CHAPTER_TITLE,
      },
      ghosts: [],
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
// Discussion-log layout data (layout-discussion-log.ts) — quick-260923-jxp
// ---------------------------------------------------------------------------

function discussionQuestion(overrides: Partial<DiscussionQuestion> & Pick<DiscussionQuestion, 'topic' | 'question'>): DiscussionQuestion {
  return {
    options: [{ option: 'A', description: 'Option A', chosen: true }],
    chosenOption: 'A',
    chosenDescription: 'Option A',
    userChoice: null,
    chosenIndex: 1,
    qualifier: null,
    resolution: 'chosen',
    settled: null,
    notes: null,
    ...overrides,
  };
}

function topic(overrides: Partial<DiscussionTopic> & Pick<DiscussionTopic, 'heading' | 'questionCount' | 'resolvedCount'>): DiscussionTopic {
  return { leftover: false, ...overrides };
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

  it('composes one chapter per topic, in first-seen order, holding every question as Q1..Qn (JXP-05: none filtered)', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'Topic One', question: 'Q1?' }),
      discussionQuestion({ topic: 'Topic One', question: 'Q2?' }),
      discussionQuestion({ topic: 'Topic Two', question: 'Q1?', resolution: 'open', chosenIndex: null }),
    ];
    const topics: DiscussionTopic[] = [
      topic({ heading: 'Topic One', questionCount: 2, resolvedCount: 2 }),
      topic({ heading: 'Topic Two', questionCount: 3, resolvedCount: 1 }),
    ];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.chapters.map((c) => c.title)).toEqual(['Topic One', 'Topic Two']);
    expect(composed!.chapters[0].items!.map((i) => i.ref)).toEqual(['Q1', 'Q2']);
    expect(composed!.chapters[1].items!.map((i) => i.ref)).toEqual(['Q1']);
  });

  it('state by resolution: chosen → Chosen (active/"chosen"), claude → Claude chose (active/"by Claude"), custom → Custom answer (active/"custom"), open → Open (quiet/"open")', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'T', question: 'Chosen?', resolution: 'chosen' }),
      discussionQuestion({ topic: 'T', question: 'Claude?', resolution: 'claude', chosenIndex: null }),
      discussionQuestion({ topic: 'T', question: 'Custom?', resolution: 'custom', chosenIndex: null, userChoice: 'My words' }),
      discussionQuestion({ topic: 'T', question: 'Open?', resolution: 'open', chosenIndex: null }),
    ];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 4, resolvedCount: 3 })];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].state).toMatchObject({ label: 'Chosen', tone: 'active', rollup: 'chosen' });
    expect(items[1].state).toMatchObject({ label: 'Claude chose', tone: 'active', rollup: 'by Claude' });
    expect(items[2].state).toMatchObject({ label: 'Custom answer', tone: 'active', rollup: 'custom' });
    expect(items[3].state).toMatchObject({ label: 'Open', tone: 'quiet', rollup: 'open' });
  });

  it('answerCard: chosenIndex set → {chosenIndex, chosenOption, chosenDescription or null}; else settled; else null', () => {
    const chosenQ = discussionQuestion({ topic: 'T', question: 'Q1?', chosenIndex: 2, chosenOption: 'B', chosenDescription: '' });
    const settledQ = discussionQuestion({
      topic: 'T',
      question: 'Q2?',
      resolution: 'custom',
      chosenIndex: null,
      chosenOption: '',
      chosenDescription: '',
      userChoice: 'free text',
      settled: { option: 'Settled opt', description: 'settled desc', prompt: 'Follow-up' },
    });
    const openQ = discussionQuestion({ topic: 'T', question: 'Q3?', resolution: 'open', chosenIndex: null, chosenOption: '', chosenDescription: '' });
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 3, resolvedCount: 2 })];
    const { manifest, input } = manifestWith({ questions: [chosenQ, settledQ, openQ], topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].answerCard).toMatchObject({ option: { number: 2, title: 'B', description: null } });
    expect(items[1].answerCard).toMatchObject({ option: { number: null, title: 'Settled opt', description: 'settled desc' } });
    expect(items[2].answerCard).toBeNull();
  });

  it('answerCard qualifier is shown for a non-Claude qualifier, and suppressed when it names Claude', () => {
    const renamedQ = discussionQuestion({ topic: 'T', question: 'Q1?', qualifier: 'renamed' });
    const claudeQ = discussionQuestion({ topic: 'T', question: 'Q2?', resolution: 'claude', qualifier: "Claude's call" });
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 2, resolvedCount: 2 })];
    const { manifest, input } = manifestWith({ questions: [renamedQ, claudeQ], topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].answerCard!.qualifier).toBe('renamed');
    expect(items[1].answerCard!.qualifier).toBeNull();
  });

  it('answerCard words: userChoice shown only when not "you decide" and (quote/asterisk/backtick/case-folded) distinct from the option title', () => {
    const sameAsOption = discussionQuestion({ topic: 'T', question: 'Q1?', chosenOption: 'Backstage', userChoice: '"backstage"' });
    const different = discussionQuestion({ topic: 'T', question: 'Q2?', chosenOption: 'CLI subcommand', userChoice: 'use the name `backstage`' });
    const youDecide = discussionQuestion({
      topic: 'T',
      question: 'Q3?',
      resolution: 'claude',
      chosenIndex: null,
      chosenOption: '',
      chosenDescription: '',
      userChoice: 'you decide',
    });
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 3, resolvedCount: 3 })];
    const { manifest, input } = manifestWith({ questions: [sameAsOption, different, youDecide], topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].answerCard!.words).toBeNull();
    expect(items[1].answerCard!.words).toBe('use the name `backstage`');
    expect(items[2].answerCard).toBeNull();
  });

  it('detail: options = source-table options minus the chosen one, in source order; label "N other option(s)" when chosen, "N option(s) offered" when not; null when the list is empty', () => {
    const withChosen = discussionQuestion({
      topic: 'T',
      question: 'Q1?',
      chosenIndex: 1,
      options: [
        { option: 'A', description: 'Option A', chosen: true },
        { option: 'B', description: 'Option B', chosen: false },
        { option: 'C', description: 'Option C', chosen: false },
      ],
    });
    const openWithOptions = discussionQuestion({
      topic: 'T',
      question: 'Q2?',
      resolution: 'open',
      chosenIndex: null,
      chosenOption: '',
      chosenDescription: '',
      options: [
        { option: 'X', description: 'desc X', chosen: false },
        { option: 'Y', description: 'desc Y', chosen: false },
      ],
    });
    const noOthers = discussionQuestion({ topic: 'T', question: 'Q3?' });
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 3, resolvedCount: 2 })];
    const { manifest, input } = manifestWith({ questions: [withChosen, openWithOptions, noOthers], topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].detail).toMatchObject({
      label: '2 other options',
      options: [
        { number: 2, title: 'B', description: 'Option B' },
        { number: 3, title: 'C', description: 'Option C' },
      ],
    });
    expect(items[1].detail).toMatchObject({ label: '2 options offered' });
    expect(items[0].detail!.label).not.toContain('note');
    expect(items[2].detail).toBeNull();
  });

  it('note: notes → { label: "Note", segments }, an "Accepted gap:" sentence carries mark "Accepted gap" with the prefix stripped; no notes → note null', () => {
    const withNote = discussionQuestion({
      topic: 'T',
      question: 'Q1?',
      notes: 'First sentence here. Accepted gap: a known limitation.',
    });
    const withoutNote = discussionQuestion({ topic: 'T', question: 'Q2?' });
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 2, resolvedCount: 2 })];
    const { manifest, input } = manifestWith({ questions: [withNote, withoutNote], topics });
    const composed = composeDocumentLayout(manifest, input);
    const items = composed!.chapters[0].items!;
    expect(items[0].note).toEqual({
      label: 'Note',
      segments: [
        { text: 'First sentence here.', mark: null },
        { text: 'a known limitation.', mark: 'Accepted gap' },
      ],
    });
    expect(items[1].note).toBeNull();
  });

  it('accountsFor is the topic\'s group exactly when the topic is not leftover', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'Clean', question: 'Q1?' }),
      discussionQuestion({ topic: 'Leftover', question: 'Q1?' }),
    ];
    const topics: DiscussionTopic[] = [
      topic({ heading: 'Clean', questionCount: 1, resolvedCount: 1, leftover: false }),
      topic({ heading: 'Leftover', questionCount: 1, resolvedCount: 1, leftover: true }),
    ];
    const groups: DocumentSectionGroup[] = [
      group({ id: 'clean', heading: 'Clean', html: '<h2>Clean</h2>' }),
      group({ id: 'leftover', heading: 'Leftover', html: '<h2>Leftover</h2>' }),
    ];
    const { manifest, input } = manifestWith({ questions, topics }, groups);
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.also!.remainder.map((g) => g.heading)).toEqual(['Leftover']);
  });

  it('cover: headline value = decided count (items not Open), status "D of T decided"', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'T', question: 'Q1?' }),
      discussionQuestion({ topic: 'T', question: 'Q2?', resolution: 'open', chosenIndex: null }),
    ];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 2, resolvedCount: 1 })];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.cover.headline).toEqual({ value: '1', label: 'of 2 questions decided' });
    expect(composed!.cover.status).toMatchObject({ tone: 'in-flight' });

    const fullQuestions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const fullTopics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];
    const { manifest: manifest2, input: input2 } = manifestWith({ questions: fullQuestions, topics: fullTopics });
    const composed2 = composeDocumentLayout(manifest2, input2);
    expect(composed2!.cover.headline).toEqual({ value: '1', label: 'questions decided' });
    expect(composed2!.cover.status).toMatchObject({ tone: 'complete' });
  });

  it('cover facts: Discussed always present ("D of N offered areas"); Logged present only with a date', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];
    const { manifest, input } = manifestWith({ questions, topics, date: null, areasDiscussed: null, declinedAreas: [] });
    const composed = composeDocumentLayout(manifest, input);
    expect(composed!.cover.facts).toEqual([{ label: 'Discussed', value: '1 of 1 offered areas' }]);

    const { manifest: manifest2, input: input2 } = manifestWith({
      questions,
      topics,
      date: '2026-08-21',
      areasDiscussed: null,
      declinedAreas: [],
    });
    const composed2 = composeDocumentLayout(manifest2, input2);
    expect(composed2!.cover.facts).toEqual([
      { label: 'Logged', value: 'Aug 21, 2026' },
      { label: 'Discussed', value: '1 of 1 offered areas' },
    ]);
  });

  it('cover facts: Discussed total prefers declinedAreas.length, then declinedCount, then offeredCount, else discussed count', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];

    const withAreas = manifestWith({ questions, topics, date: null, areasDiscussed: ['T'], declinedAreas: ['A', 'B'] });
    expect(composeDocumentLayout(withAreas.manifest, withAreas.input)!.cover.facts).toContainEqual({
      label: 'Discussed',
      value: '1 of 3 offered areas',
    });

    const withCount = manifestWith({ questions, topics, date: null, areasDiscussed: ['T'], declinedAreas: [], declinedCount: 2 });
    expect(composeDocumentLayout(withCount.manifest, withCount.input)!.cover.facts).toContainEqual({
      label: 'Discussed',
      value: '1 of 3 offered areas',
    });

    const withOffered = manifestWith({ questions, topics, date: null, areasDiscussed: ['T'], declinedAreas: [], offeredCount: 5 });
    expect(composeDocumentLayout(withOffered.manifest, withOffered.input)!.cover.facts).toContainEqual({
      label: 'Discussed',
      value: '1 of 5 offered areas',
    });
  });

  it('cover: Topics pill = chapters.length, Left to Claude = Claude-chose item count', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'One', question: 'Q1?' }),
      discussionQuestion({ topic: 'Two', question: 'Q1?', resolution: 'claude', chosenIndex: null }),
    ];
    const topics: DiscussionTopic[] = [
      topic({ heading: 'One', questionCount: 1, resolvedCount: 1 }),
      topic({ heading: 'Two', questionCount: 1, resolvedCount: 1 }),
    ];
    const { manifest, input } = manifestWith({ questions, topics });
    const composed = composeDocumentLayout(manifest, input)!;
    expect(composed.cover.pills).toContainEqual({ value: '2', label: 'Topics' });
    expect(composed.cover.pills).toContainEqual({ value: '1', label: 'Left to Claude' });
  });

  it('cover glance prefers a Claude-chose question, jumping to its composed item id', () => {
    const questions: DiscussionQuestion[] = [
      discussionQuestion({ topic: 'T', question: 'Normal?' }),
      discussionQuestion({ topic: 'T', question: 'Left to Claude?', resolution: 'claude', chosenIndex: null, chosenOption: '', chosenDescription: '' }),
    ];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 2, resolvedCount: 2 })];
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
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];
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

  it('ghosts come from structured.declinedAreas, each "Not discussed"', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];
    const { manifest, input } = manifestWith({ questions, topics, declinedAreas: ['Structured-extraction depth', 'Path targeting'] });
    const composed = composeDocumentLayout(manifest, input)!;
    expect(composed.ghosts.map((g) => ({ title: g.title, label: g.label }))).toEqual([
      { title: 'Structured-extraction depth', label: 'Not discussed' },
      { title: 'Path targeting', label: 'Not discussed' },
    ]);
  });

  it('alsoStyle is "endnotes" — plan/verification keep the default fold', () => {
    const questions: DiscussionQuestion[] = [discussionQuestion({ topic: 'T', question: 'Q1?' })];
    const topics: DiscussionTopic[] = [topic({ heading: 'T', questionCount: 1, resolvedCount: 1 })];
    const discretionGroup = group({ id: 'discretion', heading: "Claude's Discretion", html: '<h2>D</h2><ul><li>x</li></ul>' });
    const { manifest, input } = manifestWith({ questions, topics }, [discretionGroup]);
    const composed = composeDocumentLayout(manifest, input)!;
    expect(composed.also).toMatchObject({ style: 'endnotes', title: ENDNOTES_TITLE });
  });

  it('ALSO_CHAPTER_TITLE is the shared "Also in this document" string; ENDNOTES_TITLE is "Endnotes"', () => {
    expect(ALSO_CHAPTER_TITLE).toBe('Also in this document');
    expect(ENDNOTES_TITLE).toBe('Endnotes');
  });
});
