// The lifted diagram (quick-260929-3x3, sketch 009 Diagram B): the author's ASCII stays real text
// (selectable, copyable, in the accessibility tree) while decorative cards are positioned behind it
// from the measured character width and row height — `placeCards()` in the sketch. The model comes
// from src/rendering/ascii-lift.ts; a figure the model rejects (over the size caps) renders as
// plain text with only its glyphs dimmed. View-agnostic: no research-specific import.
// Card geometry is written imperatively through refs (no setState in effect bodies), on mount, on
// resize, and again once web fonts settle.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { liftDiagram } from '../../rendering/ascii-lift.ts';
import type { LiftCard, LiftedFigure, LiftSegment } from '../../rendering/ascii-lift.ts';

const GLYPH_RUN_RE = /([─│┌┐└┘├┤┬┴┼▼▲►◄→←↑↓]+)/;

/** Fallback for a figure the lift rejects: the plain text with box glyphs dimmed, arrows accented. */
function PlainFigure({ text }: { text: string }): React.JSX.Element {
  return (
    <pre className="figure-frame-plain">
      {text.split(GLYPH_RUN_RE).map((part, index) => {
        if (part === '') return null;
        if (index % 2 === 1) {
          const arrow = /[▼▲►◄→←↑↓]/.test(part);
          return (
            <span key={index} data-glyph={arrow ? 'arrow' : 'line'}>
              {part}
            </span>
          );
        }
        return part;
      })}
    </pre>
  );
}

function Segment({ segment }: { segment: LiftSegment }): React.JSX.Element {
  switch (segment.kind) {
    case 'line':
      return <span data-glyph="line">{segment.text}</span>;
    case 'arrow':
      return <span data-glyph="arrow">{segment.text}</span>;
    case 'node':
      return <span className="lifted-diagram-node">{segment.text}</span>;
    case 'sub':
      return <span className="lifted-diagram-sub">{segment.text}</span>;
    case 'note':
      return <span className="lifted-diagram-note">{segment.text}</span>;
    default:
      return <>{segment.text}</>;
  }
}

/** Cards are placed from the model's own frame (grid units, padding and clamping already applied). */
function placeCard(element: HTMLElement, card: LiftCard, cw: number, lh: number): void {
  element.style.left = `${card.frame.left * cw}px`;
  element.style.top = `${card.frame.top * lh}px`;
  element.style.width = `${card.frame.width * cw}px`;
  element.style.height = `${card.frame.height * lh}px`;
}

function LiftedFigureView({ figure, fit }: { figure: LiftedFigure; fit: boolean }): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spacers = useMemo(() => new Set(figure.spacers), [figure]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const host = hostRef.current;
    const pre = preRef.current;
    if (!wrap || !host || !pre) return;
    let disposed = false;

    const place = (): void => {
      if (disposed) return;
      // Rects are transformed by a fit scale; divide it back out so geometry is in layout units.
      const scale = host.offsetWidth > 0 ? host.getBoundingClientRect().width / host.offsetWidth : 1;
      const probe = document.createElement('span');
      probe.textContent = 'M'.repeat(100);
      probe.style.visibility = 'hidden';
      pre.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 100 / scale;
      probe.remove();
      const firstRow = pre.querySelector('.lifted-diagram-row');
      const lh = firstRow ? firstRow.getBoundingClientRect().height / scale : 0;
      if (cw > 0 && lh > 0) {
        figure.cards.forEach((card, index) => {
          const element = cardRefs.current[index];
          if (element) placeCard(element, card, cw, lh);
        });
      }
      if (fit) {
        const natural = host.offsetWidth;
        const available = wrap.clientWidth;
        const ratio = natural > 0 ? Math.min(1, available / natural) : 1;
        host.style.transformOrigin = 'top left';
        host.style.transform = ratio < 1 ? `scale(${ratio})` : '';
        wrap.style.height = ratio < 1 ? `${host.offsetHeight * ratio}px` : '';
      } else {
        host.style.transform = '';
        wrap.style.height = '';
      }
    };

    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
    observer?.observe(wrap);
    if (typeof document !== 'undefined' && document.fonts) void document.fonts.ready.then(place);
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [figure, fit]);

  return (
    <div className="lifted-diagram-fit" ref={wrapRef}>
      <div className="lifted-diagram" ref={hostRef}>
        {figure.cards.map((card, index) => (
          <div
            key={`${card.kind}-${index}`}
            className="lifted-diagram-card"
            data-kind={card.kind}
            data-widened={card.widened ? 'true' : undefined}
            aria-hidden="true"
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
          />
        ))}
        <pre className="lifted-diagram-text" ref={preRef}>
          {figure.rows.map((segments, row) => (
            <span
              key={row}
              className="lifted-diagram-row"
              data-spacer={spacers.has(row) ? 'true' : undefined}
              aria-hidden={spacers.has(row) ? 'true' : undefined}
            >
              {segments.map((segment, index) => (
                <Segment key={index} segment={segment} />
              ))}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

export function LiftedDiagram({ text, fit }: { text: string; fit: boolean }): React.JSX.Element {
  const figure = useMemo(() => liftDiagram(text), [text]);
  if (figure === null) return <PlainFigure text={text} />;
  return <LiftedFigureView figure={figure} fit={fit} />;
}

/** A framed figure that is not a liftable diagram — the same plain text, glyphs dimmed. */
export function PlainDiagram({ text }: { text: string }): React.JSX.Element {
  return <PlainFigure text={text} />;
}
