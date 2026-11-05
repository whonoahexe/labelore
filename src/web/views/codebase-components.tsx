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
import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { classifyFence } from '../../rendering/figure-detect.ts';
import { CopyCommand } from '../components/copy-command.tsx';
import { FigureFor } from '../components/fenced-figure.tsx';
import { FigureFrame } from '../components/figure-frame.tsx';
import { PlainDiagram } from '../components/lifted-diagram.tsx';
import { ResearchInline, SwapRows } from '../pages/research-atoms.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import { NOT_MAPPED, linkMapMentions } from './codebase-page.ts';
import type {
  ComposedArchitecture,
  ComposedCodebase,
  ComposedCodebaseHead,
  ComposedCodebaseLifted,
  ComposedCodebasePanel,
  ComposedCodebasePlain,
  ComposedConcern,
  ComposedConcernRow,
  ComposedConcerns,
  ComposedConcernSection,
  ComposedStack,
  ComposedStackGroup,
  ComposedStackSet,
  ComposedStructure,
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
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Codebase' },
    ],
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
      {facts.mappedText !== null ? (
        <span className="view-codebase-facts-date">{facts.mappedText}</span>
      ) : null}
      {facts.commitText !== null ? (
        <span
          className="status-chip view-codebase-commit"
          data-tone="quiet"
          title={facts.commitText}
        >
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
      {panel.keyText !== null ? (
        <span className="view-codebase-entry-key">{panel.keyText}</span>
      ) : null}
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
      <Link
        to={panel.url}
        className="view-codebase-entry"
        aria-current={panel.current ? 'page' : undefined}
      >
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
          <li
            className="view-codebase-chip"
            key={`${index}-${chip.name}`}
            data-ghost={set.ghost ? 'true' : undefined}
            title={chip.purpose ?? chip.name}
          >
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
        {set.notes !== undefined && set.notes > 0 ? (
          <li
            className="view-codebase-chip"
            data-note="true"
            title="Sentences, not tools: they stay in the sections below."
          >
            +{set.notes} {set.notes === 1 ? 'note' : 'notes'}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function ChipGroup({ group }: { group: ComposedStackGroup }): React.JSX.Element {
  return (
    <section className="view-codebase-group">
      <h3 className="view-codebase-group-head">{group.label}</h3>
      <div className="view-codebase-group-sets">
        {group.sets.map((set) => (
          <ChipSet key={set.label} set={set} />
        ))}
      </div>
    </section>
  );
}

/** The Stack panel (10-14, sketch 045 winner C, "Reuse"): the chip groups the page has drawn since 10-08 -
 * Languages, Runtime, Frameworks - and Key Dependencies in the same chip set, in the picture frame: untoned chips,
 * the version in mono, a package the document says is not present a dashed ghost. Configuration and Platform
 * Requirements stay as plain sections below. */
function StackPanel({ lifted }: { lifted: ComposedStack }): React.JSX.Element {
  const ghosts = lifted.groups.some((group) => group.sets.some((set) => set.ghost === true));
  const notes = lifted.groups.some((group) => group.sets.some((set) => (set.notes ?? 0) > 0));
  return (
    <div className="view-codebase-lifted view-codebase-stack">
      <figure className="view-codebase-pic">
        <div className="view-codebase-pic-bar">
          <span className="view-codebase-pic-title">Stack chips</span>
          <span className="view-codebase-pic-count">
            {lifted.toolCount} languages and frameworks · {lifted.dependencyCount} key dependencies
          </span>
        </div>
        <div className="view-codebase-pic-body view-codebase-stack-body">
          {lifted.groups.map((group) => (
            <ChipGroup key={group.label} group={group} />
          ))}
        </div>
        <div className="view-codebase-pic-foot">
          <span>Versions in mono, as the document writes them.</span>
          {ghosts ? <span>A dashed chip is something the document says is not present.</span> : null}
          {notes ? <span>+N notes are sentences, kept in the sections below.</span> : null}
        </div>
      </figure>
    </div>
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
          <li
            className="view-codebase-count"
            key={`${index}-${row.label}`}
            data-lead={index === 0 ? 'true' : undefined}
          >
            <i
              className="status-square view-codebase-square"
              data-tone={row.tone}
              aria-hidden="true"
            />
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
            <Concerns
              total={head.concerns.total}
              noun={head.concerns.noun}
              counts={head.concerns.counts}
            />
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

/** A fenced block in the shipped figure frame: the lane diagram or the clean tree when the shared detector says so
 * (the same decision every document makes), else the author's text as drawn, in the same frame. */
function FenceFigure({
  fence,
  title,
}: {
  fence: { info: string; text: string };
  title: string;
}): React.JSX.Element {
  const kind = useMemo(() => classifyFence(fence.info, fence.text), [fence.info, fence.text]);
  if (kind !== null) return <FigureFor kind={kind} text={fence.text} title={title} />;
  return <FigureFrame title={title}>{() => <PlainDiagram text={fence.text} />}</FigureFrame>;
}

/** Author text with a mention of another mapped document (`see STRUCTURE.md`, `.planning/codebase/NAME.md`) linked to
 * that panel through the page's Link. The address comes from the composed panel list, never from the text; a
 * document that is not mapped has no address, so its mention stays text. */
function MappedText({
  text,
  urls,
}: {
  text: string;
  urls: ReadonlyMap<string, string>;
}): React.JSX.Element {
  const parts = useMemo(() => linkMapMentions(text, urls), [text, urls]);
  if (parts.every((part) => part.to === null)) return <ResearchInline text={text} />;
  return (
    <>
      {parts.map((part, index) =>
        part.to === null ? (
          <ResearchInline key={index} text={part.text} />
        ) : (
          <Link key={index} to={part.to} className="view-codebase-xref">
            {part.code ? <code>{part.text}</code> : part.text}
          </Link>
        ),
      )}
    </>
  );
}

/** The Structure panel's designed part (10-12; sketch 043 reuses the Research figures): the Directory Layout as the
 * shipped clean tree in a figure frame titled "Directory structure". Every other section stays plain. */
function StructurePanel({ lifted }: { lifted: ComposedStructure }): React.JSX.Element {
  return (
    <div className="view-codebase-lifted view-codebase-structure">
      <section className="view-codebase-figure">
        <FenceFigure fence={lifted.tree} title="Directory structure" />
      </section>
    </div>
  );
}

/** The Architecture panel's designed parts (10-12; sketch 043 reuses the Research figures): the System Overview as
 * the shipped lane diagram figure (its "Shown as drawn" fallback included), then the Anti-Patterns as the
 * shipped swap rows. Every other section stays a plain section below. */
function ArchitecturePanel({
  lifted,
  urls,
}: {
  lifted: ComposedArchitecture;
  urls: ReadonlyMap<string, string>;
}): React.JSX.Element {
  return (
    <div className="view-codebase-lifted view-codebase-architecture">
      {lifted.diagram !== null ? (
        <section className="view-codebase-figure">
          <FenceFigure fence={lifted.diagram} title="System overview" />
        </section>
      ) : null}
      {lifted.swaps.length > 0 ? (
        <section className="view-codebase-swaps">
          <h3 className="view-codebase-group-head">
            <span>Anti-patterns</span>
            <span className="view-codebase-tally">{lifted.swaps.length} to avoid</span>
          </h3>
          <SwapRows
            items={lifted.swaps}
            renderText={(text) => <MappedText text={text} urls={urls} />}
          />
        </section>
      ) : null}
    </div>
  );
}

/** One concern in a section's list: its title, its first field as a gist, and "Read more" / "Read less" in place. The
 * opened form lists every field the document wrote, nothing cut. */
function ConcernRow({
  concern,
  open,
  onToggle,
}: {
  concern: ComposedConcern;
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const first = concern.fields[0];
  const needsMore =
    concern.fields.length > 1 || (first !== undefined && first.text.length > CONCERN_GIST_MAX);
  return (
    <li className="view-codebase-concern">
      <p className="view-codebase-concern-title">
        <ResearchInline text={concern.title} />
      </p>
      {open ? (
        <ConcernFields fields={concern.fields} />
      ) : first !== undefined ? (
        <p className="view-codebase-concern-gist" data-clamp={needsMore ? 'true' : undefined}>
          <ResearchInline text={first.text} />
        </p>
      ) : null}
      {needsMore ? (
        <button
          type="button"
          className="view-codebase-text-link"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </li>
  );
}

/** The concern a mark selected, with its section, or null. */
function findConcern(
  sections: readonly ComposedConcernSection[],
  id: string | null,
): { concern: ComposedConcern; section: ComposedConcernSection } | null {
  if (id === null) return null;
  for (const section of sections) {
    const concern = section.items.find((item) => item.id === id);
    if (concern !== undefined) return { concern, section };
  }
  return null;
}

/** A first field longer than this many characters earns "Read more" even when it is the only field. */
const CONCERN_GIST_MAX = 130;

function ConcernFields({
  fields,
}: {
  fields: ComposedConcern['fields'];
}): React.JSX.Element | null {
  if (fields.length === 0) return null;
  return (
    <dl className="view-codebase-fields">
      {fields.map((field, index) => (
        <div key={index}>
          {field.label !== null ? <dt>{field.label}</dt> : null}
          <dd>
            <ResearchInline text={field.text} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Sketch 044 E, "Risk piles": nine columns, one per section (Security first), each concern one segment stacked from
 * the baseline, so a dense section piles up. A segment's opacity follows its Priority when it states one, a zero is a
 * dashed box, and the most dangerous mark carries an accent ring. Selecting a mark opens that concern in a dock under
 * the picture; the section chips filter the marks; the sections stay as closed bars below, each holding its concerns
 * with "Read more" / "Read less". Nothing here is toned missing, destructive or warning. */
function ConcernsPanel({
  lifted,
  renderHtml,
}: {
  lifted: ComposedConcerns;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [openBars, setOpenBars] = useState<ReadonlySet<number>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const { sections } = lifted;
  const toggle = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
  };
  const chosen = findConcern(sections, selected);
  const nine = sections.length === 9;
  return (
    <div className="view-codebase-lifted view-codebase-concerns-panel">
      <figure className="view-codebase-pic">
        <div className="view-codebase-pic-bar">
          <span className="view-codebase-pic-title">
            {nine ? 'The nine sections as piles' : 'The sections as piles'}
          </span>
          <span className="view-codebase-pic-count">{lifted.totalText}</span>
        </div>
        <div className="view-codebase-pic-body">
          <div
            className="view-codebase-piles"
            style={{ '--view-codebase-pile-cols': sections.length } as React.CSSProperties}
          >
            {sections.map((section, at) => {
              const tone = section.tone ?? undefined;
              return (
                <div
                  className="view-codebase-pile-col"
                  key={`${at}-${section.heading}`}
                  data-dim={filter !== null && filter !== at ? 'true' : undefined}
                >
                  <div className="view-codebase-pile">
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="view-codebase-mark"
                          data-security={section.key === SECURITY_SECTION ? 'true' : undefined}
                          data-pri={item.priority}
                          data-top={lifted.top === item.id ? 'true' : undefined}
                          data-on={selected === item.id ? 'true' : undefined}
                          data-dim={filter !== null && filter !== at ? 'true' : undefined}
                          aria-pressed={selected === item.id}
                          aria-label={item.title}
                          title={item.title}
                          onClick={() => setSelected(selected === item.id ? null : item.id)}
                        />
                      ))
                    ) : (
                      <span className="view-codebase-pile-zero">0</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="view-codebase-pile-lab"
                    aria-pressed={filter === at}
                    aria-label={`${section.label}: ${section.count}`}
                    onClick={() => setFilter(filter === at ? null : at)}
                  >
                    <b>{section.count}</b>
                    <i
                      className="status-square view-codebase-square"
                      data-tone={tone}
                      aria-hidden="true"
                    />
                    <span className="view-codebase-pile-name">
                      <ResearchInline text={section.label} />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="view-codebase-pic-foot">
          <span className="view-codebase-key">
            <span className="view-codebase-mark" data-security="true" data-pri="" />a Security
            concern
          </span>
          <span className="view-codebase-key">
            <span className="view-codebase-mark" data-pri="" />
            any other section
          </span>
          <span className="view-codebase-key">
            <span className="view-codebase-mark" data-pri="high" />
            <span className="view-codebase-mark" data-pri="med" />
            <span className="view-codebase-mark" data-pri="low" />
            Priority High, Medium, Low when the concern states one
          </span>
          <span className="view-codebase-key">
            <span className="view-codebase-mark" data-pri="" data-top="true" />
            the most dangerous: first Security item, else first Tech debt
          </span>
          <span>
            Each segment is one concern; columns are the {nine ? 'nine ' : ''}sections, Security
            first, the rest in the document&apos;s order; a column&apos;s height is its count.
          </span>
        </div>
      </figure>
      <div className="view-codebase-legend" role="group" aria-label="Sections">
        {sections.map((section, at) => {
          const tone = section.tone ?? undefined;
          return (
            <button
              key={`${at}-${section.heading}`}
              type="button"
              className="view-codebase-sec-chip"
              aria-pressed={filter === at}
              onClick={() => setFilter(filter === at ? null : at)}
            >
              <i
                className="status-square view-codebase-square"
                data-tone={tone}
                aria-hidden="true"
              />
              <span>
                <ResearchInline text={section.label} />
              </span>
              <b>{section.count}</b>
            </button>
          );
        })}
      </div>
      {chosen !== null ? (
        <div className="view-codebase-dock" role="region" aria-label="Selected concern">
          <div className="view-codebase-dock-head">
            <h4>
              <ResearchInline text={chosen.concern.title} />
            </h4>
            <span className="source-note">
              {chosen.section.heading}
              {lifted.top === chosen.concern.id ? ' · most dangerous' : ''}
            </span>
            <button
              type="button"
              className="view-codebase-text-link"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <ConcernFields fields={chosen.concern.fields} />
        </div>
      ) : (
        <div className="view-codebase-dock-empty">Select a mark to read that concern.</div>
      )}
      <div className="view-codebase-acc-list">
        {sections.map((section, at) => (
          <ConcernBar
            key={`${at}-${section.heading}`}
            section={section}
            open={openBars.has(at)}
            onToggle={() => setOpenBars(toggle(openBars, at))}
            expanded={expanded}
            onExpand={(id) => setExpanded(toggle(expanded, id))}
            renderHtml={renderHtml}
          />
        ))}
      </div>
      {lifted.intro !== null ? (
        <div className="view-codebase-plain-section view-codebase-concerns-intro">
          {renderHtml(lifted.intro)}
        </div>
      ) : null}
    </div>
  );
}

/** The section the page rings and colours first; the lift's own key for Security Considerations. */
const SECURITY_SECTION = 'security-considerations';

function ConcernBar({
  section,
  open,
  onToggle,
  expanded,
  onExpand,
  renderHtml,
}: {
  section: ComposedConcernSection;
  open: boolean;
  onToggle: () => void;
  expanded: ReadonlySet<string>;
  onExpand: (id: string) => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  const tone = section.tone ?? undefined;
  return (
    <section className="view-codebase-acc" data-open={open ? 'true' : undefined}>
      <button
        type="button"
        className="view-codebase-acc-sum"
        aria-expanded={open}
        onClick={onToggle}
      >
        <ChevronRight className="view-codebase-acc-chev" aria-hidden="true" />
        <i className="status-square view-codebase-square" data-tone={tone} aria-hidden="true" />
        <span className="view-codebase-acc-name">
          <ResearchInline text={section.heading} />
        </span>
        <span className="view-codebase-acc-n">{section.count}</span>
      </button>
      {open ? (
        <div className="view-codebase-acc-body">
          {section.items.length > 0 ? (
            <ul className="view-codebase-concern-list">
              {section.items.map((item) => (
                <ConcernRow
                  key={item.id}
                  concern={item}
                  open={expanded.has(item.id)}
                  onToggle={() => onExpand(item.id)}
                />
              ))}
            </ul>
          ) : section.fallbackHtml !== null ? (
            <div className="view-codebase-plain-section">
              {renderHtml(stripLeadingHeading(section.fallbackHtml))}
            </div>
          ) : (
            <p className="source-note view-codebase-none">None under this heading.</p>
          )}
          {section.omitted > 0 ? (
            <p className="source-note">
              {section.items.length} of {section.count} shown; the rest are in the Source view.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Lifted({
  lifted,
  urls,
  renderHtml,
}: {
  lifted: ComposedCodebaseLifted;
  urls: ReadonlyMap<string, string>;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  if (lifted.kind === 'concerns') return <ConcernsPanel lifted={lifted} renderHtml={renderHtml} />;
  if (lifted.kind === 'architecture') return <ArchitecturePanel lifted={lifted} urls={urls} />;
  if (lifted.kind === 'structure') return <StructurePanel lifted={lifted} />;
  return <StackPanel lifted={lifted} />;
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
      {section.heading !== null ? (
        <h3 className="view-codebase-group-head">{section.heading}</h3>
      ) : null}
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
  // Another mapped panel's address by its file name, for a mention in the active panel's text (never the current one).
  const urls = useMemo(
    () =>
      new Map(
        model.panels.flatMap((panel) =>
          panel.url !== null && !panel.current
            ? [[`${panel.key.toUpperCase()}.md`, panel.url] as const]
            : [],
        ),
      ),
    [model.panels],
  );
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
            {active.keyPhrase !== null ? (
              <span className="view-codebase-panel-key">{active.keyPhrase}</span>
            ) : null}
          </header>
          {active.lifted !== null ? (
            <Lifted lifted={active.lifted} urls={urls} renderHtml={renderHtml} />
          ) : null}
          {active.plain.length > 0 ? (
            <div className="view-codebase-plain">
              {active.plain.map((section, index) => (
                <PlainSection
                  key={`${index}-${section.id ?? ''}`}
                  section={section}
                  renderHtml={renderHtml}
                />
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
