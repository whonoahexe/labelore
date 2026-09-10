// D-01 (quick-260911-243): the "Strata" mark — three bars stepping into an L. Single shared
// component so the header brand tile and public/favicon.svg never drift from one another; CSS
// owns sizing everywhere it is used, so no width/height attribute is set here.
export function LabeloreMark(props: React.ComponentProps<'svg'>): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 3h5v18H3Z M10 10h5v5h-5Z M10 16h11v5H10Z" />
    </svg>
  );
}
