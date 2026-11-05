// The shared "Value not shown" mark (Phase 10, 10-14 and 10-19, T-10-24, T-10-33): the quiet dashed word a page draws
// where a document wrote a value beside a variable's name. The value itself never reaches a page - the readers drop it
// first (`withholdValue`, `maskValues`) - so the mark says only that one was written. Promoted from the Codebase page's
// Integrations panel so the User setup page draws the very same mark. Plain text in a span: no title, no aria-label, no
// copy control, so the mark can carry no value by construction.

/** The words the mark carries. */
export const VALUE_NOT_SHOWN_LABEL = 'Value not shown';

export function ValueNotShown(): React.JSX.Element {
  return <span className="value-not-shown">{VALUE_NOT_SHOWN_LABEL}</span>;
}
