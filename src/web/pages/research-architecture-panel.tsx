// The Architecture spine's body (quick-261024-k8u, sketch 032 A): the system overview (the shipped
// lane diagram), the project structure (the shipped clean tree), scaling considerations (sketch 036
// A: what breaks first, then the concerns × scale grid), anti-patterns as swaps, and the
// build order as a layered left-to-right DAG. No graph is hand-built: the overview is whatever the
// shipped extractor lifts, with the author's own layout always one chip away. Every string is a
// React text node.
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ArchitecturePanel, BuildStepModel, ScalingCell, ScalingPanel } from '../../presentation/project-research-panels.ts';
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

function ScaleCellText({ cell }: { cell: ScalingCell }): React.JSX.Element {
  return cell.tone === 'na' ? <span className="research-scale-na">Doesn’t apply</span> : <ResearchInline text={cell.text} />;
}

/** Sketch 036 A: the ranked bottlenecks lead, said large with their fix; then every concern at every
 * scale, with the cell where a bottleneck bites marked by its number. */
function ScalingSection({ scaling }: { scaling: ScalingPanel }): React.JSX.Element {
  const { tiers, concerns, single } = scaling;
  const columns = `${single ? '' : 'minmax(9rem, 0.7fr) '}repeat(${tiers.length}, minmax(0, 1fr))`;
  return (
    <section className="research-scale">
      <SectionHead title="Scaling considerations" tally={scaling.tally} />
      {scaling.lead ? (
        <p className="research-scale-lead">
          <ResearchInline text={scaling.lead} />
        </p>
      ) : null}
      {scaling.bottlenecks.length > 0 ? (
        <ol className="research-bns">
          {scaling.bottlenecks.map((bottleneck, at) => (
            <li key={bottleneck.number} className="research-bn" data-first={at === 0 ? 'true' : 'false'}>
              <span className="research-bn-number">{bottleneck.number}</span>
              <div>
                <p className="research-label">{bottleneck.label}</p>
                <p className="research-bn-text">
                  <ResearchInline text={bottleneck.text} />
                </p>
                {bottleneck.fix ? (
                  <p className="research-bn-fix">
                    <span className="research-label">Fix</span>
                    <span>
                      <ResearchInline text={bottleneck.fix} />
                    </span>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {scaling.notBottlenecks.map((item) => (
        <p key={item.label} className="research-scale-not">
          <span className="research-label">{item.label}</span>
          <span>
            <ResearchInline text={item.text} />
          </span>
        </p>
      ))}
      {tiers.length > 0 ? (
        <>
          {scaling.bottlenecks.length > 0 || scaling.notBottlenecks.length > 0 ? <p className="research-scale-sub">At each scale</p> : null}
          <div className="research-scale-grid" data-single={single ? 'true' : 'false'} style={{ '--research-scale-cols': columns } as React.CSSProperties}>
            {single ? null : <span className="research-scale-corner">{scaling.axis}</span>}
            {tiers.map((tier, at) => (
              <span key={`t${at}`} className="research-scale-tier">
                <i>{String(at + 1).padStart(2, '0')}</i>
                <b>{tier.name}</b>
                {tier.sub ? <small>{tier.sub}</small> : null}
              </span>
            ))}
            {concerns.map((concern, ci) => (
              <Fragment key={`c${ci}`}>
                {single ? null : (
                  <span className="research-scale-concern">
                    <ResearchInline text={concern.name} />
                  </span>
                )}
                {concern.cells.map((cell, ti) => (
                  <span key={`c${ci}-${ti}`} className="research-scale-cell" data-tone={cell.tone} data-pin={cell.pin !== null ? 'true' : 'false'}>
                    <em className="research-scale-cell-tier">{tiers[ti]?.name}</em>
                    {cell.pin !== null ? <span className="research-scale-pin">{scaling.bottlenecks[cell.pin].number}</span> : null}
                    <ScaleCellText cell={cell} />
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
        </>
      ) : null}
    </section>
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
      {panel.scaling ? <ScalingSection scaling={panel.scaling} /> : null}
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
