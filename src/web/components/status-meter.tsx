// The shared status-meter (Phase 10, 10-18, UI-SPEC section 8): a segmented meter of status squares, one square per
// item, filled squares in a tone and the rest quiet (dashed). It is one shared name, built once here and drawn by
// every page that needs a progress meter; a page never makes its own `view-x-meter`. The whole meter is one image
// to a screen reader: the squares are hidden and `label` is its one accessible name, so the words and the squares
// can never disagree. Past 40 items a square stands for a bucket of items (the filled count scales, rounded), while
// the label keeps the exact numbers. Colour comes only from the tone and the shared status-square rules.
import type { ReactNode } from 'react';

/** The most squares one meter draws. */
export const STATUS_METER_MAX_CELLS = 40;

export type StatusMeterTone = 'complete' | 'in-flight';

/** One item's own state: `true` is done (the meter's tone), `false` is quiet, or a tone named outright (a page whose
 * items are done, pending and not stated draws `complete`, `in-flight` and `quiet`; the Eval review page's dimensions
 * also draw `missing`, the document-content tone for an expected item that has not appeared). */
export type StatusMeterItem = boolean | StatusMeterTone | 'missing' | 'quiet';

export interface StatusMeterProps {
  /** How many items are done, 0 to `total`. */
  filled: number;
  /** How many items there are. */
  total: number;
  /** Each item's own state in order, when the order matters (a checklist ticked out of order). With up to 40 items
   * the squares follow it; otherwise the squares are the first `filled` ones. */
  items?: readonly StatusMeterItem[];
  /** The tone of the filled squares; the rest are `quiet`. */
  tone?: StatusMeterTone;
  /** The meter's one accessible name, exact, e.g. "6 of 16 checklist items done". */
  label: string;
  /** Words drawn above the squares; hidden from assistive technology because `label` already says them. */
  caption?: ReactNode;
  /** `large` is the page-level meter; the default is the in-line one. */
  size?: 'default' | 'large';
}

/** The squares to draw and how many of them are filled: one per item up to the cap, else one per bucket. */
export function statusMeterCells(filled: number, total: number): { cells: number; filledCells: number } {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const safeFilled = Math.min(Math.max(Number.isFinite(filled) ? Math.floor(filled) : 0, 0), safeTotal);
  if (safeTotal <= STATUS_METER_MAX_CELLS) return { cells: safeTotal, filledCells: safeFilled };
  const filledCells = Math.round((safeFilled / safeTotal) * STATUS_METER_MAX_CELLS);
  return { cells: STATUS_METER_MAX_CELLS, filledCells };
}

export function StatusMeter({
  filled,
  total,
  items,
  tone = 'complete',
  label,
  caption,
  size = 'default',
}: StatusMeterProps): React.JSX.Element {
  const { cells, filledCells } = statusMeterCells(filled, total);
  const perItem = items !== undefined && items.length === total && total <= STATUS_METER_MAX_CELLS;
  const toneAt = (index: number): StatusMeterTone | 'missing' | 'quiet' => {
    if (!perItem) return index < filledCells ? tone : 'quiet';
    const item = items?.[index];
    if (typeof item === 'string') return item;
    return item ? tone : 'quiet';
  };
  return (
    <div className="status-meter" data-size={size} role="img" aria-label={label}>
      {caption !== undefined ? (
        <span className="status-meter-cap" aria-hidden="true">
          {caption}
        </span>
      ) : null}
      <span className="status-meter-cells" aria-hidden="true">
        {Array.from({ length: cells }, (_, index) => (
          <i
            key={index}
            className="status-square status-meter-sq"
            data-tone={toneAt(index)}
          />
        ))}
      </span>
    </div>
  );
}
