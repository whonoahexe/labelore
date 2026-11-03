// The WINDOWS.md ledger's React surface (Phase 9, 09-10): the source-note line under the header and the lead
// band that always comes first - the open count in the lead number style beside the word "open", a tone chip
// and the one muted line. Every string is author text rendered as plain React text - never React's raw-HTML
// injection prop - and no href is built from document text. Colour comes only from the tone a composed model
// carries and the theme tokens; the parse-degradation tones never appear on document content (the open count
// is document content, so it is `complete` or `in-flight`, never destructive).
// Under the lead (09-11): the Open and Waived sections, rows grouped by phase, each row a status-square, the
// mono id, a quiet kind chip, the description clamped to 3 lines with an in-place "Read more", then the file
// path in mono and the dates; a waived row adds its reason in a left-ruled note or the dashed "No reason
// recorded" line. The Fixed history folds one `details` element per phase. Descriptions and reasons go
// through ResearchInline (React text), file paths are text and never links.
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type {
  ComposedWindowsFixed,
  ComposedWindowsGroup,
  ComposedWindowsLedger,
  ComposedWindowsList,
  ComposedWindowsRow,
} from './windows-ledger.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial
 * keeps TypeScript from flagging the intentional override. The breadcrumb row stays, and the manifest lead
 * is dropped (the note under the header says it). */
export type WindowsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the h1 and no lead. */
export function windowsHeaderProps(model: ComposedWindowsLedger, fallbackTitle: string): WindowsHeaderProps {
  return {
    eyebrow: model.intro.eyebrow,
    title: model.intro.title || fallbackTitle,
    lead: null,
  };
}

function WindowRow({ row, fixed }: { row: ComposedWindowsRow; fixed: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const clamped = row.long && !open;
  return (
    <li className="view-windows-row" data-tone={row.tone}>
      <div className="view-windows-row-head">
        <i className="status-square" data-tone={row.tone} aria-hidden="true" />
        {row.id !== '' ? (
          <span className="view-windows-id" title={`#${row.id}`}>
            #{row.id}
          </span>
        ) : null}
        <span className="status-chip" data-tone="quiet">
          {row.chip}
        </span>
      </div>
      <div className="view-windows-description" data-clamped={clamped ? 'true' : 'false'}>
        <ResearchInline text={row.description} />
      </div>
      {row.long ? (
        <button type="button" className="view-windows-more" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Read less' : 'Read more'}
        </button>
      ) : null}
      <div className="view-windows-meta">
        {row.place !== null ? (
          <span className="view-windows-place" title={row.place}>
            {row.place}
          </span>
        ) : null}
        {row.recorded !== null ? <span>Recorded {row.recorded}</span> : null}
        {fixed && row.resolved !== null ? <span>Fixed {row.resolved}</span> : null}
      </div>
      {row.waived && row.reason !== null ? (
        <div className="view-windows-reason">
          <span className="view-windows-reason-label">Waived because</span>
          <p className="view-windows-reason-text">
            <ResearchInline text={row.reason} />
          </p>
        </div>
      ) : null}
      {row.waived && row.reason === null ? (
        <p className="view-windows-reason view-windows-reason-none">No reason recorded</p>
      ) : null}
    </li>
  );
}

function Rows({ group, fixed }: { group: ComposedWindowsGroup; fixed: boolean }): React.JSX.Element {
  return (
    <ul className="view-windows-rows">
      {group.rows.map((row, index) => (
        <WindowRow key={`${row.id}-${index}`} row={row} fixed={fixed} />
      ))}
    </ul>
  );
}

function ListSection({ title, list }: { title: string; list: ComposedWindowsList }): React.JSX.Element {
  return (
    <section className="view-windows-section" aria-label={title}>
      <h2 className="view-windows-heading">
        {title}
        <span className="view-windows-heading-count">{list.count}</span>
      </h2>
      {list.empty !== null ? (
        <p className="empty-note">{list.empty}</p>
      ) : (
        list.groups.map((group) => (
          <div className="view-windows-group" key={group.phase}>
            <h3 className="view-windows-group-head">
              <span className="view-windows-group-label" title={group.phase}>
                {group.phase}
              </span>
              <span className="view-windows-group-count">{group.rows.length}</span>
            </h3>
            <Rows group={group} fixed={false} />
          </div>
        ))
      )}
    </section>
  );
}

function FixedHistory({ fixed }: { fixed: ComposedWindowsFixed }): React.JSX.Element {
  return (
    <section className="history-section view-windows-history" aria-label="Fixed">
      <h2 className="view-windows-heading">
        Fixed
        <span className="view-windows-heading-count">{fixed.count}</span>
      </h2>
      <div className="history-list">
        {fixed.groups.map((group) => (
          <details className="history-milestone" key={group.phase}>
            <summary>
              <ChevronRight aria-hidden="true" />
              <span>
                <strong title={group.phase}>
                  {group.phase} · {group.rows.length} fixed
                </strong>
              </span>
            </summary>
            <div className="history-tree view-windows-history-body">
              <Rows group={group} fixed />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function WindowsLedgerView({ model }: { model: ComposedWindowsLedger }): React.JSX.Element {
  const { intro, lead, notice, open, waived, fixed } = model;
  return (
    <div className="view-windows-page">
      <p className="source-note view-windows-note">{intro.note}</p>
      {notice !== null ? (
        <p className="notice view-windows-notice" role="status">
          {notice}
        </p>
      ) : null}
      <section className="view-windows-lead" aria-label="Open windows" data-tone={lead.tone}>
        <div className="view-windows-count">
          <span className="view-windows-number">{lead.open}</span>
          <span className="view-windows-word">open</span>
          <span className="status-chip" data-tone={lead.tone}>
            {lead.open} open
          </span>
        </div>
        <p className="view-windows-sentence">{lead.sentence}</p>
      </section>
      <ListSection title="Open" list={open} />
      <ListSection title="Waived" list={waived} />
      {fixed !== null ? <FixedHistory fixed={fixed} /> : null}
    </div>
  );
}
