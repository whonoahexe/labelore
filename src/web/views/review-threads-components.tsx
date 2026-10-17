// The REVIEW page's React surface (quick-261017-k44, sketch 022 winner C): an own head (eyebrow, the
// Reviewed stamp, the shared warning chip, copy path, View / Source, then the one h1), the hero
// (the verdict sentence with its toned phrase, the sub line, the facts, the tally and the reviewer's
// pull quote), then the review threads: one block per file, worst first, each finding a thread with
// its line gutter, severity mark, title, outcome stamp, problem, suggested change and a reply saying
// what the fix run did with it. A fixed finding folds into a one-line resolved row.
// Every string derived from the document renders only through `ResearchInline` / `ResearchBlocks`
// (tokenizeInline output mapped to React nodes) or as plain React text - never React's raw-HTML
// injection prop (T-k44-01) - and no link target is built from document text (T-k44-07). Hashes and
// paths are mono text, never links. Colour comes only from the tone a composed model carries (the
// maps in `review-threads.ts`) and the theme tokens; the parse-degradation tones never appear on
// document content. States are `data-*` attributes (data-outcome, data-severity, data-tone), never
// new class names.
import { useCallback, useState } from 'react';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import type {
  ComposedReviewFinding,
  ComposedReviewStamp,
  ComposedReviewThreads,
} from './review-threads.ts';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

function Stamp({ stamp }: { stamp: ComposedReviewStamp }): React.JSX.Element {
  return (
    <span className="status-chip view-review-stamp" data-tone={stamp.tone} data-outcome={stamp.outcome}>
      {stamp.label}
      {stamp.commit !== null ? <span className="view-review-commit">{stamp.commit}</span> : null}
    </span>
  );
}

function Gutter({ finding }: { finding: ComposedReviewFinding }): React.JSX.Element {
  return (
    <div className="view-review-gutter">
      {finding.gutter.length > 0 ? (
        finding.gutter.map((label, index) => {
          const dash = label.indexOf('–');
          return (
            <span key={`${label}-${index}`}>
              <b>{dash === -1 ? label : label.slice(0, dash)}</b>
              {dash === -1 ? '' : label.slice(dash)}
            </span>
          );
        })
      ) : (
        <span>—</span>
      )}
      {finding.moreFiles > 0 ? <span>{`+${finding.moreFiles} file${finding.moreFiles === 1 ? '' : 's'}`}</span> : null}
    </div>
  );
}

function Reply({ finding }: { finding: ComposedReviewFinding }): React.JSX.Element {
  const { reply } = finding;
  return (
    <div className="view-review-reply" data-outcome={reply.outcome}>
      <span className="view-review-reply-mark" aria-hidden="true">
        {reply.mark}
      </span>
      <div className="view-review-reply-body">
        <span className="view-review-kicker" data-outcome={reply.outcome}>
          {reply.kicker}
        </span>
        {reply.note.length > 0 ? (
          <div className="view-review-md">
            <ResearchBlocks blocks={reply.note} />
          </div>
        ) : null}
        {reply.quiet !== null ? <span className="view-review-muted">{reply.quiet}</span> : null}
        {reply.files.length > 0 ? <span className="view-review-loc">{reply.files.join(' · ')}</span> : null}
      </div>
    </div>
  );
}

function Thread({
  finding,
  canFold,
  onFold,
}: {
  finding: ComposedReviewFinding;
  canFold: boolean;
  onFold: (id: string) => void;
}): React.JSX.Element {
  return (
    <article id={finding.anchorId} className="view-review-thread" data-severity={finding.severity} data-outcome={finding.stamp.outcome}>
      <Gutter finding={finding} />
      <div className="view-review-thread-body">
        <div className="view-review-thread-head">
          <span className="view-review-sev" data-severity={finding.severity}>
            {finding.id}
          </span>
          <h3 className="view-review-thread-title">
            <ResearchInline text={finding.title} />
          </h3>
          <Stamp stamp={finding.stamp} />
          {canFold ? (
            <button type="button" className="view-review-link" title="Fold this fixed thread" onClick={() => onFold(finding.id)}>
              Fold −
            </button>
          ) : null}
        </div>
        <div className="view-review-md">
          {finding.issue.length > 0 ? <ResearchBlocks blocks={finding.issue} /> : <p className="view-research-text">—</p>}
        </div>
        {finding.fix.length > 0 ? (
          <div className="view-review-suggest">
            <span className="view-review-kicker">Suggested change</span>
            <div className="view-review-md">
              <ResearchBlocks blocks={finding.fix} />
            </div>
          </div>
        ) : null}
        <Reply finding={finding} />
      </div>
    </article>
  );
}

function ResolvedRow({ finding, onUnfold }: { finding: ComposedReviewFinding; onUnfold: (id: string) => void }): React.JSX.Element {
  return (
    <button
      type="button"
      className="view-review-resolved"
      aria-expanded="false"
      data-outcome={finding.stamp.outcome}
      onClick={() => onUnfold(finding.id)}
    >
      <span className="view-review-resolved-line">{finding.firstLine}</span>
      <span className="view-review-resolved-text">
        <span className="view-review-mono">{finding.id}</span> · <ResearchInline text={finding.title} />
      </span>
      <Stamp stamp={finding.stamp} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface ReviewThreadsViewProps {
  model: ComposedReviewThreads;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  chip: React.ReactNode;
  /** Finding IDs that start unfolded; used by the static-markup tests. */
  initialUnfolded?: string[];
}

export function ReviewThreadsView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
  initialUnfolded = [],
}: ReviewThreadsViewProps): React.JSX.Element {
  // The fold model: with "Show fixed threads" off the set holds the fixed threads a person
  // unfolded; with it on the set holds the ones they folded back. Switching resets the set.
  const [showFixed] = useState(false);
  const [overrides, setOverrides] = useState<ReadonlySet<string>>(() => new Set(initialUnfolded));

  const flip = useCallback((id: string): void => {
    setOverrides((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { head, verdict, facts, tally, quote, threads } = model;
  const title = head.title ?? fallbackTitle;
  const foldedNow = (finding: ComposedReviewFinding): boolean =>
    finding.defaultFolded && (showFixed ? overrides.has(finding.id) : !overrides.has(finding.id));

  return (
    <div className="view-review-page">
      <header className="view-review-head">
        <div className="view-review-meta">
          <div className="view-review-meta-left">
            <p className="eyebrow">{head.eyebrow}</p>
            {head.reviewed !== null ? (
              <span className="view-review-date">
                Reviewed <b>{head.reviewed}</b>
              </span>
            ) : null}
            {chip}
          </div>
          <div className="view-review-tools">
            <CopyPathButton path={path} />
            <DocumentViewToggle mode={mode} onChange={onModeChange} />
          </div>
        </div>
        <h1 className="view-review-title">
          <ResearchInline text={title} />
        </h1>
      </header>

      <section className="view-review-hero" aria-label="Verdict">
        <div className="view-review-hero-main">
          <p className="view-review-verdict" data-tone={verdict.tone}>
            {verdict.parts.map((part, index) =>
              part.tone === null ? (
                <span key={index}>{part.text}</span>
              ) : (
                <span key={index} data-tone={part.tone}>
                  {part.text}
                </span>
              ),
            )}
          </p>
          {verdict.sub !== '' ? <p className="view-review-sub">{verdict.sub}</p> : null}
          {facts.length > 0 ? (
            <div className="view-review-facts">
              {facts.map((fact) => (
                <span key={fact.label}>
                  {fact.label}
                  <b>{fact.value}</b>
                </span>
              ))}
            </div>
          ) : null}
          {tally.length > 0 ? (
            <div className="view-review-tally">
              {tally.map((cell) => (
                <div key={cell.key} data-cell={cell.key}>
                  <span className="view-review-kicker">{cell.label}</span>
                  {cell.tone === null ? <b>{cell.count}</b> : <b data-tone={cell.tone}>{cell.count}</b>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {quote !== null ? (
          <figure className="view-review-quote">
            <p className="view-review-quote-text">
              <ResearchInline text={quote.text} />
            </p>
            <figcaption className="view-review-quote-by">
              {quote.by}
              {quote.more ? (
                <>
                  {' · '}
                  <button type="button" className="view-review-link" onClick={() => onShowSource(quote.summaryId)}>
                    Full summary ↗
                  </button>
                </>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </section>

      <section id="review-threads" className="view-review-threads">
        <div className="view-review-heading">
          <h2>{threads.heading}</h2>
          <span className="view-review-aside">{threads.aside}</span>
        </div>
        {threads.files.length > 0 ? (
          <>
            <div className="view-review-bar">
              <span className="view-review-muted">{threads.note}</span>
            </div>
            {threads.files.map((file) => (
              <section key={file.path || 'no-file'} className="view-review-file">
                <header className="view-review-file-head">
                  <code>{file.label}</code>
                  <span className="view-review-file-count">{file.count}</span>
                </header>
                {file.findings.map((finding) =>
                  foldedNow(finding) ? (
                    <ResolvedRow key={finding.id} finding={finding} onUnfold={flip} />
                  ) : (
                    <Thread
                      key={finding.id}
                      finding={finding}
                      canFold={finding.defaultFolded}
                      onFold={flip}
                    />
                  ),
                )}
              </section>
            ))}
          </>
        ) : (
          <p className="view-review-empty">{threads.empty === null ? 'No issues found.' : <ResearchInline text={threads.empty} />}</p>
        )}
      </section>
    </div>
  );
}
