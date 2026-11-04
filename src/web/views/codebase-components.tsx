// The Codebase page's React surface (Phase 10, 10-08, sketch 042 winner A, "Rail + column"): the header
// override (eyebrow and h1 "Codebase", the breadcrumb trail Dashboard / Codebase, no lead) and the page body -
// a rail holding the facts line and the seven-entry panel list, and a reading column holding the active panel
// (under the "Mapped, not started" head of a map-only project, 10-10, whose eyebrow replaces "Codebase").
// The panel list is navigation, not a tablist: each mapped entry is a real Link to that document's address
// (aria-current="page" on the current one), so the back button and a deep link work; a document the folder lacks
// is a "Not mapped" ghost entry that is not interactive.
//
// Every lifted string (a chip name or version, a concern heading) is author text rendered as plain React text
// through ResearchInline. Plain sections reach the DOM only through the `renderHtml` callback the page passes
// in (its one server-sanitised document renderer), never a new raw-HTML site here. No href is built from
// document text. Colour comes only from the tone a composed model carries and the theme tokens; nothing here is
// drawn missing or in a parse-degradation tone.
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { CopyCommand } from '../components/copy-command.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import { NOT_MAPPED } from './codebase-page.ts';
import type {
  ComposedCodebase,
  ComposedCodebaseHead,
  ComposedCodebaseLifted,
  ComposedCodebasePanel,
  ComposedCodebasePlain,
  ComposedConcernRow,
  ComposedStackGroup,
  ComposedStackSet,
} from './codebase-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type CodebaseHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props. The page is reached from the drawer and
 * search, never a Roadmap trail, so the crumbs name the dashboard and the page. */
export function codebaseHeaderProps(model: ComposedCodebase): CodebaseHeaderProps {
  return {
    // A map-only project's eyebrow is the head's words (sketch 042 A); the h1 stays "Codebase".
    eyebrow: model.head === null ? 'Codebase' : model.head.eyebrow,
    title: 'Codebase',
    lead: null,
    crumbs: [{ label: 'Dashboard', to: presentationRoutePatterns.dashboard }, { label: 'Codebase' }],
  };
}

function Facts({ facts }: { facts: ComposedCodebase['facts'] }): React.JSX.Element {
  const { readiness } = facts;
  return (
    <div className="view-codebase-facts">
      <span className="view-codebase-facts-count">{facts.countText}</span>
      <span className="status-chip" data-tone={readiness.tone} title={readiness.title ?? undefined}>
        <i className="status-square" data-tone={readiness.tone} aria-hidden="true" />
        {readiness.label}
      </span>
      {facts.mappedText !== null ? <span className="view-codebase-facts-date">{facts.mappedText}</span> : null}
      {facts.commitText !== null ? (
        <span className="status-chip view-codebase-commit" data-tone="quiet" title={facts.commitText}>
          {facts.commitText}
        </span>
      ) : null}
    </div>
  );
}

function Entry({ panel }: { panel: ComposedCodebasePanel }): React.JSX.Element {
  const body = (
    <>
      <span className="view-codebase-entry-no">{panel.no}</span>
      <span className="view-codebase-entry-name">{panel.label}</span>
      {panel.keyText !== null ? <span className="view-codebase-entry-key">{panel.keyText}</span> : null}
    </>
  );
  if (panel.ghost || panel.url === null) {
    return (
      <li className="view-codebase-entry-item">
        <div className="view-codebase-entry" data-ghost="true">
          <span className="view-codebase-entry-no">{panel.no}</span>
          <span className="view-codebase-entry-name">{panel.label}</span>
          <span className="view-codebase-entry-ghost">
            <i className="status-square" data-tone="quiet" aria-hidden="true" />
            {NOT_MAPPED}
          </span>
        </div>
      </li>
    );
  }
  return (
    <li className="view-codebase-entry-item">
      <Link to={panel.url} className="view-codebase-entry" aria-current={panel.current ? 'page' : undefined}>
        {body}
      </Link>
    </li>
  );
}

function ChipSet({ set }: { set: ComposedStackSet }): React.JSX.Element {
  return (
    <div className="view-codebase-chip-set">
      <p className="view-codebase-micro">{set.label}</p>
      <ul className="view-codebase-chips">
        {set.chips.map((chip, index) => (
          <li className="view-codebase-chip" key={`${index}-${chip.name}`} title={chip.name}>
            <span>
              <ResearchInline text={chip.name} />
            </span>
            {chip.version !== null ? (
              <code>
                <ResearchInline text={chip.version} />
              </code>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChipGroup({ group }: { group: ComposedStackGroup }): React.JSX.Element {
  return (
    <section className="view-codebase-group">
      <h3 className="view-codebase-group-head">{group.label}</h3>
      {group.sets.map((set) => (
        <ChipSet key={set.label} set={set} />
      ))}
    </section>
  );
}

/** The total and the per-section counts. The panel draws the document's headings; the head draws short labels
 * with the heading as the title. */
function Concerns({
  total,
  noun,
  counts,
}: {
  total: number;
  noun: string;
  counts: (ComposedConcernRow & { title?: string })[];
}): React.JSX.Element {
  return (
    <div className="view-codebase-concerns">
      <p className="view-codebase-concerns-total">
        <b>{total}</b>
        <span>{noun}</span>
      </p>
      <ul className="view-codebase-counts">
        {counts.map((row, index) => (
          <li className="view-codebase-count" key={`${index}-${row.label}`} data-lead={index === 0 ? 'true' : undefined}>
            <i className="status-square view-codebase-square" data-tone={row.tone} aria-hidden="true" />
            <span title={row.title ?? row.label}>
              <ResearchInline text={row.label} />
            </span>
            <b>{row.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The "Mapped, not started" head of a map-only project (sketch 042 A): a bordered block at the top of the
 * reading column - the sentence, then the stack and the concern counts in two columns - above the panel. The
 * words "Mapped, not started" are the page's eyebrow; the facts line and the panel list stay in the rail. */
function Head({ head }: { head: ComposedCodebaseHead }): React.JSX.Element {
  return (
    <section className="view-codebase-head" aria-label={head.eyebrow}>
      <p className="view-codebase-head-lead">{head.lead}</p>
      {head.stack.length > 0 || head.concerns !== null ? (
        <div className="view-codebase-head-cols">
          {head.stack.length > 0 ? (
            <div className="view-codebase-head-stack">
              {head.stack.map((set) => (
                <ChipSet key={set.label} set={set} />
              ))}
            </div>
          ) : null}
          {head.concerns !== null ? (
            <Concerns total={head.concerns.total} noun={head.concerns.noun} counts={head.concerns.counts} />
          ) : null}
        </div>
      ) : null}
      <div className="view-codebase-next">
        <p className="view-codebase-next-reason">{head.next.reason}</p>
        <CopyCommand command={head.next.command} />
        <p className="source-note">{head.next.note}</p>
      </div>
    </section>
  );
}

function Lifted({ lifted }: { lifted: ComposedCodebaseLifted }): React.JSX.Element {
  if (lifted.kind === 'stack') {
    return (
      <div className="view-codebase-lifted">
        {lifted.groups.map((group) => (
          <ChipGroup key={group.label} group={group} />
        ))}
      </div>
    );
  }
  return (
    <div className="view-codebase-lifted">
      <Concerns total={lifted.total} noun={lifted.noun} counts={lifted.counts} />
    </div>
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
  return (
    <div className="view-codebase-page">
      <aside className="view-codebase-rail">
        <Facts facts={facts} />
        <nav className="view-codebase-list" aria-label="Codebase map">
          <ol>
            {panels.map((panel) => (
              <Entry key={panel.key} panel={panel} />
            ))}
          </ol>
        </nav>
      </aside>
      <div className="view-codebase-main">
        {model.head !== null ? <Head head={model.head} /> : null}
        <article className="view-codebase-panel" aria-labelledby="view-codebase-panel-title">
          <header className="view-codebase-panel-head">
            <span className="view-codebase-panel-no">{active.no}</span>
            <h2 id="view-codebase-panel-title">{active.label}</h2>
            {active.keyPhrase !== null ? <span className="view-codebase-panel-key">{active.keyPhrase}</span> : null}
          </header>
          {active.lifted !== null ? <Lifted lifted={active.lifted} /> : null}
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
