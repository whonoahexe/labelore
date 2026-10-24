// The Architecture spine's body (quick-261024-k8u, sketch 032 A): the system overview (the shipped
// lane diagram), the project structure (the shipped clean tree), anti-patterns as swaps, and the
// build order as a layered left-to-right DAG. No graph is hand-built: the overview is whatever the
// shipped extractor lifts, with the author's own layout always one chip away. Every string is a
// React text node.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ArchitecturePanel, BuildStepModel } from '../../presentation/project-research-panels.ts';
import { layoutBuildOrder } from '../../rendering/build-order-layout.ts';
import { FencedFigure } from '../components/fenced-figure.tsx';
import { Chev, ResearchInline, SectionHead, SwapRows } from './research-atoms.tsx';

const DEFAULT_BUDGET = 940;

function BuildOrderGraph({ steps }: { steps: readonly BuildStepModel[] }): React.JSX.Element {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [selected, setSelected] = useState<string | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const next = Math.round(canvas.clientWidth);
      if (next > 0) setBudget(next);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => layoutBuildOrder(steps.map((step) => ({ id: step.id, name: step.name, depends: step.depends })), budget),
    [steps, budget],
  );
  const byId = useMemo(() => new Map(steps.map((step) => [step.id, step])), [steps]);
  const chosen = selected !== null ? (byId.get(selected) ?? null) : null;
  const hot = new Set<string>();
  if (chosen) {
    for (const wire of layout.wires) {
      if (wire.from === chosen.id) hot.add(wire.to);
      if (wire.to === chosen.id) hot.add(wire.from);
    }
  }
  const pick = (id: string): void => setSelected(selected === id ? null : id);
  const chips = (ids: readonly string[]): React.JSX.Element[] =>
    ids.map((id) => (
      <button key={id} type="button" className="research-step-chip" onClick={() => setSelected(id)}>
        {id} · {byId.get(id)?.name ?? id}
      </button>
    ));

  return (
    <div
      className="research-bo"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected !== null) {
          event.stopPropagation();
          setSelected(null);
        }
      }}
    >
      <div className="research-bo-canvas" ref={canvasRef}>
        <div
          className="research-bo-stage"
          data-selecting={chosen ? 'true' : 'false'}
          style={{ width: layout.width, height: layout.height }}
        >
          <svg className="research-bo-wires" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.wires.map((wire) => {
              const lit = chosen !== null && (wire.from === chosen.id || wire.to === chosen.id);
              return <path key={`w-${wire.from}-${wire.to}`} className="research-bo-wire" d={wire.path} data-hot={lit ? 'true' : 'false'} />;
            })}
            {layout.wires.map((wire) => {
              const lit = chosen !== null && (wire.from === chosen.id || wire.to === chosen.id);
              return <path key={`a-${wire.from}-${wire.to}`} className="research-bo-arrow" d={wire.arrow} data-hot={lit ? 'true' : 'false'} />;
            })}
          </svg>
          {steps.map((step) => {
            const at = layout.positions[step.id];
            if (!at) return null;
            return (
              <button
                key={step.id}
                type="button"
                className="research-bo-node"
                aria-pressed={selected === step.id}
                data-hot={hot.has(step.id) ? 'true' : 'false'}
                style={{ left: at.x, top: at.y, width: layout.nodeWidth, height: layout.nodeHeight }}
                onClick={() => pick(step.id)}
              >
                <span className="research-bo-id">{step.id}</span>
                <span className="research-bo-name">{step.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      {chosen ? (
        <div className="research-bo-detail">
          <span className="research-bo-big">{chosen.id}</span>
          <div>
            <h4 className="research-bo-title">{chosen.name}</h4>
            {chosen.deliverable ? (
              <p className="research-bo-what">
                <ResearchInline text={chosen.deliverable} />
              </p>
            ) : null}
            <div className="research-bo-rel">
              <div>
                <span className="research-label">Waits for</span>
                {chosen.depends.length > 0 ? chips(chosen.depends) : <span className="research-step-chip">Nothing · starts any time</span>}
              </div>
              {chosen.unlocks.length > 0 ? (
                <div>
                  <span className="research-label">Unlocks</span>
                  {chips(chosen.unlocks)}
                </div>
              ) : null}
            </div>
            {chosen.notes ? (
              <p className="research-bo-note">
                <ResearchInline text={chosen.notes} />
              </p>
            ) : null}
            {chosen.alsoWaitsFor ? (
              <p className="research-bo-note">
                Also waits for: <ResearchInline text={chosen.alsoWaitsFor} />
              </p>
            ) : null}
          </div>
          <button type="button" className="research-icon-btn" aria-label="Close" onClick={() => setSelected(null)}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="research-bo-hint">Pick a step to see what it delivers, what it waits for and what it unlocks.</p>
      )}
    </div>
  );
}

export function ArchitecturePanelBody({ panel }: { panel: ArchitecturePanel }): React.JSX.Element {
  const [whyOpen, setWhyOpen] = useState(false);
  const order = panel.buildOrder;
  return (
    <div className="research-arch">
      {panel.overview ? (
        <section>
          <FencedFigure text={panel.overview} title="System overview" />
        </section>
      ) : null}
      {panel.structure ? (
        <section>
          <FencedFigure text={panel.structure} title="Project structure" />
        </section>
      ) : null}
      {panel.antiPatterns.length > 0 ? (
        <section>
          <SectionHead title="Anti-patterns" tally={panel.antiTally} />
          <SwapRows items={panel.antiPatterns} />
        </section>
      ) : null}
      {order ? (
        <section>
          <SectionHead title="Suggested build order" tally={order.tally} />
          <BuildOrderGraph steps={order.steps} />
          {order.toggleText ? (
            <div className="research-why">
              <button type="button" className="research-toggle" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>
                <Chev />
                {order.toggleLabel}
              </button>
              {whyOpen ? (
                <p className="research-sec-note">
                  <ResearchInline text={order.toggleText} />
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
