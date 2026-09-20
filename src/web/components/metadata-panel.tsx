// The field-list renderer shared by every structured-value surface in the app: the "Document
// metadata" disclosure (artifact-page.tsx), VIEW-03's verification checks and fact-list blocks
// (src/web/views/facts.ts, blocks.tsx), and VIEW-06's fallback frontmatter projection
// (src/web/views/fallback.ts). Moved out of artifact-page.tsx (Plan 05-05, Task 1) so it has one
// home instead of being re-declared per consumer.
import type { FrontmatterPanel, FrontmatterValueView } from '../../rendering/frontmatter-views.ts';

export function ValueView({ value }: { value: FrontmatterValueView }): React.JSX.Element {
  if (value.kind === 'scalar') return <span className="metadata-scalar">{value.value}</span>;
  if (value.kind === 'list') {
    return value.items.length === 0 ? (
      <span className="metadata-empty">Empty list</span>
    ) : (
      <ol className="metadata-list">
        {value.items.map((item, index) => (
          <li key={index}>
            <ValueView value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return value.entries.length === 0 ? (
    <span className="metadata-empty">Empty object</span>
  ) : (
    <dl className="metadata-record">
      {value.entries.map((entry) => (
        <div key={entry.key}>
          <dt>{entry.key}</dt>
          <dd>
            <ValueView value={entry.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MetadataPanel({ panel }: { panel: FrontmatterPanel }): React.JSX.Element {
  return (
    <section className={`metadata-panel metadata-panel-${panel.presentation}`}>
      <h2>{panel.label}</h2>
      <ValueView value={panel.value} />
    </section>
  );
}
