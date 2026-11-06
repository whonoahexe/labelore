// The Indexes page's React surface (Phase 11, 11-18, VIEW-19, sketch 055 winner A "Instrument grid"): the header
// override (crumbs, the eyebrow "Exploration · Indexes", the h1 "Indexes" and the facts as meta) and the page body:
// a grid with one tile per index file. A tile that opens is a real button (aria-expanded, aria-controls) whose click
// navigates to the file's own address; the open tile spans the full row in place, shows its panel and has a Close
// button, and Esc closes it. Closing collapses the tile in place and sends nothing and stores nothing (X3). The
// not-built Graph tile is a ghost: not focusable, nothing to open.
//
// Every string is author text rendered as plain React text - never React's raw-HTML injection prop - and no href is
// built from document text: a tile opens the address the payload gave it (T-11-28). Only the bounded summary reaches
// this file, so there is no raw intel or graph JSON to show. Colour comes only from a tone a chip or cell carries and
// the theme tokens; a failed last update is the `missing` tone, never destructive.
import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { WarningChip } from '../components/warning-chip.tsx';
import { useProjectNavigate } from '../nav.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type {
  ComposedIndexes,
  ComposedIndexesCell,
  ComposedIndexesChip,
  ComposedIndexesCount,
  ComposedIndexesFoot,
  ComposedIndexesPanel,
  ComposedIndexesTile,
} from './indexes-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type IndexesHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props: "Exploration · Indexes", the h1 "Indexes" and the
 * facts as meta. No copy-path for a whole folder: each tile carries its own path. */
export function indexesHeaderProps(model: ComposedIndexes): IndexesHeaderProps {
  const { head } = model;
  return {
    eyebrow: head.eyebrow,
    title: head.title,
    meta: (
      <>
        {head.facts.map((fact) => (
          <span key={fact} className="view-indexes-meta">
            {fact}
          </span>
        ))}
      </>
    ),
    path: null,
    crumbs: [{ label: 'Dashboard', to: presentationRoutePatterns.dashboard }, { label: 'Indexes' }],
  };
}

function Chip({ chip }: { chip: ComposedIndexesChip }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={chip.tone}>
      <i className="status-square" data-tone={chip.tone} aria-hidden="true" />
      {chip.label}
    </span>
  );
}

function Counts({ counts, label }: { counts: ComposedIndexesCount[]; label: string | null }): React.JSX.Element {
  if (counts.length === 0) {
    return label === null ? <></> : <span className="view-indexes-note">{label}</span>;
  }
  // One accessible name for the figure; the cells themselves are decoration (UI-SPEC accessibility).
  const name = counts.map((count) => `${count.value} ${count.word}`).join(', ');
  return (
    <span className="view-indexes-bigs" role="img" aria-label={name}>
      {counts.map((count) => (
        <span key={count.word} className="view-indexes-big" aria-hidden="true">
          <span className="view-indexes-num">{count.value}</span>
          <span className="view-indexes-word">{count.word}</span>
        </span>
      ))}
    </span>
  );
}

function Figure({ tile }: { tile: ComposedIndexesTile }): React.JSX.Element | null {
  const { figure } = tile;
  switch (figure.kind) {
    case 'graph':
      return (
        <>
          <Counts counts={figure.counts} label={figure.countsLabel} />
          {figure.chips.length > 0 ? (
            <span className="view-indexes-chips">
              {figure.chips.map((chip) => (
                <Chip key={chip.label} chip={chip} />
              ))}
            </span>
          ) : null}
        </>
      );
    case 'line':
      return figure.text === '' ? null : <span className="view-indexes-line">{figure.text}</span>;
    case 'unreadable':
      return <WarningChip tone="unreadable" />;
    case 'ghost':
      return <span className="view-indexes-note">{figure.text}</span>;
  }
}

function Cell({ cell }: { cell: ComposedIndexesCell }): React.JSX.Element {
  return (
    <div className="view-indexes-cell" data-tone={cell.tone ?? undefined}>
      <span className="view-indexes-word">{cell.label}</span>
      <span className="view-indexes-val">{cell.value}</span>
      {cell.note !== null ? <span className="view-indexes-note">{cell.note}</span> : null}
    </div>
  );
}

function Foot({ foot }: { foot: ComposedIndexesFoot }): React.JSX.Element {
  return (
    <div className="view-indexes-foot">
      <span className="view-indexes-meta">{foot.path}</span>
      {foot.updated !== null ? <span className="view-indexes-meta">{foot.updated}</span> : null}
      {foot.size !== null ? <span className="view-indexes-meta">{foot.size}</span> : null}
    </div>
  );
}

function Panel({ panel }: { panel: ComposedIndexesPanel }): React.JSX.Element {
  const graph = panel.graph;
  return (
    <div className="view-indexes-panel">
      {graph !== null ? (
        <>
          <Counts counts={graph.counts} label={graph.countsLabel} />
          {graph.cells.length > 0 ? (
            <div className="view-indexes-cells">
              {graph.cells.map((cell) => (
                <Cell key={cell.key} cell={cell} />
              ))}
            </div>
          ) : null}
          {graph.reportLines.length > 0 ? (
            <ul className="view-indexes-report">
              {graph.reportLines.map((line, index) => (
                <li key={index}>
                  <ResearchInline text={line} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {panel.foot !== null ? <Foot foot={panel.foot} /> : null}
    </div>
  );
}

function TileHead({ tile }: { tile: ComposedIndexesTile }): React.JSX.Element {
  return (
    <span className="view-indexes-top">
      <span className="view-indexes-name">{tile.title}</span>
      {tile.path !== null ? (
        <span className="view-indexes-path" title={tile.path}>
          {tile.path}
        </span>
      ) : null}
    </span>
  );
}

/** The Indexes page: the grid of tiles, with the tile the address names open in place. */
export function IndexesView({ model }: { model: ComposedIndexes }): React.JSX.Element {
  const navigate = useProjectNavigate();
  const idBase = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // View state only: it is never sent anywhere or stored, and a reload shows the address's tile open again.
  const [closed, setClosed] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const openKey = model.openKey !== null && closed !== model.openKey ? model.openKey : null;

  // A different address opens a different tile: forget what was collapsed for the last one (derived during render,
  // the sanctioned way to reset state when a prop changes).
  const [seenKey, setSeenKey] = useState(model.openKey);
  if (seenKey !== model.openKey) {
    setSeenKey(model.openKey);
    setClosed(null);
  }

  // Esc collapses the open tile in place.
  useEffect(() => {
    if (openKey === null) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setClosed(openKey);
      setFocusKey(openKey);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openKey]);

  // After a close, the tile is a button again: put focus back on it.
  useEffect(() => {
    if (focusKey === null || openKey !== null) return;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      if (root === null) return;
      for (const node of root.querySelectorAll<HTMLElement>('[data-tile-key]')) {
        if (node.dataset.tileKey === focusKey) {
          node.focus();
          break;
        }
      }
      setFocusKey(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusKey, openKey]);

  function open(tile: ComposedIndexesTile): void {
    if (tile.to === null) return;
    setClosed(null);
    navigate(tile.to);
  }

  return (
    <div className="view-indexes-root" ref={rootRef}>
      <ul className="view-indexes-grid">
        {model.tiles.map((tile) => {
          const panelId = `${idBase}-${tile.key}`;
          const isOpen = openKey === tile.key && tile.panel !== null;
          if (tile.ghost) {
            return (
              <li key={tile.key} className="view-indexes-cellwrap" data-span={tile.span}>
                <div className="view-indexes-tile" data-ghost="true">
                  <TileHead tile={tile} />
                  <div className="view-indexes-fig">
                    <Figure tile={tile} />
                  </div>
                </div>
              </li>
            );
          }
          if (isOpen && tile.panel !== null) {
            return (
              <li key={tile.key} className="view-indexes-cellwrap" data-open="true">
                <section className="view-indexes-tile" data-open="true" aria-labelledby={`${panelId}-title`} id={panelId}>
                  <div className="view-indexes-top">
                    <h2 className="view-indexes-title" id={`${panelId}-title`}>
                      {tile.title}
                    </h2>
                    <button
                      type="button"
                      className="view-indexes-close"
                      aria-label={`Close ${tile.title}`}
                      onClick={() => {
                        setClosed(tile.key);
                        setFocusKey(tile.key);
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <Panel panel={tile.panel} />
                </section>
              </li>
            );
          }
          return (
            <li key={tile.key} className="view-indexes-cellwrap" data-span={tile.span}>
              <button
                type="button"
                className="view-indexes-tile"
                data-tile-key={tile.key}
                aria-expanded={false}
                aria-controls={panelId}
                disabled={tile.to === null}
                onClick={() => open(tile)}
              >
                <TileHead tile={tile} />
                <span className="view-indexes-fig">
                  <Figure tile={tile} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
