// Pace (quick-261018-4tb, sketch 026 P1): the total execution time as the hero of a rail, the plan
// counts under it, a trend chip and sentence, and every timed plan as a dot over shaded phase bands
// with a running median. Every number comes from presentation/dashboard-pace.ts; this module only
// maps that model to markup. SVG text is plain children, and a dot names its plan through a native
// <title>, so there is no tooltip element and nothing moves.
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import {
  TREND_LABEL,
  formatMinutes,
  paceChart,
  paceStats,
  scopedPlans,
  trendSentence,
  type PaceScopeKey,
  type PaceStats,
} from '../../presentation/dashboard-pace.ts';
import type { DashboardViewModel } from '../../presentation/dashboard.ts';

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

function TrendIcon({ verdict }: { verdict: NonNullable<PaceStats['trend']>['verdict'] }): React.JSX.Element {
  if (verdict === 'faster') return <TrendingDown aria-hidden="true" />;
  if (verdict === 'slower') return <TrendingUp aria-hidden="true" />;
  return <ArrowRight aria-hidden="true" />;
}

function ScopeChips({
  milestones,
  scope,
  onScope,
}: {
  milestones: string[];
  scope: PaceScopeKey;
  onScope: (scope: PaceScopeKey) => void;
}): React.JSX.Element | null {
  if (milestones.length < 2) return null;
  const options: PaceScopeKey[] = ['all', ...[...milestones].reverse()];
  return (
    <div className="pace-scope">
      <div className="ledger-chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="ledger-chip"
            data-on={scope === option}
            onClick={() => onScope(option)}
          >
            {option === 'all' ? 'All milestones' : option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PaceSection({
  pace,
  readAt,
}: {
  pace: DashboardViewModel['pace'];
  readAt: string;
}): React.JSX.Element {
  const [scope, setScope] = useState<PaceScopeKey>(pace.defaultScope);
  const plans = scopedPlans(pace.plans, scope);
  const stats = paceStats(plans);

  if (stats.timed === 0) {
    return (
      <section className="pace-empty" aria-labelledby="pace-heading">
        <header className="section-heading">
          <div>
            <p className="eyebrow">
              <Clock aria-hidden="true" />
              Pace
            </p>
            <h2 id="pace-heading">How fast plans land</h2>
          </div>
          <ScopeChips milestones={pace.milestones} scope={scope} onScope={setScope} />
        </header>
        <div className="quiet-state">
          <CheckCircle2 aria-hidden="true" />
          <p>No completed plan has a recorded duration yet.</p>
        </div>
      </section>
    );
  }

  const chart = paceChart(plans, readAt);
  const { trend } = stats;
  return (
    <section className="pace-rail" aria-label="Pace">
      <div className="pace-hero">
        <p className="eyebrow">
          <Clock aria-hidden="true" />
          Pace
        </p>
        <span className="pace-total">{formatMinutes(stats.total)}</span>
        <span className="ledger-quiet">{`of execution across ${plural(stats.timed, 'timed plan')}`}</span>
        <dl className="pace-facts">
          <dt>Plans completed</dt>
          <dd>
            {stats.plans}
            {stats.untimed > 0 ? <span className="ledger-quiet">{`${stats.untimed} untimed`}</span> : null}
          </dd>
          <dt>Average</dt>
          <dd>
            {formatMinutes(stats.avg)}
            <span className="ledger-quiet">{`median ${formatMinutes(stats.median)}`}</span>
          </dd>
          <dt>Per task</dt>
          <dd>{`${stats.perTask.toFixed(1)} min`}</dd>
        </dl>
      </div>
      <div className="pace-main">
        <ScopeChips milestones={pace.milestones} scope={scope} onScope={setScope} />
        <div className="pace-verdict">
          <span className="pace-trend" data-verdict={trend?.verdict}>
            {trend ? <TrendIcon verdict={trend.verdict} /> : null}
            {trend ? TREND_LABEL[trend.verdict] : 'Not enough plans yet'}
          </span>
          <p>{trendSentence(trend)}</p>
        </div>
        <figure className="pace-chart">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Minutes per plan, in completion order">
            {chart.bands.map((band) => (
              <g key={`${band.x}`}>
                <rect
                  className="pace-band"
                  data-alt={band.alt}
                  x={band.x}
                  y={band.y}
                  width={band.width}
                  height={band.height}
                />
                {band.label ? (
                  <text className="pace-band-label" x={band.labelX} y={band.labelY} textAnchor="middle">
                    {band.label}
                  </text>
                ) : null}
              </g>
            ))}
            {chart.ticks.map((tick) => (
              <g key={tick.value}>
                <line className="pace-gridline" x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} />
                <text className="pace-tick" x={chart.left - 6} y={tick.y + 3} textAnchor="end">
                  {tick.label}
                </text>
              </g>
            ))}
            <path className="pace-median" d={chart.medianPath} />
            {chart.dots.map((dot, index) => (
              <g key={`${dot.id}-${index}`} className="pace-dot" data-approx={dot.approx}>
                <title>{dot.tip}</title>
                <circle className="pace-dot-hit" cx={dot.x} cy={dot.y} r={10} />
                <circle className="pace-dot-mark" cx={dot.x} cy={dot.y} r={4} />
                {dot.caret ? <path className="pace-over" d={dot.caret} /> : null}
              </g>
            ))}
          </svg>
          <figcaption className="pace-key">
            <span>
              <i className="pace-key-dot" />
              One plan, minutes
            </span>
            <span>
              <i className="pace-key-dot" data-hollow="true" />
              Approximate (~)
            </span>
            <span>
              <i className="pace-key-line" />
              Running median of 5
            </span>
            {chart.anyOver ? <span>{`Above ${formatMinutes(chart.cap)}: drawn at the top`}</span> : null}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
