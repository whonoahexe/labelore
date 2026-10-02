// The UI-REVIEW scorecard's React surface (quick-261003-528, sketch 018 B): the facts row that shares
// the header's meta row, the hexagon radar beside the verdict / fix pins / method chips, the pillar
// tab bar, and the inspector that puts a pillar's issues and fixes before its passes. Every string
// derived from the document renders only through `ResearchInline` / `ResearchBlocks`
// (tokenizeInline output mapped to React nodes) or as plain React text — never React's raw-HTML
// injection prop (T-528-02). Colour comes only from the tone a composed model carries (the maps in
// `ui-review.ts`) and the theme tokens; the parse-degradation tones never appear on document
// content. The only link is the baseline chip's `Link` to the sibling UI-SPEC route, whose target
// the server generated (T-528-03).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { copyText } from '../components/copy-path-button.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import type {
  ComposedUiReview,
  ComposedUiReviewFix,
  ComposedUiReviewIntro,
  ComposedUiReviewItem,
  ComposedUiReviewPillar,
} from './ui-review.ts';

// ---------------------------------------------------------------------------
// Header: Audited · Phase · Fixes
// ---------------------------------------------------------------------------

export function UiReviewIntroMeta({ intro }: { intro: ComposedUiReviewIntro }): React.JSX.Element {
  return (
    <div className="view-ui-review-cover">
      <p className="view-ui-review-facts">
        {intro.audited ? (
          <span>
            Audited<b>{intro.audited}</b>
          </span>
        ) : null}
        {intro.phase ? (
          <span>
            Phase<b>{intro.phase}</b>
          </span>
        ) : null}
        <span>
          Fixes<b>{intro.fixCount}</b>
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyboard stepping
// ---------------------------------------------------------------------------

export interface StepContext {
  /** True when the event target is an input, textarea, select or contenteditable element. */
  editable: boolean;
  /** True when the target is the page body or sits inside the view. */
  inside: boolean;
  /** True when a modifier key is held. */
  modified: boolean;
}

/** ArrowRight / ArrowLeft -> the next / previous pillar number (1-based, wrapping); null for any
 * other key, a held modifier, an editable target or a target outside the view. */
export function stepPillar(key: string, current: number, count: number, context: StepContext): number | null {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
  if (context.modified || context.editable || !context.inside || count <= 0) return null;
  const zero = current - 1;
  const next = (zero + (key === 'ArrowRight' ? 1 : -1) + count) % count;
  return next + 1;
}

// ---------------------------------------------------------------------------
// Radar
// ---------------------------------------------------------------------------

function Radar({
  review,
  selected,
  onSelect,
}: {
  review: ComposedUiReview;
  selected: number;
  onSelect: (n: number) => void;
}): React.JSX.Element | null {
  const radar = review.radar;
  if (radar === null) return null;
  const g = radar.geometry;
  return (
    <div className="view-ui-review-radar">
      <svg
        viewBox={`0 0 ${g.size} ${g.size}`}
        role="group"
        aria-label={`Pillar scores, ${review.score} of ${review.max}`}
      >
        {g.rings.map((points, index) => (
          <polygon
            key={`ring-${index}`}
            className="view-ui-review-ring"
            data-outer={index === g.rings.length - 1 ? 'true' : undefined}
            points={points}
          />
        ))}
        {g.spokes.map((spoke, index) => (
          <line key={`spoke-${index}`} className="view-ui-review-spoke" {...spoke} />
        ))}
        <polygon className="view-ui-review-shape" points={g.shape} />
        {g.dots.map((dot, index) => (
          <rect
            key={`dot-${index}`}
            className="view-ui-review-dot"
            data-tone={radar.labels[index].tone}
            x={dot.x - 5}
            y={dot.y - 5}
            width={10}
            height={10}
          />
        ))}
        <g className="view-ui-review-centre">
          <text className="view-ui-review-centre-score" x={g.cx} y={g.cy + 4}>
            {review.score}
          </text>
          <text className="view-ui-review-centre-of" x={g.cx} y={g.cy + 22}>
            of {review.max}
          </text>
        </g>
        {radar.labels.map((label, index) => {
          const at = g.labels[index];
          const height = label.fixLabel ? 50 : 40;
          return (
            <g
              key={label.n}
              className="view-ui-review-label"
              data-selected={selected === label.n ? 'true' : undefined}
              role="button"
              tabIndex={0}
              aria-label={`${label.name} ${label.score} of 4`}
              aria-pressed={selected === label.n}
              onClick={() => onSelect(label.n)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(label.n);
                }
              }}
            >
              <rect x={at.x - 46} y={at.y - 24} width={92} height={height} />
              <text className="view-ui-review-label-name" x={at.x} y={at.y - 8} textAnchor="middle">
                {label.short}
              </text>
              <text className="view-ui-review-label-score" x={at.x} y={at.y + 10} textAnchor="middle">
                {label.score}/4
              </text>
              {label.fixLabel ? (
                <text className="view-ui-review-label-fix" x={at.x} y={at.y + 22} textAnchor="middle">
                  {label.fixLabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side column: verdict, fix pins, method chips
// ---------------------------------------------------------------------------

function Side({
  review,
  pressedFix,
  onPin,
}: {
  review: ComposedUiReview;
  pressedFix: number | null;
  onPin: (fix: ComposedUiReviewFix) => void;
}): React.JSX.Element {
  const { method, noFixes } = review;
  return (
    <div className="view-ui-review-side">
      <p className="view-ui-review-verdict">
        {review.verdict.line}
        {review.verdict.fixesLine ? <span className="view-ui-review-muted"> {review.verdict.fixesLine}</span> : null}
      </p>
      {review.fixes.length > 0 ? (
        <div className="view-ui-review-stack">
          <span className="view-ui-review-key">Fixes · click to open its pillar</span>
          <div className="view-ui-review-pins">
            {review.fixes.map((fix) => (
              <button
                key={fix.n}
                type="button"
                className="view-ui-review-pin"
                data-fixpin={fix.n}
                aria-pressed={pressedFix === fix.n}
                onClick={() => onPin(fix)}
              >
                <span className="view-ui-review-pin-n">{fix.n}</span>
                <span>
                  <ResearchInline text={fix.title} />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : noFixes ? (
        <div className="view-ui-review-nothing-fix" data-kind={noFixes.kind}>
          {noFixes.kind === 'clear' ? (
            <>
              <span className="view-ui-review-tick" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>Nothing to fix.</strong>
                {noFixes.note ? (
                  <span className="view-ui-review-muted">
                    {' '}
                    <ResearchInline text={noFixes.note} />
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <span>No fixes listed — each pillar explains its lost points.</span>
          )}
        </div>
      ) : null}
      <div className="view-ui-review-stack">
        <span className="view-ui-review-key">How it was audited</span>
        <div className="view-ui-review-chips">
          {method.status ? (
            <span className="status-chip" data-tone={method.status.tone}>
              {method.status.label}
            </span>
          ) : null}
          <span className="status-chip" data-tone={method.shots.tone} title={method.shots.title ?? undefined}>
            {method.shots.label}
          </span>
          {method.baseline ? (
            method.baseline.url ? (
              <Link
                className="status-chip"
                data-tone={method.tones.baseline}
                to={method.baseline.url}
                title={method.baseline.title}
              >
                {method.baseline.label}
              </Link>
            ) : (
              <span className="status-chip" data-tone={method.tones.baseline} title={method.baseline.title}>
                {method.baseline.label}
              </span>
            )
          ) : null}
          {method.human ? (
            <span className="status-chip" data-tone={method.tones.human}>
              Needs a human look
            </span>
          ) : null}
          {method.supersedes > 0 ? (
            <span className="status-chip" data-tone={method.tones.supersedes}>
              Supersedes {method.supersedes} review{method.supersedes === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {method.extraFacts.map((fact) => (
          <p key={fact.key} className="view-ui-review-fact-line">
            <span className="view-ui-review-key">{fact.key}</span>
            <span>
              <ResearchInline text={fact.value} />
            </span>
          </p>
        ))}
      </div>
      {review.history ? (
        <div className="view-ui-review-stack">
          <span className="view-ui-review-key">Score across reviews</span>
          <div className="view-ui-review-history">
            {review.history.map((bar, index) => (
              <span
                key={index}
                className="view-ui-review-bar"
                data-now={bar.now ? 'true' : undefined}
                title={bar.title}
              >
                <span>{bar.score}</span>
                <i style={{ '--view-ui-review-bar': bar.ratio } as React.CSSProperties} />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar, inspector
// ---------------------------------------------------------------------------

function Squares({ pillar }: { pillar: ComposedUiReviewPillar }): React.JSX.Element {
  return (
    <span className="view-ui-review-squares" aria-hidden="true">
      {pillar.squares.map((square, index) => (
        <i
          key={index}
          className="view-ui-review-sq"
          data-on={square.on ? 'true' : 'false'}
          data-tone={pillar.tone}
        />
      ))}
    </span>
  );
}

function ItemBody({ item }: { item: ComposedUiReviewItem }): React.JSX.Element {
  return (
    <div className="view-ui-review-item-body">
      {item.text !== '' ? (
        <span>
          <ResearchInline text={item.text} />
        </span>
      ) : null}
      {item.sub.length > 0 ? (
        <ul className="view-ui-review-sub">
          {item.sub.map((sub, index) => (
            <li key={index}>
              <ResearchInline text={sub} />
            </li>
          ))}
        </ul>
      ) : null}
      {item.code !== null && item.code !== '' ? (
        <pre className="view-ui-review-code">
          <code>{item.code}</code>
        </pre>
      ) : null}
    </div>
  );
}

function FixCard({
  fix,
  highlight,
  flash,
  open,
  copied,
  onToggle,
  onCopy,
}: {
  fix: ComposedUiReviewFix;
  highlight: boolean;
  flash: boolean;
  open: boolean;
  copied: string | null;
  onToggle: () => void;
  onCopy: (ref: string) => void;
}): React.JSX.Element {
  const why = fix.impact ?? fix.context;
  const clamp = fix.impact === null && fix.contextLong && !open;
  return (
    <div
      className="view-ui-review-fixcard"
      id={fix.anchorId}
      data-highlight={highlight ? 'true' : undefined}
      data-flash={flash ? 'true' : undefined}
    >
      <span className="view-ui-review-key view-ui-review-fix-no">Fix {fix.n}</span>
      <h4>
        <ResearchInline text={fix.title} />
      </h4>
      {why ? (
        <span className="view-ui-review-why" data-clamp={clamp ? 'true' : undefined}>
          <span className="view-ui-review-key">Why · </span>
          <ResearchInline text={why} />
        </span>
      ) : null}
      {fix.impact === null && fix.contextLong ? (
        <button type="button" className="view-ui-review-more" aria-expanded={open} onClick={onToggle}>
          {open ? 'less' : 'more'}
        </button>
      ) : null}
      {fix.fix ? (
        <span>
          <span className="view-ui-review-key">Do · </span>
          <ResearchInline text={fix.fix} />
        </span>
      ) : null}
      {fix.refs.length > 0 ? (
        <span className="view-ui-review-refs">
          {fix.refs.map((ref) => (
            <button
              key={ref}
              type="button"
              className="view-ui-review-ref"
              title={`Copy ${ref}`}
              onClick={() => onCopy(ref)}
            >
              {copied === `${fix.n}:${ref}` ? 'Copied' : ref}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function UiReviewView({
  review,
  onShowSource,
  initialPillar,
  initialFix,
}: {
  review: ComposedUiReview;
  onShowSource: (id: string | null) => void;
  /** Only the static-markup tests set these two. */
  initialPillar?: number;
  initialFix?: number | null;
}): React.JSX.Element {
  const [selected, setSelected] = useState<number>(initialPillar ?? review.initialPillar);
  const [pressedFix, setPressedFix] = useState<number | null>(initialFix ?? null);
  const [flashed, setFlashed] = useState<number | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const flashTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);
  const pendingScroll = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const select = useCallback((n: number): void => {
    setSelected(n);
    setPressedFix(null);
  }, []);

  const pillarCount = review.pillars.length;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      const tag = target?.tagName ?? '';
      const editable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target instanceof HTMLElement && target.isContentEditable);
      const inside = target === document.body || (target !== null && root.current?.contains(target) === true);
      const next = stepPillar(event.key, selected, pillarCount, {
        editable,
        inside,
        modified: event.ctrlKey || event.metaKey || event.altKey || event.shiftKey,
      });
      if (next === null) return;
      event.preventDefault();
      setSelected(next);
      setPressedFix(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, pillarCount]);

  const onPin = useCallback(
    (fix: ComposedUiReviewFix): void => {
      if (pressedFix === fix.n) {
        setPressedFix(null);
        return;
      }
      setPressedFix(fix.n);
      if (fix.pillarNumbers.length > 0) setSelected(fix.pillarNumbers[0]);
      pendingScroll.current = fix.anchorId;
      setFlashed(fix.n);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashed(null), 900);
    },
    [pressedFix],
  );

  // After the render that shows the pressed fix's card, bring it into view.
  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    pendingScroll.current = null;
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  const onCopy = useCallback(async (fixN: number, ref: string): Promise<void> => {
    if (!(await copyText(ref))) return;
    setCopied(`${fixN}:${ref}`);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }, []);

  const toggleMore = useCallback((n: number): void => {
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const pillar = review.pillars.find((p) => p.n === selected) ?? review.pillars[0];
  const pillarFixes = review.fixes.filter((fix) => pillar.fixNumbers.includes(fix.n));
  const card = (fix: ComposedUiReviewFix): React.JSX.Element => (
    <FixCard
      key={fix.n}
      fix={fix}
      highlight={pressedFix === fix.n}
      flash={flashed === fix.n}
      open={opened.has(fix.n)}
      copied={copied}
      onToggle={() => toggleMore(fix.n)}
      onCopy={(ref) => void onCopy(fix.n, ref)}
    />
  );
  const index = review.pillars.indexOf(pillar) + 1;

  return (
    <div className="document-reader-layout" data-outline="false">
      <div className="document-canvas view-ui-review-page" ref={root}>
        <section className="view-ui-review-hero" aria-label="Scorecard">
          <Radar review={review} selected={pillar.n} onSelect={select} />
          <Side review={review} pressedFix={pressedFix} onPin={onPin} />
        </section>

        <section className="view-ui-review-pillars">
          <div className="view-ui-review-tabs" role="tablist" aria-label="Pillars">
            {review.pillars.map((p) => (
              <button
                key={p.n}
                id={p.tabId}
                type="button"
                role="tab"
                className="view-ui-review-tab"
                aria-selected={p.n === pillar.n}
                aria-controls={p.panelId}
                onClick={() => select(p.n)}
              >
                <span className="view-ui-review-tab-name">{p.name}</span>
                <Squares pillar={p} />
              </button>
            ))}
          </div>

          <section
            id="ui-review-inspector"
            className="view-ui-review-inspector"
            role="tabpanel"
            aria-labelledby={pillar.tabId}
            aria-live="polite"
          >
            <div className="view-ui-review-inspector-head">
              <div className="view-ui-review-stack">
                <span className="view-ui-review-key">
                  Pillar {index} of {pillarCount} · ← → to step
                </span>
                <h2>
                  {pillar.name}{' '}
                  <span className="view-ui-review-score" data-tone={pillar.tone}>
                    {pillar.score}/4
                  </span>
                </h2>
              </div>
              {pillar.key ? (
                <span className="view-ui-review-key-finding">
                  <ResearchInline text={pillar.key} />
                </span>
              ) : null}
            </div>
            {pillar.verdict ? (
              <p className="view-ui-review-pillar-verdict">
                <ResearchInline text={pillar.verdict.text} />
              </p>
            ) : null}
            <div className="view-ui-review-columns">
              <div className="view-ui-review-found">
                <h3 className="view-ui-review-col-title">Found · {pillar.found.length}</h3>
                {pillar.found.length > 0 ? (
                  pillar.found.map((item, itemIndex) => (
                    <div key={itemIndex} className="view-ui-review-found-card" data-kind={item.kind}>
                      <span className="view-ui-review-mark" data-kind={item.kind} aria-hidden="true">
                        {item.mark}
                      </span>
                      <ItemBody item={item} />
                    </div>
                  ))
                ) : (
                  <div className="view-ui-review-nothing">Nothing found — every check held.</div>
                )}
                {pillarFixes.map(card)}
              </div>
              <div className="view-ui-review-held">
                <h3 className="view-ui-review-col-title">Held up · {pillar.heldCount}</h3>
                {pillar.held.length > 0 ? (
                  pillar.held.map((group, groupIndex) => (
                    <div key={groupIndex} className="view-ui-review-group">
                      {group.title ? (
                        <div className="view-ui-review-group-title">
                          <ResearchInline text={group.title} />
                        </div>
                      ) : null}
                      <ul className="view-ui-review-evidence">
                        {group.items.map((item, itemIndex) => (
                          <li key={itemIndex} data-kind={item.kind}>
                            <span className="view-ui-review-mark" data-kind={item.kind} aria-hidden="true">
                              {item.mark}
                            </span>
                            <ItemBody item={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="view-ui-review-nothing">No passing evidence listed.</div>
                )}
              </div>
            </div>
          </section>
        </section>

        {review.unlinkedFixes.length > 0 ? (
          <section id="ui-review-unlinked" className="view-ui-review-unlinked">
            <h3 className="view-ui-review-col-title">Not tied to a pillar</h3>
            {review.unlinkedFixes.map(card)}
          </section>
        ) : null}

        {review.back.length > 0 ? (
          <section className="view-ui-review-back" aria-label="Back matter">
            <span className="view-ui-review-key">Back matter</span>
            {review.back.map((section) => (
              <details key={section.id} id={section.id}>
                <summary>{section.heading}</summary>
                <div className="view-ui-review-back-body">
                  {section.files ? (
                    <div className="view-ui-review-files">
                      {section.files.groups.map((group, groupIndex) => (
                        <div key={groupIndex} className="view-ui-review-files-group">
                          {group.caption ? <div className="view-ui-review-group-title">{group.caption}</div> : null}
                          {directoriesOf(group.entries).map((dir) => (
                            <div key={dir.dir}>
                              <div className="view-ui-review-dir">{dir.dir}/</div>
                              <ul>
                                {dir.files.map((file, fileIndex) => (
                                  <li key={fileIndex}>
                                    <code>{file.name}</code>
                                    {file.note ? (
                                      <span className="view-ui-review-muted">
                                        {' '}
                                        — <ResearchInline text={file.note} />
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {group.other.map((line, lineIndex) => (
                            <p key={lineIndex} className="view-ui-review-files-other">
                              <ResearchInline text={line} />
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!section.files
                    ? section.parts.map((part, partIndex) => (
                        <div key={partIndex}>
                          {part.heading ? (
                            <p className="view-ui-review-part-title">
                              <ResearchInline text={part.heading} />
                            </p>
                          ) : null}
                          <ResearchBlocks blocks={part.blocks} />
                        </div>
                      ))
                    : null}
                </div>
              </details>
            ))}
          </section>
        ) : null}

        {review.sourceOnly.length > 0 ? (
          <nav id="ui-review-source-only" className="view-ui-review-source-only" aria-label="In the source only">
            <span className="view-ui-review-key">In the source only</span>
            <ul>
              {review.sourceOnly.map((entry) => (
                <li key={entry.label}>
                  <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

/** Entries grouped by directory, in first-seen order; a bare file name sits under ".". */
function directoriesOf(
  entries: { path: string; note: string }[],
): { dir: string; files: { name: string; note: string }[] }[] {
  const dirs: { dir: string; files: { name: string; note: string }[] }[] = [];
  for (const entry of entries) {
    const slash = entry.path.lastIndexOf('/');
    const dir = slash < 0 ? '.' : entry.path.slice(0, slash);
    const name = slash < 0 ? entry.path : entry.path.slice(slash + 1);
    let bucket = dirs.find((d) => d.dir === dir);
    if (!bucket) {
      bucket = { dir, files: [] };
      dirs.push(bucket);
    }
    bucket.files.push({ name, note: entry.note });
  }
  return dirs;
}
