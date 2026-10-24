// The Stack spine's body (quick-261024-k8u, sketch 034 A): the decision's numbered reasons (which
// sit in the leaf, under the verdict), the stack one layer at a time behind a chip switch, and the
// alternatives as "chosen over alternative" rows. Every string is a React text node.
import { useState } from 'react';
import type { StackPanel } from '../../presentation/project-research-panels.ts';
import { Chev, ChipSwitch, ResearchInline, SectionHead, sentenceCase } from './research-atoms.tsx';

/** The decision's reasons: numbered one-line leads that each open to their body. */
export function StackReasons({ panel }: { panel: StackPanel }): React.JSX.Element | null {
  const [open, setOpen] = useState<number | null>(null);
  if (panel.reasons.length === 0) return null;
  return (
    <div className="research-reasons-wrap">
      {panel.reasonsTally ? <p className="research-label">{panel.reasonsTally}</p> : null}
      <ol className="research-reasons">
        {panel.reasons.map((reason, index) => {
          const isOpen = open === index;
          return (
            <li key={index} className="research-reason" data-open={isOpen}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : index)}>
                <span className="research-reason-n">{String(index + 1).padStart(2, '0')}</span>
                <span className="research-reason-lead">
                  <ResearchInline text={reason.lead} />
                </span>
                <Chev />
              </button>
              {isOpen ? (
                <p className="research-reason-body">
                  <ResearchInline text={reason.body} />
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StackPanelBody({ panel }: { panel: StackPanel }): React.JSX.Element {
  const [layer, setLayer] = useState(0);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [openAlt, setOpenAlt] = useState<number | null>(null);
  const layerIndex = Math.min(layer, Math.max(0, panel.layers.length - 1));
  const current = panel.layers[layerIndex];

  return (
    <div className="research-stack">
      {current ? (
        <section>
          <SectionHead title="Recommended stack" tally={panel.stackTally} />
          <ChipSwitch
            label="Stack layers"
            active={String(layerIndex)}
            options={panel.layers.map((item, index) => ({ key: String(index), label: item.title, count: item.items.length }))}
            onPick={(key) => {
              setLayer(Number(key));
              setOpenRow(null);
            }}
          />
          {current.note ? (
            <p className="research-gnote">
              <ResearchInline text={sentenceCase(current.note)} />
            </p>
          ) : null}
          <div className="research-prows">
            {current.items.map((item, index) => {
              const key = `${layerIndex}:${index}`;
              const isOpen = openRow === key;
              return (
                <div key={key} className="research-prow" data-open={isOpen}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenRow(isOpen ? null : key)}>
                    <span className="research-prow-name">
                      <ResearchInline text={item.name} />
                    </span>
                    <span className="research-prow-version">{item.version ? <ResearchInline text={item.version} /> : null}</span>
                    <span className="research-prow-purpose">{item.purpose ? <ResearchInline text={item.purpose} /> : null}</span>
                    <Chev />
                  </button>
                  {isOpen && item.why ? (
                    <div className="research-row-more">
                      <p className="research-label">{current.whyLabel}</p>
                      <p>
                        <ResearchInline text={`${sentenceCase(item.why)}.`} />
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {panel.alternatives ? (
        <section>
          <SectionHead title="Alternatives considered" tally={panel.alternatives.tally} />
          <div className="research-alts">
            {panel.alternatives.rows.map((row, index) => {
              const isOpen = openAlt === index;
              return (
                <div key={index}>
                  {row.header ? (
                    <p className="research-alt-group research-label">
                      <ResearchInline text={row.header} />
                    </p>
                  ) : null}
                  <div className="research-alt" data-open={isOpen}>
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenAlt(isOpen ? null : index)}>
                      <span className="research-alt-chosen" data-repeat={row.repeat ? 'true' : 'false'}>
                        <ResearchInline text={row.chosen} />
                      </span>
                      <span className="research-alt-over research-label">over</span>
                      <span className="research-alt-other">
                        <ResearchInline text={row.alt} />
                      </span>
                      <Chev />
                    </button>
                    {isOpen ? (
                      <div className="research-row-more">
                        <p className="research-label">{panel.alternatives?.label}</p>
                        <p>
                          <ResearchInline text={`${sentenceCase(row.text)}.`} />
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
