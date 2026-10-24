// The Summary spine's body (quick-261024-k8u, sketch 031 E round 4): the suggested build order as a
// track of phase cards with an inspector under it, "Why this order", and the gaps ledger.
// Every string is a React text node through ResearchInline.
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, Lock, TriangleAlert } from 'lucide-react';
import type { GateBlock, PhaseInspector, SummaryPanel } from '../../presentation/project-research-panels.ts';
import { PitfallChipView, ResearchInline, SectionHead } from './research-atoms.tsx';

/** A gate as a barrier block: a solid lock tile, "Gate", its sub line and its conditions as a
 * checklist marked with small outlined squares (never ticks). */
export function GateBlockView({ gate }: { gate: GateBlock }): React.JSX.Element {
  return (
    <div className="research-gate">
      <span className="research-gate-lock">
        <Lock aria-hidden="true" />
      </span>
      <span className="research-gate-head">
        <b>{gate.title}</b>
        <small>{gate.sub}</small>
      </span>
      <ul className="research-gate-cond">
        {gate.conditions.map((condition, index) => (
          <li key={index}>
            <span>
              <ResearchInline text={condition} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Inspector({
  inspector,
  index,
  total,
  onWalk,
}: {
  inspector: PhaseInspector;
  index: number;
  total: number;
  onWalk: (step: number) => void;
}): React.JSX.Element {
  return (
    <div className="research-inspect" aria-live="polite">
      <div className="research-inspect-head">
        <div>
          <p className="research-label">{inspector.kicker}</p>
          <h4 className="research-inspect-title">
            <ResearchInline text={inspector.name} />
          </h4>
        </div>
        <div className="research-walk">
          <button type="button" className="research-icon-btn" aria-label="Previous phase" disabled={index === 0} onClick={() => onWalk(-1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="research-icon-btn" aria-label="Next phase" disabled={index === total - 1} onClick={() => onWalk(1)}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="research-inspect-body">
        {inspector.rationale ? (
          <p className="research-inspect-why">
            <ResearchInline text={inspector.rationale} />
          </p>
        ) : null}
        <div className="research-facet">
          <p className="research-label">Delivers · {inspector.deliversCount}</p>
          <ul className="research-dv-grid" data-one={inspector.oneColumn ? 'true' : 'false'}>
            {inspector.delivers.map((tile, tileIndex) => (
              <li key={tileIndex} className="research-dv">
                <span className="research-dv-n">{String(tileIndex + 1).padStart(2, '0')}</span>
                <span>
                  <span className="research-dv-main">
                    <ResearchInline text={tile.main} />
                  </span>
                  {tile.sub ? (
                    <span className="research-dv-sub">
                      <ResearchInline text={tile.sub} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="research-facets-side">
          {inspector.gate ? <GateBlockView gate={inspector.gate} /> : null}
          {inspector.avoids.length > 0 ? (
            <div className="research-facet">
              <p className="research-label">Avoids pitfalls · {inspector.avoids.length}</p>
              <div className="research-pf-chips">
                {inspector.avoids.map((chip) => (
                  <PitfallChipView key={chip.n} chip={chip} />
                ))}
              </div>
            </div>
          ) : null}
          {inspector.flag ? (
            <div className="research-facet">
              <p className="research-label">{inspector.flag.label}</p>
              <p>
                <ResearchInline text={inspector.flag.text} />
              </p>
            </div>
          ) : null}
          {inspector.facets.map((facet) => (
            <div key={facet.label} className="research-facet">
              <p className="research-label">{facet.label}</p>
              <p>
                <ResearchInline text={facet.text} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SummaryPanelBody({ panel }: { panel: SummaryPanel }): React.JSX.Element {
  const [selected, setSelected] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);
  const track = useRef<HTMLDivElement | null>(null);
  const total = panel.phases.length;
  const index = Math.min(selected, Math.max(0, total - 1));

  const walk = (step: number): void => {
    const next = Math.max(0, Math.min(total - 1, index + step));
    if (next === index) return;
    setSelected(next);
    // The newly selected card keeps focus, so the next arrow keeps walking.
    requestAnimationFrame(() => track.current?.querySelector<HTMLButtonElement>(`[data-phase="${next}"]`)?.focus());
  };

  // The track and the inspector own their arrows: they walk the phases and the spines stay put.
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    walk(event.key === 'ArrowRight' ? 1 : -1);
  };

  return (
    <div className="research-summary">
      <section>
        <SectionHead title="Suggested build order" tally={panel.tally} />
        {panel.note ? (
          <p className="research-sec-note">
            <ResearchInline text={panel.note} />
          </p>
        ) : null}
        {panel.entryGate ? (
          <div className="research-entry">
            <GateBlockView gate={panel.entryGate} />
          </div>
        ) : null}
        {total === 0 ? (
          <p className="research-sec-note">This summary names no phases.</p>
        ) : (
          <div onKeyDown={onKeyDown}>
            <div className="research-track-wrap" ref={track}>
              <div
                className="research-track"
                data-lanes={panel.hasSecondLane ? '2' : '1'}
                style={{ '--research-cols': panel.cols } as React.CSSProperties}
              >
                {panel.phases.map((phase, phaseIndex) => (
                  <button
                    key={phase.n + String(phaseIndex)}
                    type="button"
                    className="research-stn"
                    data-alongside={phase.alongside ? 'true' : 'false'}
                    data-phase={phaseIndex}
                    aria-pressed={phaseIndex === index}
                    style={{ gridColumn: phase.col, gridRow: phase.lane }}
                    onClick={() => setSelected(phaseIndex)}
                  >
                    <span className="research-stn-num">{phase.label}</span>
                    <span className="research-stn-card">
                      {phase.alongside ? <span className="research-stn-with">Alongside {phase.alongside}</span> : null}
                      <b className="research-stn-name">
                        <ResearchInline text={phase.name} />
                      </b>
                      <span className="research-stn-marks">
                        {phase.marks.gate ? (
                          <span data-mark="gate">
                            <Lock aria-hidden="true" /> Gate
                          </span>
                        ) : null}
                        {phase.marks.research ? (
                          <span>
                            <FlaskConical aria-hidden="true" /> Research
                          </span>
                        ) : null}
                        {phase.marks.pitfalls > 0 ? (
                          <span aria-label={`Avoids ${phase.marks.pitfalls} pitfalls`}>
                            <TriangleAlert aria-hidden="true" /> {phase.marks.pitfalls}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Inspector inspector={panel.inspectors[index]} index={index} total={total} onWalk={walk} />
          </div>
        )}
        {panel.whyOrder.length > 0 ? (
          <div className="research-why">
            <button type="button" className="research-toggle" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>
              <ChevronRight aria-hidden="true" />
              Why this order · {panel.whyOrder.length}
            </button>
            {whyOpen ? (
              <ol className="research-why-list">
                {panel.whyOrder.map((reason, reasonIndex) => (
                  <li key={reasonIndex}>
                    <span>
                      <ResearchInline text={reason} />
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
      </section>
      {panel.gaps.length > 0 ? (
        <section>
          <SectionHead title="Gaps to address" tally={`${panel.gaps.length} open · resolve during planning`} />
          <ol className="research-gaps">
            {panel.gaps.map((gap, gapIndex) => (
              <li key={gapIndex} className="research-gap">
                <div>
                  {gap.lead ? (
                    <b>
                      <ResearchInline text={gap.lead} />
                    </b>
                  ) : null}
                  <p>
                    <ResearchInline text={gap.body} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
