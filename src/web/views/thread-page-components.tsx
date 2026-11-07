// The thread page's React surface (Phase 11, 11-23, VIEW-16, sketch 058 winner A "Status dial"): the header override
// (crumbs, the eyebrow "Thread", the title as the h1 and the slug as meta; the header keeps its own Copy path button) and
// the page body: a dial card (a half-dial of the three statuses with the needle on this thread's own, the status chip, the
// dates and the age of the last update) beside "Next steps" (numbered in the author's order, the first one boxed) over
// "Goal", with "Context" and "References" in two columns below (a reference that resolves to a payload artifact is a link
// with a `complete` square; every other is plain text). Every
// string is author text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop - and
// the page makes no request and touches no storage (T-11-57). A `NAME=value` pair in the prose draws the name and the shared
// "Value not shown" mark. Colour comes only from the tone a mark carries and the theme tokens: open and in progress are
// `in-flight`, resolved `complete`, any other word `quiet`; nothing is `missing` or destructive.
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { ValueNotShown } from '../components/value-not-shown.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import {
  CONTEXT_LABEL,
  CREATED_LABEL,
  GOAL_LABEL,
  NEXT_STEPS_LABEL,
  NOT_FOUND_LABEL,
  REFERENCES_LABEL,
  THREAD_DIAL,
  UPDATED_LABEL,
} from './thread-page.ts';
import type {
  ComposedThread,
  ComposedThreadBlock,
  ComposedThreadRef,
  ComposedThreadStatus,
  ThreadSegment,
} from './thread-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type ThreadHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props: "Thread", the title as the h1 and the slug as meta. The
 * header keeps its own Copy path button for the one file; the sketch draws no lead line, so the manifest's stays off. */
export function threadHeaderProps(model: ComposedThread, artifactTitle: string): ThreadHeaderProps {
  const slug = model.head.slug;
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta: slug === null ? null : <span className="view-thread-meta">{slug}</span>,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: slug ?? model.head.title ?? artifactTitle },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------------------------------------

function Segments({ segments }: { segments: ThreadSegment[] }): React.JSX.Element {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'withheld' ? (
          <span key={index} className="view-thread-withheld">
            <code>{segment.name}</code>
            <ValueNotShown />
          </span>
        ) : (
          <ResearchInline key={index} text={segment.text} />
        ),
      )}
    </>
  );
}

// The dial: a half circle of radius 80 about (100, 100) in a 200 x 112 box. Each status owns an arc (open on the left, in
// progress at the top, resolved on the right); the needle points at the middle of the thread's own. The geometry is plain
// arithmetic on the position, so the picture reads from the status alone.
const DIAL_CENTRE = 100;
const DIAL_RADIUS = 80;
const DIAL_NEEDLE = 62;
const DIAL_ARCS: Record<string, { from: number; to: number; mid: number }> = {
  open: { from: 180, to: 124, mid: 152 },
  in_progress: { from: 118, to: 62, mid: 90 },
  resolved: { from: 56, to: 0, mid: 28 },
};

function dialPoint(degrees: number, radius: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [DIAL_CENTRE + radius * Math.cos(radians), DIAL_CENTRE - radius * Math.sin(radians)];
}

function Dial({ status }: { status: ComposedThreadStatus }): React.JSX.Element {
  const needleAt = status.dial === null ? null : DIAL_ARCS[status.dial]!.mid;
  const needleTip = needleAt === null ? null : dialPoint(needleAt, DIAL_NEEDLE);
  return (
    <div className="view-thread-dial">
      <svg viewBox="0 0 200 112" role="img" aria-label={`Status dial: ${status.word}`}>
        {THREAD_DIAL.map((position) => {
          const arc = DIAL_ARCS[position.key]!;
          const [x0, y0] = dialPoint(arc.from, DIAL_RADIUS);
          const [x1, y1] = dialPoint(arc.to, DIAL_RADIUS);
          return (
            <path
              key={position.key}
              className="view-thread-arc"
              data-tone={status.dial === position.key ? position.tone : undefined}
              d={`M${x0.toFixed(2)} ${y0.toFixed(2)} A${DIAL_RADIUS} ${DIAL_RADIUS} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
            />
          );
        })}
        {needleTip === null ? null : (
          <line
            className="view-thread-needle"
            x1={DIAL_CENTRE}
            y1={DIAL_CENTRE}
            x2={needleTip[0].toFixed(2)}
            y2={needleTip[1].toFixed(2)}
          />
        )}
        <rect className="view-thread-hub" x={DIAL_CENTRE - 5} y={DIAL_CENTRE - 5} width="10" height="10" />
      </svg>
      <div className="view-thread-dial-words">
        {THREAD_DIAL.map((position) => (
          <span key={position.key} data-on={status.dial === position.key ? 'true' : 'false'}>
            {position.word}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The dates and the age as the card prints them; "Updated" and the age are absent when the file has no `updated` date. */
function factsOf(model: ComposedThread): string[] {
  return [
    model.created === null ? null : `${CREATED_LABEL} ${model.created}`,
    model.updated === null ? null : `${UPDATED_LABEL} ${model.updated}`,
    model.age,
  ].filter((fact): fact is string => fact !== null);
}

function hasCard(model: ComposedThread): boolean {
  return model.status !== null || factsOf(model).length > 0;
}

function DialCard({ model }: { model: ComposedThread }): React.JSX.Element | null {
  const { status } = model;
  const facts = factsOf(model);
  if (!hasCard(model)) return null;
  return (
    <aside className="view-thread-dial-card" aria-label={status === null ? 'Thread status' : `Status ${status.word}`}>
      {status === null ? null : <Dial status={status} />}
      <div className="view-thread-center">
        {status === null ? null : (
          <span className="status-chip" data-tone={status.tone}>
            {status.word}
          </span>
        )}
        {facts.length === 0 ? null : (
          <div className="view-thread-facts">
            {facts.map((fact) => (
              <span key={fact} className="view-thread-meta">
                {fact}
              </span>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function Steps({ model }: { model: ComposedThread }): React.JSX.Element | null {
  if (model.steps.length === 0) return null;
  return (
    <section className="view-thread-section">
      <h2 className="view-thread-heading">{NEXT_STEPS_LABEL}</h2>
      <ol className="view-thread-steps">
        {model.steps.map((step) => (
          <li key={step.key} className="view-thread-step" data-first={step.number === 1 ? 'true' : 'false'}>
            <span className="view-thread-no" aria-hidden="true">
              {step.number}
            </span>
            <span className="view-thread-tx">
              <Segments segments={step.segments} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Blocks({ blocks }: { blocks: ComposedThreadBlock[] }): React.JSX.Element {
  return (
    <>
      {blocks.map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index} className="view-thread-dots">
            {block.items.map((item, at) => (
              <li key={at}>
                <span>
                  <Segments segments={item} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index} className="view-thread-prose">
            <Segments segments={block.segments} />
          </p>
        ),
      )}
    </>
  );
}

function Reference({ reference }: { reference: ComposedThreadRef }): React.JSX.Element {
  const tone = reference.state === 'resolved' ? 'complete' : 'quiet';
  return (
    <li className="view-thread-ref" data-state={reference.state}>
      {reference.state === 'text' ? (
        <i className="status-square view-thread-sq" aria-hidden="true" />
      ) : (
        <i className="status-square view-thread-sq" data-tone={tone} aria-hidden="true" />
      )}
      <span>
        {reference.path !== null && reference.url !== null ? (
          <Link className="view-thread-path" to={reference.url}>
            {reference.path}
          </Link>
        ) : null}
        {reference.path !== null && reference.url === null ? (
          <span className="view-thread-path">{reference.path}</span>
        ) : null}
        {reference.state === 'not-found' ? (
          <span className="status-chip" data-tone="quiet">
            {NOT_FOUND_LABEL}
          </span>
        ) : null}
        {reference.text !== null ? (
          reference.path === null ? (
            <ResearchInline text={reference.text} />
          ) : (
            <span className="view-thread-why">
              <ResearchInline text={reference.text} />
            </span>
          )
        ) : null}
      </span>
    </li>
  );
}

/** The thread page: a dial card beside the numbered next steps over the goal, then Context and References in two columns. */
export function ThreadView({ model }: { model: ComposedThread }): React.JSX.Element {
  const hasSide = model.steps.length > 0 || model.goal.length > 0;
  const hasColumns = model.context.length > 0 || model.references.length > 0;
  return (
    <div className="view-thread-root">
      {hasCard(model) || hasSide ? (
        <div className="view-thread-band" data-card={hasCard(model) ? 'true' : 'false'}>
          <DialCard model={model} />
          {hasSide ? (
            <div className="view-thread-side">
              <Steps model={model} />
              {model.goal.length > 0 ? (
                <section className="view-thread-section">
                  <h2 className="view-thread-heading">{GOAL_LABEL}</h2>
                  <Blocks blocks={model.goal} />
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasColumns ? (
        <div className="view-thread-cols">
          <div className="view-thread-col">
            {model.context.length > 0 ? (
              <section className="view-thread-section">
                <h2 className="view-thread-heading">{CONTEXT_LABEL}</h2>
                <Blocks blocks={model.context} />
              </section>
            ) : null}
          </div>
          <div className="view-thread-col">
            {model.references.length > 0 ? (
              <section className="view-thread-section">
                <h2 className="view-thread-heading">{REFERENCES_LABEL}</h2>
                <ul className="view-thread-refs">
                  {model.references.map((reference) => (
                    <Reference key={reference.key} reference={reference} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
