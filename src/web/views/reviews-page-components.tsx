// The Cross-AI reviews page's React surface (Phase 10, 10-22, VIEW-12, sketch 052 winner A "Overlap"): the header override
// (eyebrow "Phase N · Cross-AI reviews", the phase name as the h1, "Reviewed {date}", "Plans ..." and the reviewer count as
// meta) and the page body. The first screen is one figure and one list: up to three overlapping circles, one per substantive
// reviewer, each concern a square in the region of the reviewers who raised it (an agreed concern large and numbered in an
// overlap, a single-reviewer concern small at its circle's edge, a lane that did not run an empty dashed circle apart), with
// the reviewer cards under it as its key; beside it the Agreed list (or "Concerns" for one reviewer). With four or more
// substantive reviewers the circles are not drawn: the cards and the Agreed list stand alone, each row naming its reviewers, and
// one quiet line says so. Then the Disagreements, side by side and never merged, then each review as written, closed, and the
// file's own consensus labelled as such. Every string is author text rendered as plain React text through ResearchInline -
// never React's raw-HTML injection prop - and no href is built from document text (T-10-43). Colour comes only from the tone a
// composed model carries and the theme tokens: HIGH `missing` (an outline), MEDIUM `in-flight` (filled) and LOW `quiet`
// (dashed) differ by shape and word as well as colour, so they stay apart in the dark theme; never destructive or warning.
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { CONSENSUS_LABEL, REVIEWERS_DISAGREE_LABEL } from './reviews-page.ts';
import { layoutOverlap, maskOf } from './reviews-overlap.ts';
import type { OverlapMark } from './reviews-overlap.ts';
import type { SpecHeaderProps } from './spec-page-components.tsx';
import type {
  ComposedAgreed,
  ComposedConcern,
  ComposedDisagreement,
  ComposedReviewer,
  ComposedReviews,
  ReviewTextBlock,
  ReviewsTone,
} from './reviews-page.ts';

/** What the dock shows: an agreed concern or one concern, by index. */
type Selection = { kind: 'agreed'; index: number } | { kind: 'concern'; id: number };

function ReviewsMeta({ model }: { model: ComposedReviews }): React.JSX.Element {
  const count = model.reviewers.length;
  return (
    <>
      {model.reviewedAt !== null ? <span className="view-reviews-meta">Reviewed {model.reviewedAt}</span> : null}
      {model.plansReviewed.length > 0 ? <span className="view-reviews-meta">Plans {model.plansReviewed.join(', ')}</span> : null}
      <span className="view-reviews-meta">
        {count} {count === 1 ? 'reviewer' : 'reviewers'}
      </span>
    </>
  );
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · Cross-AI reviews", the phase name as the h1 (the
 * file's own title when the page could not resolve one), no lead, and the review date, the plans and the reviewer count as
 * meta. */
export function reviewsHeaderProps(model: ComposedReviews, artifactTitle: string): SpecHeaderProps {
  return {
    eyebrow: model.phase === null ? 'Cross-AI reviews' : `Phase ${model.phase} · Cross-AI reviews`,
    title: model.phaseName ?? artifactTitle,
    lead: null,
    meta: <ReviewsMeta model={model} />,
  };
}

function Square({ tone, done }: { tone?: ReviewsTone; done?: boolean }): React.JSX.Element {
  return <i className="status-square view-reviews-sq" data-tone={tone} data-done={done === true ? 'true' : undefined} aria-hidden="true" />;
}

function SeverityChip({ tone, word }: { tone: ReviewsTone; word: string }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={tone}>
      <Square tone={tone} />
      {word}
    </span>
  );
}

function ReviewerCard({ reviewer }: { reviewer: ComposedReviewer }): React.JSX.Element {
  return (
    <div className="view-reviews-card" data-failed={reviewer.status === 'ok' ? undefined : 'true'}>
      <p className="view-reviews-card-name">{reviewer.name}</p>
      {reviewer.model !== null ? (
        <code className="view-reviews-model" title={reviewer.model}>
          {reviewer.model}
        </code>
      ) : null}
      <div className="view-reviews-chips">
        {reviewer.risk !== null && reviewer.riskTone !== null ? (
          <SeverityChip tone={reviewer.riskTone} word={`Overall risk: ${reviewer.risk}`} />
        ) : null}
        {reviewer.statusLabel !== null ? (
          <span className="status-chip" data-tone="quiet">
            <Square tone="quiet" />
            {reviewer.statusLabel}
          </span>
        ) : null}
        {reviewer.reduced.map((label) => (
          <span key={label} className="status-chip" data-tone="quiet">
            <Square tone="quiet" />
            {label}
          </span>
        ))}
      </div>
      {reviewer.coverage.length > 0 ? (
        <span className="view-reviews-cov">
          {reviewer.coverage.map((c) => (
            <span key={c.id}>
              <Square tone={c.done ? undefined : 'quiet'} done={c.done} />
              {c.id}
              {c.done ? '' : ' not reviewed'}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Cards({ reviewers }: { reviewers: readonly ComposedReviewer[] }): React.JSX.Element {
  return (
    <>
      {reviewers.map((reviewer) => (
        <ReviewerCard key={reviewer.index} reviewer={reviewer} />
      ))}
    </>
  );
}

function namesOf(model: ComposedReviews, indexes: readonly number[]): string {
  return indexes.map((i) => model.reviewers[i].name).join(', ');
}

/** The overlap drawing: laid out at its real measured width after layout, so its labels keep the page's own font sizes at
 * 390. The first paint uses the sketch's 600px box so server and test markup is deterministic. */
function Drawing({
  model,
  selection,
  onSelect,
}: {
  model: ComposedReviews;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
}): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const el = box.current;
    if (el === null) return undefined;
    const measure = (): void => {
      if (el.clientWidth > 0) setWidth(el.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const drawn = model.drawn;
  const positionOf = (reviewer: number): number => drawn.indexOf(reviewer);
  const marks: OverlapMark[] = [];
  for (const a of model.agreed) {
    marks.push({ id: `a${a.index}`, mask: maskOf(a.reviewers.map(positionOf).filter((p) => p >= 0)), large: true, no: a.no });
  }
  for (const id of model.singles) {
    const c = model.concerns[id];
    marks.push({ id: `c${id}`, mask: maskOf([positionOf(c.reviewer)]), large: false, no: null });
  }
  const absent = model.reviewers.filter((r) => r.status !== 'ok');
  const layout = layoutOverlap(width, drawn.length, marks, absent.length);
  const toneOfMark = (id: string): ReviewsTone | null => {
    if (id.charCodeAt(0) === 97) return model.agreed[Number(id.slice(1))]?.tone ?? null;
    return model.concerns[Number(id.slice(1))]?.tone ?? null;
  };
  const labelOfMark = (id: string): string => {
    if (id.charCodeAt(0) === 97) {
      const a = model.agreed[Number(id.slice(1))];
      return a === undefined ? '' : `${a.no}, agreed, ${a.word}: ${namesOf(model, a.reviewers)}`;
    }
    const c = model.concerns[Number(id.slice(1))];
    return c === undefined ? '' : `${model.reviewers[c.reviewer].name}, ${c.word}${c.planId === null ? '' : `, plan ${c.planId}`}`;
  };
  const selected = (id: string): boolean =>
    selection !== null &&
    (id.charCodeAt(0) === 97 ? selection.kind === 'agreed' && selection.index === Number(id.slice(1)) : selection.kind === 'concern' && selection.id === Number(id.slice(1)));
  const pick = (id: string): void =>
    onSelect(id.charCodeAt(0) === 97 ? { kind: 'agreed', index: Number(id.slice(1)) } : { kind: 'concern', id: Number(id.slice(1)) });
  return (
    <div className="view-reviews-draw">
      <div ref={box} className="view-reviews-draw-in">
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} height={layout.height} role="group" aria-label="Who raised which concern">
          {layout.circles.map((c, i) => (
            <circle key={i} className="view-reviews-circle" cx={c.cx} cy={c.cy} r={c.r} />
          ))}
          {layout.circles.map((c, i) => (
            <text key={`n${i}`} className="view-reviews-circle-name" x={c.labelX} y={c.labelY} textAnchor={c.anchor}>
              {model.reviewers[drawn[i]].name}
            </text>
          ))}
          {layout.absent.map((c, i) => (
            <g key={`x${i}`}>
              <circle className="view-reviews-circle" data-absent="true" cx={c.cx} cy={c.cy} r={c.r} />
              <text className="view-reviews-circle-name" data-small="true" x={c.labelX} y={c.labelY} textAnchor="middle">
                {absent[i].name}
              </text>
            </g>
          ))}
          {layout.squares.map((sq) => {
            const tone = toneOfMark(sq.id);
            return (
              <g
                key={sq.id}
                className="view-reviews-mark"
                role="button"
                tabIndex={0}
                aria-label={labelOfMark(sq.id)}
                aria-pressed={selected(sq.id)}
                data-on={selected(sq.id) ? 'true' : undefined}
                onClick={() => pick(sq.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    pick(sq.id);
                  }
                }}
              >
                <rect x={sq.x} y={sq.y} width={sq.size} height={sq.size} data-tone={tone ?? 'quiet'} />
                {sq.no !== null && sq.noX !== null && sq.noY !== null ? (
                  <text className="view-reviews-no" x={sq.noX} y={sq.noY}>
                    {sq.no}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Legend({ grouped }: { grouped: boolean }): React.JSX.Element {
  return (
    <div className="view-reviews-foot">
      <span>
        <Square tone="missing" />
        HIGH
      </span>
      <span>
        <Square tone="in-flight" />
        MEDIUM
      </span>
      <span>
        <Square tone="quiet" />
        LOW
      </span>
      <span>one square per concern{grouped ? '; a large square is an agreed concern' : ''}</span>
    </div>
  );
}

function AgreedRow({
  model,
  agreed,
  pressed,
  onSelect,
}: {
  model: ComposedReviews;
  agreed: ComposedAgreed;
  pressed: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <li>
      <button type="button" className="view-reviews-ag" aria-pressed={pressed} data-agreed={agreed.index} onClick={onSelect}>
        <span className="view-reviews-ag-no">{agreed.no}</span>
        <span className="view-reviews-ag-t">
          <ResearchInline text={agreed.text} />
        </span>
        <span className="view-reviews-ag-m">
          <SeverityChip tone={agreed.tone} word={agreed.word} />
          <span className="view-reviews-meta">
            {namesOf(model, agreed.reviewers)}
            {agreed.planId === null ? '' : ` · Plan ${agreed.planId}`}
          </span>
        </span>
      </button>
    </li>
  );
}

function ConcernRow({
  model,
  concern,
  pressed,
  onSelect,
}: {
  model: ComposedReviews;
  concern: ComposedConcern;
  pressed: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <li>
      <button type="button" className="view-reviews-ag" aria-pressed={pressed} data-concern={concern.id} onClick={onSelect}>
        <span className="view-reviews-ag-no">
          <Square tone={concern.tone} />
        </span>
        <span className="view-reviews-ag-t">
          <ResearchInline text={concern.text} />
        </span>
        <span className="view-reviews-ag-m">
          <SeverityChip tone={concern.tone} word={concern.word} />
          <span className="view-reviews-meta">
            {model.reviewers[concern.reviewer].name}
            {concern.planId === null ? '' : ` · Plan ${concern.planId}`}
          </span>
        </span>
      </button>
    </li>
  );
}

/** The list beside the figure (or under the cards): "Agreed" with its count for two or more reviewers, "Concerns" for one. */
function Side({
  model,
  selection,
  onSelect,
}: {
  model: ComposedReviews;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
}): React.JSX.Element | null {
  const overlap = model.layout === 'overlap';
  if (!model.grouped) {
    if (model.concerns.length === 0) return null;
    return (
      <div className="view-reviews-side">
        <h2 className="view-reviews-h">
          Concerns <span className="view-reviews-meta">{model.concerns.length}</span>
        </h2>
        <ol className="view-reviews-list">
          {model.concerns.map((c) => (
            <ConcernRow
              key={c.id}
              model={model}
              concern={c}
              pressed={selection?.kind === 'concern' && selection.id === c.id}
              onSelect={() => onSelect({ kind: 'concern', id: c.id })}
            />
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div className="view-reviews-side">
      <h2 className="view-reviews-h">
        Agreed <span className="view-reviews-meta">{model.agreed.length}</span>
      </h2>
      {model.agreed.length > 0 ? (
        <ol className="view-reviews-list">
          {model.agreed.map((a) => (
            <AgreedRow
              key={a.index}
              model={model}
              agreed={a}
              pressed={selection?.kind === 'agreed' && selection.index === a.index}
              onSelect={() => onSelect({ kind: 'agreed', index: a.index })}
            />
          ))}
        </ol>
      ) : (
        <p className="view-reviews-zero">
          <Square tone="quiet" />
          <span className="view-reviews-num">0</span>
        </p>
      )}
      {overlap ? (
        <p className="view-reviews-meta">{model.singles.length} raised by one reviewer, at the circles' edges</p>
      ) : model.singles.length > 0 ? (
        <>
          <h2 className="view-reviews-h">
            Raised by one reviewer <span className="view-reviews-meta">{model.singles.length}</span>
          </h2>
          <ol className="view-reviews-list">
            {model.singles.map((id) => (
              <ConcernRow
                key={id}
                model={model}
                concern={model.concerns[id]}
                pressed={selection?.kind === 'concern' && selection.id === id}
                onSelect={() => onSelect({ kind: 'concern', id })}
              />
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}

const HOW_WORDS: ReadonlyMap<ComposedAgreed['how'], string> = new Map([
  ['words', 'Matched: the same opening words on the same plan'],
  ['file', "Matched: named together in the file's consensus"],
  ['both', "Matched: the same opening words, and named together in the file's consensus"],
]);

/** The dock under the row: an agreed concern sets each reviewer's own words side by side and says how it was matched; one
 * concern shows its text. Closing it clears the selection. */
function Dock({
  model,
  selection,
  onClose,
}: {
  model: ComposedReviews;
  selection: Selection;
  onClose: () => void;
}): React.JSX.Element | null {
  if (selection.kind === 'agreed') {
    const a = model.agreed[selection.index];
    if (a === undefined) return null;
    return (
      <div className="view-reviews-dock" data-dock="agreed">
        <div className="view-reviews-dock-head">
          <span className="view-reviews-key">
            Agreed · {a.no}
            {a.planId === null ? '' : ` · Plan ${a.planId}`}
          </span>
          <SeverityChip tone={a.tone} word={a.word} />
          <button type="button" className="view-reviews-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="view-reviews-prose view-reviews-strong">
          <ResearchInline text={a.text} />
        </p>
        <p className="view-reviews-meta">{HOW_WORDS.get(a.how) ?? ''}</p>
        <div className="view-reviews-side-by-side" style={{ '--view-reviews-n': a.concerns.length } as React.CSSProperties}>
          {a.concerns.map((id) => {
            const c = model.concerns[id];
            return (
              <div key={id} className="view-reviews-said">
                <span className="view-reviews-said-head">
                  <span className="view-reviews-name">{model.reviewers[c.reviewer].name}</span>
                  <SeverityChip tone={c.tone} word={c.word} />
                </span>
                <p className="view-reviews-prose">
                  <ResearchInline text={c.text} />
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const c = model.concerns[selection.id];
  if (c === undefined) return null;
  return (
    <div className="view-reviews-dock" data-dock="concern">
      <div className="view-reviews-dock-head">
        <span className="view-reviews-key">
          {model.reviewers[c.reviewer].name}
          {c.planId === null ? '' : ` · Plan ${c.planId}`}
        </span>
        <SeverityChip tone={c.tone} word={c.word} />
        <button type="button" className="view-reviews-close" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="view-reviews-prose">
        <ResearchInline text={c.text} />
      </p>
    </div>
  );
}

/** One disagreement: a dashed quiet block with its title and the in-flight "Reviewers disagree" chip, each reviewer's stance
 * side by side, and a hatched cell for a reviewer who stated none. Never a merged verdict. */
function Disagreement({ model, item }: { model: ComposedReviews; item: ComposedDisagreement }): React.JSX.Element {
  return (
    <div className="view-reviews-dis" data-kind={item.kind}>
      <div className="view-reviews-dis-head">
        <h3 className="view-reviews-dis-title">{item.title}</h3>
        <SeverityChip tone="in-flight" word={REVIEWERS_DISAGREE_LABEL} />
      </div>
      <div className="view-reviews-dis-row" style={{ '--view-reviews-n': item.stances.length + item.out.length } as React.CSSProperties}>
        {item.stances.map((s) => (
          <div key={s.reviewer} className="view-reviews-stance">
            <span className="view-reviews-name">{model.reviewers[s.reviewer].name}</span>
            {s.tone !== null ? (
              <SeverityChip tone={s.tone} word={s.value} />
            ) : (
              <span className="status-chip view-reviews-stance-word">{s.value}</span>
            )}
          </div>
        ))}
        {item.out.map((o) => (
          <div key={o.reviewer} className="view-reviews-stance" data-out="true">
            <span className="view-reviews-name">{model.reviewers[o.reviewer].name}</span>
            <span className="view-reviews-meta view-reviews-out">{o.why}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Blocks({ blocks }: { blocks: readonly ReviewTextBlock[] }): React.JSX.Element {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'plan':
            return (
              <p key={index} className="view-reviews-plan-h">
                <ResearchInline text={block.text} />
              </p>
            );
          case 'label':
            return (
              <p key={index} className="view-reviews-key">
                <ResearchInline text={block.text} />
              </p>
            );
          case 'list':
            return (
              <ul key={index} className="view-reviews-bul">
                {block.items.map((item, i) => (
                  <li key={i}>
                    <ResearchInline text={item} />
                  </li>
                ))}
              </ul>
            );
          case 'code':
            return (
              <pre key={index} className="view-reviews-code">
                {block.text}
              </pre>
            );
          default:
            return (
              <p key={index} className="view-reviews-prose">
                <ResearchInline text={block.text} />
              </p>
            );
        }
      })}
    </>
  );
}

/** One closed bar: a native details whose text is rendered only once it is opened. */
function Bar({ name, count, blocks, kind }: { name: string; count: string; blocks: readonly ReviewTextBlock[]; kind: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <details className="view-reviews-bar" data-bar={kind} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="view-reviews-bar-sum">
        <ChevronRight className="view-reviews-chev" aria-hidden="true" />
        <span className="view-reviews-bar-name">{name}</span>
        <span className="view-reviews-bar-count">{count}</span>
      </summary>
      {open ? (
        <div className="view-reviews-bar-body">
          <Blocks blocks={blocks} />
        </div>
      ) : null}
    </details>
  );
}

function plansCount(reviewer: ComposedReviewer): string {
  if (reviewer.status === 'failed') return 'review failed';
  if (reviewer.status === 'skipped') return 'review skipped';
  return reviewer.planCount === 0 ? '' : `${reviewer.planCount} ${reviewer.planCount === 1 ? 'plan' : 'plans'}`;
}

function Bars({ model }: { model: ComposedReviews }): React.JSX.Element {
  return (
    <div className="view-reviews-bars">
      <p className="view-reviews-key">Each review as written</p>
      <div className="view-reviews-bar-list">
        {model.reviewers.map((r) => (
          <Bar key={r.index} kind="review" name={`${r.name} Review`} count={plansCount(r)} blocks={r.blocks} />
        ))}
        {model.others.map((o, index) => (
          <Bar key={`o${index}`} kind="other" name={o.heading} count="" blocks={o.blocks} />
        ))}
        {model.consensus !== null ? <Bar kind="consensus" name={CONSENSUS_LABEL} count="the file’s own" blocks={model.consensus.blocks} /> : null}
      </div>
    </div>
  );
}

export function ReviewsView({ model }: { model: ComposedReviews }): React.JSX.Element {
  const [selection, setSelection] = useState<Selection | null>(null);
  const toggle = (next: Selection): void =>
    setSelection((current) => {
      if (current === null || current.kind !== next.kind) return next;
      if (current.kind === 'agreed' && next.kind === 'agreed') return current.index === next.index ? null : next;
      if (current.kind === 'concern' && next.kind === 'concern') return current.id === next.id ? null : next;
      return next;
    });
  const overlap = model.layout === 'overlap';
  const sideLabel = model.grouped ? 'Agreed' : 'Concerns';
  return (
    <div className="view-reviews-page">
      <section className="view-reviews-row" data-layout={model.layout} aria-label={overlap ? sideLabel : 'Reviewers'}>
        {overlap ? (
          <figure className="view-reviews-fig" aria-label="Who raised which concern">
            <Drawing model={model} selection={selection} onSelect={toggle} />
            <div className="view-reviews-key-cards">
              <Cards reviewers={model.reviewers} />
            </div>
            <Legend grouped={model.grouped} />
          </figure>
        ) : (
          <div className="view-reviews-roster">
            <p className="view-reviews-key">Reviewers</p>
            <div className="view-reviews-key-cards">
              <Cards reviewers={model.reviewers} />
            </div>
            {model.note !== null ? <p className="view-reviews-note">{model.note}</p> : null}
          </div>
        )}
        <Side model={model} selection={selection} onSelect={toggle} />
      </section>
      {selection !== null ? <Dock model={model} selection={selection} onClose={() => setSelection(null)} /> : null}
      {model.disagreements.length > 0 ? (
        <section className="view-reviews-group" aria-labelledby="view-reviews-dis-h">
          <h2 className="view-reviews-h" id="view-reviews-dis-h">
            Disagreements <span className="view-reviews-meta">{model.disagreements.length}</span>
          </h2>
          {model.disagreements.map((item, index) => (
            <Disagreement key={index} model={model} item={item} />
          ))}
        </section>
      ) : null}
      <Bars model={model} />
    </div>
  );
}
