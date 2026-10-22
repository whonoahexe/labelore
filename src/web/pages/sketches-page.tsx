import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { SketchRow, SketchesViewModel } from '../../presentation/sketches.ts';
import { EmptyState } from '../components/empty-state.tsx';
import { buttonVariants } from '../components/ui/button.tsx';

async function fetchSketches(): Promise<SketchesViewModel> {
  const response = await fetch('/api/sketches', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Sketches request failed (${response.status})`);
  return (await response.json()) as SketchesViewModel;
}

const DEFAULT_LEDE = 'Every design sketch in .planning/sketches/.';

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

function SketchListRow({ sketch }: { sketch: SketchRow }): React.JSX.Element {
  const actionClass = buttonVariants({ variant: 'ghost', size: 'sm' });
  return (
    <li className="sketch-row">
      <span className="sketch-number">{sketch.number}</span>
      <div className="sketch-main">
        <h2 className="sketch-name">{sketch.name}</h2>
        {sketch.question ? <p className="sketch-question">{sketch.question}</p> : null}
        <div className="sketch-meta">
          <WinnerLine sketch={sketch} />
          {sketch.tags.length > 0 ? (
            <ul className="sketch-tags">
              {sketch.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="sketch-actions">
        {sketch.readmeUrl ? (
          <Link className={actionClass} to={sketch.readmeUrl}>
            README
          </Link>
        ) : null}
        {/* The sketch itself is a server file, not a client route: a plain anchor, never a router Link. */}
        {sketch.viewUrl ? (
          <a className={actionClass} href={sketch.viewUrl} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        ) : null}
      </div>
    </li>
  );
}

/** The /sketches route (todo 001): one row per design sketch under .planning/sketches/. Every value
 * is a React text node - MANIFEST and README text is never turned into markup. */
export function SketchesPage(): React.JSX.Element {
  const sketches = useQuery({ queryKey: ['sketches'], queryFn: fetchSketches });

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

  const count = model.sketches.length;
  return (
    <main className="page-stack sketches-page">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Design sketches</p>
          <h1>Sketches</h1>
          <p className="lede">{model.direction ?? DEFAULT_LEDE}</p>
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
