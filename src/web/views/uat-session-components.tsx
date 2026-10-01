// The UAT session page's React surface (quick-261001-qk7, sketch 015 B): the cover facts with the
// "Tested from" line, the current-test attention card or the one-line done state, the "01 Summary"
// square strip and result bar, and the "02 Tests" Expected | Result pairs. Every string derived
// from the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline
// output mapped to React nodes) or as plain React text — never React's raw-HTML injection prop
// (T-qk7-02). Colour comes only from the tone a composed model carries (the maps in
// `uat-session.ts`) and the theme tokens; the parse-degradation tones never appear on document
// content.
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import {
  NOT_DIAGNOSED_TONE,
  NOW_TONE,
  RESOLVED_TONE,
  RESULT_LABEL,
  RESULT_ORDER,
  RESULT_TONE,
} from './uat-session.ts';
import type {
  ComposedUatCurrent,
  ComposedUatExtra,
  ComposedUatGapItem,
  ComposedUatGaps,
  ComposedUatIntro,
  ComposedUatSession,
  ComposedUatSourceOnly,
  ComposedUatTest,
} from './uat-session.ts';

// ---------------------------------------------------------------------------
// Cover: status, Started, Updated and the gap between them, Tested from
// ---------------------------------------------------------------------------

export function UatIntroMeta({ intro }: { intro: ComposedUatIntro }): React.JSX.Element {
  return (
    <div className="view-uat-cover">
      <p className="view-uat-facts">
        <span className="status-chip" data-tone={intro.status.tone}>
          {intro.status.label}
        </span>
        {intro.started ? (
          <span>
            Started<b>{intro.started}</b>
          </span>
        ) : null}
        {intro.updated ? (
          <span>
            Updated<b>{intro.updated}</b>
            {intro.gap ? <span className="view-uat-gap">({intro.gap} later)</span> : null}
          </span>
        ) : null}
      </p>
      {intro.source.length > 0 ? (
        <p className="view-uat-scope">
          <span className="view-uat-key">Tested from</span>
          <span className="view-uat-scope-text">{intro.source.join(' · ')}</span>
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current test or the done line
// ---------------------------------------------------------------------------

function CurrentTest({
  current,
  onJump,
}: {
  current: ComposedUatCurrent;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  if (!current.live) {
    return (
      <p className="view-uat-done">
        {current.headline === 'Testing complete' ? (
          <span className="view-uat-tick" aria-hidden="true">
            ✓
          </span>
        ) : null}
        <strong>{current.headline}</strong>
        <span>
          · {current.passed} of {current.total} passed
        </span>
        {current.line ? (
          <span className="view-uat-muted">
            <ResearchInline text={current.line} />
          </span>
        ) : current.updated ? (
          <span className="view-uat-muted">{current.updated}</span>
        ) : null}
      </p>
    );
  }
  return (
    <section id="uat-current" className="view-uat-now" aria-label="Current test">
      <span className="view-uat-big" aria-hidden="true">
        {current.padded}
      </span>
      <div className="view-uat-now-label">
        <span className="eyebrow">Now testing</span>
        <span className="view-uat-key">
          Test {current.n} of {current.total}
        </span>
      </div>
      <h2>
        <ResearchInline text={current.name} />
      </h2>
      <div className="view-uat-now-expected">
        <span className="view-uat-key">Expected</span>
        <ResearchBlocks blocks={current.expectedBlocks} />
      </div>
      <div className="view-uat-awaiting">
        <span className="view-uat-pulse" aria-hidden="true" />
        <span>
          Awaiting <b>{current.awaiting}</b>
        </span>
        {current.updated ? (
          <>
            <span aria-hidden="true">·</span>
            <span>Updated {current.updated}</span>
          </>
        ) : null}
        <button type="button" className="view-uat-link" onClick={() => onJump(current.anchorId)}>
          Go to test {current.n} ↓
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 01 Summary: one square per test, the result bar and key
// ---------------------------------------------------------------------------

function Summary({
  session,
  onJump,
}: {
  session: ComposedUatSession;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  const labelOf = (result: (typeof RESULT_ORDER)[number]): string =>
    result === 'other' ? 'Other' : RESULT_LABEL[result];
  return (
    <section id="uat-summary" className="view-block view-uat-summary">
      <header className="section-heading">
        <h2>
          <span className="view-uat-section-number">01</span>
          Summary
        </h2>
        <span className="view-uat-aside">One square per test · click to jump</span>
      </header>
      <div className="view-uat-summary-row">
        <div className="view-uat-squares">
          {session.squares.map((square) => (
            <button
              key={square.anchorId}
              type="button"
              className="view-uat-square"
              data-result={square.result}
              data-now={square.isNow ? 'true' : undefined}
              title={square.title}
              aria-label={square.title}
              onClick={() => onJump(square.anchorId)}
            >
              {square.n}
            </button>
          ))}
        </div>
        <div className="view-uat-bar-block">
          <div className="view-uat-bar" aria-hidden="true">
            {RESULT_ORDER.map((result) =>
              session.counts[result] > 0 ? (
                <span
                  key={result}
                  data-result={result}
                  style={{ flexGrow: session.counts[result] }}
                  title={`${labelOf(result)}: ${session.counts[result]}`}
                />
              ) : null,
            )}
          </div>
          <ul className="view-uat-bar-key">
            {RESULT_ORDER.filter((result) => session.counts[result] > 0).map((result) => (
              <li key={result} data-result={result}>
                <i aria-hidden="true" />
                <b>{session.counts[result]}</b>
                {labelOf(result)}
              </li>
            ))}
            <li>· {session.total} tests</li>
          </ul>
          {session.mismatch ? <p className="view-uat-mismatch">⚑ {session.mismatch}</p> : null}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 02 Tests: always-open Expected | Result pairs
// ---------------------------------------------------------------------------

function Pair({
  test,
  flashed,
  open,
  onToggle,
}: {
  test: ComposedUatTest;
  flashed: boolean;
  open: ReadonlySet<string>;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  const expandKey = `expected-${test.anchorId}`;
  const moreKey = `more-${test.anchorId}`;
  const expanded = open.has(expandKey);
  const moreOpen = open.has(moreKey);
  return (
    <div
      id={test.anchorId}
      className="view-uat-pair"
      data-now={test.isNow ? 'true' : undefined}
      data-flash={flashed ? 'true' : undefined}
    >
      <span className="view-uat-n">{String(test.n).padStart(2, '0')}</span>
      <div className="view-uat-expected">
        <span className="view-uat-name">
          <ResearchInline text={test.name} />
        </span>
        <div className="view-uat-md" data-clamp={test.expectedLong && !expanded ? 'true' : undefined}>
          <ResearchBlocks blocks={test.expectedBlocks} />
        </div>
        {test.expectedLong ? (
          <button
            type="button"
            className="view-uat-link"
            aria-expanded={expanded}
            onClick={() => onToggle(expandKey)}
          >
            {expanded ? 'less' : 'more'}
          </button>
        ) : null}
      </div>
      <div className="view-uat-result">
        <span className="view-uat-chips">
          {test.isNow ? (
            <span className="status-chip" data-tone={NOW_TONE}>
              Now
            </span>
          ) : null}
          <span className="status-chip" data-tone={test.tone} data-result={test.result}>
            {test.label}
          </span>
          {test.severity ? (
            <span className="status-chip" data-tone={test.severity.tone}>
              {test.severity.value}
            </span>
          ) : null}
          {test.blockedBy ? (
            <span className="status-chip" data-tone={RESULT_TONE.blocked}>
              {test.blockedBy}
            </span>
          ) : null}
        </span>
        {test.rawResult ? (
          <div className="view-uat-kv">
            <span className="view-uat-key">Result</span>
            <span>
              <ResearchInline text={test.rawResult} />
            </span>
          </div>
        ) : null}
        {test.reported.length > 0 ? (
          <div className="view-uat-kv">
            <span className="view-uat-key">Reported</span>
            <div className="view-uat-reported">
              <ResearchBlocks blocks={test.reported} />
            </div>
          </div>
        ) : null}
        {test.severity ? (
          <div className="view-uat-kv">
            <span className="view-uat-key">Severity</span>
            <span>
              <span className="status-chip" data-tone={test.severity.tone}>
                {test.severity.value}
              </span>
            </span>
          </div>
        ) : null}
        {test.blockedBy ? (
          <div className="view-uat-kv">
            <span className="view-uat-key">Blocked by</span>
            <span>
              <span className="status-chip" data-tone={RESULT_TONE.blocked}>
                {test.blockedBy}
              </span>
            </span>
          </div>
        ) : null}
        {test.reason ? (
          <div className="view-uat-kv">
            <span className="view-uat-key">Reason</span>
            <div className="view-uat-reason" data-quiet={test.reason.quiet ? 'true' : undefined}>
              <ResearchBlocks blocks={test.reason.blocks} />
            </div>
          </div>
        ) : null}
        {test.more.length > 0 ? (
          <div className="view-uat-more">
            <button
              type="button"
              className="view-uat-link"
              aria-expanded={moreOpen}
              onClick={() => onToggle(moreKey)}
            >
              {moreOpen
                ? 'Less ▴'
                : `More · ${test.more
                    .map((entry) => entry.label)
                    .filter((label) => label !== '')
                    .join(', ')} ▾`}
            </button>
            {moreOpen
              ? test.more.map((entry, index) => (
                  <div key={`${entry.label}-${index}`} className="view-uat-kv">
                    <span className="view-uat-key">{entry.label}</span>
                    <div className="view-uat-md">
                      <ResearchBlocks blocks={entry.blocks} />
                    </div>
                  </div>
                ))
              : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 03 Gaps: a register that opens to its diagnosis, or prose cards
// ---------------------------------------------------------------------------

export function GapDetail({
  item,
  onJump,
}: {
  item: ComposedUatGapItem;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  const resolution = item.resolution;
  return (
    <div className="view-uat-gap-detail">
      {item.reason ? (
        <div className="view-uat-reported">
          <ResearchBlocks blocks={[{ kind: 'paragraph', text: item.reason }]} />
        </div>
      ) : null}
      {item.diagnosed ? (
        <div className="view-uat-diagnosis">
          {item.rootCause ? (
            <div className="view-uat-kv">
              <span className="view-uat-key">Root cause</span>
              <span>
                <ResearchInline text={item.rootCause} />
              </span>
            </div>
          ) : null}
          {item.artifacts.length > 0 ? (
            <div className="view-uat-kv">
              <span className="view-uat-key">Artifacts</span>
              <ul className="view-uat-artifacts">
                {item.artifacts.map((artifact, index) => (
                  <li key={`${artifact.path}-${index}`}>
                    <span className="view-uat-path">{artifact.path}</span>
                    {artifact.issue ? (
                      <span className="view-uat-muted-text">
                        <ResearchInline text={artifact.issue} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.missing.length > 0 ? (
            <div className="view-uat-kv">
              <span className="view-uat-key">Missing</span>
              <ul className="view-uat-todo" data-done={item.missingDone ? 'true' : undefined}>
                {item.missing.map((entry, index) => (
                  <li key={index}>
                    <span>
                      <ResearchInline text={entry} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.debugSession ? (
            <div className="view-uat-kv">
              <span className="view-uat-key">Debug session</span>
              <span className="view-uat-path">{item.debugSession}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="view-uat-diagnosis" data-none="true">
          <span className="status-chip" data-tone={NOT_DIAGNOSED_TONE}>
            Not diagnosed yet
          </span>
          <span>Root cause, artifacts and missing work fill in after diagnosis.</span>
        </div>
      )}
      {resolution ? (
        <div className="view-uat-resolved">
          <div className="view-uat-resolved-top">
            <span className="status-chip" data-tone={RESOLVED_TONE}>
              Resolved
            </span>
            {resolution.resolvedAt ? <span className="view-uat-key">{resolution.resolvedAt}</span> : null}
            {resolution.reverifiedAt ? (
              <span className="view-uat-key">· reverified {resolution.reverifiedAt}</span>
            ) : null}
            {resolution.deployedAt ? <span className="view-uat-key">· deployed {resolution.deployedAt}</span> : null}
          </div>
          {resolution.resolvedBy ? (
            <span>
              <ResearchInline text={resolution.resolvedBy} />
            </span>
          ) : null}
          {resolution.fix ? (
            <span className="view-uat-muted-text">
              <ResearchInline text={resolution.fix} />
            </span>
          ) : null}
          {resolution.reverify ? (
            <span className="view-uat-muted-text">
              Re-check: <ResearchInline text={resolution.reverify} />
            </span>
          ) : null}
        </div>
      ) : null}
      {item.alsoInSource.length > 0 ? (
        <p className="view-uat-key">Also in source: {item.alsoInSource.join(', ')}</p>
      ) : null}
      {item.testAnchor ? (
        <button
          type="button"
          className="view-uat-link"
          onClick={() => onJump(item.testAnchor as string)}
        >
          Test {item.test} ↑
        </button>
      ) : null}
    </div>
  );
}

function Gaps({
  gaps,
  open,
  onToggle,
  onJump,
}: {
  gaps: ComposedUatGaps;
  open: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  return (
    <section id="uat-gaps" className="view-block view-uat-gaps">
      <header className="section-heading">
        <h2>
          <span className="view-uat-section-number">03</span>
          Gaps
        </h2>
        <span className="view-uat-aside">{gaps.aside}</span>
      </header>
      {gaps.lead ? (
        <p className="view-uat-lead">
          <ResearchInline text={gaps.lead} />
        </p>
      ) : null}
      {gaps.mode === 'register' ? (
        <table className="view-uat-register">
          <thead>
            <tr>
              <th>ID</th>
              <th>Truth</th>
              <th data-narrow="hide">Severity</th>
              <th>Status</th>
              <th data-narrow="hide">Test</th>
              <th data-narrow="hide">Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {gaps.items.map((item) => {
              const key = `gap-${item.index}`;
              const isOpen = open.has(key);
              const detailId = `${item.anchorId}-detail`;
              return (
                <Fragment key={item.anchorId}>
                  <tr
                    id={item.anchorId}
                    data-gap=""
                    data-open={isOpen ? 'true' : undefined}
                    onClick={() => onToggle(key)}
                  >
                    <td className="view-uat-key">{item.gapId}</td>
                    <td>
                      <button
                        type="button"
                        className="view-uat-truth"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? detailId : undefined}
                      >
                        <ResearchInline text={item.truth} />
                      </button>
                    </td>
                    <td data-narrow="hide">
                      {item.severity ? (
                        <span className="status-chip" data-tone={item.severity.tone}>
                          {item.severity.value}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className="status-chip" data-tone={item.status.tone}>
                        {item.status.label}
                      </span>
                    </td>
                    <td className="view-uat-key" data-narrow="hide">
                      {item.test ?? ''}
                    </td>
                    <td className="view-uat-key" data-narrow="hide">
                      {item.rootCause ? 'Root-caused' : '—'}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr id={detailId} data-detail="">
                      <td colSpan={6}>
                        <GapDetail item={item} onJump={onJump} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : gaps.mode === 'cards' ? (
        <div className="view-uat-cards">
          {gaps.cards.map((card, index) => (
            <article key={index} className="view-uat-card">
              {card.title ? (
                <h3>
                  <ResearchInline text={card.title} />
                </h3>
              ) : null}
              <div className="view-uat-md">
                <ResearchBlocks blocks={card.blocks} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="view-uat-muted-text">
          <ResearchInline text={gaps.emptyLine} />
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Folded extras and the "In the source only" strip
// ---------------------------------------------------------------------------

function Extras({ extras }: { extras: ComposedUatExtra[] }): React.JSX.Element | null {
  if (extras.length === 0) return null;
  return (
    <section id="uat-extras" className="view-block view-uat-extras">
      {extras.map((extra) => (
        <details key={extra.id}>
          <summary>{extra.heading}</summary>
          <div className="view-uat-md">
            <ResearchBlocks blocks={extra.blocks} />
          </div>
        </details>
      ))}
    </section>
  );
}

function SourceOnly({
  entries,
  onShowSource,
}: {
  entries: ComposedUatSourceOnly[];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <nav id="uat-source-only" className="view-block view-uat-source-only" aria-label="In the source only">
      <span className="view-uat-key">In the source only</span>
      <ul>
        {entries.map((entry) => (
          <li key={entry.label}>
            {entry.interactive ? (
              <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
                {entry.label}
              </button>
            ) : (
              <span className="view-uat-source-note" title="Only in the raw file — Source mode drops HTML comments">
                {entry.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function UatSessionView({
  session,
  onShowSource,
  title,
}: {
  session: ComposedUatSession;
  onShowSource: (id: string | null) => void;
  title: string;
}): React.JSX.Element {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [flashed, setFlashed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const toggle = useCallback((key: string): void => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const jump = useCallback((anchorId: string): void => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFlashed(anchorId);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashed(null), 900);
  }, []);

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas" aria-label={`${title} document`}>
        <CurrentTest current={session.current} onJump={jump} />
        <Summary session={session} onJump={jump} />
        <section id="uat-tests" className="view-block view-uat-tests">
          <header className="section-heading">
            <h2>
              <span className="view-uat-section-number">02</span>
              Tests
            </h2>
            <span className="view-uat-aside">Expected · result</span>
          </header>
          {session.testsNote.length > 0 ? (
            <div className="view-uat-note">
              <ResearchBlocks blocks={session.testsNote} />
            </div>
          ) : null}
          <div className="view-uat-pairs">
            {session.tests.map((test) => (
              <Pair
                key={test.anchorId}
                test={test}
                flashed={flashed === test.anchorId}
                open={open}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
        <Gaps gaps={session.gaps} open={open} onToggle={toggle} onJump={jump} />
        <Extras extras={session.extras} />
        <SourceOnly entries={session.sourceOnly} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
