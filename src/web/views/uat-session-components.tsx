// The UAT session page's React surface (quick-261001-qk7, sketch 015 B): the cover facts with the
// "Tested from" line, the current-test attention card or the one-line done state, the "01 Summary"
// square strip and result bar, and the "02 Tests" Expected | Result pairs. Every string derived
// from the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline
// output mapped to React nodes) or as plain React text — never React's raw-HTML injection prop
// (T-qk7-02). Colour comes only from the tone a composed model carries (the maps in
// `uat-session.ts`) and the theme tokens; the parse-degradation tones never appear on document
// content.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { NOW_TONE, RESULT_LABEL, RESULT_ORDER, RESULT_TONE } from './uat-session.ts';
import type {
  ComposedUatCurrent,
  ComposedUatIntro,
  ComposedUatSession,
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
// The view
// ---------------------------------------------------------------------------

export function UatSessionView({
  session,
  title,
}: {
  session: ComposedUatSession;
  onShowSource?: (id: string | null) => void;
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
      </article>
    </div>
  );
}
