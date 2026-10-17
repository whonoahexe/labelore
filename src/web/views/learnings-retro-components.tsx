// The LEARNINGS page's React surface (quick-261017-k45, sketch 024 winner E): an own head (eyebrow,
// extraction date, project, the shared warning chip, copy path, View / Source, then the one h1, the
// one-sentence lede and the dashed note naming missing artifacts), the labelled source bar that filters
// every chapter to one artifact, the chapter tabs (one chapter at a time, each entry with its body on
// the left and a side note on the right) and the "Also in this file" chip row.
// Every string derived from the document renders only through `ResearchInline` / `ResearchBlocks`
// (tokenizeInline output mapped to React nodes) or as plain React text - never React's raw-HTML
// injection prop (T-k45-01) - and no link target is built from document text (T-k45-06). Source names
// and paths are mono text, never links. The four kinds ride `data-kind` as identity colours, not
// tones; the page writes no tone attribute and never uses a parse-degradation tone. States are
// `data-*` attributes (data-kind, data-bare) and aria attributes, never new class names. The picked
// source and the selected tab live in component state only: nothing touches the URL.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { chapterCounts, entriesFor, filterLine, pickTab } from './learnings-retro.ts';
import type { ComposedLearningsEntry, ComposedLearningsRetro, LearningsKind } from './learnings-retro.ts';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

function MissingNote({ names }: { names: string[] }): React.JSX.Element | null {
  if (names.length === 0) return null;
  return (
    <p className="view-learnings-missing">
      Extracted without{' '}
      {names.map((name, index) => (
        <span key={`${name}-${index}`}>
          <b>{name}</b>
          {index < names.length - 1 ? ', ' : ' '}
        </span>
      ))}
      — learnings from {names.length === 1 ? 'it' : 'them'} are not here.
    </p>
  );
}

function SourceBar({
  model,
  source,
  onPick,
}: {
  model: ComposedLearningsRetro;
  source: string | null;
  onPick: (artifact: string) => void;
}): React.JSX.Element | null {
  if (model.sources.length === 0) return null;
  const line = filterLine(model, source);
  return (
    <div className="view-learnings-trail">
      <span className="view-learnings-key">Where they came from · pick one to show only its learnings</span>
      <div className="view-learnings-bar">
        {model.sources.map((segment) => (
          <button
            key={segment.artifact}
            type="button"
            className="view-learnings-segment"
            style={{ flexGrow: segment.count }}
            aria-pressed={source === segment.artifact}
            title={segment.title}
            onClick={() => onPick(segment.artifact)}
          >
            <span>{segment.label}</span>
            <b>{segment.count}</b>
          </button>
        ))}
      </div>
      {line !== null && source !== null ? (
        <p className="view-learnings-filterline">
          Showing the {line.count} {line.count === 1 ? 'learning' : 'learnings'} from <b>{source}</b> ·{' '}
          <button type="button" className="view-learnings-link" onClick={() => onPick(source)}>
            Show all
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Entry({ entry }: { entry: ComposedLearningsEntry }): React.JSX.Element {
  const bare = entry.fields.length === 0 && entry.sources.length === 0 && entry.graduated === null;
  return (
    <article className="view-learnings-entry" data-kind={entry.kind} data-bare={bare ? 'true' : undefined}>
      <span className="view-learnings-no">{entry.no}</span>
      <div className="view-learnings-main">
        <h3>
          <ResearchInline text={entry.title} />
        </h3>
        {entry.body.length > 0 ? <ResearchBlocks blocks={entry.body} /> : null}
      </div>
      {bare ? null : (
        <aside className="view-learnings-side">
          {entry.fields.map((field, index) => (
            <div key={`${field.label}-${index}`} className="view-learnings-field">
              <span className="view-learnings-key">{field.label}</span>
              <ResearchBlocks blocks={field.blocks} />
            </div>
          ))}
          {entry.sources.length > 0 ? (
            <span className="view-learnings-source">
              From{' '}
              {entry.sources.map((source, index) => (
                <span key={`${source.artifact}-${index}`}>
                  {index > 0 ? ' · ' : ''}
                  <b>{source.label}</b>
                  {source.note !== null ? (
                    <>
                      {' ('}
                      <ResearchInline text={source.note} />
                      {')'}
                    </>
                  ) : null}
                </span>
              ))}
            </span>
          ) : null}
          {entry.graduated !== null ? (
            <span
              className="view-learnings-graduated"
              title={
                entry.graduated.date !== null
                  ? `Graduated to ${entry.graduated.target} on ${entry.graduated.date}`
                  : `Graduated to ${entry.graduated.target}`
              }
            >
              Graduated to {entry.graduated.target}
            </span>
          ) : null}
        </aside>
      )}
    </article>
  );
}

function AlsoRow({
  items,
  onShowSource,
}: {
  items: ComposedLearningsRetro['also'];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <nav className="view-learnings-also" aria-label="Also in this file">
      <span className="view-learnings-key">Also in this file</span>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <button type="button" className="status-chip" onClick={() => onShowSource(item.targetId)}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface LearningsRetroViewProps {
  model: ComposedLearningsRetro;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  chip: React.ReactNode;
  /** Static-markup tests only: the tab and source the view opens on. */
  initialTab?: LearningsKind | null;
  initialSource?: string | null;
}

const PANEL_ID = 'learnings-panel';

export function LearningsRetroView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
  initialTab = null,
  initialSource = null,
}: LearningsRetroViewProps): React.JSX.Element {
  const [wanted, setWanted] = useState<LearningsKind | null>(initialTab);
  const [source, setSource] = useState<string | null>(initialSource);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const frame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    },
    [],
  );

  // Picking a segment again clears the filter. When the tabs sit above the viewport they scroll back
  // into view instantly (no smooth scroll), landing below the sticky header.
  const onPick = useCallback((artifact: string): void => {
    setSource((current) => (current === artifact ? null : artifact));
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const tabs = tabsRef.current;
      if (tabs !== null && tabs.getBoundingClientRect().top < 0) tabs.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }, []);

  const { head, chapters } = model;
  const title = head.title ?? fallbackTitle;
  const counts = chapterCounts(model, source);
  const selected = pickTab(model, source, wanted);
  const chapter = chapters.find((c) => c.kind === selected) ?? null;
  const enabled = counts.filter((c) => c.shown > 0).map((c) => c.kind);

  const move = (kind: LearningsKind | undefined): void => {
    if (kind === undefined) return;
    setWanted(kind);
    tabRefs.current[kind]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (enabled.length === 0) return;
    const at = selected === null ? -1 : enabled.indexOf(selected);
    if (event.key === 'ArrowRight') move(enabled[(at + 1) % enabled.length]);
    else if (event.key === 'ArrowLeft') move(enabled[(at - 1 + enabled.length) % enabled.length]);
    else if (event.key === 'Home') move(enabled[0]);
    else if (event.key === 'End') move(enabled[enabled.length - 1]);
    else return;
    event.preventDefault();
  };

  const chapterCount = counts.find((c) => c.kind === selected);
  const entries = selected === null ? [] : entriesFor(model, selected, source);

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-learnings-page" aria-label={`${title} document`}>
        <header className="view-learnings-head">
          <div className="view-learnings-meta">
            <div className="view-learnings-meta-left">
              <p className="eyebrow">{head.eyebrow}</p>
              {head.extracted !== null ? (
                <span className="view-learnings-date">
                  Extracted <b>{head.extracted}</b>
                </span>
              ) : null}
              {head.project !== null ? <span className="view-learnings-date">{head.project}</span> : null}
              {chip}
            </div>
            <div className="view-learnings-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          <h1 className="view-learnings-title">
            <ResearchInline text={title} />
          </h1>
          <p className="view-learnings-lede">{model.lede}</p>
          <MissingNote names={head.missing} />
          <SourceBar model={model} source={source} onPick={onPick} />
        </header>

        <section className="view-learnings-chapters" aria-label="Learnings">
          <div
            ref={tabsRef}
            className="view-learnings-tabs"
            role="tablist"
            aria-label="Chapters"
            onKeyDown={onTabKeyDown}
          >
            {chapters.map((c) => {
              const count = counts.find((n) => n.kind === c.kind);
              const shown = count?.shown ?? 0;
              return (
                <button
                  key={c.kind}
                  ref={(node) => {
                    tabRefs.current[c.kind] = node;
                  }}
                  id={`learnings-tab-${c.kind}`}
                  type="button"
                  role="tab"
                  className="view-learnings-tab"
                  data-kind={c.kind}
                  aria-selected={selected === c.kind}
                  aria-controls={PANEL_ID}
                  tabIndex={selected === c.kind ? 0 : -1}
                  disabled={shown === 0}
                  onClick={() => setWanted(c.kind)}
                >
                  <span className="view-learnings-tab-no">{c.number}</span>
                  {c.title}
                  <b>{shown}</b>
                </button>
              );
            })}
          </div>
          <div
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={selected === null ? undefined : `learnings-tab-${selected}`}
          >
            {chapter !== null && entries.length > 0 ? (
              <section className="view-learnings-chapter" data-kind={chapter.kind}>
                <header className="view-learnings-chapter-head">
                  <span className="view-learnings-chapter-no">{chapter.number}</span>
                  <h2>{chapter.title}</h2>
                  <span className="view-learnings-key view-learnings-count">
                    {source !== null && chapterCount !== undefined
                      ? `${chapterCount.shown} of ${chapterCount.total}`
                      : (chapterCount?.total ?? entries.length)}
                  </span>
                </header>
                {entries.map((entry) => (
                  <Entry key={entry.no} entry={entry} />
                ))}
              </section>
            ) : (
              <p className="view-learnings-empty">Nothing from this artifact in any chapter.</p>
            )}
          </div>
        </section>

        <AlsoRow items={model.also} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
