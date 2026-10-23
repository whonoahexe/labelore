// The TODO page's React surface (quick-261023-61k, sketch 027 C: the lifecycle): an own head (eyebrow,
// created day, the shared warning chip, copy path, View / Source, then the one h1), the chip row (status,
// severity square, area), the three-step strip (Noted -> Captured -> Closed / Now, each a button that
// scrolls to its stage) and one numbered spine under it: the notes the todo was made from, the todo itself
// (lead beside plan, files, other sections folded) and how it closed or how long it has been open, then
// one "Also in this file" chip row.
// T-61k-01: every string derived from the document renders only through `ResearchInline` (inside
// `TodoInline` / `TodoBlocks`) or as plain React text - never React's raw-HTML injection prop. T-61k-06:
// a link target is only ever a url field the server's `todoContext` resolved (a note's page, the closing
// quick task's page); no link is built from document text. Paths, commit hashes and file names are mono
// text, never links. The status chip carries the documented tones (complete, in-flight, quiet) on
// `data-tone`; the severity square rides `data-severity` and steps and stages `data-state` as identity
// marks, not tones, and the page never uses a parse-degradation tone. States are `data-*` attributes and
// aria attributes, never new class names. The unfold state lives in component state only: nothing
// touches the URL.
import { useState } from 'react';
import { Link } from 'react-router';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import type { TodoBlock } from '../../planning-repo/handlers/todo-file.ts';
import { ResearchInline } from './research-briefing-components.tsx';
import type {
  ComposedTodoLifecycle,
  ComposedTodoNote,
  ComposedTodoRef,
  ComposedTodoStep,
} from './todo-lifecycle.ts';

// ---------------------------------------------------------------------------
// Author text
// ---------------------------------------------------------------------------

type Piece = { type: 'text'; text: string } | { type: 'ref'; text: string; label: string; url: string };

function isWordCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
}

function isNameCode(code: number): boolean {
  return isWordCode(code) || code === 46 || code === 45;
}

function startsToken(text: string, at: number): boolean {
  if (at === 0) return true;
  const ch = text[at - 1];
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '(' || ch === '[' || ch === '"' || ch === "'";
}

/** The references (`[[slug]]`, `notes/<name>.md`, `.planning/notes/<name>.md`) of a run of text that
 * resolve to a note with a page. A character scan, never a pattern built from the text. */
function refsIn(text: string, refs: ComposedTodoRef[]): { start: number; end: number; ref: ComposedTodoRef; label: string }[] {
  const found: { start: number; end: number; ref: ComposedTodoRef; label: string }[] = [];
  let at = text.indexOf('[[');
  while (at >= 0) {
    let end = at + 2;
    while (end < text.length && (isWordCode(text.charCodeAt(end)) || text[end] === '-')) end += 1;
    if (end > at + 2 && text.startsWith(']]', end)) {
      const slug = text.slice(at + 2, end);
      const ref = refs.find((candidate) => candidate.slug === slug);
      if (ref) found.push({ start: at, end: end + 2, ref, label: slug });
    }
    at = text.indexOf('[[', at + 2);
  }
  at = text.indexOf('notes/');
  while (at >= 0) {
    const prefixed = at >= 10 && text.startsWith('.planning/', at - 10);
    const start = prefixed ? at - 10 : at;
    if (startsToken(text, start)) {
      let end = at + 6;
      while (end < text.length && isNameCode(text.charCodeAt(end))) end += 1;
      let name = text.slice(at + 6, end);
      while (name.endsWith('.') && !name.endsWith('.md')) {
        name = name.slice(0, -1);
        end -= 1;
      }
      if (name.length > 3 && name.endsWith('.md') && name[0] !== '.') {
        const path = `.planning/notes/${name}`;
        const ref = refs.find((candidate) => candidate.path === path);
        if (ref) found.push({ start, end, ref, label: text.slice(start, end).startsWith('.planning/') ? text.slice(start + 10, end) : text.slice(start, end) });
      }
    }
    at = text.indexOf('notes/', at + 6);
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Splits text into plain runs and resolved note references; backtick spans stay whole, so a reference
 * inside code stays code. */
function piecesOf(text: string, refs: ComposedTodoRef[]): Piece[] {
  if (refs.length === 0) return [{ type: 'text', text }];
  const ticks: number[] = [];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '`') ticks.push(i);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < ticks.length; i += 2) spans.push([ticks[i], ticks[i + 1] + 1]);
  const pieces: Piece[] = [];
  let cursor = 0;
  const pushOutside = (from: number, to: number): void => {
    const slice = text.slice(from, to);
    let last = 0;
    let previousEnd = 0;
    for (const hit of refsIn(slice, refs)) {
      if (hit.start < previousEnd) continue;
      if (hit.start > last) pieces.push({ type: 'text', text: slice.slice(last, hit.start) });
      pieces.push({ type: 'ref', text: slice.slice(hit.start, hit.end), label: hit.label, url: hit.ref.url });
      last = hit.end;
      previousEnd = hit.end;
    }
    if (last < slice.length) pieces.push({ type: 'text', text: slice.slice(last) });
  };
  for (const [open, close] of spans) {
    if (open > cursor) pushOutside(cursor, open);
    pieces.push({ type: 'text', text: text.slice(open, close) });
    cursor = close;
  }
  if (cursor < text.length) pushOutside(cursor, text.length);
  return pieces;
}

/** Inline author text: ResearchInline for every run, plus in-app links for the note references that
 * resolve. */
export function TodoInline({ text, refs }: { text: string; refs: ComposedTodoRef[] }): React.JSX.Element {
  const pieces = piecesOf(text, refs);
  return (
    <>
      {pieces.map((piece, index) =>
        piece.type === 'ref' ? (
          <Link key={`ref-${index}`} className="view-todo-ref" to={piece.url}>
            {piece.label}
          </Link>
        ) : (
          <ResearchInline key={`text-${index}`} text={piece.text} />
        ),
      )}
    </>
  );
}

/** paragraph / list / checklist / table / code / heading / quote - every string through `TodoInline`. */
export function TodoBlocks({ blocks, refs }: { blocks: TodoBlock[]; refs: ComposedTodoRef[] }): React.JSX.Element {
  return (
    <div className="view-todo-md">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.kind === 'paragraph') {
          return (
            <p key={key} className="view-todo-text">
              <TodoInline text={block.text} refs={refs} />
            </p>
          );
        }
        if (block.kind === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={key} className="view-todo-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <TodoInline text={item} refs={refs} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.kind === 'checklist') {
          return (
            <ul key={key} className="view-todo-checks">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="view-todo-check" data-done={item.done ? 'true' : 'false'}>
                  <span>
                    <TodoInline text={item.text} refs={refs} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'table') {
          const headers = block.rows.length > 0 ? Object.keys(block.rows[0]) : [];
          return (
            <div key={key} className="document-overflow-boundary">
              <table className="view-todo-table">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header}>
                        <TodoInline text={header} refs={refs} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {headers.map((header) => (
                        <td key={header}>
                          <TodoInline text={row[header] ?? ''} refs={refs} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.kind === 'heading') {
          return (
            <h3 key={key} className="view-todo-subhead">
              <TodoInline text={block.text} refs={refs} />
            </h3>
          );
        }
        if (block.kind === 'quote') {
          return (
            <blockquote key={key} className="view-todo-quote">
              <TodoInline text={block.text} refs={refs} />
            </blockquote>
          );
        }
        if (block.kind === 'code') {
          return (
            <pre key={key} className="view-todo-code">
              <code>{block.text}</code>
            </pre>
          );
        }
        return null;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function jumpTo(target: string | null): void {
  if (target === null) return;
  document.getElementById(target)?.scrollIntoView({ block: 'start' });
}

const STEP_KEY: Record<ComposedTodoStep['key'], string> = {
  noted: 'Noted',
  captured: 'Captured',
  closed: 'Closed',
  now: 'Now',
};

function Step({ step }: { step: ComposedTodoStep }): React.JSX.Element {
  const inner = (
    <>
      <span className="view-todo-step-key">{STEP_KEY[step.key]}</span>
      <b className="view-todo-step-value">{step.value}</b>
      <span className="view-todo-step-sub">{step.sub}</span>
    </>
  );
  if (step.target === null) {
    return (
      <div className="view-todo-step" data-state={step.state}>
        {inner}
      </div>
    );
  }
  return (
    <button type="button" className="view-todo-step" data-state={step.state} onClick={() => jumpTo(step.target)}>
      {inner}
    </button>
  );
}

function NoteCard({ note, refs }: { note: ComposedTodoNote; refs: ComposedTodoRef[] }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const clamped = note.clamp && !open;
  return (
    <article className="view-todo-note" data-missing={note.missing ? 'true' : undefined}>
      <div className="view-todo-note-head">
        <span className="view-todo-kicker">{note.kicker}</span>
        <span className="view-todo-kicker" data-quiet="true">
          {note.way}
        </span>
      </div>
      {note.missing ? (
        <div className="view-todo-note-text" data-clamped="false">
          <code>{note.path}</code> <span>Not in .planning/notes/</span>
        </div>
      ) : (
        <div className="view-todo-note-text" data-clamped={clamped ? 'true' : 'false'}>
          {note.title !== null ? (
            <b>{note.title}</b>
          ) : (
            <TodoInline text={note.text} refs={refs} />
          )}
        </div>
      )}
      <div className="view-todo-note-foot">
        {note.clamp ? (
          <button type="button" className="view-todo-link" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Fold ↑' : 'Unfold ↓'}
          </button>
        ) : null}
        {note.url !== null ? (
          <Link className="view-todo-link" to={note.url}>
            Open note ↗
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Stage({
  id,
  state,
  number,
  title,
  kicker,
  children,
}: {
  id: string;
  state: 'done' | 'now';
  number: number;
  title: string;
  kicker?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="view-todo-stage" id={id} data-state={state}>
      <span className="view-todo-node">{number}</span>
      <div className="view-todo-stage-body">
        <div className="view-todo-stage-head">
          <h2>{title}</h2>
          {kicker !== undefined && kicker !== null ? <span className="view-todo-kicker">{kicker}</span> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Part({ label, blocks, refs }: { label: string; blocks: TodoBlock[]; refs: ComposedTodoRef[] }): React.JSX.Element {
  return (
    <div className="view-todo-part">
      <span className="view-todo-kicker">{label}</span>
      <TodoBlocks blocks={blocks} refs={refs} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface TodoLifecycleViewProps {
  model: ComposedTodoLifecycle;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  chip: React.ReactNode;
}

export function TodoLifecycleView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
}: TodoLifecycleViewProps): React.JSX.Element {
  const { head, chips, steps, noted, captured, end, refs, also } = model;
  const title = head.title ?? fallbackTitle;
  const endQuickLink = end.kind === 'closed' && end.closedBy !== null && end.closedBy.url !== null ? end.closedBy : null;

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-todo-page" aria-label={`${title} document`}>
        <header className="view-todo-head">
          <div className="view-todo-meta">
            <div className="view-todo-meta-left">
              <p className="eyebrow">{head.eyebrow}</p>
              {head.created !== null ? (
                <span className="view-todo-date">
                  Created <b>{head.created}</b>
                </span>
              ) : null}
              {chip}
            </div>
            <div className="view-todo-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          <h1 className="view-todo-title">
            <ResearchInline text={title} />
          </h1>
          <div className="view-todo-chips">
            <span className="status-chip" data-tone={chips.status.tone}>
              {chips.status.label}
            </span>
            <span className="view-todo-pip" data-severity={chips.weight.level} title={chips.weight.title}>
              <i aria-hidden="true" />
              {chips.weight.lead}
              {chips.weight.tail !== null ? <span> · {chips.weight.tail}</span> : null}
            </span>
            {chips.area !== null ? (
              <span className="status-chip" data-tone="quiet">
                {chips.area}
              </span>
            ) : null}
          </div>
          <div className="view-todo-steps">
            {steps.map((step) => (
              <Step key={step.key} step={step} />
            ))}
          </div>
        </header>

        <div className="view-todo-spine">
          {noted !== null ? (
            <Stage id={noted.id} state="done" number={noted.number} title="Noted" kicker={noted.kicker}>
              {noted.notes.map((note, index) => (
                <NoteCard key={`${note.path}-${index}`} note={note} refs={refs} />
              ))}
            </Stage>
          ) : null}

          <Stage id={captured.id} state="done" number={captured.number} title="Captured as a todo" kicker={captured.kicker}>
            {captured.lead !== null || captured.plan !== null ? (
              <div className="view-todo-pair">
                {captured.lead !== null ? <Part label={captured.lead.label} blocks={captured.lead.blocks} refs={refs} /> : null}
                {captured.plan !== null ? <Part label={captured.plan.label} blocks={captured.plan.blocks} refs={refs} /> : null}
              </div>
            ) : null}
            {captured.empty ? (
              <p className="view-todo-empty">Nothing below the frontmatter — the title is the whole todo.</p>
            ) : null}
            {captured.files !== null ? (
              <div className="view-todo-files">
                <span className="view-todo-kicker">Files · {captured.files.count}</span>
                {captured.files.rows.map((file, index) => (
                  <div key={`${file.raw}-${index}`} className="view-todo-file">
                    <span>
                      <span className="view-todo-file-dir">{file.dir}</span>
                      {file.name}
                    </span>
                    {file.range !== null ? <span className="view-todo-file-range">{file.range}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {captured.extras.length > 0 ? (
              <div className="view-todo-folds">
                {captured.extras.map((extra, index) => (
                  <details key={`${extra.heading}-${index}`} className="view-todo-fold" open={extra.open}>
                    <summary>
                      <TodoInline text={extra.heading} refs={refs} />
                    </summary>
                    <TodoBlocks blocks={extra.blocks} refs={refs} />
                  </details>
                ))}
              </div>
            ) : null}
          </Stage>

          {end.kind === 'closed' ? (
            <Stage
              id={end.id}
              state="done"
              number={end.number}
              title={end.title}
              kicker={
                endQuickLink !== null && end.kicker.startsWith(endQuickLink.label) ? (
                  <>
                    <Link className="view-todo-link" to={endQuickLink.url as string}>
                      {endQuickLink.label}
                    </Link>
                    {end.kicker.slice(endQuickLink.label.length)}
                  </>
                ) : (
                  end.kicker
                )
              }
            >
              {end.closing !== null ? (
                <div className="view-todo-close">
                  <TodoBlocks blocks={end.closing} refs={refs} />
                  {end.commits.length > 0 ? (
                    <div className="view-todo-commits">
                      {end.commits.map((hash) => (
                        <code key={hash} className="view-todo-commit">
                          {hash}
                        </code>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="view-todo-wait">{end.note}</p>
                  {end.commits.length > 0 ? (
                    <div className="view-todo-commits">
                      {end.commits.map((hash) => (
                        <code key={hash} className="view-todo-commit">
                          {hash}
                        </code>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </Stage>
          ) : (
            <Stage id={end.id} state="now" number={end.number} title={end.title}>
              <p className="view-todo-wait">
                <b>{end.lead}</b> {end.rest}
              </p>
            </Stage>
          )}
        </div>

        {also.length > 0 ? (
          <nav className="view-todo-also" aria-label="Also in this file">
            <span className="view-todo-key">Also in this file</span>
            <ul>
              {also.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <button type="button" className="status-chip" onClick={() => onShowSource(item.targetId)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
    </div>
  );
}
