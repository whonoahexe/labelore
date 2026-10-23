// The NOTE page's React surface (quick-261023-61l, sketch 028 A: annotated): an own head (eyebrow, noted
// day, the promoted chip, the shared warning chip, copy path, View / Source, then the one h1), the main
// column (a quick note's labelled clauses with a Lifted | As written toggle, or an explore note drawn as a
// document), the sticky margin (the todo card(s) or why there is none, then the files the note mentions or
// the explore note's contents) and the Also row.
// Every string derived from the document renders only through `ResearchInline` (tokenizeInline output
// mapped to React nodes) or as plain React text - never React's raw-HTML injection prop (T-61l-01); an
// explore note's body reaches the DOM only through the `renderHtml` callback the page supplies (the
// sanitized server render). File references are mono buttons that copy their path, never links, and no
// link target is built from document text: the only `Link` targets are urls the server's `noteContext`
// resolved (T-61l-06). Clause labels and the promoted and status chips carry the documented tones
// (complete, in-flight, quiet) from the composed model on `data-tone`; the todo card's status rides
// `data-status`, the weight marker `data-level`, the page shape `data-shape` and the title size
// `data-short` as identity marks, not tones, and the page never uses a parse-degradation tone.
// The Lifted | As written toggle, the highlighted reference and the Copied note live in component state
// only: nothing touches the URL, and the Copied timer is cleared on unmount.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CopyPathButton, copyText } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import type { NoteRun } from '../../planning-repo/handlers/note-lift.ts';
import { ResearchInline } from './research-briefing-components.tsx';
import { dropLeadingH1 } from './note-page.ts';
import type { ComposedNoteCard, ComposedNoteEmpty, ComposedNotePage } from './note-page.ts';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

interface RefState {
  selected: string | null;
  copied: string | null;
  onRef: (path: string) => void;
}

/** A note's runs: text through ResearchInline, a file reference as a copy button, an identifier as mono text. */
function Runs({ runs, refs }: { runs: NoteRun[]; refs: RefState }): React.JSX.Element {
  return (
    <>
      {runs.map((run, index) => {
        if (run.kind === 'file') {
          return (
            <button
              key={`${run.kind}-${index}`}
              type="button"
              className="view-note-ref"
              aria-pressed={refs.selected === run.text}
              title={refs.copied === run.text ? 'Copied' : `Copy ${run.text}`}
              onClick={() => refs.onRef(run.text)}
            >
              {run.text}
            </button>
          );
        }
        if (run.kind === 'ident') {
          return (
            <span key={`${run.kind}-${index}`} className="view-note-ident">
              {run.text}
            </span>
          );
        }
        return <ResearchInline key={`${run.kind}-${index}`} text={run.text} />;
      })}
    </>
  );
}

function TodoCard({ card }: { card: ComposedNoteCard }): React.JSX.Element {
  return (
    <article className="view-note-todo" data-status={card.statusKey}>
      <div className="view-note-todo-row">
        <span className="view-note-kicker">{card.kicker}</span>
        <span className="status-chip" data-tone={card.status.tone}>
          {card.status.label}
        </span>
        <span className="view-note-weight" data-level={card.weight.level} title={card.weight.title}>
          <i aria-hidden="true" />
          {card.weight.text}
        </span>
        {card.area !== null ? (
          <span className="status-chip" data-tone="quiet">
            {card.area}
          </span>
        ) : null}
      </div>
      <h3 className="view-note-todo-title">
        <ResearchInline text={card.title} />
      </h3>
      <span className="view-note-via">{card.via}</span>
      {card.resolution !== null ? (
        <p className="view-note-resolution">
          <ResearchInline text={card.resolution} />
        </p>
      ) : null}
      {card.batched.length > 0 ? (
        <div className="view-note-batched">
          <span className="view-note-kicker">Batched with</span>
          {card.batched.map((row, index) =>
            row.url !== null ? (
              <Link key={`${row.text}-${index}`} className="view-note-sibling" to={row.url}>
                {row.text}
              </Link>
            ) : (
              <span key={`${row.text}-${index}`} className="view-note-sibling">
                {row.text}
              </span>
            ),
          )}
        </div>
      ) : null}
      {card.url !== null ? (
        <Link className="view-note-open" to={card.url}>
          Open todo ↗
        </Link>
      ) : (
        <span className="view-note-open">Open todo ↗</span>
      )}
    </article>
  );
}

function EmptyCard({ empty }: { empty: ComposedNoteEmpty }): React.JSX.Element {
  return (
    <article className="view-note-todo" data-status="none">
      <span className="view-note-kicker">{empty.kicker}</span>
      <p className="view-note-none">
        <ResearchInline text={empty.text} />
      </p>
    </article>
  );
}

function AlsoRow({
  items,
  onShowSource,
}: {
  items: ComposedNotePage['also'];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <nav className="view-note-also" aria-label="Also in this file">
      <span className="view-note-key">Also in this file</span>
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

export interface NotePageViewProps {
  model: ComposedNotePage;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  /** The rendered document html (an explore note's body); empty for a quick note. */
  documentHtml: string;
  /** The page's sanitized server render of a document body. */
  renderHtml: (html: string) => React.ReactNode;
  chip: React.ReactNode;
}

export function NotePageView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  documentHtml,
  renderHtml,
  chip,
}: NotePageViewProps): React.JSX.Element {
  const [lifted, setLifted] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onRef(file: string): Promise<void> {
    setSelected((current) => (current === file ? null : file));
    if (!(await copyText(file))) return;
    setCopied(file);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(null), 1500);
  }
  const refs: RefState = { selected, copied, onRef: (file) => void onRef(file) };

  const { head, title, shape } = model;
  const documentTitle = title.text ?? fallbackTitle;
  const jumpTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  const cards =
    model.todos.length > 0
      ? model.todos.map((card, index) => <TodoCard key={`${card.url ?? card.title}-${index}`} card={card} />)
      : model.empty !== null
        ? <EmptyCard empty={model.empty} />
        : null;

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-note-page" data-shape={shape} aria-label={`${shape === 'quick' ? 'Note' : documentTitle} document`}>
        <header className="view-note-head">
          <div className="view-note-meta">
            <div className="view-note-meta-left">
              <p className="eyebrow">{head.eyebrow}</p>
              {head.noted !== null ? (
                <span className="view-note-date">
                  Noted <b>{head.noted.date}</b>
                  {head.noted.time !== null ? ` · ${head.noted.time}` : ''}
                </span>
              ) : null}
              {head.promoted !== null ? (
                <span className="status-chip" data-tone={head.promoted.tone}>
                  {head.promoted.label}
                </span>
              ) : null}
              {chip}
            </div>
            <div className="view-note-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          <h1 className="view-note-title" data-short={shape === 'quick' ? title.short : false}>
            {shape === 'quick' ? <Runs runs={title.runs} refs={refs} /> : <ResearchInline text={documentTitle} />}
          </h1>
          {model.lede !== null ? (
            <p className="view-note-lede">
              <ResearchInline text={model.lede} />
            </p>
          ) : null}
        </header>

        <div className="view-note-grid">
          <div className="view-note-main">
            {shape === 'quick' ? (
              <>
                {model.rows.length > 0 ? (
                  <div className="view-note-toggle" role="group" aria-label="Note view">
                    <button type="button" aria-pressed={lifted} onClick={() => setLifted(true)}>
                      Lifted
                    </button>
                    <button type="button" aria-pressed={!lifted} onClick={() => setLifted(false)}>
                      As written
                    </button>
                  </div>
                ) : null}
                {!lifted && model.verbatim !== null ? (
                  <p className="view-note-verbatim">
                    <Runs runs={model.verbatim.runs} refs={refs} />
                    {model.verbatim.capped ? '…' : ''}
                  </p>
                ) : model.rows.length > 0 ? (
                  <div className="view-note-clauses">
                    {model.rows.map((row, index) => (
                      <div key={`row-${index}`} className="view-note-clause">
                        <span className="view-note-gutter">
                          {row.then ? (
                            <span className="view-note-then">Then</span>
                          ) : (
                            <span className="view-note-label" data-tone={row.tone ?? undefined}>
                              {row.label}
                            </span>
                          )}
                        </span>
                        <p className="view-note-text">
                          <Runs runs={row.runs} refs={refs} />
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="view-note-whole">{model.whole}</p>
                )}
              </>
            ) : (
              <div className="view-note-doc">{renderHtml(dropLeadingH1(documentHtml))}</div>
            )}
          </div>

          <aside className="view-note-margin">
            {shape === 'document' && model.contents.length > 0 ? (
              <nav className="view-note-contents" aria-label="In this note">
                <span className="view-note-kicker">In this note · {model.contents.length}</span>
                {model.contents.map((entry, index) => (
                  <button key={`${entry.id}-${index}`} type="button" onClick={() => jumpTo(entry.id)}>
                    <ResearchInline text={entry.text} />
                  </button>
                ))}
              </nav>
            ) : null}
            {cards !== null ? <section className="view-note-section">{cards}</section> : null}
            {shape === 'quick' && model.mentions.length > 0 ? (
              <section className="view-note-section view-note-mentions">
                <span className="view-note-kicker">Mentions · {model.mentions.length}</span>
                {model.mentions.map((mention) => (
                  <button
                    key={mention.path}
                    type="button"
                    className="view-note-mention"
                    aria-pressed={selected === mention.path}
                    onClick={() => refs.onRef(mention.path)}
                  >
                    <span>{mention.path}</span>
                    {mention.count > 1 ? <span className="view-note-count">×{mention.count}</span> : null}
                    <span className="view-note-copied" aria-live="polite">
                      {copied === mention.path ? 'Copied' : ''}
                    </span>
                  </button>
                ))}
              </section>
            ) : null}
          </aside>
        </div>

        <AlsoRow items={model.also} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
