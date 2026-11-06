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
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronRight, FileCode, FileOutput, FileText, X } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { RecordDisagreement } from '../components/record-disagreement.tsx';
import { Link, useProjectLocation, useProjectNavigate } from '../nav.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import type {
  ComposedSpikes,
  ComposedSpikesBar,
  ComposedSpikesChip,
  ComposedSpikesColumn,
  ComposedSpikesFile,
  ComposedSpikesLane,
  ComposedSpikesSheet,
  ComposedSpikesTile,
  ComposedSpikesWrapTile,
} from './spikes-page.ts';
import { SHEET_CLOSE_LABEL, WRAPPED_UP_WORDS } from './spikes-page.ts';

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
      data-spike-folder={tile.folder ?? undefined}
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

// ---------------------------------------------------------------------------------------------------------
// The sheet (11-16, D-01, D-07): the shared Dialog docked right. Esc and the scrim close it by going to the manifest's
// address (or hiding it in place when the project has no manifest); a router state key carries the opening tile's
// folder across that navigation so focus returns to it. File rows are names and sizes in text: no anchor, no request,
// no preview. Section bodies reach the DOM only through the page's sanitised `renderHtml`.
// ---------------------------------------------------------------------------------------------------------

type RenderHtml = ((html: string) => React.ReactNode) | undefined;

const FILE_ICON = { notes: FileText, script: FileCode, output: FileOutput } as const;

function Chip({ chip }: { chip: ComposedSpikesChip }): React.JSX.Element {
  const body = (
    <>
      <i className="status-square view-spikes-sq" data-tone={chip.tone ?? undefined} aria-hidden="true" />
      <span>
        <ResearchInline text={chip.label} />
      </span>
    </>
  );
  // An id that names no spike with a README stays plain text.
  if (chip.to === null) {
    return (
      <span className="view-spikes-rel" data-plain="true">
        {body}
      </span>
    );
  }
  return (
    <Link className="view-spikes-rel" to={chip.to}>
      {body}
    </Link>
  );
}

function ChipRow({ label, chips }: { label: string; chips: ComposedSpikesChip[] }): React.JSX.Element | null {
  if (chips.length === 0) return null;
  return (
    <div className="view-spikes-block">
      <span className="view-spikes-key">{label}</span>
      <ul className="view-spikes-rels">
        {chips.map((chip, index) => (
          <li key={`${chip.id}-${index}`}>
            <Chip chip={chip} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilesList({ title, files }: { title: string; files: ComposedSpikesFile[] }): React.JSX.Element {
  return (
    <div className="view-spikes-block">
      <span className="view-spikes-key">{title}</span>
      <div className="view-spikes-files">
        <ul>
          {files.map((file) => {
            const Icon = FILE_ICON[file.kind];
            return (
              <li key={file.name}>
                <Icon className="view-spikes-file-icon" aria-hidden="true" />
                <span className="view-spikes-file-name">{file.name}</span>
                <span className="view-spikes-file-kind">{file.kind}</span>
                <span className="view-spikes-file-size">{file.size}</span>
              </li>
            );
          })}
        </ul>
        <p className="view-spikes-files-note">Listed by name only. Labelore never runs or opens these files.</p>
      </div>
    </div>
  );
}

function Bars({ bars, renderHtml }: { bars: ComposedSpikesBar[]; renderHtml: RenderHtml }): React.JSX.Element | null {
  if (bars.length === 0) return null;
  return (
    <div className="view-spikes-bars">
      {bars.map((bar) => (
        <details key={bar.key} className="view-spikes-bar">
          <summary className="view-spikes-bar-sum">
            <ChevronRight className="view-spikes-bar-chev" aria-hidden="true" />
            <span className="view-spikes-bar-name">
              <ResearchInline text={bar.title} />
            </span>
          </summary>
          <div className="view-spikes-bar-body view-spikes-md">{renderHtml ? renderHtml(stripLeadingHeading(bar.html)) : null}</div>
        </details>
      ))}
    </div>
  );
}

function Head({ sheet, titleId }: { sheet: ComposedSpikesSheet; titleId: string }): React.JSX.Element {
  return (
    <div className="view-spikes-sheet-head">
      <span className="view-spikes-key">
        <ResearchInline text={sheet.eyebrow} />
      </span>
      <h2 className="view-spikes-sheet-title" id={titleId}>
        <ResearchInline text={sheet.title} />
      </h2>
    </div>
  );
}

/** The sheet's content for the open panel; the Dialog shell around it supplies the close button and the title id. */
export function SheetBody({
  sheet,
  titleId,
  renderHtml,
}: {
  sheet: ComposedSpikesSheet;
  titleId: string;
  renderHtml?: (html: string) => React.ReactNode;
}): React.JSX.Element {
  if (sheet.kind === 'conventions') {
    return (
      <article className="view-spikes-panel">
        <Head sheet={sheet} titleId={titleId} />
        <Bars bars={sheet.sections} renderHtml={renderHtml} />
      </article>
    );
  }
  if (sheet.kind === 'wrap-up') {
    return (
      <article className="view-spikes-panel">
        <Head sheet={sheet} titleId={titleId} />
        {sheet.skill !== null ? (
          <p className="view-spikes-note">
            Packaged into the project skill <code>{sheet.skill}</code>
          </p>
        ) : null}
        <ChipRow label="Processed spikes" chips={sheet.processed} />
        {sheet.findingsHtml !== null ? (
          <div className="view-spikes-block">
            <span className="view-spikes-key">Key findings</span>
            <div className="view-spikes-md">{renderHtml ? renderHtml(stripLeadingHeading(sheet.findingsHtml)) : null}</div>
          </div>
        ) : null}
        {sheet.notProcessed !== null ? <p className="view-spikes-note">{sheet.notProcessed}</p> : null}
      </article>
    );
  }
  const { verdict, disagreement, validates } = sheet;
  return (
    <article className="view-spikes-panel">
      <Head sheet={sheet} titleId={titleId} />
      <div className="view-spikes-verdict">
        <span className="status-chip view-spikes-chip-big" data-tone={verdict.tone ?? undefined} data-plain={verdict.tone === null ? 'true' : undefined}>
          {verdict.tone !== null ? <i className="status-square" data-tone={verdict.tone} aria-hidden="true" /> : null}
          {verdict.word}
        </span>
        {verdict.freeText !== '' ? (
          <span className="view-spikes-vtext-open">
            <ResearchInline text={verdict.freeText} />
          </span>
        ) : null}
      </div>
      {disagreement !== null ? (
        <div className="view-spikes-block">
          <RecordDisagreement field={disagreement.field} left={disagreement.manifest} right={disagreement.readme} />
          <p className="view-spikes-note">{disagreement.note}</p>
        </div>
      ) : null}
      {sheet.orphanNote !== null ? <p className="view-spikes-note">{sheet.orphanNote}</p> : null}
      {validates !== null ? (
        <div className="view-spikes-block">
          <span className="view-spikes-key">What this validates</span>
          {validates.kind === 'gwt' ? (
            <dl className="view-spikes-gwt">
              {(
                [
                  ['Given', validates.given],
                  ['When', validates.when],
                  ['Then', validates.then],
                ] as const
              ).map(([word, value]) => (
                <div key={word}>
                  <dt className="view-spikes-key">{word}</dt>
                  <dd>
                    <ResearchInline text={value} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="view-spikes-whole">
              <ResearchInline text={validates.text} />
            </p>
          )}
        </div>
      ) : null}
      {sheet.resultsHtml !== null ? (
        <div className="view-spikes-block">
          <span className="view-spikes-key">Results</span>
          <div className="view-spikes-md">{renderHtml ? renderHtml(stripLeadingHeading(sheet.resultsHtml)) : null}</div>
        </div>
      ) : null}
      <ChipRow label="Related" chips={sheet.related} />
      <FilesList title={sheet.filesTitle} files={sheet.files} />
      {sheet.pauseTo !== null ? (
        <p className="view-spikes-note">
          <Link className="view-spikes-pause" to={sheet.pauseTo}>
            Paused work
          </Link>
        </p>
      ) : null}
      {sheet.tags.length > 0 ? (
        <p className="view-spikes-tags">
          <span className="view-spikes-key">Tags</span> <span>{sheet.tags.join(', ')}</span>
        </p>
      ) : null}
      <Bars bars={sheet.bars} renderHtml={renderHtml} />
    </article>
  );
}

function Sheet({
  sheet,
  renderHtml,
  onClose,
}: {
  sheet: ComposedSpikesSheet;
  renderHtml: RenderHtml;
  onClose: () => void;
}): React.JSX.Element {
  const titleId = useId();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="view-spikes-scrim" />
        <Dialog.Popup className="view-spikes-sheet" aria-labelledby={titleId} finalFocus={false}>
          <div className="view-spikes-sheet-bar">
            <span className="view-spikes-addr">{sheet.address}</span>
            <Dialog.Close className="view-spikes-close" aria-label={SHEET_CLOSE_LABEL}>
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <SheetBody sheet={sheet} titleId={titleId} renderHtml={renderHtml} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The folder a close navigation asks focus to return to, read from the router state it was sent with. */
function focusKeyOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !Object.hasOwn(state, 'spikesFocus')) return null;
  const key = (state as { spikesFocus?: unknown }).spikesFocus;
  return typeof key === 'string' && key !== '' ? key : null;
}

/** The Spikes page: the verdict board grouped by idea, then the folders the manifest does not list and the wrap-up;
 * when the address names a spike, the wrap-up or the conventions, that panel opens over the board in a sheet. */
export function SpikesView({
  model,
  renderHtml,
}: {
  model: ComposedSpikes;
  /** Renders a section of the open file through the document's sanitised path; without it those sections hold no body. */
  renderHtml?: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const { notInManifest, wrapUp, sheet } = model;
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useProjectNavigate();
  const { state } = useProjectLocation();
  // A sheet hidden in place (the project has no manifest to go back to) stays hidden until the address names another.
  const [hidden, setHidden] = useState<string | null>(null);
  const [localFocus, setLocalFocus] = useState<string | null>(null);
  const open = sheet !== null && hidden !== sheet.key;
  const focusKey = localFocus ?? focusKeyOf(state);

  useEffect(() => {
    if (open || focusKey === null) return;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      if (root === null) return;
      for (const tile of root.querySelectorAll<HTMLElement>('[data-spike-folder]')) {
        if (tile.dataset.spikeFolder === focusKey) {
          tile.focus();
          break;
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, focusKey]);

  function close(): void {
    if (sheet === null) return;
    if (sheet.closeTo === null) {
      setLocalFocus(sheet.focus);
      setHidden(sheet.key);
      return;
    }
    navigate(sheet.closeTo, { state: { spikesFocus: sheet.focus } });
  }

  return (
    <div className="view-spikes-root" ref={rootRef}>
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
      {open && sheet !== null ? <Sheet key={sheet.key} sheet={sheet} renderHtml={renderHtml} onClose={close} /> : null}
    </div>
  );
}
