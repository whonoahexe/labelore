// Small shared pieces of the project Research page (quick-261024-k8u, sketches 031-035).
// Every string that comes from a research file reaches the DOM through `ResearchInline`: the
// tokenizer's text/code/strong/em output mapped to React nodes, never markup. A `D-NN` mention
// stays plain text. The page never links back to the source files.
import { Fragment, useMemo } from 'react';
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
