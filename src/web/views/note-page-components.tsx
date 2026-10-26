// The NOTE page's React surface (quick-261023-61l, sketch 028 A: annotated; quick-261023-u13, sketch 029 A:
// gist console): a console with a rail beside the main column. The rail (`header.view-note-rail`) holds the
// eyebrow, the one h1 (a quick note's title made from its file name, an explore note's title), the
// where-it-went stage chip with the shared warning chip, one big number, the stat list, the todo card(s)
// or why there is none, and the page tools (copy path, View / Source). The main column opens on the gist
// said large, then a Lifted | As written toggle and a ledger: "What it says" (one numbered row per lifted
// clause) for a quick note, a "Where it went" ledger for a one-liner, or "Section by section" for an
// explore note, whose rows open the section in place with Read + / Fold -. Mentions and the Also row close
// the page.
// Every string derived from the document renders only through `ResearchInline` (tokenizeInline output
// mapped to React nodes) or as plain React text - never React's raw-HTML injection prop (T-61l-01,
// T-u13-01); an explore note's body, and an opened section, reach the DOM only through the `renderHtml`
// callback the page supplies (the sanitized server render), fed only `dropLeadingH1(...)` or
// `sectionHtml(...)` output. File references are mono buttons that copy their path, never links, and no
// link target is built from document text: the only `Link` targets are urls the server's `noteContext`
// resolved (T-61l-06). Labels, stat values and the status chips carry the documented tones (complete,
// in-flight, missing, quiet) from the composed model on `data-tone`; the stage chip and the big number's bar
// ride `data-stage`, the todo card's status `data-status`, the weight marker `data-level` and the page shape
// `data-shape` as identity marks, not tones, and the page never uses a parse-degradation tone.
// The Lifted | As written toggle, the opened sections, the highlighted reference and the Copied note live in
// component state only: nothing touches the URL, and the Copied timer is cleared on unmount.
import { useEffect, useRef, useState } from 'react';
import { Link } from '../nav.tsx';
import { CopyPathButton, copyText } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import type { NoteRun } from '../../planning-repo/handlers/note-lift.ts';
import { ResearchInline } from './research-briefing-components.tsx';
import { dropLeadingH1, sectionHtml } from './note-page.ts';
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
  /** The rendered document html (read for an explore note's sections and its As written body). */
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
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
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
  const toggleOpen = (index: string): void => {
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const { rail, gist, shape } = model;
  const documentTitle = rail.title ?? fallbackTitle;
  const cards =
    model.todos.length > 0
      ? model.todos.map((card, index) => <TodoCard key={`${card.url ?? card.title}-${index}`} card={card} />)
      : model.empty !== null
        ? <EmptyCard empty={model.empty} />
        : null;

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-note-page" data-shape={shape} aria-label={`${shape === 'quick' ? 'Note' : documentTitle} document`}>
        <div className="view-note-console">
          <header className="view-note-rail">
            <p className="eyebrow">{rail.eyebrow}</p>
            <h1 className="view-note-title">{shape === 'quick' ? documentTitle : <ResearchInline text={documentTitle} />}</h1>
            {rail.context !== null ? (
              <p className="view-note-context">
                <ResearchInline text={rail.context} />
              </p>
            ) : null}
            <div className="view-note-stage-row">
              <span className="view-note-stage" data-stage={rail.stage.key}>
                <i aria-hidden="true" />
                {rail.stage.text}
              </span>
              {chip}
            </div>
            <div className="view-note-big" data-stage={rail.big.stage}>
              <i className="view-note-bar" aria-hidden="true" />
              <div>
                <b>{rail.big.value}</b>
                <p className="view-note-big-label">{rail.big.label}</p>
                <p className="view-note-big-sub">{rail.big.sub}</p>
              </div>
            </div>
            <dl className="view-note-stats">
              {rail.stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd data-tone={stat.tone ?? undefined}>{stat.value}</dd>
                </div>
              ))}
            </dl>
            {model.cardsInRail && cards !== null ? <section className="view-note-section">{cards}</section> : null}
            <div className="view-note-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </header>

          <div className="view-note-main">
            {gist.runs.length > 0 || gist.text !== null ? (
              <section className="view-note-gist">
                <span className="view-note-kicker">The gist</span>
                <p className="view-note-say" data-long={gist.long ? 'true' : 'false'}>
                  {shape === 'quick' ? <Runs runs={gist.runs} refs={refs} /> : <ResearchInline text={gist.text ?? ''} />}
                </p>
                {gist.line !== null ? (
                  <p className="view-note-line">{shape === 'quick' ? gist.line : <ResearchInline text={gist.line} />}</p>
                ) : null}
              </section>
            ) : null}

            {model.toggle ? (
              <div className="view-note-toggle" role="group" aria-label="Note view">
                <button type="button" aria-pressed={lifted} onClick={() => setLifted(true)}>
                  Lifted
                </button>
                <button type="button" aria-pressed={!lifted} onClick={() => setLifted(false)}>
                  As written
                </button>
              </div>
            ) : null}

            {shape === 'quick' ? (
              !lifted && model.verbatim !== null ? (
                <p className="view-note-verbatim">
                  <Runs runs={model.verbatim.runs} refs={refs} />
                  {model.verbatim.capped ? '…' : ''}
                </p>
              ) : model.ledger !== null ? (
                <section className="view-note-ledger">
                  <header className="view-note-ledger-head">
                    <h2>{model.ledger.title}</h2>
                    <span className="view-note-kicker">{model.ledger.kicker}</span>
                  </header>
                  {model.rows.map((row) => (
                    <div key={`row-${row.index}`} className="view-note-row" data-tone={row.mark ?? undefined}>
                      <span className="view-note-index">{row.index}</span>
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
                        <span className="view-note-first">
                          <Runs runs={row.first} refs={refs} />
                        </span>
                        {row.rest.length > 0 ? (
                          <>
                            {' '}
                            <Runs runs={row.rest} refs={refs} />
                          </>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </section>
              ) : model.oneLine !== null ? (
                <>
                  <p className="view-note-whole">{model.oneLine.whole}</p>
                  <section className="view-note-ledger">
                    <header className="view-note-ledger-head">
                      <h2>Where it went</h2>
                      <span className="view-note-kicker">{model.oneLine.kicker}</span>
                    </header>
                    <div className="view-note-went">{cards}</div>
                  </section>
                </>
              ) : null
            ) : !lifted ? (
              <div className="view-note-doc">{renderHtml(dropLeadingH1(documentHtml))}</div>
            ) : model.ledger !== null ? (
              <section className="view-note-ledger">
                <header className="view-note-ledger-head">
                  <h2>{model.ledger.title}</h2>
                  <span className="view-note-kicker">{model.ledger.kicker}</span>
                </header>
                {model.parts.map((part) => {
                  const { id } = part;
                  const open = id !== null && opened.has(part.index);
                  return (
                    <article key={`part-${part.index}`} className="view-note-part" data-open={open ? 'true' : 'false'}>
                      <span className="view-note-index">{part.index}</span>
                      <div className="view-note-part-body">
                        <h3 className="view-note-part-title">
                          <ResearchInline text={part.heading} />
                        </h3>
                        {part.key !== null ? (
                          <p className="view-note-part-key">
                            <ResearchInline text={part.key} />
                          </p>
                        ) : null}
                        {!open && part.items.length > 0 ? (
                          <ul className="view-note-items">
                            {part.items.map((item, index) => (
                              <li key={`item-${index}`}>
                                {item.term !== null ? (
                                  <>
                                    <b className="view-note-term">
                                      <ResearchInline text={item.term} />
                                    </b>
                                    <span>
                                      <ResearchInline text={item.text} />
                                    </span>
                                  </>
                                ) : (
                                  <span className="view-note-item-whole">
                                    <ResearchInline text={item.text} />
                                  </span>
                                )}
                              </li>
                            ))}
                            {part.more > 0 ? <li className="view-note-more">+{part.more} more</li> : null}
                          </ul>
                        ) : null}
                        {!open && part.flags.length > 0 ? (
                          <div className="view-note-flags">
                            {part.flags.map((flag, index) => (
                              <p key={`flag-${index}`}>
                                <span className="view-note-label" data-tone={flag.tone}>
                                  {flag.label}
                                </span>
                                <span>{flag.text}</span>
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {!open && part.figures.length > 0 ? (
                          <div className="view-note-figures">
                            {part.figures.map((figure, index) => (
                              <span key={`figure-${index}`} className="view-note-figure" title={figure.phrase}>
                                {figure.value}
                                <span>{figure.unit}</span>
                              </span>
                            ))}
                            {part.moreFigures > 0 ? (
                              <span className="view-note-figure">
                                <span>+{part.moreFigures}</span>
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="view-note-side">
                        {part.side.map((entry, index) => (
                          <span key={`side-${index}`}>{entry}</span>
                        ))}
                        {id !== null ? (
                          <button type="button" className="view-note-read" aria-expanded={open} onClick={() => toggleOpen(part.index)}>
                            {open ? 'Fold –' : 'Read +'}
                          </button>
                        ) : null}
                      </div>
                      {open && id !== null ? <div className="view-note-full">{renderHtml(sectionHtml(documentHtml, id))}</div> : null}
                    </article>
                  );
                })}
              </section>
            ) : null}

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
          </div>
        </div>

        <AlsoRow items={model.also} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
