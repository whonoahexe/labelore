// The CONTEXT brief's React surface (quick-260923-lju, sketch-006 D1): hero, out-strip, boundary
// notes, the amber open-questions panel, unrecognised-section extras, the continuous decision
// register, the discretion panel, the ideas panels, and — closing the brief (quick-260925-3ob) —
// the quiet back-matter rows: requirement amendments, canonical references, existing code
// insights, each collapsed and muted.
// Every markdown-derived string renders only through `Inline` (tokenizeInline output mapped to
// React text/code/strong/em nodes) — never `dangerouslySetInnerHTML` (T-lju-01). Whole-section
// HTML (extras, More) still goes through the existing sanitized `renderHtml` callback, unchanged.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { InlineToken } from './inline-markdown.ts';
import { tokenizeInline } from './inline-markdown.ts';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  ComposedArea,
  ComposedAreaEntry,
  ComposedAside,
  ComposedContextBrief,
  ComposedIntro,
  ComposedOpenQuestionRow,
} from './context-brief.ts';
import { stripLeadingHeading } from './document-sections.ts';

// ---------------------------------------------------------------------------
// Inline rendering
// ---------------------------------------------------------------------------

/** Renders `text` as tokenized inline markdown — the only path any brief string reaches the DOM
 * through (T-lju-01). A ref token becomes a jump button only when `refTargets` resolves it and
 * `interactive` allows it; otherwise it renders as plain text (never nested inside another
 * button). */
function Inline({
  text,
  refTargets,
  onJump,
  interactive = true,
}: {
  text: string;
  refTargets: Record<string, string>;
  onJump?: (id: string) => void;
  interactive?: boolean;
}): React.JSX.Element {
  const tokens = tokenizeInline(text);
  return <InlineWithRefs tokens={tokens} refTargets={refTargets} onJump={onJump} interactive={interactive} />;
}

function InlineWithRefs({
  tokens,
  refTargets,
  onJump,
  interactive,
}: {
  tokens: InlineToken[];
  refTargets: Record<string, string>;
  onJump?: (id: string) => void;
  interactive: boolean;
}): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'ref') {
          const targetId = refTargets[token.value];
          if (interactive && targetId && onJump) {
            return (
              <button
                key={key}
                type="button"
                className="view-context-ref"
                onClick={() => onJump(targetId)}
              >
                {token.value}
              </button>
            );
          }
          return <span key={key}>{token.value}</span>;
        }
        if (token.type === 'strong') {
          return (
            <strong key={key}>
              <InlineWithRefs tokens={token.value} refTargets={refTargets} onJump={onJump} interactive={false} />
            </strong>
          );
        }
        if (token.type === 'em') {
          return (
            <em key={key}>
              <InlineWithRefs tokens={token.value} refTargets={refTargets} onJump={onJump} interactive={false} />
            </em>
          );
        }
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// BlockList — paragraph / list / table / code
// ---------------------------------------------------------------------------

function BlockList({
  blocks,
  refTargets,
  onJump,
}: {
  blocks: Block[];
  refTargets: Record<string, string>;
  onJump?: (id: string) => void;
}): React.JSX.Element {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.kind === 'paragraph') {
          return (
            <p key={key} className="view-context-block-text">
              <Inline text={block.text} refTargets={refTargets} onJump={onJump} />
            </p>
          );
        }
        if (block.kind === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={key} className="view-context-block-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} refTargets={refTargets} onJump={onJump} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.kind === 'table') {
          const headers = block.rows.length > 0 ? Object.keys(block.rows[0]) : [];
          return (
            <div key={key} className="document-overflow-boundary">
              <table>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {headers.map((h) => (
                        <td key={h}>
                          <Inline text={row[h] ?? ''} refTargets={refTargets} onJump={onJump} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <pre key={key}>
            <code>{block.text}</code>
          </pre>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// useContextBrief — open-id set, toggle, jump (mirrors useChapterFolds' pending-scroll pattern)
/** In-list items are mid-sentence fragments ("login/logout", "the X seam swap"); capitalise a
 * leading lowercase letter so the list reads as items. A leading code span or link is left alone —
 * identifiers keep their case. */
function capitalizeItem(text: string): string {
  return text.replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------

export interface ContextBriefInteraction {
  isOpen(id: string): boolean;
  toggle(id: string): void;
  jumpTo(id: string, options?: { open?: boolean }): void;
}

function initialOpenFromHash(): Set<string> {
  const open = new Set<string>();
  if (typeof window === 'undefined') return open;
  const rawHash = window.location.hash.slice(1);
  if (!rawHash) return open;
  try {
    open.add(decodeURIComponent(rawHash));
  } catch {
    // A malformed fragment names nothing real — safely ignored.
  }
  return open;
}

export function useContextBrief(): ContextBriefInteraction {
  const [openIds, setOpenIds] = useState<Set<string>>(() => initialOpenFromHash());
  const pendingScrollRef = useRef<string | null>(null);
  const [scrollTick, setScrollTick] = useState(0);

  const isOpen = useCallback((id: string) => openIds.has(id), [openIds]);

  const toggle = useCallback((id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const jumpTo = useCallback((id: string, options?: { open?: boolean }) => {
    if (options?.open !== false) {
      setOpenIds((previous) => {
        if (previous.has(id)) return previous;
        const next = new Set(previous);
        next.add(id);
        return next;
      });
    }
    pendingScrollRef.current = id;
    setScrollTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    pendingScrollRef.current = null;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    const raf = window.requestAnimationFrame(() => {
      const el = document.getElementById(pending);
      if (!el) return;
      el.scrollIntoView({ behavior, block: 'center' });
      el.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [scrollTick]);

  return { isOpen, toggle, jumpTo };
}

// ---------------------------------------------------------------------------
// Intro meta
// ---------------------------------------------------------------------------

export function ContextIntroMeta({ intro }: { intro: ComposedIntro }): React.JSX.Element {
  return (
    <>
      {intro.status ? (
        <span className="status-chip" data-tone={intro.status.tone}>
          {intro.status.label}
        </span>
      ) : null}
      {intro.covers ? <span className="source-note">Covers {intro.covers}</span> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// ContextBriefView
// ---------------------------------------------------------------------------

function DecisionRow({
  entry,
  refTargets,
  interaction,
}: {
  entry: Extract<ComposedAreaEntry, { kind: 'decision' }>;
  refTargets: Record<string, string>;
  interaction: ContextBriefInteraction;
}): React.JSX.Element {
  const { decision } = entry;
  const open = interaction.isOpen(decision.id);
  return (
    <div className="view-context-decision" id={decision.id} tabIndex={-1}>
      <span className="view-context-tag">{decision.tag ?? '·'}</span>
      {decision.expandable ? (
        <button
          type="button"
          className="view-context-summary"
          aria-expanded={open}
          aria-controls={`${decision.id}-detail`}
          onClick={() => interaction.toggle(decision.id)}
        >
          <Inline text={decision.summary} refTargets={refTargets} interactive={false} />
        </button>
      ) : (
        <span className="view-context-summary">
          <Inline text={decision.summary} refTargets={refTargets} onJump={interaction.jumpTo} />
        </span>
      )}
      <span className="view-context-chips">
        {decision.openChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="status-chip"
            data-tone="in-flight"
            onClick={() => interaction.jumpTo(chip.id)}
          >
            {chip.tag}
          </button>
        ))}
        {decision.reversibility ? (
          <span className="status-chip" data-tone={decision.reversibility.hardToUndo ? undefined : 'quiet'}>
            {decision.reversibility.word}
          </span>
        ) : null}
      </span>
      {open ? (
        <div className="view-context-detail" id={`${decision.id}-detail`}>
          {decision.detail ? (
            <p>
              <Inline text={decision.detail} refTargets={refTargets} onJump={interaction.jumpTo} />
            </p>
          ) : null}
          {decision.reversibility ? (
            <p className="view-context-reversibility">
              <b>Reversibility</b>{' '}
              <Inline text={decision.reversibility.text} refTargets={refTargets} onJump={interaction.jumpTo} />
            </p>
          ) : null}
        </div>
      ) : null}
      {decision.claudeNotes.map((note) => (
        <div className="view-context-claude-note" key={note.id}>
          <span className="view-context-claude-label">Claude decides</span>
          <Inline text={note.text} refTargets={refTargets} onJump={interaction.jumpTo} />
        </div>
      ))}
    </div>
  );
}

function AreaBlock({
  area,
  refTargets,
  interaction,
}: {
  area: ComposedArea;
  refTargets: Record<string, string>;
  interaction: ContextBriefInteraction;
}): React.JSX.Element {
  return (
    <div className="view-context-area">
      <header className="view-context-area-head">
        <h3>{area.title}</h3>
        <span className="view-context-chips">
          <span className="status-chip" data-tone="quiet">
            {area.lockedCount === 1 ? '1 locked' : `${area.lockedCount} locked`}
          </span>
          {area.openCount > 0 ? (
            <span className="status-chip" data-tone="in-flight">
              {area.openCount === 1 ? '1 open' : `${area.openCount} open`}
            </span>
          ) : null}
        </span>
      </header>
      <div className="view-context-area-body">
        {area.entries.map((entry, index) =>
          entry.kind === 'note' ? (
            <p className="view-context-note" key={`note-${index}`}>
              <Inline text={entry.text} refTargets={refTargets} onJump={interaction.jumpTo} />
            </p>
          ) : (
            <DecisionRow key={entry.decision.id} entry={entry} refTargets={refTargets} interaction={interaction} />
          ),
        )}
      </div>
    </div>
  );
}

function OpenQuestionRowView({
  row,
  refTargets,
  interaction,
}: {
  row: ComposedOpenQuestionRow;
  refTargets: Record<string, string>;
  interaction: ContextBriefInteraction;
}): React.JSX.Element {
  const open = interaction.isOpen(row.id);
  return (
    <li id={row.id} tabIndex={-1}>
      <span className="view-context-tag">{row.label}</span>
      {row.expandable ? (
        <button
          type="button"
          className="view-context-question"
          aria-expanded={open}
          onClick={() => interaction.toggle(row.id)}
        >
          <Inline text={row.summary} refTargets={refTargets} interactive={false} />
        </button>
      ) : (
        <span className="view-context-question">
          <Inline text={row.summary} refTargets={refTargets} interactive={false} />
        </span>
      )}
      <span className="view-context-chips">
        {row.blocks.length > 0 ? (
          row.blocks.map((b) => (
            <button
              key={b.id}
              type="button"
              className="status-chip"
              data-tone="in-flight"
              onClick={() => interaction.jumpTo(b.id)}
            >
              blocks {b.tag}
            </button>
          ))
        ) : row.tag ? (
          <span className="status-chip" data-tone="quiet">
            unattached
          </span>
        ) : null}
      </span>
      {open && row.detail ? (
        <p className="view-context-why">
          <Inline text={row.detail} refTargets={refTargets} onJump={interaction.jumpTo} />
        </p>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// ContextAsides — quiet back-matter rows (amendments, references, code) (quick-260925-3ob)
// ---------------------------------------------------------------------------

function ContextAsides({
  asides,
  refTargets,
  interaction,
}: {
  asides: ComposedAside[];
  refTargets: Record<string, string>;
  interaction: ContextBriefInteraction;
}): React.JSX.Element | null {
  if (asides.length === 0) return null;
  return (
    <section className="view-block view-context-asides" aria-label="Supporting material">
      {asides.map((aside) => {
        const open = interaction.isOpen(aside.id);
        return (
          <div key={aside.id} className="view-context-aside" id={aside.id} tabIndex={-1} data-kind={aside.kind}>
            <button
              type="button"
              className="view-context-aside-toggle"
              aria-expanded={open}
              aria-controls={`${aside.id}-body`}
              onClick={() => interaction.toggle(aside.id)}
            >
              <ChevronRight className="view-context-aside-chevron" aria-hidden="true" />
              <span className="view-context-aside-label">
                <Inline text={aside.label} refTargets={refTargets} interactive={false} />
              </span>
              {aside.count > 0 ? <span className="view-context-aside-count">{aside.count}</span> : null}
              {aside.hint !== null ? <span className="view-context-aside-hint">{aside.hint}</span> : null}
            </button>
            {open ? (
              <div className="view-context-aside-body" id={`${aside.id}-body`}>
                {aside.groups.map((group, index) => (
                  <div className="view-context-aside-group" key={index}>
                    {group.title !== null ? (
                      <p className="view-context-aside-group-title">
                        <Inline text={group.title} refTargets={refTargets} interactive={false} />
                      </p>
                    ) : null}
                    <BlockList blocks={group.blocks} refTargets={refTargets} onJump={interaction.jumpTo} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

export function ContextBriefView({
  brief,
  renderHtml,
}: {
  brief: ComposedContextBrief;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const interaction = useContextBrief();
  const { refTargets } = brief;

  return (
    <>
      {brief.boundary ? (
        <section id="context-boundary" className="view-block position-hero view-context-hero">
          <div className="view-context-hero-left">
            <p className="eyebrow">{brief.boundary.eyebrow}</p>
            {brief.boundary.statement ? (
              <p className="view-context-statement">
                <Inline text={brief.boundary.statement} refTargets={refTargets} onJump={interaction.jumpTo} />
              </p>
            ) : null}
            {brief.boundary.inList.length > 0 ? (
              <div className="view-context-rest">
                <BlockList blocks={brief.boundary.restBlocks} refTargets={refTargets} onJump={interaction.jumpTo} />
              </div>
            ) : null}
            {brief.stats.length > 0 ? (
              <div className="view-context-stats">
                {brief.stats.map((stat) => (
                  <button
                    key={stat.id}
                    type="button"
                    className={
                      stat.open ? 'view-context-stat view-context-stat-open' : 'view-context-stat'
                    }
                    onClick={() => interaction.jumpTo(stat.target)}
                  >
                    <strong>{stat.count}</strong> {stat.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Scope (P-2/P-3): In and Out side by side in one block, so the pair reads as one
          boundary and each out item keeps its destination next to its text. */}
      {brief.boundary ? (
        <section className="view-block view-context-scope">
          <div className="view-context-in">
            <p className="view-context-scope-label">
              In this phase
              {brief.boundary.inList.length > 0 ? (
                <span className="view-context-scope-count">{brief.boundary.inList.length}</span>
              ) : null}
            </p>
            {brief.boundary.inList.length > 0 ? (
              <ul>
                {brief.boundary.inList.map((item, index) => (
                  <li key={index}>
                    {/* One wrapper, so the li's two-column grid (check, text) gets exactly two
                        items — Inline emits one node per text/code fragment. */}
                    <span>
                      <Inline text={capitalizeItem(item)} refTargets={refTargets} onJump={interaction.jumpTo} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="view-context-rest">
                <BlockList blocks={brief.boundary.restBlocks} refTargets={refTargets} onJump={interaction.jumpTo} />
              </div>
            )}
          </div>
          {brief.boundary.outItems.length > 0 ? (
            <div className="view-context-out">
              <p className="view-context-scope-label">
                Not in this phase
                <span className="view-context-scope-count">{brief.boundary.outItems.length}</span>
              </p>
              <ul>
                {brief.boundary.outItems.map((item, index) => (
                  <li key={index}>
                    {/* One wrapper: the li is a mark/body grid, and Inline emits one node per
                        text/code fragment. */}
                    <span>
                      <Inline text={item.text} refTargets={refTargets} onJump={interaction.jumpTo} />
                      {item.dest ? <span className="view-context-dest">→ {item.dest}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {brief.boundary.drift ? (
                <p className="view-context-drift">Do not drift into these.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {brief.boundaryNotes.length > 0 ? (
        <section className="view-block view-context-boundary-notes">
          {brief.boundaryNotes.map((note) => (
            <div key={note.id}>
              {note.title ? <h3>{note.title}</h3> : null}
              <BlockList blocks={note.blocks} refTargets={refTargets} onJump={interaction.jumpTo} />
            </div>
          ))}
        </section>
      ) : null}

      {brief.openPanel ? (
        <section id="context-open" className="view-block attention-panel view-context-open">
          <p className="eyebrow">Open for the researcher</p>
          {brief.openPanel.lead.length > 0 ? (
            <div className="source-note">
              <BlockList blocks={brief.openPanel.lead} refTargets={refTargets} onJump={interaction.jumpTo} />
            </div>
          ) : null}
          <ol className="view-context-open-list">
            {brief.openPanel.rows.map((row) => (
              <OpenQuestionRowView key={row.id} row={row} refTargets={refTargets} interaction={interaction} />
            ))}
          </ol>
        </section>
      ) : null}

      {brief.extras.map((group, index) => (
        <section className="view-block view-context-extra" key={`extra-${index}`}>
          <header className="section-heading compact">
            <h2>{group.heading}</h2>
          </header>
          {renderHtml(stripLeadingHeading(group.html))}
        </section>
      ))}

      {brief.areas.length > 0 ? (
        <section id="context-decisions" className="view-block view-context-register">
          <header className="section-heading compact">
            <h2>Decisions</h2>
            <span>{brief.decisionCount}</span>
          </header>
          {brief.decisionsPreamble.length > 0 ? (
            <BlockList blocks={brief.decisionsPreamble} refTargets={refTargets} onJump={interaction.jumpTo} />
          ) : null}
          {brief.areas.map((area) => (
            <AreaBlock key={area.id} area={area} refTargets={refTargets} interaction={interaction} />
          ))}
        </section>
      ) : null}

      {brief.discretionPanel && brief.discretionPanel.loose.length > 0 ? (
        <section id="context-discretion" className="view-block preview-panel view-context-discretion">
          <p className="eyebrow">Also left to Claude</p>
          {brief.discretionPanel.lead.length > 0 ? (
            <div className="source-note">
              <BlockList blocks={brief.discretionPanel.lead} refTargets={refTargets} onJump={interaction.jumpTo} />
            </div>
          ) : null}
          <ul className="view-context-leftover">
            {brief.discretionPanel.loose.map((item, index) => (
              <li key={index}>
                <Inline text={item} refTargets={refTargets} onJump={interaction.jumpTo} />
              </li>
            ))}
          </ul>
          {brief.discretionPanel.trailer.length > 0 ? (
            <BlockList blocks={brief.discretionPanel.trailer} refTargets={refTargets} onJump={interaction.jumpTo} />
          ) : null}
        </section>
      ) : null}

      {brief.specifics || brief.deferred ? (
        <div className="view-block view-context-ideas">
          {brief.specifics ? (
            <section id="context-specifics" className="view-context-ideas-col view-context-specifics-col">
              <p className="view-context-scope-label">
                Specific ideas
                <span className="view-context-scope-count">{brief.specifics.items.length}</span>
              </p>
              <ul className="view-context-specifics">
                {brief.specifics.items.map((item) => (
                  <li key={item.id} className="view-context-idea" data-kind={item.kind}>
                    <span className="status-chip" data-tone={item.tone}>
                      {item.kindLabel}
                    </span>
                    <div>
                      {item.title ? (
                        <>
                          <strong>
                            <Inline text={item.title} refTargets={refTargets} onJump={interaction.jumpTo} />
                          </strong>{' '}
                          <span className="view-context-idea-rest">
                            <Inline text={item.body} refTargets={refTargets} onJump={interaction.jumpTo} />
                          </span>
                        </>
                      ) : (
                        <Inline text={item.body} refTargets={refTargets} onJump={interaction.jumpTo} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {brief.deferred ? (
            <section id={brief.deferred.id} className="preview-panel">
              <header className="section-heading compact">
                <h2>{brief.deferred.label}</h2>
                <span>{brief.deferred.items.length}</span>
              </header>
              <ul className="view-context-idea-list">
                {brief.deferred.items.map((item) => {
                  const open = interaction.isOpen(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="view-context-idea"
                        aria-expanded={open}
                        data-open={open}
                        data-untitled={item.title === null}
                        onClick={() => interaction.toggle(item.id)}
                      >
                        {item.title ? (
                          <span className="view-context-idea-title">
                            <Inline text={item.title} refTargets={refTargets} interactive={false} />
                          </span>
                        ) : null}
                        <span className="view-context-idea-body">
                          <Inline text={item.body} refTargets={refTargets} interactive={false} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <ContextAsides asides={brief.asides} refTargets={refTargets} interaction={interaction} />
    </>
  );
}
