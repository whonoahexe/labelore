// A History milestone's RETROSPECTIVE.md section in a dialog (sketch 030, side rail): the four point
// lists as a vertical tab rail beside the open list, numbered, with Older / Newer walking the History
// milestones that have a retrospective.
import { useEffect, useRef } from 'react';
import { Check, Hourglass, Lightbulb, Repeat, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx';
import { LeadText } from '../components/lead-tokens.tsx';
import type { MilestoneFlow, RetroSectionKey } from '../../presentation/roadmap.ts';
import { stripEmoji } from './strip-emoji.ts';

export interface RetrospectiveTarget {
  key: string;
  tab: RetroSectionKey | null;
}

const ICONS: Record<RetroSectionKey, LucideIcon> = {
  worked: Check,
  inefficient: Hourglass,
  patterns: Repeat,
  lessons: Lightbulb,
};

/** The History milestone's title as authored, emoji and all: the <summary> text ROADMAP.md
 * archived carries the version already; a MILESTONES.md name does not. */
export function historyName(milestone: MilestoneFlow): string {
  const record = milestone.record;
  return record && milestone.version ? `${milestone.version} ${record.name}` : milestone.name;
}

function historyTitle(milestone: MilestoneFlow): string {
  return stripEmoji(historyName(milestone));
}

export function RetrospectiveButton({
  milestone,
  onOpen,
}: {
  milestone: MilestoneFlow;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="milestone-retro-button"
      aria-haspopup="dialog"
      aria-label={`Open the ${historyTitle(milestone)} retrospective`}
      onClick={(event) => {
        // The button sits inside the card's <summary>; opening the dialog must not toggle the card.
        event.preventDefault();
        event.stopPropagation();
        onOpen();
      }}
    >
      <Lightbulb aria-hidden="true" />
      <span>Retrospective</span>
    </button>
  );
}

function pad(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function RetrospectiveDialog({
  milestones,
  target,
  caption,
  onChange,
}: {
  /** The History milestones, oldest first; only the ones with a retrospective are walked. */
  milestones: MilestoneFlow[];
  target: RetrospectiveTarget | null;
  caption: (milestone: MilestoneFlow) => string;
  onChange: (next: RetrospectiveTarget | null) => void;
}): React.JSX.Element {
  const railRef = useRef<HTMLDivElement | null>(null);
  const walkable = milestones.filter((milestone) => milestone.retrospective);
  const index = target ? walkable.findIndex((milestone) => milestone.key === target.key) : -1;
  const milestone = index >= 0 ? walkable[index] : null;
  const retrospective = milestone?.retrospective ?? null;
  const live = retrospective?.sections.filter((section) => section.points.length > 0) ?? [];
  // A section the milestone lacks falls back to the first one with points.
  const current = live.find((section) => section.key === target?.tab) ?? live[0] ?? null;
  const older = index > 0 ? walkable[index - 1] : undefined;
  const newer = index >= 0 ? walkable[index + 1] : undefined;

  useEffect(() => {
    railRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [current?.key, milestone?.key]);

  function select(key: RetroSectionKey): void {
    if (milestone) onChange({ key: milestone.key, tab: key });
  }

  function onRailKey(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!current || live.length === 0) return;
    const at = live.indexOf(current);
    let next: number;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (at + 1) % live.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (at - 1 + live.length) % live.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = live.length - 1;
    else return;
    event.preventDefault();
    select(live[next].key);
  }

  return (
    <Dialog
      open={milestone !== null}
      onOpenChange={(open) => {
        if (!open) onChange(null);
      }}
    >
      <DialogContent className="milestone-retro">
        {milestone && retrospective && current ? (
          <>
            <header className="milestone-retro-head">
              <p className="eyebrow">Retrospective</p>
              <DialogTitle>{historyTitle(milestone)}</DialogTitle>
              <DialogDescription>{caption(milestone)}</DialogDescription>
            </header>
            <div className="milestone-retro-body">
              <div
                ref={railRef}
                className="milestone-retro-rail"
                role="tablist"
                aria-orientation="vertical"
                aria-label="Retrospective sections"
                onKeyDown={onRailKey}
              >
                {retrospective.sections.map((section) => {
                  const Icon = ICONS[section.key];
                  const selected = section.key === current.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      role="tab"
                      id={`milestone-retro-tab-${section.key}`}
                      className="milestone-retro-tab"
                      aria-selected={selected}
                      aria-controls="milestone-retro-pane"
                      tabIndex={selected ? 0 : -1}
                      disabled={section.points.length === 0}
                      onClick={() => select(section.key)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{section.label}</span>
                      <b>{section.points.length}</b>
                    </button>
                  );
                })}
              </div>
              <div
                id="milestone-retro-pane"
                className="milestone-retro-pane"
                role="tabpanel"
                aria-labelledby={`milestone-retro-tab-${current.key}`}
              >
                <h3>{current.label}</h3>
                <p className="milestone-retro-count">
                  {`${current.points.length} point${current.points.length === 1 ? '' : 's'} from the ${milestone.version ?? historyTitle(milestone)} retrospective`}
                </p>
                <ol className="milestone-retro-points">
                  {current.points.map((point, at) => (
                    <li key={at}>
                      <span aria-hidden="true">{pad(at)}</span>
                      <p>
                        {point.lead ? (
                          <>
                            <strong>
                              <LeadText text={point.lead} />
                            </strong>{' '}
                          </>
                        ) : null}
                        <LeadText text={point.text} />
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <footer className="milestone-retro-foot">
              <span className="milestone-retro-keys" aria-hidden="true">
                <kbd>←</kbd>
                <kbd>→</kbd> sections
              </span>
              <span className="milestone-retro-walk">
                <button
                  type="button"
                  disabled={!older}
                  onClick={() => older && onChange({ key: older.key, tab: current.key })}
                >
                  {`← ${older?.version ?? 'Older'}`}
                </button>
                <button
                  type="button"
                  disabled={!newer}
                  onClick={() => newer && onChange({ key: newer.key, tab: current.key })}
                >
                  {`${newer?.version ?? 'Newer'} →`}
                </button>
              </span>
            </footer>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
