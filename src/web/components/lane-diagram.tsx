// The lanes-by-kind diagram (quick-260930-mp6, sketch 012 B): the author's ASCII read as a graph
// (src/rendering/ascii-graph.ts) and drawn from scratch as typed nodes in one lane per kind
// (src/rendering/lane-layout.ts) — icon headers, uniform nodes, orthogonal wires with arrowheads. The
// shipped lifted diagram stays as "Shown as drawn": the fallback for a figure whose graph is thin, and
// a toggle on every drawn one. View-agnostic: no research-specific import. All author text renders as
// React text nodes or escaped attributes, and svg geometry is built from numbers only (T-mp6-02).
import { useMemo, useState } from 'react';
import { Cpu, Database, HardDrive, Monitor, Radio, Server, Shield, ChevronRight } from 'lucide-react';
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

function LaneDiagram({ graph, fit, label }: { graph: DiagramGraph; fit: boolean; label: string }): React.JSX.Element {
  const layout = useMemo(() => layoutLanes(graph, DEFAULT_BUDGET), [graph]);
  return (
    <div className="lane-diagram" data-fit={fit ? 'true' : undefined}>
      <div className="lane-diagram-canvas">
        <div
          className="lane-diagram-stage"
          role="group"
          aria-label={`${label}: ${graph.nodes.length} nodes, ${graph.edges.length} wires`}
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
          <svg className="lane-diagram-wires" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.wires.map((wire, index) => (
              <path key={`w${index}`} className="lane-diagram-wire" d={wire.d} />
            ))}
            {layout.wires.map((wire, index) =>
              wire.directed ? <path key={`a${index}`} className="lane-diagram-arrow" d={arrowPath(wire.tip)} /> : null,
            )}
          </svg>
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
