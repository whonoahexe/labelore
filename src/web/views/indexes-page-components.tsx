// The Indexes page's React surface (Phase 11, 11-18 and 11-19, VIEW-19, sketch 055 winner A "Instrument grid"): the
// header override (crumbs, the eyebrow "Exploration · Indexes", the h1 "Indexes" and the facts as meta) and the page
// body: a grid with one tile per index file, each with its key figure. A tile that opens is a real button
// (aria-expanded, aria-controls) whose click navigates to the file's own address; the open tile spans the full row in
// place, shows its panel and has a Close button, and Esc closes it. Closing collapses the tile in place and sends
// nothing and stores nothing, and the address stays (X3). The not-built Graph tile is a ghost: not focusable, nothing
// to open. A bar or split bar carries one accessible name and its cells are hidden from assistive technology.
//
// Every string is author text rendered as plain React text - never React's raw-HTML injection prop - and no href is
// built from document text: a tile opens the address the payload gave it (T-11-28, T-11-30). Only the bounded summary
// reaches this file, so there is no raw intel or graph JSON to show. Colour comes only from a tone a chip or cell
// carries and the theme tokens; a failed last update is the `missing` tone, never destructive, and an unreadable file
// shows the shared "Unreadable" chip.
import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { WarningChip } from '../components/warning-chip.tsx';
import { useProjectNavigate } from '../nav.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type {
  ComposedIndexes,
  ComposedIndexesBar,
  ComposedIndexesBody,
  ComposedIndexesCell,
  ComposedIndexesChip,
  ComposedIndexesCount,
  ComposedIndexesFoot,
  ComposedIndexesPanel,
  ComposedIndexesSplit,
  ComposedIndexesTags,
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

// ---------------------------------------------------------------------------------------------------------
// Atoms. Everything a tile's button holds is phrasing content (spans), so the same atoms serve a tile and a panel.
// ---------------------------------------------------------------------------------------------------------

function Chip({ chip }: { chip: ComposedIndexesChip }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={chip.tone}>
      <i className="status-square" data-tone={chip.tone} aria-hidden="true" />
      {chip.label}
    </span>
  );
}

function Chips({ chips }: { chips: ComposedIndexesChip[] }): React.JSX.Element | null {
  if (chips.length === 0) return null;
  return (
    <span className="view-indexes-chips">
      {chips.map((chip) => (
        <Chip key={chip.label} chip={chip} />
      ))}
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

function Split({ split }: { split: ComposedIndexesSplit }): React.JSX.Element {
  return (
    <span className="view-indexes-split" role="img" aria-label={split.name}>
      <span className="view-indexes-splitbar" aria-hidden="true">
        {split.parts.map((part) => (
          <span key={part.label} className="view-indexes-splitpart" data-fill={part.fill} style={{ width: `${part.share}%` }} />
        ))}
      </span>
      <span className="view-indexes-splitkey" aria-hidden="true">
        {split.parts.map((part) => (
          <span key={part.label} className="view-indexes-splitkeyrow">
            <i className="view-indexes-swatch" data-fill={part.fill} />
            {part.label}
            <b>
              {part.value.toLocaleString('en-GB')}
              {split.suffix}
            </b>
          </span>
        ))}
      </span>
    </span>
  );
}

function Tags({ tags }: { tags: ComposedIndexesTags }): React.JSX.Element {
  return (
    <span className="view-indexes-tags">
      {tags.items.map((item) => (
        <span key={item} className="view-indexes-tag">
          {item}
        </span>
      ))}
      {tags.more > 0 ? <span className="view-indexes-note">{tags.more} more</span> : null}
    </span>
  );
}

function Bars({ bars }: { bars: ComposedIndexesBar[] }): React.JSX.Element {
  return (
    <ul className="view-indexes-bars">
      {bars.map((bar, index) => (
        <li key={`${index}-${bar.label}`}>
          <span className="view-indexes-barlabel" title={bar.label}>
            {bar.label}
          </span>
          <span className="view-indexes-bartrack" aria-hidden="true">
            <span className="view-indexes-barfill" style={{ width: `${bar.share}%` }} />
          </span>
          <span className="view-indexes-barvalue">{bar.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Layers({ layers }: { layers: string[] }): React.JSX.Element {
  return (
    <span className="view-indexes-layers">
      {layers.map((layer, index) => (
        <span key={`${index}-${layer}`} className="view-indexes-layer">
          <span className="view-indexes-ix">{index + 1}</span>
          <span className="view-indexes-layername">{layer}</span>
        </span>
      ))}
    </span>
  );
}

function Word({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <span className="view-indexes-word">{children}</span>;
}

function Figure({ tile }: { tile: ComposedIndexesTile }): React.JSX.Element | null {
  const { figure } = tile;
  switch (figure.kind) {
    case 'graph':
      return (
        <>
          <Counts counts={figure.counts} label={figure.countsLabel} />
          <Chips chips={figure.chips} />
        </>
      );
    case 'count':
      return (
        <>
          {figure.count !== null ? <Counts counts={[figure.count]} label={null} /> : null}
          {figure.split !== null ? <Split split={figure.split} /> : null}
          {figure.tags.length > 0 ? <Tags tags={{ items: figure.tags, more: 0 }} /> : null}
          <Chips chips={figure.chips} />
        </>
      );
    case 'layers':
      return <Layers layers={figure.layers} />;
    case 'tags':
      return <Tags tags={figure.tags} />;
    case 'line':
      return figure.text === '' ? null : <span className="view-indexes-line">{figure.text}</span>;
    case 'unreadable':
      return <WarningChip tone="unreadable" />;
    case 'ghost':
      return <span className="view-indexes-note">{figure.text}</span>;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------------------------------------

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
      <span className="view-indexes-meta" title={foot.path}>
        {foot.path}
      </span>
      {foot.updated !== null ? <span className="view-indexes-meta">{foot.updated}</span> : null}
      {foot.size !== null ? <span className="view-indexes-meta">{foot.size}</span> : null}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="view-indexes-block">
      <Word>{label}</Word>
      {children}
    </div>
  );
}

function Body({ body }: { body: ComposedIndexesBody }): React.JSX.Element | null {
  switch (body.kind) {
    case 'graph':
      return (
        <>
          <Counts counts={body.counts} label={body.countsLabel} />
          {body.cells.length > 0 ? (
            <div className="view-indexes-cells">
              {body.cells.map((cell) => (
                <Cell key={cell.key} cell={cell} />
              ))}
            </div>
          ) : null}
          {body.extraction !== null ? (
            <Block label="How the edges were found">
              <Split split={body.extraction} />
            </Block>
          ) : null}
          {body.hubs !== null ? (
            <Block label={body.hubs.title}>
              <Bars bars={body.hubs.bars} />
            </Block>
          ) : null}
          {body.counts.length === 0 && body.reportLines.length > 0 ? (
            <ul className="view-indexes-report">
              {body.reportLines.map((line, index) => (
                <li key={index}>
                  <ResearchInline text={line} />
                </li>
              ))}
            </ul>
          ) : null}
          {body.unreadable.map((path) => (
            <div key={path} className="view-indexes-unread">
              <WarningChip tone="unreadable" />
              <span className="view-indexes-meta" title={path}>
                {path}
              </span>
            </div>
          ))}
          {body.notSent !== null ? (
            <div className="view-indexes-withheld">
              <span>Not sent to this page</span>
              {body.notSent.files.map((file) => (
                <span key={file.name}>
                  <b>{file.name}</b> {file.size}
                </span>
              ))}
              {body.notSent.more > 0 ? <span>{body.notSent.more} more</span> : null}
            </div>
          ) : null}
        </>
      );
    case 'architecture':
      return (
        <>
          {body.layers.length > 0 ? <Layers layers={body.layers} /> : null}
          {body.keys !== null ? (
            <Block label={body.keysLabel ?? 'Keys'}>
              <ul className="view-indexes-keys">
                {body.keys.items.map((key) => (
                  <li key={key} className="view-indexes-keyrow">
                    {key}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </>
      );
    case 'stack':
      return (
        <>
          {body.groups.map((group) => (
            <Block key={group.label} label={group.label}>
              <Tags tags={group.tags} />
            </Block>
          ))}
          {body.facts.length > 0 ? (
            <div className="view-indexes-facts">
              {body.facts.map((fact) => (
                <span key={fact.label}>
                  {fact.label} <b>{fact.value}</b>
                </span>
              ))}
            </div>
          ) : null}
        </>
      );
    case 'file-roles':
      return (
        <>
          {body.split !== null ? <Split split={body.split} /> : null}
          <div className="view-indexes-paths">
            {body.folders.map((group) => (
              <div key={group.folder} className="view-indexes-dir">
                <span className="view-indexes-meta" title={group.folder}>
                  {group.folder}/
                </span>
                {group.files.map((file, index) => (
                  <span key={`${index}-${file.name}`} className="view-indexes-filerow">
                    <span>{file.name}</span>
                    {file.type !== null ? <Word>{file.type}</Word> : null}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="view-indexes-note">{body.shownLabel}</p>
        </>
      );
    case 'api-map':
      return (
        <>
          {body.methods.length > 0 ? <Tags tags={{ items: body.methods, more: 0 }} /> : null}
          <ul className="view-indexes-routes">
            {body.routes.map((route, index) => (
              <li key={`${index}-${route.method}-${route.path}`}>
                <span className="view-indexes-method">{route.method}</span>
                <span className="view-indexes-routepath">{route.path}</span>
                {route.description !== null || route.file !== null ? (
                  <span className="view-indexes-routenote">
                    {route.description}
                    {route.description !== null && route.file !== null ? ' · ' : null}
                    {route.file !== null ? <span className="view-indexes-meta">{route.file}</span> : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="view-indexes-note">{body.shownLabel}</p>
        </>
      );
    case 'dependencies':
      return (
        <>
          {body.split !== null ? <Split split={body.split} /> : null}
          {body.rows.length > 0 ? (
            <Block label="Most used, by files that import them">
              <Bars bars={body.rows} />
            </Block>
          ) : null}
          <p className="view-indexes-note">{body.shownLabel}</p>
        </>
      );
    case 'synthesis':
      return (
        <>
          <Counts counts={body.count !== null ? [body.count] : []} label={null} />
          <Chips chips={body.chips} />
          {body.split !== null ? (
            <Block label="Classified as">
              <Split split={body.split} />
            </Block>
          ) : null}
          {body.documents.length > 0 ? (
            <ul className="view-indexes-docs">
              {body.documents.map((document) => (
                <li key={document.name}>
                  <span className="view-indexes-meta">{document.name}</span>
                  <span>{document.facts}</span>
                  <span className="view-indexes-note">{document.size}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {body.classifications !== null ? <p className="view-indexes-note">{body.classifications}</p> : null}
        </>
      );
    case 'generic':
      return (
        <>
          {body.keys !== null ? (
            <Block label={body.keysLabel}>
              <Tags tags={body.keys} />
            </Block>
          ) : null}
        </>
      );
    case 'unreadable':
      return (
        <div className="view-indexes-unread">
          <WarningChip tone="unreadable" />
        </div>
      );
  }
}

function Panel({ panel }: { panel: ComposedIndexesPanel }): React.JSX.Element {
  return (
    <div className="view-indexes-panel">
      <Body body={panel.body} />
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
