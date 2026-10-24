// The Features spine's body (quick-261024-k8u, sketch 033 D1): a kind switch with big counts, a
// group switch when the chosen list has groups, feature rows with complexity cells, "Not to build"
// as swaps, and the competitor matrix with our column tinted. Every string is a React text node.
import { useState } from 'react';
import type { FeatureKindKey, FeatureList, FeaturesPanel } from '../../presentation/project-research-panels.ts';
import { Chev, ChipSwitch, Meter, ResearchInline, SectionHead, SwapRows, sentenceCase } from './research-atoms.tsx';

function FeatureRows({ kind, list }: { kind: FeatureKindKey; list: FeatureList }): React.JSX.Element {
  const [group, setGroup] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const names = list.groups.map((entry) => entry.name);
  const active = group !== null && names.includes(group) ? group : (names[0] ?? null);
  const rows = list.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => active === null || (item.group ?? 'Other') === active);
  return (
    <>
      {list.groups.length > 0 && active !== null ? (
        <ChipSwitch
          label="Feature groups"
          active={active}
          options={list.groups.map((entry) => ({ key: entry.name, label: entry.name, count: entry.count }))}
          onPick={(key) => {
            setGroup(key);
            setOpen(null);
          }}
        />
      ) : null}
      <div className="research-frows">
        {rows.map(({ item, index }) => {
          const key = `${kind}:${index}`;
          const isOpen = open === key;
          return (
            <div key={key} className="research-frow" data-open={isOpen}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                <span>
                  <span className="research-frow-name">
                    <ResearchInline text={item.name} />
                  </span>
                  {!isOpen && item.why ? (
                    <span className="research-frow-why">
                      <ResearchInline text={item.why} />
                    </span>
                  ) : null}
                </span>
                <Meter filled={item.cells} cells={3} label={item.complexity ? `${item.complexity} complexity` : 'complexity not rated'} />
                <Chev />
              </button>
              {isOpen ? (
                <div className="research-row-more">
                  <p className="research-label">{kind === 'expected' ? 'Why users expect it' : 'Why it matters'}</p>
                  <p>
                    <ResearchInline text={`${sentenceCase(item.why)}.`} />
                  </p>
                  {item.notes ? (
                    <>
                      <p className="research-label">Notes</p>
                      <p>
                        <ResearchInline text={`${sentenceCase(item.notes)}.`} />
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function CompetitorMatrix({ competitors }: { competitors: NonNullable<FeaturesPanel['competitors']> }): React.JSX.Element {
  const [unclamped, setUnclamped] = useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number): void => {
    const next = new Set(unclamped);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setUnclamped(next);
  };
  return (
    <section>
      <SectionHead title="Competitor feature analysis" tally={competitors.tally} />
      <div className="research-matrix" style={{ '--research-rivals': competitors.rivals.length } as React.CSSProperties}>
        <div className="research-matrix-row" data-head="true">
          <span className="research-label">Feature</span>
          {competitors.rivals.map((rival, index) => (
            <span key={index}>
              <b>{rival.name}</b>
              {rival.sub ? <small>{rival.sub}</small> : null}
            </span>
          ))}
          <span className="research-matrix-us">
            <b>{competitors.ours.name}</b>
            <small>{competitors.ours.sub}</small>
          </span>
        </div>
        {competitors.rows.map((row, index) => {
          const isOpen = unclamped.has(index);
          return (
            <div
              key={index}
              className="research-matrix-row"
              data-open={isOpen}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => toggle(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggle(index);
                }
              }}
            >
              <span className="research-matrix-feature">
                <ResearchInline text={row.feature} />
              </span>
              {row.them.map((cell, cellIndex) => (
                <span key={cellIndex} className="research-matrix-them">
                  <span className="research-matrix-clamp">
                    <ResearchInline text={cell || '—'} />
                  </span>
                </span>
              ))}
              <span className="research-matrix-us">
                <span className="research-matrix-clamp">
                  <ResearchInline text={row.ours} />
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {competitors.note ? (
        <p className="research-matrix-note">
          <ResearchInline text={competitors.note} />
        </p>
      ) : null}
    </section>
  );
}

export function FeaturesPanelBody({ panel }: { panel: FeaturesPanel }): React.JSX.Element {
  const [kind, setKind] = useState<FeatureKindKey>('expected');
  return (
    <div className="research-features">
      <section>
        <SectionHead title="Feature landscape" tally={panel.tally} />
        <div className="research-kinds" role="group" aria-label="Feature kinds">
          {panel.kinds.map((entry) => (
            <button key={entry.key} type="button" className="research-kind" aria-pressed={kind === entry.key} onClick={() => setKind(entry.key)}>
              <b>{entry.count}</b>
              <span className="research-label">{entry.label}</span>
            </button>
          ))}
        </div>
        {kind === 'anti' ? (
          <SwapRows items={panel.anti.items} />
        ) : (
          // Remounted per kind so each list starts on its first group with nothing open.
          <FeatureRows key={kind} kind={kind} list={panel[kind]} />
        )}
      </section>
      {panel.competitors ? <CompetitorMatrix competitors={panel.competitors} /> : null}
    </div>
  );
}
