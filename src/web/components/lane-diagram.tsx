// The lanes-by-kind diagram (quick-260930-mp6, sketch 012 B): the author's ASCII read as a graph
// (src/rendering/ascii-graph.ts) and drawn from scratch as typed nodes in one lane per kind
// (src/rendering/lane-layout.ts) — icon headers, uniform nodes, orthogonal wires with arrowheads. The
// shipped lifted diagram stays as "Shown as drawn": the fallback for a figure whose graph is thin, and
// a toggle on every drawn one. View-agnostic: no research-specific import. All author text renders as
// React text nodes or escaped attributes, and svg geometry is built from numbers only (T-mp6-02).
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Cpu, Database, HardDrive, Monitor, Radio, Server, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { liftDiagram } from '../../rendering/ascii-lift.ts';
import { buildDiagramGraph } from '../../rendering/ascii-graph.ts';
import type { DiagramGraph, DiagramKind } from '../../rendering/ascii-graph.ts';
import { DEFAULT_BUDGET, layoutLanes } from '../../rendering/lane-layout.ts';
import type { LaneKind, LayoutTip } from '../../rendering/lane-layout.ts';
import { FigureFrame } from './figure-frame.tsx';
import { LiftedDiagram } from './lifted-diagram.tsx';

const ICONS: Record<DiagramKind, LucideIcon> = {
  client: Monitor,
  edge: Shield,
  service: Server,
  worker: Cpu,
  channel: Radio,
  data: Database,
  external: HardDrive,
  step: ChevronRight,
};

const LANE_NAMES: Record<LaneKind, string> = {
  client: 'Client',
  edge: 'Edge',
  service: 'Service',
  worker: 'Worker',
  channel: 'Channel',
  data: 'Data',
  external: 'External',
};

/** The subtitle shows only when the label is short enough to leave it room (the sketch's rule). */
const SUB_MAX = 24;
const SUB_MAX_COMPACT = 14;

/** An arrowhead: a triangle whose tip is the wire's end, from numbers only. */
function arrowPath({ x, y, dir }: LayoutTip): string {
  const s = 4;
  const l = 7;
  const points =
    dir === 'd'
      ? [[x - s, y - l], [x + s, y - l], [x, y]]
      : dir === 'r'
        ? [[x - l, y - s], [x - l, y + s], [x, y]]
        : dir === 'l'
          ? [[x + l, y - s], [x + l, y + s], [x, y]]
          : [[x - s, y + l], [x + s, y + l], [x, y]];
  return `M${points.map(([px, py]) => `${px},${py}`).join('L')}Z`;
}

const KIND_NAMES: Record<DiagramKind, string> = { ...LANE_NAMES, step: 'Step' };

/** The details panel for one node: details, notes, what feeds it and what it feeds, and its own words. */
export function NodeDetails({
  graph,
  id,
  onClose,
}: {
  graph: DiagramGraph;
  id: number;
  onClose: () => void;
}): React.JSX.Element | null {
  const node = graph.nodes[id];
  if (!node) return null;
  const Icon = ICONS[node.kind];
  const name = (nodeId: number): string => graph.nodes[nodeId]?.label.main ?? '?';
  const from = graph.edges.filter((e) => e.to === id);
  const to = graph.edges.filter((e) => e.from === id);
  const wired = (label: string): React.ReactNode => (label !== '' ? <> — <em>{label}</em></> : null);
  return (
    <aside className="lane-diagram-panel" aria-label={node.label.main}>
      <div className="lane-diagram-panel-head">
        <span className="lane-diagram-icon">
          <Icon aria-hidden="true" />
        </span>
        <p className="lane-diagram-panel-title" data-code={node.label.code ? 'true' : undefined}>
          {node.label.main}
        </p>
        <button type="button" className="status-chip" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="lane-diagram-panel-section">{KIND_NAMES[node.kind]}</p>
      {node.label.sub !== '' ? <p className="lane-diagram-panel-sub">{node.label.sub}</p> : null}
      {node.details.length > 0 ? (
        <>
          <p className="lane-diagram-panel-section">Details</p>
          <pre className="lane-diagram-panel-pre">{node.details.join('\n')}</pre>
        </>
      ) : null}
      {node.notes.length > 0 ? (
        <>
          <p className="lane-diagram-panel-section">Notes</p>
          <ul className="lane-diagram-panel-list">
            {node.notes.map((note, index) => (
              <li key={index}>
                <em>{note}</em>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {from.length > 0 ? (
        <>
          <p className="lane-diagram-panel-section">From</p>
          <ul className="lane-diagram-panel-list">
            {from.map((e, index) => (
              <li key={index}>
                {name(e.from)}
                {wired(e.label)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {to.length > 0 ? (
        <>
          <p className="lane-diagram-panel-section">To</p>
          <ul className="lane-diagram-panel-list">
            {to.map((e, index) => (
              <li key={index}>
                {name(e.to)}
                {wired(e.label)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="lane-diagram-panel-section">As written</p>
      <pre className="lane-diagram-panel-pre">{node.label.full}</pre>
    </aside>
  );
}

export function LaneDiagram({ graph, fit, label }: { graph: DiagramGraph; fit: boolean; label: string }): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // The width budget is the root's own width — measured on the root, not the canvas column, so the
  // layout holds still when the panel opens. In the Expand dialog the wider body yields a larger budget.
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [selected, setSelected] = useState<number | null>(null);
  const layout = useMemo(() => layoutLanes(graph, budget), [graph, budget]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const next = Math.round(root.clientWidth);
      if (next > 0) setBudget(next);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Fit to width: scale the stage from its top left by min(1, available / natural), set the canvas
  // height to the scaled height and let data-fit clip the unscaled box. Imperative, as lifted-diagram.tsx.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const apply = (): void => {
      const ratio = fit && layout.width > 0 && canvas.clientWidth > 0 ? Math.min(1, canvas.clientWidth / layout.width) : 1;
      stage.style.transform = ratio < 1 ? `scale(${ratio})` : '';
      canvas.style.height = ratio < 1 ? `${layout.height * ratio}px` : '';
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(apply);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [layout, fit]);

  const chosen = selected !== null ? graph.nodes[selected] : undefined;
  const hot = new Set<number>();
  if (chosen) {
    graph.edges.forEach((e) => {
      if (e.from === chosen.id) hot.add(e.to);
      if (e.to === chosen.id) hot.add(e.from);
    });
  }
  const touches = (from: number, to: number): boolean => chosen !== undefined && (from === chosen.id || to === chosen.id);

  return (
    <div
      className="lane-diagram"
      ref={rootRef}
      data-panel={chosen ? 'true' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && chosen) {
          // The first Escape clears the selection; a dialog around the figure closes on the next.
          event.stopPropagation();
          setSelected(null);
        }
      }}
    >
      <div className="lane-diagram-canvas" ref={canvasRef} data-fit={fit ? 'true' : undefined}>
        <div
          className="lane-diagram-stage"
          ref={stageRef}
          role="group"
          aria-label={`${label}: ${graph.nodes.length} nodes, ${graph.edges.length} wires`}
          data-selecting={chosen ? 'true' : undefined}
          style={{ width: layout.width, height: layout.height }}
        >
          {layout.lanes.map((lane) => {
            const Icon = ICONS[lane.kind];
            return (
              <div
                key={lane.kind}
                className="lane-diagram-lane"
                data-shade={lane.shaded ? 'true' : undefined}
                style={{ left: lane.x, width: lane.width }}
              >
                <span className="lane-diagram-lane-head">
                  <Icon aria-hidden="true" />
                  {LANE_NAMES[lane.kind]}
                  {lane.kind === 'service' && lane.steps ? ' & steps' : ''}
                </span>
              </div>
            );
          })}
          {layout.groups.map((group) => (
            <div
              key={group.id}
              className="lane-diagram-group"
              style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
            >
              <span className="lane-diagram-group-label">{group.label}</span>
            </div>
          ))}
          <svg className="lane-diagram-wires" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.wires.map((wire, index) => (
              <path key={`w${index}`} className="lane-diagram-wire" d={wire.d} data-hot={touches(wire.from, wire.to) ? 'true' : undefined} />
            ))}
            {layout.wires.map((wire, index) =>
              wire.directed ? (
                <path
                  key={`a${index}`}
                  className="lane-diagram-arrow"
                  d={arrowPath(wire.tip)}
                  data-hot={touches(wire.from, wire.to) ? 'true' : undefined}
                />
              ) : null,
            )}
          </svg>
          {layout.wires.map((wire, index) =>
            wire.label !== '' ? (
              <span
                key={`l${index}`}
                className="lane-diagram-wire-label"
                title={wire.label}
                style={{ left: wire.labelAt.x, top: wire.labelAt.y, maxWidth: wire.labelAt.maxWidth }}
              >
                {wire.label}
              </span>
            ) : null,
          )}
          {graph.nodes.map((node) => {
            const at = layout.nodes[node.id];
            const Icon = ICONS[node.kind];
            const extra = node.details.length + node.notes.length;
            const showSub = node.label.sub !== '' && node.label.main.length <= (layout.compact ? SUB_MAX_COMPACT : SUB_MAX);
            return (
              <button
                key={node.id}
                type="button"
                className="lane-diagram-node"
                data-kind={node.kind}
                data-compact={layout.compact ? 'true' : undefined}
                data-hot={hot.has(node.id) ? 'true' : undefined}
                aria-pressed={chosen?.id === node.id}
                onClick={() => setSelected((previous) => (previous === node.id ? null : node.id))}
                style={{ left: at.x, top: at.y, width: layout.nodeWidth, height: layout.nodeHeight }}
              >
                <span className="lane-diagram-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="lane-diagram-text">
                  <span className="lane-diagram-label" data-code={node.label.code ? 'true' : undefined} title={node.label.full}>
                    {node.label.main}
                  </span>
                  {showSub ? <span className="lane-diagram-sub">{node.label.sub}</span> : null}
                </span>
                {extra > 0 ? <span className="lane-diagram-more">+{extra}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {chosen ? <NodeDetails graph={graph} id={chosen.id} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/** The figure as the author drew it: the quiet note over the lifted diagram. */
function AsDrawn({ text, fit }: { text: string; fit: boolean }): React.JSX.Element {
  return (
    <>
      <p className="lane-diagram-fallback">
        <span className="status-chip" data-tone="quiet">
          Shown as drawn
        </span>
        <span>This figure keeps the author&apos;s layout.</span>
      </p>
      <LiftedDiagram text={text} fit={fit} />
    </>
  );
}

/** A framed architecture figure: lanes by kind when the graph is confident, else the author's layout. */
export function LaneDiagramFigure({
  text,
  title,
  caption,
}: {
  text: string;
  title: string;
  caption?: React.ReactNode;
}): React.JSX.Element {
  const graph = useMemo(() => {
    const figure = liftDiagram(text);
    return figure === null ? null : buildDiagramGraph(figure);
  }, [text]);
  const [drawn, setDrawn] = useState(false);
  const drawable = graph !== null && !graph.thin;
  const tools = drawable ? (
    <button type="button" className="status-chip" aria-pressed={drawn} onClick={() => setDrawn((previous) => !previous)}>
      Shown as drawn
    </button>
  ) : undefined;
  return (
    <FigureFrame title={title} caption={caption} tools={tools}>
      {(fit) => (drawable && !drawn ? <LaneDiagram graph={graph} fit={fit} label={title} /> : <AsDrawn text={text} fit={fit} />)}
    </FigureFrame>
  );
}
