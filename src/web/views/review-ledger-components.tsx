// The review ledger's React surface (Phase 9, 09-12): the tab strip and shared head that sit first in the
// page once a folder holds a second review-family file, and the Fix tab's body - one labelled, anchored
// section per fix file with its entries grouped Fixed, Skipped, Deferred and a final quiet "Not in the
// review" group, and (09-13) the Disposition tab's body: rows grouped Open, Deferred, Skipped, Fixed and Other
// by what became of each finding. Every string is author text rendered as plain React text through ResearchInline - never
// React's raw-HTML injection prop - and no href is built from document text: the only links are the
// member routes the server resolved, and file paths are chips, never links (T-09-25). Colour comes only
// from the tone a composed model carries and the theme tokens; the parse-degradation tones never appear on
// document content, and a critical finding is `missing`, never destructive.
import { useEffect, useState } from 'react';
import type { LedgerContext } from '../../presentation/review-ledger.ts';
import { LedgerSwitch } from '../components/ledger-switch.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { scrollWhenSettled } from '../pages/scroll-settle.ts';
import type { ComposedStaleMark } from './review-threads.ts';
import { composeLedgerHead } from './review-ledger.ts';
import type {
  ComposedDispositionGroup,
  ComposedDispositionLedger,
  ComposedDispositionRow,
  ComposedFixGroup,
  ComposedFixLedger,
  ComposedFixRow,
  ComposedFixSection,
  ComposedLedgerHead,
  ComposedReviewLedger,
} from './review-ledger.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial
 * keeps TypeScript from flagging the intentional override. The breadcrumb row stays. */
export type LedgerHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props: the eyebrow of the open tab, the review's title
 * and no lead. */
export function ledgerHeaderProps(
  model: ComposedReviewLedger,
  fallbackTitle: string,
): LedgerHeaderProps {
  return {
    eyebrow: model.tab === 'disposition' ? 'Review disposition' : 'Review fix',
    title: model.title !== null && model.title !== '' ? model.title : fallbackTitle,
    lead: null,
  };
}

/** The shared head: the findings total in the lead number style, one row per severity present with its pip,
 * "{fixed} of {total} fixed" (or "{open} of {total} open" once a disposition supplies it) and a bar of
 * status-squares, then the one muted line. */
export function LedgerHead({ head }: { head: ComposedLedgerHead }): React.JSX.Element {
  const plain = head.open === null;
  return (
    <section className="view-review-ledger-head" aria-label="Findings across the review files">
      <div className="view-review-ledger-total">
        <span className="view-review-ledger-number">{plain ? head.total : head.open}</span>
        <span className="view-review-ledger-word">
          {plain ? (head.total === 1 ? 'finding' : 'findings') : `of ${head.total} findings`}
        </span>
      </div>
      {head.severities.length > 0 ? (
        <ul className="view-review-ledger-severities">
          {head.severities.map((row) => (
            <li
              key={row.severity}
              className="view-review-ledger-severity"
              data-severity={row.severity}
            >
              <span className="view-review-sev" data-severity={row.severity}>
                {row.label}
              </span>
              <span className="view-review-ledger-fixed">
                {row.open === null
                  ? `${row.fixed} of ${row.total} fixed`
                  : `${row.open} of ${row.total} open`}
              </span>
              <span className="view-review-ledger-bar" aria-hidden="true">
                {row.squares.map((tone, index) => (
                  <i key={index} className="status-square" data-tone={tone} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {head.note !== null ? <p className="view-review-ledger-note">{head.note}</p> : null}
    </section>
  );
}

/** The strip and head, first in the page; null while the folder holds fewer than two review-family files (D-11).
 * A tab whose route did not resolve is drawn only when it is the open one - no disabled or missing tab. */
export function ledgerSwitcher(context: LedgerContext | null): React.ReactNode {
  if (context === null || !Array.isArray(context.members) || context.members.length < 2)
    return null;
  const tabs = context.tabs
    .filter((tab) => tab.url !== null || tab.tab === context.active)
    .map((tab) => ({ key: tab.tab, label: tab.label, to: tab.url, count: tab.count }));
  const head = composeLedgerHead(context);
  return (
    <>
      <LedgerSwitch label="Review files" tabs={tabs} active={context.active} />
      {head !== null ? <LedgerHead head={head} /> : null}
    </>
  );
}

/** The quiet disagreement chip: the fix file says fixed, the disposition still says open (D-08). Deliberately not
 * the `complete` tone - it is a note about two records parting ways, not a result. */
function StaleMark({ mark }: { mark: ComposedStaleMark }): React.JSX.Element {
  return (
    <span
      className="status-chip view-review-stale"
      data-tone={mark.tone}
      title={mark.commit !== null ? mark.commit.full : undefined}
    >
      {mark.commit !== null
        ? `Fixed in ${mark.commit.short}, disposition not updated`
        : 'Fixed in the fix report, disposition not updated'}
    </span>
  );
}

function FixRow({ row }: { row: ComposedFixRow }): React.JSX.Element {
  return (
    <li className="view-review-ledger-row">
      <div className="view-review-ledger-row-head">
        {row.ids.map((entry) => (
          <span key={entry.id} className="view-review-sev" data-severity={entry.severity}>
            {entry.id}
          </span>
        ))}
        {row.title !== null ? (
          <span className="view-review-ledger-title">
            <ResearchInline text={row.title} />
          </span>
        ) : null}
        {row.mark !== null ? <StaleMark mark={row.mark} /> : null}
      </div>
      {row.files.length > 0 || row.commits.length > 0 ? (
        <div className="view-review-ledger-row-meta">
          {row.files.map((file) => (
            <code key={file} className="view-review-ledger-chip" title={file}>
              {file}
            </code>
          ))}
          {row.moreFiles > 0 ? (
            <span className="view-review-ledger-more">+{row.moreFiles}</span>
          ) : null}
          {row.commits.map((commit) => (
            <span key={commit.full} className="view-review-ledger-commit" title={commit.full}>
              {commit.short}
            </span>
          ))}
        </div>
      ) : null}
      {row.reason !== null ? (
        <p className="view-review-ledger-reason">
          <ResearchInline text={row.reason} />
        </p>
      ) : null}
    </li>
  );
}

function FixGroup({ group }: { group: ComposedFixGroup }): React.JSX.Element {
  return (
    <div className="view-review-group" data-group={group.key} data-tone={group.tone}>
      <h3 className="view-review-group-head">
        <i className="status-square" data-tone={group.tone} aria-hidden="true" />
        <span>{group.label}</span>
        <span className="view-review-group-count">{group.rows.length}</span>
      </h3>
      <ul className="view-review-ledger-rows">
        {group.rows.map((row, index) => (
          <FixRow key={`${row.ids.map((entry) => entry.id).join('+')}-${index}`} row={row} />
        ))}
      </ul>
    </div>
  );
}

function FixSection({ section }: { section: ComposedFixSection }): React.JSX.Element {
  return (
    <section id={section.id} className="view-review-ledger-section">
      <div className="view-review-ledger-section-head">
        {section.heading !== null ? (
          <h2 className="view-review-ledger-heading" title={section.headingFull ?? undefined}>
            {section.heading}
          </h2>
        ) : null}
        <span className="view-review-ledger-file" title={section.fileName}>
          {section.fileName}
        </span>
      </div>
      <p className="view-review-ledger-lead">
        <span>{section.counts}</span>
        {section.fixedAt !== null ? <span>{section.fixedAt}</span> : null}
      </p>
      {section.empty ? (
        <p className="empty-note">No fixes listed for this file.</p>
      ) : (
        section.groups.map((group) => <FixGroup key={group.key} group={group} />)
      )}
    </section>
  );
}

/** The Fix tab's body. When the opened file is a suffixed one, its own section is scrolled into view once
 * the layout settles, so the URL of a shard opens at that shard. */
export function FixTabView({ model }: { model: ComposedFixLedger }): React.JSX.Element {
  const { scrollTo } = model;
  useEffect(() => {
    if (scrollTo === null) return;
    return scrollWhenSettled({
      measure: () => {
        const element = window.document.getElementById(scrollTo);
        if (!element) return null;
        return (
          window.scrollY +
          element.getBoundingClientRect().top +
          window.document.documentElement.scrollHeight
        );
      },
      scroll: () => {
        const reducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.document
          .getElementById(scrollTo)
          ?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
      },
      schedule: (callback) => window.requestAnimationFrame(callback),
      cancel: (handle) => window.cancelAnimationFrame(handle),
    });
  }, [scrollTo]);
  return (
    <div className="view-review-ledger-page">
      {model.sections.map((section) => (
        <FixSection key={section.id} section={section} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The Disposition tab
// ---------------------------------------------------------------------------

function Reason({ text, long }: { text: string; long: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const clamped = long && !open;
  return (
    <div className="view-review-ledger-reason-block">
      <p className="view-review-ledger-reason" data-clamped={clamped ? 'true' : 'false'}>
        <ResearchInline text={text} />
      </p>
      {long ? (
        <button
          type="button"
          className="view-review-ledger-more-button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}

function DispositionRowView({ row }: { row: ComposedDispositionRow }): React.JSX.Element {
  return (
    <li className="view-review-ledger-row">
      <div className="view-review-ledger-row-head">
        <span className="view-review-sev" data-severity={row.severity ?? undefined}>
          {row.id}
        </span>
        {row.title !== null ? (
          <span className="view-review-ledger-title">
            <ResearchInline text={row.title} />
          </span>
        ) : null}
        {row.raw !== null ? (
          <span className="status-chip" data-tone="quiet">
            {row.raw}
          </span>
        ) : null}
        {row.mark !== null ? <StaleMark mark={row.mark} /> : null}
      </div>
      {row.reason !== null ? <Reason text={row.reason} long={row.long} /> : null}
      {row.commit !== null ? (
        <div className="view-review-ledger-row-meta">
          <span className="view-review-ledger-commit" title={row.commit.full}>
            {row.commit.short}
          </span>
        </div>
      ) : null}
      {row.sourceText !== null ? (
        <p className="view-review-ledger-reason">
          <ResearchInline text={row.sourceText} />
        </p>
      ) : null}
      {row.missingCommit ? (
        <p className="view-review-ledger-reason" data-tone="quiet">
          Commit not recorded
        </p>
      ) : null}
    </li>
  );
}

function DispositionGroupView({ group }: { group: ComposedDispositionGroup }): React.JSX.Element {
  return (
    <div className="view-review-group" data-group={group.key} data-tone={group.tone}>
      <h3 className="view-review-group-head">
        <i
          className="status-square view-review-group-square"
          data-tone={group.tone}
          data-dashed={group.dashed ? 'true' : 'false'}
          aria-hidden="true"
        />
        <span>{group.label}</span>
        <span className="view-review-group-count">{group.rows.length}</span>
      </h3>
      <ul className="view-review-ledger-rows">
        {group.rows.map((row, index) => (
          <DispositionRowView key={`${row.id}-${index}`} row={row} />
        ))}
      </ul>
    </div>
  );
}

/** The Disposition tab's body: groups in the fixed order Open, Deferred, Skipped, Fixed, Other. */
export function DispositionTabView({
  model,
}: {
  model: ComposedDispositionLedger;
}): React.JSX.Element {
  return (
    <div className="view-review-ledger-page">
      {model.groups.map((group) => (
        <DispositionGroupView key={group.key} group={group} />
      ))}
    </div>
  );
}

/** Whichever tab body the model holds. */
export function LedgerTabView({ model }: { model: ComposedReviewLedger }): React.JSX.Element {
  return model.tab === 'disposition' ? (
    <DispositionTabView model={model} />
  ) : (
    <FixTabView model={model} />
  );
}
