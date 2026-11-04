// The Codebase page's React surface (Phase 10, 10-08, sketch 042 winner A, "Rail + column"): the header
// override (eyebrow and h1 "Codebase", the breadcrumb trail Dashboard / Codebase, no lead) and the page body -
// a rail holding the facts line and the seven-entry panel list, and a reading column holding the active panel.
// The panel list is navigation: each mapped entry is a real Link to that document's address, so the back
// button and a deep link work.
//
// Plain sections reach the DOM only through the `renderHtml` callback the page passes in (its one
// server-sanitised document renderer), never a new raw-HTML site here. No href is built from document text.
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { stripLeadingHeading } from './document-sections.ts';
import type { ComposedCodebase, ComposedCodebasePanel, ComposedCodebasePlain } from './codebase-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type CodebaseHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props. The page is reached from the drawer and
 * search, never a Roadmap trail, so the crumbs name the dashboard and the page. */
export function codebaseHeaderProps(_model: ComposedCodebase): CodebaseHeaderProps {
  return {
    eyebrow: 'Codebase',
    title: 'Codebase',
    lead: null,
    crumbs: [{ label: 'Dashboard', to: presentationRoutePatterns.dashboard }, { label: 'Codebase' }],
  };
}

function numberOf(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function Entry({ panel, index }: { panel: ComposedCodebasePanel; index: number }): React.JSX.Element {
  const body = (
    <>
      <span className="view-codebase-entry-no">{numberOf(index)}</span>
      <span className="view-codebase-entry-name">{panel.label}</span>
    </>
  );
  return (
    <li className="view-codebase-entry-item">
      {panel.url !== null ? (
        <Link
          to={panel.url}
          className="view-codebase-entry"
          aria-current={panel.current ? 'page' : undefined}
        >
          {body}
        </Link>
      ) : (
        <div className="view-codebase-entry">{body}</div>
      )}
    </li>
  );
}

function PlainSection({
  section,
  renderHtml,
}: {
  section: ComposedCodebasePlain;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="view-codebase-plain-section" id={section.id ?? undefined}>
      {section.heading !== null ? <h3 className="view-codebase-group-head">{section.heading}</h3> : null}
      {renderHtml(section.heading !== null ? stripLeadingHeading(section.html) : section.html)}
    </section>
  );
}

export function CodebaseView({
  model,
  renderHtml,
}: {
  model: ComposedCodebase;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const { facts, panels, active } = model;
  const activeIndex = panels.findIndex((panel) => panel.current);
  return (
    <div className="view-codebase-page">
      <aside className="view-codebase-rail">
        <div className="view-codebase-facts">
          <span className="view-codebase-facts-count">{facts.countText}</span>
        </div>
        <nav className="view-codebase-list" aria-label="Codebase map">
          <ol>
            {panels.map((panel, index) => (
              <Entry key={panel.key} panel={panel} index={index} />
            ))}
          </ol>
        </nav>
      </aside>
      <div className="view-codebase-main">
        <article className="view-codebase-panel" aria-labelledby="view-codebase-panel-title">
          <header className="view-codebase-panel-head">
            <span className="view-codebase-panel-no">{numberOf(activeIndex < 0 ? 0 : activeIndex)}</span>
            <h2 id="view-codebase-panel-title">{active.label}</h2>
          </header>
          {active.plain.length > 0 ? (
            <div className="view-codebase-plain">
              {active.plain.map((section, index) => (
                <PlainSection key={`${index}-${section.id ?? ''}`} section={section} renderHtml={renderHtml} />
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
