import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { SketchRow, SketchesViewModel } from '../../presentation/sketches.ts';
import { EmptyState } from '../components/empty-state.tsx';
import { buttonVariants } from '../components/ui/button.tsx';

async function fetchSketches(): Promise<SketchesViewModel> {
  const response = await fetch('/api/sketches', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Sketches request failed (${response.status})`);
  return (await response.json()) as SketchesViewModel;
}

const DEFAULT_LEDE = 'Every design sketch in .planning/sketches/.';

/** The MANIFEST's design direction can run to a paragraph; the lede keeps only its first sentence. */
function shortDirection(direction: string): string {
  return /^.+?[.!?](?=\s|$)/s.exec(direction)?.[0] ?? direction;
}

function WinnerLine({ sketch }: { sketch: SketchRow }): React.JSX.Element {
  return (
    <span className="sketch-winner">
      <span className="status-chip" data-tone={sketch.decided ? 'complete' : 'quiet'}>
        {sketch.decided ? 'Winner' : 'No winner'}
      </span>
      {sketch.winner ? <span>{sketch.winner}</span> : null}
    </span>
  );
}

/** Splits a MANIFEST winner cell such as "C — status rail" into the picked variant and its
 * description; a cell with no short leading pick stays whole. */
function splitWinner(winner: string): { pick: string | null; text: string } {
  const match = /^(.{1,12}?)\s+[—–]\s+(.+)$/s.exec(winner);
  return match ? { pick: match[1], text: match[2] } : { pick: null, text: winner };
}

function SketchVerdict({ sketch }: { sketch: SketchRow }): React.JSX.Element {
  const { pick, text } = sketch.winner ? splitWinner(sketch.winner) : { pick: null, text: 'Not decided yet' };
  return (
    <div className="sketch-verdict" data-decided={sketch.decided ? 'true' : 'false'}>
      <div className="sketch-verdict-pick">
        <span className="sketch-verdict-label">{sketch.decided ? 'Winner' : 'No winner'}</span>
        {pick ? <span className="sketch-verdict-variant">{pick}</span> : null}
      </div>
      <p className="sketch-verdict-text">{text}</p>
    </div>
  );
}

function SketchListRow({ sketch }: { sketch: SketchRow }): React.JSX.Element {
  const viewClass = buttonVariants({ variant: 'secondary', size: 'sm' });
  const openClass = buttonVariants({ variant: 'ghost', size: 'sm' });
  return (
    <li className="sketch-row">
      <span className="sketch-number">{sketch.number}</span>
      <div className="sketch-main">
        <div className="sketch-heading">
          <h2 className="sketch-name">{sketch.name}</h2>
          {sketch.question ? <p className="sketch-question">{sketch.question}</p> : null}
        </div>
        <SketchVerdict sketch={sketch} />
        {sketch.tags.length > 0 ? (
          <ul className="sketch-tags">
            {sketch.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="sketch-actions">
        {sketch.viewUrl && sketch.folder ? (
          <Link className={viewClass} to={{ search: `?view=${encodeURIComponent(sketch.folder)}` }}>
            View
          </Link>
        ) : null}
        {/* The sketch itself is a server file, not a client route: a plain anchor, never a router Link. */}
        {sketch.viewUrl ? (
          <a className={openClass} href={sketch.viewUrl} target="_blank" rel="noopener noreferrer">
            Open full size
          </a>
        ) : null}
      </div>
    </li>
  );
}

function SketchViewer({ sketch, viewUrl }: { sketch: SketchRow; viewUrl: string }): React.JSX.Element {
  const actionClass = buttonVariants({ variant: 'ghost', size: 'sm' });
  return (
    <section className="sketch-viewer">
      <header className="sketch-viewer-head">
        <Link className="text-link" to={presentationRoutePatterns.sketches}>
          All sketches
        </Link>
        <div>
          <p className="eyebrow">Sketch {sketch.number}</p>
          <h1>{sketch.name}</h1>
          {sketch.question ? <p className="lede">{sketch.question}</p> : null}
        </div>
        <WinnerLine sketch={sketch} />
        <div className="sketch-viewer-actions">
          <a className={actionClass} href={viewUrl} target="_blank" rel="noopener noreferrer">
            Open full size
          </a>
        </div>
      </header>
      {/* sandbox is scripts only: the sketch runs in an opaque origin, so its own JS cannot reach the
          app, its DOM or its API (todo 001). The server's Content-Security-Policy sandbox header on
          every /sketches/* response gives the same guarantee to the full-size tab. */}
      <iframe
        className="sketch-viewer-frame"
        src={viewUrl}
        title={`Sketch ${sketch.number}: ${sketch.name}`}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts"
      />
    </section>
  );
}

/** The /sketches route (todo 001): one row per design sketch under .planning/sketches/. Every value
 * is a React text node - MANIFEST and README text is never turned into markup. */
export function SketchesPage(): React.JSX.Element {
  const sketches = useQuery({ queryKey: ['sketches'], queryFn: fetchSketches });
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  // Opening or leaving a sketch swaps the whole page body; start it at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (sketches.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="roadmap-loading" aria-hidden="true" />
      </main>
    );
  }

  if (sketches.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>Sketches could not be loaded.</h1>
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{sketches.error.message}</p>
        </section>
      </main>
    );
  }

  const model = sketches.data;
  if (!model.available || model.sketches.length === 0) {
    return (
      <main className="page-stack sketches-page">
        <p className="eyebrow">Design sketches</p>
        <h1>Sketches</h1>
        <EmptyState />
      </main>
    );
  }

  // A `view` that names no viewable sketch silently shows the list.
  const viewing = view ? model.sketches.find((sketch) => sketch.folder === view && sketch.viewUrl) : undefined;
  if (viewing?.viewUrl) {
    return (
      <main className="page-stack sketches-page">
        <SketchViewer sketch={viewing} viewUrl={viewing.viewUrl} />
      </main>
    );
  }

  const count = model.sketches.length;
  return (
    <main className="page-stack sketches-page">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Design sketches</p>
          <h1>Sketches</h1>
          <p className="lede">{model.direction ? shortDirection(model.direction) : DEFAULT_LEDE}</p>
          <p className="sketches-tally">
            {count} {count === 1 ? 'sketch' : 'sketches'} · {model.decidedCount} with a winner
          </p>
          {model.manifestUrl ? (
            <Link className="text-link" to={model.manifestUrl}>
              Manifest
            </Link>
          ) : null}
        </div>
      </header>
      <ol className="sketch-list">
        {model.sketches.map((sketch, index) => (
          <SketchListRow key={sketch.folder ?? `row-${index}`} sketch={sketch} />
        ))}
      </ol>
    </main>
  );
}
