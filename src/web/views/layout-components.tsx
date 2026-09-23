// sketch-004 B3 (quick-260922-3us), extended by quick-260923-jxp: the shared, kind-agnostic
// cover/chapter-bar/fold components — never names a kind, never imports DocumentView directly
// (html renders through the `renderHtml` prop artifact-page.tsx supplies, keeping DocumentCanvas
// the only raw-HTML sink, T-3us-01).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, StickyNote } from 'lucide-react';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { useActiveSection } from '../components/use-active-section.ts';
import {
  ALSO_CHAPTER_TITLE,
  chapterForTarget,
  type ComposedAlsoChapter,
  type ComposedChapter,
  type ComposedDocumentLayout,
  type ComposedItem,
  type CoverFact,
  type Tally,
} from './layout.ts';
import { REMAINDER_ID, REMAINDER_LABEL } from './manifest.ts';

// ---------------------------------------------------------------------------
// useChapterFolds — open/closed state, expand/collapse-all, and jump-to-target
// ---------------------------------------------------------------------------

export interface ChapterFolds {
  openChapters: ReadonlySet<string>;
  openItems: ReadonlySet<string>;
  /** quick-260923-jxp (JXP-06): open note ids — a separate set from `openItems`, so Expand
   * all/Collapse all and `jumpTo` never touch a note's own open/closed state. */
  openNotes: ReadonlySet<string>;
  toggleChapter(id: string): void;
  toggleItem(id: string): void;
  toggleNote(id: string): void;
  expandAll(): void;
  collapseAll(): void;
  allOpen: boolean;
  jumpTo(targetId: string): void;
}

function allChapterIds(layout: ComposedDocumentLayout | null): string[] {
  if (!layout) return [];
  const ids = layout.chapters.map((chapter) => chapter.id);
  if (layout.also) ids.push(layout.also.id);
  return ids;
}

/** quick-260923-jxp (JXP-07): the ids Expand all/Collapse all/allOpen operate over — every real
 * chapter, plus the Also chapter only when it is the folded ('fold') style. An endnotes-style Also
 * chapter is always open and never toggled, so it never enters this set (or a ghost row, which
 * never toggles at all). */
function expandableChapterIds(layout: ComposedDocumentLayout | null): string[] {
  if (!layout) return [];
  const ids = layout.chapters.map((chapter) => chapter.id);
  if (layout.also && layout.also.style === 'fold') ids.push(layout.also.id);
  return ids;
}

/** Deep links into folded content keep working: on the initial render, a `#fragment` in the URL
 * that resolves (via `chapterForTarget`) against `layout` pre-opens the matching chapter (and the
 * item's detail, for an item target) — never writes the URL itself. */
function initialOpenFromHash(layout: ComposedDocumentLayout | null): {
  chapters: Set<string>;
  items: Set<string>;
} {
  const chapters = new Set<string>();
  const items = new Set<string>();
  if (!layout || typeof window === 'undefined') return { chapters, items };
  const rawHash = window.location.hash.slice(1);
  if (!rawHash) return { chapters, items };
  let targetId: string;
  try {
    targetId = decodeURIComponent(rawHash);
  } catch {
    return { chapters, items };
  }
  const resolved = chapterForTarget(layout, targetId);
  if (!resolved) return { chapters, items };
  chapters.add(resolved.chapterId);
  if (resolved.itemId) items.add(resolved.itemId);
  return { chapters, items };
}

export function useChapterFolds(
  layout: ComposedDocumentLayout | null,
  options: { onRequireView: () => void },
): ChapterFolds {
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => initialOpenFromHash(layout).chapters,
  );
  const [openItems, setOpenItems] = useState<Set<string>>(() => initialOpenFromHash(layout).items);
  const [openNotes, setOpenNotes] = useState<Set<string>>(() => new Set());
  // react-hooks v7: never call setState synchronously from an effect body — the pending scroll
  // target lives in a ref, consumed by an effect keyed on a plain counter bump.
  const pendingScrollRef = useRef<{ chapterId: string; itemId: string | null } | null>(null);
  const [scrollTick, setScrollTick] = useState(0);

  const toggleChapter = useCallback((id: string) => {
    setOpenChapters((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setOpenItems((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleNote = useCallback((id: string) => {
    setOpenNotes((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ids = useMemo(() => expandableChapterIds(layout), [layout]);
  const allOpen = ids.length > 0 && ids.every((id) => openChapters.has(id));

  const expandAll = useCallback(() => setOpenChapters(new Set(ids)), [ids]);
  const collapseAll = useCallback(() => setOpenChapters(new Set()), []);

  const jumpTo = useCallback(
    (targetId: string) => {
      if (!layout) return;
      const resolved = chapterForTarget(layout, targetId);
      if (!resolved) return;
      options.onRequireView();
      setOpenChapters((previous) => {
        if (previous.has(resolved.chapterId)) return previous;
        const next = new Set(previous);
        next.add(resolved.chapterId);
        return next;
      });
      if (resolved.itemId) {
        const itemId = resolved.itemId;
        setOpenItems((previous) => {
          if (previous.has(itemId)) return previous;
          const next = new Set(previous);
          next.add(itemId);
          return next;
        });
      }
      pendingScrollRef.current = resolved;
      setScrollTick((tick) => tick + 1);
    },
    [layout, options],
  );

  useEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    pendingScrollRef.current = null;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    const raf = window.requestAnimationFrame(() => {
      if (pending.itemId) {
        const itemEl = document.getElementById(pending.itemId);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior, block: 'center' });
          itemEl.focus({ preventScroll: true });
          return;
        }
      }
      const chapterEl = document.getElementById(pending.chapterId);
      if (!chapterEl) return;
      chapterEl.scrollIntoView({ behavior, block: 'start' });
      // quick-260923-jxp: an endnotes-style Also chapter has no `.document-fold-head` to focus —
      // fall back to focusing the chapter element itself (it carries `tabIndex={-1}`).
      const foldHead = chapterEl.querySelector<HTMLButtonElement>('.document-fold-head');
      if (foldHead) foldHead.focus({ preventScroll: true });
      else chapterEl.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [scrollTick]);

  return {
    openChapters,
    openItems,
    openNotes,
    toggleChapter,
    toggleItem,
    toggleNote,
    expandAll,
    collapseAll,
    allOpen,
    jumpTo,
  };
}

// ---------------------------------------------------------------------------
// Cover pieces
// ---------------------------------------------------------------------------

export function CoverFacts({ facts }: { facts: CoverFact[] }): React.JSX.Element | null {
  if (facts.length === 0) return null;
  return (
    <p className="document-cover-facts">
      {facts.map((fact, index) => (
        <span key={`${fact.label}-${index}`}>
          {fact.label} <b>{fact.value}</b>
        </span>
      ))}
    </p>
  );
}

export function CoverStatusChip({ status }: { status: Tally | null }): React.JSX.Element | null {
  if (!status) return null;
  return (
    <span className="status-chip" data-tone={status.tone}>
      {status.label}
    </span>
  );
}

export function CoverCells({
  layout,
  onJump,
}: {
  layout: ComposedDocumentLayout;
  onJump: (targetId: string) => void;
}): React.JSX.Element {
  const { cover, chapters, also, ghosts } = layout;

  const headlineCell =
    cover.headline || cover.pills.length > 0 ? (
      <div className="document-cover-cell">
        <p className="eyebrow">At a glance</p>
        {cover.headline ? (
          <p className="document-cover-headline">
            <strong>{cover.headline.value}</strong>
            <span>{cover.headline.label}</span>
          </p>
        ) : null}
        {cover.pills.length > 0 ? (
          <div className="document-cover-pills">
            {cover.pills.map((pill, index) => (
              <span className="document-cover-pill" key={`${pill.label}-${index}`}>
                <strong>{pill.value}</strong> {pill.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ) : null;

  const glanceCell = cover.glance ? (
    <div className="document-cover-cell document-cover-glance">
      <p className="eyebrow">{cover.glance.eyebrow}</p>
      <h2>{cover.glance.title}</h2>
      {cover.glance.body ? <p>{cover.glance.body}</p> : null}
      <button type="button" className="text-link" onClick={() => onJump(cover.glance!.target)}>
        {cover.glance.action} →
      </button>
    </div>
  ) : null;

  // quick-260923-jxp (JXP-02/JXP-07): index order is chapters, then ghosts (non-interactive,
  // "Not discussed"), then the Also/Endnotes entry — titled from `also.title` so an endnotes-style
  // sheet reads "Endnotes" instead of "Also in this document".
  return (
    <div className="document-cover-cells" data-glance={cover.glance ? 'true' : 'false'}>
      {headlineCell}
      {glanceCell}
      <div className="document-cover-cell">
        <p className="eyebrow">In this document</p>
        <nav aria-label="Chapters">
          <ol className="document-chapter-index">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button type="button" onClick={() => onJump(chapter.id)}>
                  <span className="document-chapter-index-number">{chapter.number}</span>
                  <span className="document-chapter-index-title">{chapter.title}</span>
                  {chapter.count !== null ? (
                    <span className="document-chapter-index-count">{chapter.count}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {ghosts.map((ghost) => (
              <li key={ghost.id} data-ghost="true">
                <span className="document-chapter-index-number" aria-hidden="true">
                  –
                </span>
                <span className="document-chapter-index-title">{ghost.title}</span>
                <span className="status-chip" data-tone="quiet">
                  {ghost.label}
                </span>
              </li>
            ))}
            {also ? (
              <li key={also.id}>
                <button type="button" onClick={() => onJump(also.id)}>
                  <span className="document-chapter-index-number">{also.number}</span>
                  <span className="document-chapter-index-title">{also.title}</span>
                </button>
              </li>
            ) : null}
          </ol>
        </nav>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pinned chapter bar
// ---------------------------------------------------------------------------

export function ChapterBar({
  layout,
  title,
  mode,
  onModeChange,
}: {
  layout: ComposedDocumentLayout;
  title: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
}): React.JSX.Element | null {
  const [coverVisible, setCoverVisible] = useState(true);
  // The shell header has no fixed height (its own content — brand/nav/controls — sizes it), so a
  // guessed static offset drifts from the real value; measured once on mount and kept in sync via
  // ResizeObserver, with the CSS `top: var(--space-22)` rule as the pre-measurement/no-observer
  // fallback (same offset .document-outline-trigger already uses).
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const ids = useMemo(() => allChapterIds(layout), [layout]);
  const activeId = useActiveSection(ids);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.shell-header');
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const cover = document.getElementById('document-cover');
    if (!cover || typeof IntersectionObserver === 'undefined') return;
    const rootMargin = headerHeight !== null ? `-${Math.ceil(headerHeight)}px 0px 0px 0px` : '-88px 0px 0px 0px';
    const observer = new IntersectionObserver(([entry]) => setCoverVisible(entry.isIntersecting), {
      rootMargin,
    });
    observer.observe(cover);
    return () => observer.disconnect();
  }, [headerHeight]);

  if (coverVisible) return null;

  const allEntries: (ComposedChapter | ComposedAlsoChapter)[] = layout.also
    ? [...layout.chapters, layout.also]
    : layout.chapters;
  const active = allEntries.find((entry) => entry.id === activeId) ?? layout.chapters[0];
  const activeTitle = active.id === 'chapter-also' ? (layout.also?.title ?? ALSO_CHAPTER_TITLE) : (active as ComposedChapter).title;

  return (
    <div
      className="document-chapter-bar"
      role="region"
      aria-label="Current chapter"
      style={headerHeight !== null ? { top: `${headerHeight}px` } : undefined}
    >
      <span className="document-chapter-bar-number">{active.number}</span>
      <span className="document-chapter-bar-title">{activeTitle}</span>
      <span className="document-chapter-bar-doc">{title}</span>
      <DocumentViewToggle mode={mode} onChange={onModeChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folded chapters
// ---------------------------------------------------------------------------

function FoldRollup({ rollup }: { rollup: { text: string; tone: Tally['tone'] }[] }): React.JSX.Element | null {
  if (rollup.length === 0) return null;
  return (
    <span className="document-fold-rollup">
      {rollup.map((entry, index) => (
        <span className="status-chip" data-tone={entry.tone} key={index}>
          {entry.text}
        </span>
      ))}
    </span>
  );
}

function ItemRow({
  item,
  open,
  onToggle,
  noteOpen,
  onToggleNote,
  renderHtml,
}: {
  item: ComposedItem;
  open: boolean;
  onToggle: () => void;
  noteOpen: boolean;
  onToggleNote: () => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const noteId = `${item.id}-note`;
  return (
    <article className="document-item" id={item.id} tabIndex={-1}>
      <div className="document-item-head">
        <div>
          {item.ref ? <p className="document-item-ref">{item.ref}</p> : null}
          <h3 className="document-item-title">{item.title}</h3>
        </div>
        {item.chips && item.chips.length > 0 ? (
          <div className="document-item-chips">
            {item.chips.map((chip, index) => (
              <span className="status-chip" data-tone={chip.tone} key={index}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
        {item.note ? (
          <button
            type="button"
            className="document-item-note-toggle"
            aria-expanded={noteOpen}
            aria-controls={noteId}
            onClick={onToggleNote}
          >
            <StickyNote aria-hidden="true" />
            {item.note.label}
          </button>
        ) : null}
      </div>
      {item.answerCard ? (
        <div className="document-answer">
          {item.answerCard.option ? (
            <>
              <p className="document-answer-option">
                {item.answerCard.option.number !== null ? (
                  <span className="document-option-number">{item.answerCard.option.number}</span>
                ) : null}
                <span className="document-option-title">{item.answerCard.option.title}</span>
              </p>
              {item.answerCard.option.description ? (
                <p className="document-option-desc">{item.answerCard.option.description}</p>
              ) : null}
            </>
          ) : null}
          {item.answerCard.words ? (
            <p className="document-answer-words">
              <span className="document-item-detail-label">Your words</span>
              {item.answerCard.words}
            </p>
          ) : null}
          {item.state ? (
            <div className="document-item-state">
              <span className="status-chip" data-tone={item.state.tone}>
                {item.state.label}
              </span>
              {item.answerCard.qualifier ? (
                <span className="status-chip" data-tone="quiet">
                  {item.answerCard.qualifier}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : item.state ? (
        <div className="document-item-state">
          <span className="status-chip" data-tone={item.state.tone}>
            {item.state.label}
          </span>
          {item.answer ? <span className="document-item-answer">{item.answer}</span> : null}
        </div>
      ) : null}
      {item.detail ? (
        <div className="document-item-more">
          <button type="button" className="text-link" onClick={onToggle}>
            {open ? 'Hide' : item.detail.label}
          </button>
          {open ? (
            <div className="document-item-detail">
              {item.detail.options && item.detail.options.length > 0 ? (
                <ol className="document-option-list">
                  {item.detail.options.map((option, index) => (
                    <li className="document-option" key={index}>
                      {option.number !== null ? (
                        <span className="document-option-number">{option.number}</span>
                      ) : null}
                      <span className="document-option-title">{option.title}</span>
                      {option.description ? (
                        <span className="document-option-desc">{option.description}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
              {item.detail.rows?.map((row, index) => (
                <div className="document-item-detail-row" key={index}>
                  {row.label ? <span className="document-item-detail-label">{row.label}</span> : null}
                  <span>{row.text}</span>
                </div>
              ))}
              {item.detail.html ? renderHtml(item.detail.html) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {item.note && noteOpen ? (
        <div className="document-item-note" id={noteId}>
          {item.note.segments.map((segment, index) => (
            <span key={index}>
              {segment.mark ? <span className="document-item-note-mark">{segment.mark}</span> : null}
              {segment.text}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ChapterFold({
  chapter,
  open,
  onToggle,
  openItems,
  onToggleItem,
  openNotes,
  onToggleNote,
  renderHtml,
}: {
  chapter: ComposedChapter;
  open: boolean;
  onToggle: () => void;
  openItems: ReadonlySet<string>;
  onToggleItem: (id: string) => void;
  openNotes: ReadonlySet<string>;
  onToggleNote: (id: string) => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const bodyId = `${chapter.id}-body`;
  return (
    <section className="view-block document-fold" id={chapter.id} data-open={open}>
      <h2 className="document-fold-title">
        <button
          type="button"
          className="document-fold-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span className="document-fold-number">{chapter.number}</span>
          <span className="document-fold-name">{chapter.title}</span>
          <FoldRollup rollup={chapter.rollup} />
          <ChevronRight className="document-fold-chevron" aria-hidden="true" />
        </button>
      </h2>
      {open ? (
        <div className="document-fold-body" id={bodyId}>
          {chapter.items
            ? chapter.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  open={openItems.has(item.id)}
                  onToggle={() => onToggleItem(item.id)}
                  noteOpen={openNotes.has(`${item.id}-note`)}
                  onToggleNote={() => onToggleNote(`${item.id}-note`)}
                  renderHtml={renderHtml}
                />
              ))
            : chapter.html
              ? renderHtml(chapter.html)
              : null}
        </div>
      ) : null}
    </section>
  );
}

function AlsoFold({
  also,
  open,
  onToggle,
  renderHtml,
}: {
  also: ComposedAlsoChapter;
  open: boolean;
  onToggle: () => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const bodyId = `${also.id}-body`;
  const remainderHtml = useMemo(
    () => also.remainder.map((group) => group.html).join(''),
    [also.remainder],
  );
  return (
    <section className="view-block document-fold" id={also.id} data-open={open}>
      <h2 className="document-fold-title">
        <button
          type="button"
          className="document-fold-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span className="document-fold-number">{also.number}</span>
          <span className="document-fold-name">{also.title}</span>
          <FoldRollup rollup={also.rollup} />
          <ChevronRight className="document-fold-chevron" aria-hidden="true" />
        </button>
      </h2>
      {open ? (
        <div className="document-fold-body" id={bodyId}>
          <div className="document-also">
            {also.panels.map((panel) => (
              <section className="document-also-panel" id={panel.id} key={panel.id}>
                <p className="eyebrow">{panel.eyebrow}</p>
                {renderHtml(panel.html)}
              </section>
            ))}
          </div>
          {also.remainder.length > 0 ? (
            <details className="artifact-metadata" id={REMAINDER_ID}>
              <summary>
                {REMAINDER_LABEL}{' '}
                <span>
                  {also.remainder.length === 1 ? '1 section' : `${also.remainder.length} sections`}
                </span>
              </summary>
              {renderHtml(remainderHtml)}
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** quick-260923-jxp (JXP-07): the discussion-log's always-open back-matter sheet, replacing the
 * folded "Also in this document" chapter. Quieter typography, small-caps subsections, hanging
 * bullets — never folded, and its panels keep their original anchor ids so the cover glance and
 * chapter index still jump straight to them. */
function EndnotesSheet({
  also,
  renderHtml,
}: {
  also: ComposedAlsoChapter;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const remainderHtml = useMemo(
    () => also.remainder.map((group) => group.html).join(''),
    [also.remainder],
  );
  return (
    <section className="view-block document-endnotes" id={also.id} tabIndex={-1}>
      <h2 className="document-endnotes-title">{also.title}</h2>
      {also.panels.map((panel) => (
        <section className="document-endnote" id={panel.id} key={panel.id} tabIndex={-1}>
          <h3 className="document-endnote-title">{panel.heading}</h3>
          {renderHtml(panel.bodyHtml)}
        </section>
      ))}
      {also.remainder.length > 0 ? (
        <details className="artifact-metadata" id={REMAINDER_ID}>
          <summary>
            {REMAINDER_LABEL}{' '}
            <span>{also.remainder.length === 1 ? '1 section' : `${also.remainder.length} sections`}</span>
          </summary>
          {renderHtml(remainderHtml)}
        </details>
      ) : null}
    </section>
  );
}

export function FoldedChapters({
  layout,
  folds,
  renderHtml,
}: {
  layout: ComposedDocumentLayout;
  folds: ChapterFolds;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <div className="document-fold-tools">
        <button
          type="button"
          className="text-link"
          onClick={folds.allOpen ? folds.collapseAll : folds.expandAll}
        >
          {folds.allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {layout.chapters.map((chapter) => (
        <ChapterFold
          key={chapter.id}
          chapter={chapter}
          open={folds.openChapters.has(chapter.id)}
          onToggle={() => folds.toggleChapter(chapter.id)}
          openItems={folds.openItems}
          onToggleItem={folds.toggleItem}
          openNotes={folds.openNotes}
          onToggleNote={folds.toggleNote}
          renderHtml={renderHtml}
        />
      ))}
      {layout.ghosts.map((ghost) => (
        <div className="document-ghost" id={ghost.id} key={ghost.id}>
          <span className="document-fold-number" aria-hidden="true">
            –
          </span>
          <span className="document-ghost-name">{ghost.title}</span>
          <span className="status-chip" data-tone="quiet">
            {ghost.label}
          </span>
        </div>
      ))}
      {layout.also
        ? (() => {
            const also = layout.also;
            return also.style === 'endnotes' ? (
              <EndnotesSheet also={also} renderHtml={renderHtml} />
            ) : (
              <AlsoFold
                also={also}
                open={folds.openChapters.has(also.id)}
                onToggle={() => folds.toggleChapter(also.id)}
                renderHtml={renderHtml}
              />
            );
          })()
        : null}
    </>
  );
}
