// The Pitfalls spine's body (quick-261024-k8u, sketch 035 A): a watch list with one row per
// pitfall that opens in place, and the "Looks done but isn't" ledger. Warning signs are marked with
// small squares drawn by CSS in the pitfall tone (the `missing` family); no icon or glyph marks any
// list item. `?pitfall=N` opens row N. Every string is a React text node.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { PitfallRowModel, PitfallsPanel, PitfallTabKey } from '../../presentation/project-research-panels.ts';
import { Chev, Meter, PitfallChipView, ResearchInline, SectionHead } from './research-atoms.tsx';

function Blocks({ blocks }: { blocks: ReadonlyArray<{ bullet: boolean; text: string }> }): React.JSX.Element {
  const groups: Array<{ bullet: boolean; items: string[] }> = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.bullet && last?.bullet) last.items.push(block.text);
    else groups.push({ bullet: block.bullet, items: [block.text] });
  }
  return (
    <>
      {groups.map((group, index) =>
        group.bullet ? (
          <ul key={index} className="research-signs">
            {group.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <span>
                  <ResearchInline text={item} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            <ResearchInline text={group.items[0]} />
          </p>
        ),
      )}
    </>
  );
}

function AvoidRows({ row }: { row: PitfallRowModel }): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="research-avoid">
      {row.avoid.map((item, index) => (
        <li key={index}>
          <button
            type="button"
            className="research-avoid-button"
            aria-expanded={open === index}
            onClick={() => setOpen(open === index ? null : index)}
          >
            <span className="research-avoid-n">{String(index + 1).padStart(2, '0')}</span>
            <span>
              <span className="research-avoid-main">
                <ResearchInline text={item.main} />
              </span>
              {item.rest ? (
                <span className="research-avoid-rest">
                  <ResearchInline text={item.rest} />
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function OpenRow({ row }: { row: PitfallRowModel }): React.JSX.Element {
  const [tab, setTab] = useState<PitfallTabKey | null>(null);
  const [wrongMore, setWrongMore] = useState(false);
  const active = row.tabs.find((entry) => entry.key === tab)?.key ?? row.tabs[0]?.key ?? null;
  const wrong = row.wrong;

  // The tabs own their arrows (roving selection), so the spines stay put.
  const onTabKeys = (event: React.KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const at = row.tabs.findIndex((entry) => entry.key === active);
    const next = row.tabs[Math.max(0, Math.min(row.tabs.length - 1, at + (event.key === 'ArrowRight' ? 1 : -1)))];
    if (next) {
      setTab(next.key);
      requestAnimationFrame(() => (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
    }
  };

  return (
    <div className="research-wl-open">
      {wrong.head ? (
        <>
          <p className="research-p-wrong">
            <ResearchInline text={wrong.head} />
          </p>
          {wrong.tail ? (
            <p className="research-tail">
              <ResearchInline text={wrong.tail} />
            </p>
          ) : null}
        </>
      ) : wrong.list.length > 0 ? (
        <ul className="research-p-wrong-list">
          {wrong.list.map((item, index) => (
            <li key={index}>
              <span>
                <ResearchInline text={item} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {wrong.more.length > 0 ? (
        <>
          {wrongMore ? (
            <div className="research-p-more">
              <Blocks blocks={wrong.more} />
            </div>
          ) : null}
          <button type="button" className="research-toggle" aria-expanded={wrongMore} onClick={() => setWrongMore(!wrongMore)}>
            <Chev />
            {wrongMore ? 'Show less' : 'What goes wrong, in full'}
          </button>
        </>
      ) : null}
      {row.tabs.length > 0 ? (
        <>
          <div className="research-ptabs" role="tablist" aria-label={`Pitfall ${row.label}`} onKeyDown={onTabKeys}>
            {row.tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                className="research-ptab"
                aria-selected={entry.key === active}
                tabIndex={entry.key === active ? 0 : -1}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="research-ppane" role="tabpanel">
            {active === 'signs' ? (
              <ul className="research-signs">
                {row.signs.map((sign, index) => (
                  <li key={index}>
                    <span>
                      <ResearchInline text={sign} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {active === 'avoid' ? <AvoidRows row={row} /> : null}
            {active === 'why' ? (
              <div className="research-p-prose">
                {row.why.map((block, index) => (
                  <p key={index}>
                    <ResearchInline text={block.text} />
                  </p>
                ))}
              </div>
            ) : null}
            {active === 'verify' && row.verify ? (
              <div className="research-verify">
                <p className="research-label">Proves it&apos;s prevented</p>
                <p>
                  <ResearchInline text={row.verify} />
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** `?pitfall=` as a bounded positive integer, else null. */
function requestedPitfall(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

export function PitfallsPanelBody({ panel }: { panel: PitfallsPanel }): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const param = requestedPitfall(searchParams.get('pitfall'));
  const requested = param !== null && panel.pitfalls.some((row) => row.n === param) ? param : null;
  const [open, setOpen] = useState<number | null>(requested);
  const [seen, setSeen] = useState<number | null>(requested);
  const rows = useRef(new Map<number, HTMLLIElement>());
  // A new `?pitfall=` (a chip elsewhere on the page) opens that row, set during render so the row
  // opens on the same frame the URL changes.
  if (requested !== seen) {
    setSeen(requested);
    if (requested !== null) setOpen(requested);
  }
  useEffect(() => {
    if (requested !== null) rows.current.get(requested)?.scrollIntoView({ block: 'start' });
  }, [requested]);

  return (
    <div className="research-pitfalls">
      <section>
        <SectionHead title="Critical pitfalls" tally={panel.tally} />
        {panel.note ? (
          <p className="research-sec-note">
            <ResearchInline text={panel.note} />
          </p>
        ) : null}
        <ol className="research-wl">
          {panel.pitfalls.map((row) => {
            const isOpen = open === row.n;
            return (
              <li
                key={row.n}
                className="research-wl-row"
                data-open={isOpen}
                data-pitfall={row.n}
                ref={(element) => {
                  if (element) rows.current.set(row.n, element);
                  else rows.current.delete(row.n);
                }}
              >
                <button
                  type="button"
                  className="research-wl-head"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : row.n)}
                >
                  <span className="research-pnum">{row.label}</span>
                  <span className="research-wl-name">
                    <b>
                      <ResearchInline text={row.name} />
                    </b>
                    {row.title ? (
                      <span className="research-wl-full">
                        <ResearchInline text={row.title} />
                      </span>
                    ) : null}
                    {!isOpen && row.firstSign ? (
                      <span className="research-wl-watch">
                        <span className="research-label">Watch for</span>
                        <span className="research-wl-sign">
                          <span className="research-wl-sign-text">
                            <ResearchInline text={row.firstSign} />
                          </span>
                          {row.moreSigns > 0 ? <em>+{row.moreSigns} more</em> : null}
                        </span>
                      </span>
                    ) : null}
                  </span>
                  <span className="research-wl-lk">
                    {row.meter ? (
                      <span className="research-likely">
                        <Meter filled={row.meter.filled} cells={row.meter.cells} label={row.meter.label} />
                        <span>{row.meter.text}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="research-phase-tag" title="Prevented in">
                    {row.phase}
                  </span>
                  <Chev />
                </button>
                {isOpen ? <OpenRow row={row} /> : null}
              </li>
            );
          })}
        </ol>
      </section>
      {panel.checks.length > 0 ? (
        <section>
          <SectionHead title="Looks done but isn't" tally={panel.checksTally} />
          <ol className="research-ledger">
            {panel.checks.map((check, index) => (
              <li key={index}>
                <div>
                  {check.label ? (
                    <b>
                      <ResearchInline text={check.label} />
                    </b>
                  ) : null}
                  <p>
                    <ResearchInline text={check.text} />
                  </p>
                  {check.chips.length > 0 ? (
                    <div className="research-pf-chips">
                      {check.chips.map((chip) => (
                        <PitfallChipView key={chip.n} chip={chip} withName />
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
