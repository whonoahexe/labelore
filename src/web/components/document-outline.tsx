// The "On this page" navigation column, extracted so its markup is shared verbatim between
// Source mode (fed by `RenderedDocument.headings`) and View mode (fed by the view registry's own
// promoted-section list, D-11). `activeId` is accepted and rendered now — Plan 05-04 is the first
// to actually compute one via IntersectionObserver; until then no caller passes it and every
// anchor renders with no `data-active` attribute, which is today's behavior unchanged.
export interface OutlineEntry {
  id: string;
  label: string;
  depth?: number;
}

export function DocumentOutline({
  entries,
  activeId,
}: {
  entries: OutlineEntry[];
  activeId?: string | null;
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <nav className="document-outline" aria-label="On this page">
      <p>On this page</p>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id} data-depth={entry.depth ?? 2}>
            <a
              href={`#${encodeURIComponent(entry.id)}`}
              data-active={activeId === entry.id ? 'true' : undefined}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
