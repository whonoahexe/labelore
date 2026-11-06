// The Spikes page's React surface (Phase 11, 11-15, VIEW-14, sketch 053 winner A "Verdict board"): the header
// override (crumbs, the eyebrow "Exploration · Spikes", the h1 "Spikes", the verdict counts as the lead, the facts
// as meta and a copy button for the manifest) and the page body: the board, then "Not in the manifest" and the
// wrap-up. Every string is author text rendered as plain React text through ResearchInline - never React's raw-HTML
// injection prop - and no href is built from document text: a tile links to the address the payload gave it
// (T-11-24). Colour comes only from the tone a tile carries and the theme tokens; an invalidated spike is the
// `missing` tone, never destructive. The requirements toggle is a real button whose aria-expanded is React state and
// nothing else: it issues no request, writes no file and no storage.
//
// Each idea lane is a labelled section with the idea key as its h3; each verdict column in a lane is a labelled
// list; each tile is one link whose accessible name reads "{id} {name}, {verdict} {free text}" and whose flags
// (file count, "README says", "Wrapped up") are its description. Under 48rem the stylesheet turns the board into one
// stack per idea with a chip key; the markup is the same.
import { Fragment, useId, useState } from 'react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { Link } from '../nav.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type {
  ComposedSpikes,
  ComposedSpikesColumn,
  ComposedSpikesLane,
  ComposedSpikesTile,
  ComposedSpikesWrapTile,
} from './spikes-page.ts';
import { WRAPPED_UP_WORDS } from './spikes-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type SpikesHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props: "Exploration · Spikes", the h1 "Spikes", the verdict
 * counts as the lead line, the facts as meta and the manifest's path on the copy button. */
export function spikesHeaderProps(model: ComposedSpikes): SpikesHeaderProps {
  const { head } = model;
  return {
    eyebrow: head.eyebrow,
    title: head.title,
    lead:
      head.leadText === null ? null : (
        <span className="view-spikes-lead">
          {head.leadTerms.map((term, index) => (
            <Fragment key={term.word}>
              {index > 0 ? ' · ' : null}
              <b>{term.count}</b> {term.word}
            </Fragment>
          ))}
        </span>
      ),
    meta: (
      <>
        {head.facts.map((fact) => (
          <span key={fact} className="view-spikes-meta">
            {fact}
          </span>
        ))}
      </>
    ),
    path: head.manifestPath,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Spikes' },
    ],
  };
}

function Tile({ tile }: { tile: ComposedSpikesTile }): React.JSX.Element {
  const footId = useId();
  const body = (
    <>
      <span className="view-spikes-top">
        <i className="status-square view-spikes-sq" data-tone={tile.tone ?? undefined} aria-hidden="true" />
        <span className="view-spikes-id">{tile.id}</span>
        {tile.type !== '' ? <span className="view-spikes-word">{tile.type}</span> : null}
      </span>
      <span className="view-spikes-name">
        <ResearchInline text={tile.name} />
      </span>
      {tile.freeText !== '' ? (
        <span className="view-spikes-vtext" title={tile.freeText}>
          <ResearchInline text={tile.freeText} />
        </span>
      ) : null}
      <span className="view-spikes-foot" id={footId}>
        <span>{tile.files}</span>
        {tile.readmeSays !== null ? (
          <span className="view-spikes-flag" title={tile.readmeSaysTitle ?? undefined}>
            {tile.readmeSays}
          </span>
        ) : null}
        {tile.wrappedUp ? <span>{WRAPPED_UP_WORDS}</span> : null}
      </span>
    </>
  );
  if (tile.to === null) {
    return (
      <div className="view-spikes-tile" data-tone={tile.tone ?? undefined}>
        {body}
      </div>
    );
  }
  return (
    <Link
      className="view-spikes-tile"
      to={tile.to}
      data-tone={tile.tone ?? undefined}
      aria-label={tile.label}
      aria-describedby={footId}
      aria-current={tile.active ? 'page' : undefined}
    >
      {body}
    </Link>
  );
}

function ColumnHead({ column }: { column: ComposedSpikesColumn }): React.JSX.Element {
  return (
    <div className="view-spikes-colhead">
      <span className="view-spikes-num">{column.count}</span>
      <span className="status-chip" data-tone={column.tone}>
        <i className="status-square" data-tone={column.tone} aria-hidden="true" />
        {column.label}
      </span>
    </div>
  );
}

function Lane({ lane }: { lane: ComposedSpikesLane }): React.JSX.Element {
  // View state only: it is never sent anywhere or stored, and a reload closes it.
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const listId = useId();
  return (
    <section className="view-spikes-lane" aria-labelledby={titleId}>
      <div className="view-spikes-lanehead">
        <h3 className="view-spikes-lane-title" id={titleId}>
          {lane.key}
        </h3>
        {lane.description !== '' ? (
          <p className="view-spikes-desc" title={lane.description}>
            <ResearchInline text={lane.description} />
          </p>
        ) : null}
        {lane.requirementsLabel !== null ? (
          <button
            type="button"
            className="view-spikes-toggle"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((value) => !value)}
          >
            {lane.requirementsLabel} {open ? '−' : '+'}
          </button>
        ) : null}
      </div>
      {lane.cells.map((cell) =>
        cell.tiles.length === 0 ? (
          <div key={cell.column} className="view-spikes-cell" data-empty="true" aria-hidden="true" />
        ) : (
          <div key={cell.column} className="view-spikes-cell" data-word={cell.label}>
            <ul className="view-spikes-tiles" aria-label={`${cell.label}, ${lane.key}`}>
              {cell.tiles.map((tile) => (
                <li key={tile.key}>
                  <Tile tile={tile} />
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
      {open ? (
        <div className="view-spikes-reqrow" id={listId}>
          <span className="view-spikes-key">Requirements, as the manifest states them</span>
          <ul className="view-spikes-reqs">
            {lane.requirements.map((requirement, index) => (
              <li key={index}>
                <ResearchInline text={requirement} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Board({ model, lanes }: { model: ComposedSpikes; lanes: ComposedSpikesLane[] }): React.JSX.Element {
  return (
    <section className="view-spikes-board-wrap" aria-labelledby="view-spikes-board-title">
      <h2 className="sr-only" id="view-spikes-board-title">
        Verdict board
      </h2>
      <ul className="view-spikes-chipkey" aria-label="Verdict counts">
        {model.columns.map((column) => (
          <li key={column.key}>
            <span className="status-chip" data-tone={column.tone}>
              <i className="status-square" data-tone={column.tone} aria-hidden="true" />
              {column.count} {column.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="view-spikes-board">
        <div className="view-spikes-heads">
          <div className="view-spikes-colhead" data-first="true">
            <span className="view-spikes-key">Idea</span>
          </div>
          {model.columns.map((column) => (
            <ColumnHead key={column.key} column={column} />
          ))}
        </div>
        {lanes.map((lane) => (
          <Lane key={lane.key} lane={lane} />
        ))}
      </div>
    </section>
  );
}

function WrapTile({ tile }: { tile: ComposedSpikesWrapTile }): React.JSX.Element {
  return (
    <Link className="view-spikes-tile" to={tile.to} aria-current={tile.active ? 'page' : undefined}>
      <span className="view-spikes-top">
        <span className="view-spikes-id">{tile.fileName}</span>
      </span>
      <span className="view-spikes-name">
        <ResearchInline text={tile.title} />
      </span>
      {tile.detail !== null ? (
        <span className="view-spikes-vtext" title={tile.detail}>
          <ResearchInline text={tile.detail} />
        </span>
      ) : null}
    </Link>
  );
}

/** The Spikes page: the verdict board grouped by idea, then the folders the manifest does not list and the wrap-up. */
export function SpikesView({ model }: { model: ComposedSpikes }): React.JSX.Element {
  const { notInManifest, wrapUp } = model;
  return (
    <div className="view-spikes-root">
      {model.lanes !== null ? <Board model={model} lanes={model.lanes} /> : null}
      {model.boardNote !== null ? <p className="view-spikes-note">{model.boardNote}</p> : null}
      {notInManifest !== null ? (
        <section className="view-spikes-below" aria-labelledby="view-spikes-orphans-title">
          <h2 className="view-spikes-key" id="view-spikes-orphans-title">
            {notInManifest.title}
          </h2>
          <ul className="view-spikes-strip">
            {notInManifest.tiles.map((tile) => (
              <li key={tile.key}>
                <Tile tile={tile} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {wrapUp.tiles.length > 0 ? (
        <section className="view-spikes-below" aria-labelledby="view-spikes-wrap-title">
          <h2 className="view-spikes-key" id="view-spikes-wrap-title">
            {wrapUp.title}
          </h2>
          <ul className="view-spikes-strip">
            {wrapUp.tiles.map((tile) => (
              <li key={tile.key}>
                <WrapTile tile={tile} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {wrapUp.note !== null ? <p className="view-spikes-note">{wrapUp.note}</p> : null}
    </div>
  );
}
