// Small shared pieces of the project Research page (quick-261024-k8u, sketches 031-035).
// Every string that comes from a research file reaches the DOM through `ResearchInline`: the
// tokenizer's text/code/strong/em output mapped to React nodes, never markup. A `D-NN` mention
// stays plain text. The page never links back to the source files.
import { Fragment, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useProjectNavigate } from '../nav.tsx';
import type { PitfallChip, SwapItem } from '../../presentation/project-research-panels.ts';
import { tokenizeInline } from '../views/inline-markdown.ts';
import type { InlineToken } from '../views/inline-markdown.ts';
import type { ConfidenceLevel } from '../../planning-repo/handlers/project-research-lift.ts';

function renderTokens(tokens: InlineToken[], prefix: string): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${prefix}${index}`;
    switch (token.type) {
      case 'text':
      case 'ref':
        return <Fragment key={key}>{token.value}</Fragment>;
      case 'code':
        return <code key={key}>{token.value}</code>;
      case 'strong':
        return <strong key={key}>{renderTokens(token.value, `${key}.`)}</strong>;
      case 'em':
        return <em key={key}>{renderTokens(token.value, `${key}.`)}</em>;
    }
  });
}

/** The only path any research string reaches the DOM through. */
export function ResearchInline({ text }: { text: string }): React.JSX.Element {
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  return <>{renderTokens(tokens, '')}</>;
}

/** First letter up, a trailing period dropped: the shape sketches 033 and 034 print rows in. */
export function sentenceCase(text: string): string {
  const trimmed = text.trim();
  return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).replace(/\.$/, '');
}

/** How full a confidence meter is, in cells (half cells allowed); unstated is empty. */
export function confidenceCells(level: ConfidenceLevel | null): number {
  switch (level) {
    case 'HIGH':
      return 3;
    case 'MEDIUM-HIGH':
      return 2.5;
    case 'MEDIUM':
      return 2;
    case 'LOW-MEDIUM':
      return 1.5;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}

/** `MEDIUM-HIGH` as `medium–high`; null as `unstated`. */
export function confidenceText(level: ConfidenceLevel | null): string {
  return level ? level.toLowerCase().replace('-', '–') : 'unstated';
}

/** A row of cells, each full, half or empty: a confidence (3 cells) or likelihood (4 cells) meter. */
export function Meter({
  filled,
  cells,
  label,
}: {
  filled: number;
  cells: number;
  label: string;
}): React.JSX.Element {
  return (
    <span className="research-meter" role="img" aria-label={label}>
      {Array.from({ length: cells }, (_, index) => {
        const position = index + 1;
        const fill = filled >= position ? 'full' : filled >= position - 0.5 ? 'half' : 'empty';
        return <i key={position} data-fill={fill} />;
      })}
    </span>
  );
}

export function ConfidenceMeter({ level }: { level: ConfidenceLevel | null }): React.JSX.Element {
  return <Meter filled={confidenceCells(level)} cells={3} label={`${level ?? 'unstated'} confidence`} />;
}

/** The meter beside its lowercase level, as in the bar and the leaf kicker. */
export function ConfidenceChip({ level }: { level: ConfidenceLevel | null }): React.JSX.Element {
  return (
    <span className="research-conf">
      <ConfidenceMeter level={level} />
      {confidenceText(level)}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Shared panel atoms

/** A panel section's head: its title (an h3) and a mono tally at the trailing edge. */
export function SectionHead({ title, tally }: { title: string; tally?: string | null }): React.JSX.Element {
  return (
    <div className="research-section-head">
      <h3>{title}</h3>
      {tally ? <span className="research-tally">{tally}</span> : null}
    </div>
  );
}

/** The chevron that turns when a row opens. */
export function Chev(): React.JSX.Element {
  return <ChevronRight className="research-chev" aria-hidden="true" />;
}

export interface ChipOption {
  key: string;
  label: string;
  count: number;
}

/** One-at-a-time switch: chips with counts (Stack layers, Features groups). */
export function ChipSwitch({
  options,
  active,
  onPick,
  label,
}: {
  options: readonly ChipOption[];
  active: string;
  onPick: (key: string) => void;
  label: string;
}): React.JSX.Element {
  return (
    <div className="research-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="research-chip"
          aria-pressed={option.key === active}
          onClick={() => onPick(option.key)}
        >
          <span>{option.label}</span>
          <b>{option.count}</b>
        </button>
      ))}
    </div>
  );
}

/** 032 A's swaps: the thing struck through, then what to do instead; a click opens the why. */
export function SwapRows({ items }: { items: readonly SwapItem[] }): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="research-swaps">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <li key={index} className="research-swap" data-open={isOpen}>
            <button
              type="button"
              className="research-swap-button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              <span className="research-swap-n">{String(index + 1).padStart(2, '0')}</span>
              <span className="research-swap-bad">
                <ResearchInline text={item.bad} />
              </span>
              <span className="research-swap-arrow" aria-hidden="true">
                →
              </span>
              <span className="research-swap-good">
                <ResearchInline text={item.good} />
              </span>
              <Chev />
            </button>
            {isOpen ? (
              <div className="research-swap-why">
                {item.details.map((detail) => (
                  <Fragment key={detail.label}>
                    <p className="research-label">{detail.label}</p>
                    <p>
                      <ResearchInline text={detail.text} />
                    </p>
                  </Fragment>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A pitfall's number as a chip. A navigable one opens that pitfall on the Pitfalls spine (a pushed
 * history entry, so Back returns to the chip); an inert one is a plain span. */
export function PitfallChipView({ chip, withName = false }: { chip: PitfallChip; withName?: boolean }): React.JSX.Element {
  const navigate = useProjectNavigate();
  const text = withName && chip.short ? `${chip.label} \u00b7 ${chip.short}` : chip.label;
  if (!chip.navigable) return <span className="research-pf-chip">{text}</span>;
  const name = chip.short ? `Pitfall ${chip.label}: ${chip.short}` : `Pitfall ${chip.label}`;
  return (
    <button
      type="button"
      className="research-pf-chip"
      aria-label={name}
      title={chip.short ?? undefined}
      onClick={() => navigate({ search: `?open=pitfalls&pitfall=${chip.n}` })}
    >
      {text}
    </button>
  );
}
