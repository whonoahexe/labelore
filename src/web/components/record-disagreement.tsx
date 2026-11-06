// The shared disagreement block (Phase 11, 11-10, promoted from three planned view-local copies per UI-SPEC section 9):
// two records that part ways, drawn as a dashed, quiet frame with each value under the name of the file it came from,
// "{field} · {left file}" beside "{field} · {right file}". It is a fact about the files, never an error and never a
// result: nothing is merged and neither side is called right. The `≠` carries the accessible text "differs from", so
// a screen reader hears "task · HANDOFF.json 3 differs from task · .continue-here.md 4". Plain React text only; the
// caller passes author text through as-is. Used by the pause page now; the Spikes and Workstreams pages reuse it.
import { ResearchInline } from '../pages/research-atoms.tsx';

export interface RecordDisagreementSide {
  /** The file (or record) the value came from: "HANDOFF.json". */
  label: string;
  value: string;
}

export function RecordDisagreement({
  field,
  left,
  right,
}: {
  field: string;
  left: RecordDisagreementSide;
  right: RecordDisagreementSide;
}): React.JSX.Element {
  return (
    <div className="record-disagreement">
      <div data-side="left">
        <span data-part="label">
          {field} · {left.label}
        </span>
        <span data-part="value">
          <ResearchInline text={left.value} />
        </span>
      </div>
      <span data-part="ne">
        <span aria-hidden="true">≠</span>
        <span className="sr-only">differs from</span>
      </span>
      <div data-side="right">
        <span data-part="label">
          {field} · {right.label}
        </span>
        <span data-part="value">
          <ResearchInline text={right.value} />
        </span>
      </div>
    </div>
  );
}
