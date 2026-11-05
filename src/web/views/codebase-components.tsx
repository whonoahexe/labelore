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
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { classifyFence } from '../../rendering/figure-detect.ts';
import { CleanTreeFigure } from '../components/clean-tree.tsx';
import { CopyCommand } from '../components/copy-command.tsx';
import { FigureFor } from '../components/fenced-figure.tsx';
import { FigureFrame } from '../components/figure-frame.tsx';
import { LaneDiagram } from '../components/lane-diagram.tsx';
import { PlainDiagram } from '../components/lifted-diagram.tsx';
import { ValueNotShown } from '../components/value-not-shown.tsx';
import { ResearchInline, SwapRows } from '../pages/research-atoms.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import { NEVER_RUNS_NOTE, NOT_MAPPED, linkMapMentions } from './codebase-page.ts';
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
  ComposedConventions,
  ComposedIntegrations,
  ComposedRule,
  ComposedStack,
  ComposedStackGroup,
  ComposedStackSet,
  ComposedStructure,
  ComposedTesting,
  RuleStrength,
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

function ChipSet({
  set,
  integrationsUrl = null,
}: {
  set: ComposedStackSet;
  integrationsUrl?: string | null;
}): React.JSX.Element {
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
            {chip.xref !== undefined && integrationsUrl !== null ? (
              <Link
                to={integrationsUrl}
                className="view-codebase-xref"
                aria-label={`${chip.name} is also in Integrations: ${chip.xref.join(', ')}`}
                title={`Also in Integrations: ${chip.xref.join(', ')}`}
              >
                ↔
              </Link>
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

function ChipGroup({
  group,
  integrationsUrl,
}: {
  group: ComposedStackGroup;
  integrationsUrl: string | null;
}): React.JSX.Element {
  return (
    <section className="view-codebase-group">
      <h3 className="view-codebase-group-head">{group.label}</h3>
      <div className="view-codebase-group-sets">
        {group.sets.map((set) => (
          <ChipSet key={set.label} set={set} integrationsUrl={integrationsUrl} />
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
  const crossed =
    lifted.integrationsUrl !== null &&
    lifted.groups.some((group) => group.sets.some((set) => set.chips.some((chip) => chip.xref !== undefined)));
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
            <ChipGroup key={group.label} group={group} integrationsUrl={lifted.integrationsUrl} />
          ))}
        </div>
        <div className="view-codebase-pic-foot">
          <span>Versions in mono, as the document writes them.</span>
          {ghosts ? <span>A dashed chip is something the document says is not present.</span> : null}
          {notes ? <span>+N notes are sentences, kept in the sections below.</span> : null}
          {crossed ? <span>↔ is also named in Integrations.</span> : null}
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

/** True from 42rem up. The lanes scale to the frame there (six lanes are a little wider than the reading column); on a
 * narrow screen they keep their size and pan inside the frame, as the sketch draws them. */
function useWideScreen(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 42rem)');
    const update = (): void => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

/** The Integrations panel (10-14, sketch 045 winner C, "Reuse"): the shipped lane diagram, handed a graph built from the
 * groups in use (the app wired to one node each, the lane from the group's section); the groups that say None as quiet
 * chips under the lanes; the variable names as a strip of tags, a value the document wrote beside one shown only as the
 * quiet "Value not shown" mark. The page can only show a name: the lift never held the value. */
function IntegrationsPanel({ lifted }: { lifted: ComposedIntegrations }): React.JSX.Element {
  const wide = useWideScreen();
  return (
    <div className="view-codebase-lifted view-codebase-integrations">
      <figure className="view-codebase-pic">
        <div className="view-codebase-pic-bar">
          <span className="view-codebase-pic-title">What the code talks to</span>
          <span className="view-codebase-pic-count">
            {lifted.inUse} in use · {lifted.quiet.length} not used
          </span>
        </div>
        <div className="view-codebase-pic-body view-codebase-integrations-body">
          {lifted.graph !== null ? (
            <div className="view-codebase-lanes">
              <LaneDiagram graph={lifted.graph} fit={wide} label="Integrations" />
            </div>
          ) : (
            <p className="source-note">Nothing in this document is in use.</p>
          )}
          {lifted.quiet.length > 0 ? (
            <div className="view-codebase-strip">
              <p className="view-codebase-micro">Not used · {lifted.quiet.length}</p>
              <ul className="view-codebase-tags">
                {lifted.quiet.map((group, index) => (
                  <li key={`${index}-${group.label}`}>
                    <span className="status-chip" data-tone="quiet" title={group.title ?? undefined}>
                      <i className="status-square" data-tone="quiet" aria-hidden="true" />
                      <ResearchInline text={group.label} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {lifted.variables.length > 0 ? (
            <div className="view-codebase-strip">
              <p className="view-codebase-micro">Environment · {lifted.variables.length} names</p>
              <ul className="view-codebase-tags">
                {lifted.variables.map((variable) => (
                  <li
                    key={variable.name}
                    className="view-codebase-vtag"
                    data-kind={variable.kind}
                    title={variable.kind === 'named' ? 'named in the document' : variable.kind}
                  >
                    <code>{variable.name}</code>
                    {variable.hadValue ? <ValueNotShown /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {lifted.environment !== null && lifted.environment.groups.length > 0 ? (
            <div className="view-codebase-strip">
              <p className="view-codebase-micro">{lifted.environment.heading}</p>
              <dl className="view-codebase-env">
                {lifted.environment.groups.map((group, index) => (
                  <div key={`${index}-${group.label}`}>
                    {group.label !== '' ? <dt>{group.label}</dt> : null}
                    <dd>
                      {group.lines.map((line, at) => (
                        <p key={at}>
                          <ResearchInline text={line} />
                        </p>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {lifted.stackUrl !== null && lifted.alsoInStack.length > 0 ? (
            <div className="view-codebase-strip">
              <p className="view-codebase-micro">Also in Stack</p>
              <ul className="view-codebase-xrefs">
                {lifted.alsoInStack.map((entry) => (
                  <li key={entry.group}>
                    <span>
                      <ResearchInline text={entry.group} />
                    </span>
                    {entry.names.map((name) => (
                      <Link key={name} to={lifted.stackUrl ?? ''} className="view-codebase-xref">
                        {name} ↔
                      </Link>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="view-codebase-pic-foot">
          <span>
            Lanes by kind, as the Research page draws them. One node per group in use; a wire&apos;s label is the group&apos;s
            client. Groups that say None sit under the lanes.
          </span>
          <span>A dashed tag marks a value the document writes beside a name; Labelore shows the name only.</span>
        </div>
      </figure>
    </div>
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

/** One mark of a pile: a segment. `pri` is the opacity step (high, med, low, or '' for the plain one) and `ring` the accent
 * ring; each panel that draws piles supplies both from its own rule (Concerns: the stated Priority and the most dangerous
 * concern; Conventions: the rule's strength and whether a test or the linter checks it). */
interface PileMark {
  id: string;
  title: string;
  pri: string;
  security: boolean;
  ring: boolean;
}

interface PileColumn {
  key: string;
  label: string;
  count: number;
  tone: ComposedConcernSection['tone'];
  marks: PileMark[];
}

/** The pile picture (sketch 044 E, shared by Concerns and Conventions): a column per section, a segment per item stacked
 * from the baseline, the count and the section's name under each column. Selecting a segment tells the panel; the labels
 * filter the columns. The foot is the panel's own key. */
function PilePicture({
  title,
  countText,
  columns,
  selected,
  onSelect,
  filter,
  onFilter,
  foot,
  squares = true,
}: {
  title: string;
  countText: string;
  columns: PileColumn[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  filter: number | null;
  onFilter: (at: number | null) => void;
  foot: React.ReactNode;
  /** The square beside each count: Concerns' tone marks; Conventions draws none. */
  squares?: boolean;
}): React.JSX.Element {
  return (
    <figure className="view-codebase-pic">
      <div className="view-codebase-pic-bar">
        <span className="view-codebase-pic-title">{title}</span>
        <span className="view-codebase-pic-count">{countText}</span>
      </div>
      <div className="view-codebase-pic-body">
        <div
          className="view-codebase-piles"
          style={{ '--view-codebase-pile-cols': columns.length } as React.CSSProperties}
        >
          {columns.map((column, at) => {
            const tone = column.tone ?? undefined;
            return (
              <div
                className="view-codebase-pile-col"
                key={column.key}
                data-dim={filter !== null && filter !== at ? 'true' : undefined}
              >
                <div className="view-codebase-pile">
                  {column.marks.length > 0 ? (
                    column.marks.map((mark) => (
                      <button
                        key={mark.id}
                        type="button"
                        className="view-codebase-mark"
                        data-security={mark.security ? 'true' : undefined}
                        data-pri={mark.pri}
                        data-top={mark.ring ? 'true' : undefined}
                        data-on={selected === mark.id ? 'true' : undefined}
                        data-dim={filter !== null && filter !== at ? 'true' : undefined}
                        aria-pressed={selected === mark.id}
                        aria-label={mark.title}
                        title={mark.title}
                        onClick={() => onSelect(selected === mark.id ? null : mark.id)}
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
                  aria-label={`${column.label}: ${column.count}`}
                  onClick={() => onFilter(filter === at ? null : at)}
                >
                  <b>{column.count}</b>
                  {squares ? (
                    <i className="status-square view-codebase-square" data-tone={tone} aria-hidden="true" />
                  ) : null}
                  <span className="view-codebase-pile-name">
                    <ResearchInline text={column.label} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="view-codebase-pic-foot">{foot}</div>
    </figure>
  );
}

/** The section chips under a pile picture: they filter the columns, and stand in for the column names at 390px. */
function PileChips({
  columns,
  filter,
  onFilter,
  squares = true,
}: {
  columns: PileColumn[];
  filter: number | null;
  onFilter: (at: number | null) => void;
  squares?: boolean;
}): React.JSX.Element {
  return (
    <div className="view-codebase-legend" role="group" aria-label="Sections">
      {columns.map((column, at) => {
        const tone = column.tone ?? undefined;
        return (
          <button
            key={column.key}
            type="button"
            className="view-codebase-sec-chip"
            aria-pressed={filter === at}
            onClick={() => onFilter(filter === at ? null : at)}
          >
            {squares ? <i className="status-square view-codebase-square" data-tone={tone} aria-hidden="true" /> : null}
            <span>
              <ResearchInline text={column.label} />
            </span>
            <b>{column.count}</b>
          </button>
        );
      })}
    </div>
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
  // Concerns' opacity rule is the concern's Priority and its ring marks the most dangerous one.
  const columns: PileColumn[] = sections.map((section, at) => ({
    key: `${at}-${section.heading}`,
    label: section.label,
    count: section.count,
    tone: section.tone,
    marks: section.items.map((item) => ({
      id: item.id,
      title: item.title,
      pri: item.priority,
      security: section.key === SECURITY_SECTION,
      ring: lifted.top === item.id,
    })),
  }));
  return (
    <div className="view-codebase-lifted view-codebase-concerns-panel">
      <PilePicture
        title={nine ? 'The nine sections as piles' : 'The sections as piles'}
        countText={lifted.totalText}
        columns={columns}
        selected={selected}
        onSelect={setSelected}
        filter={filter}
        onFilter={setFilter}
        foot={
          <>
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
          </>
        }
      />
      <PileChips columns={columns} filter={filter} onFilter={setFilter} />
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

/** A rule's strength as the opacity step the shared pile reads: hard is full, plain is the middle step, an observed habit the lightest. */
const STRENGTH_STEP: Readonly<Record<RuleStrength, string>> = { hard: 'high', plain: 'med', observed: 'low' };

const STRENGTH_WORDS: Readonly<Record<RuleStrength, string>> = {
  hard: 'a hard rule (never, must, only, no)',
  plain: 'a plain rule',
  observed: 'an observed habit (observed, usually, rare)',
};

function findRule(
  groups: ComposedConventions['groups'],
  id: string | null,
): { rule: ComposedRule; heading: string } | null {
  if (id === null) return null;
  for (const group of groups) {
    const rule = group.rules.find((candidate) => candidate.id === id);
    if (rule !== undefined) return { rule, heading: group.heading };
  }
  return null;
}

/** The Conventions panel (10-14, sketch 046 winner B, "Reuse"): sketch 044 E's piles, the same picture the Concerns
 * panel draws, one column per section and one segment per rule. The opacity rule is the rule's strength and the ring
 * marks a rule a test or the linter checks. Selecting a segment reads that rule in a dock; every section stays below as
 * the plain section, so nothing is cut. */
function ConventionsPanel({ lifted }: { lifted: ComposedConventions }): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const columns: PileColumn[] = lifted.groups.map((group, at) => ({
    key: `${at}-${group.heading}`,
    label: group.label,
    count: group.count,
    tone: group.count === 0 ? 'quiet' : null,
    marks: group.rules.map((rule) => ({
      id: rule.id,
      title: rule.text.length > 120 ? `${rule.text.slice(0, 120)}...` : rule.text,
      pri: STRENGTH_STEP[rule.strength],
      security: false,
      ring: rule.checked,
    })),
  }));
  const chosen = findRule(lifted.groups, selected);
  return (
    <div className="view-codebase-lifted view-codebase-concerns-panel view-codebase-conventions-panel">
      <PilePicture
        title="How much each section asks"
        countText={`${lifted.total} rules · ${lifted.hard} hard · ${lifted.checked} checked`}
        columns={columns}
        selected={selected}
        onSelect={setSelected}
        filter={filter}
        onFilter={setFilter}
        squares={false}
        foot={
          <>
            <span className="view-codebase-key">
              <span className="view-codebase-mark" data-pri="high" />a hard rule: never, must, only, no
            </span>
            <span className="view-codebase-key">
              <span className="view-codebase-mark" data-pri="med" />a plain rule
            </span>
            <span className="view-codebase-key">
              <span className="view-codebase-mark" data-pri="low" />an observed habit
            </span>
            <span className="view-codebase-key">
              <span className="view-codebase-mark" data-pri="med" data-top="true" />
              checked by a test or the linter
            </span>
            <span>One column per section in the document&apos;s order, one segment per rule.</span>
          </>
        }
      />
      <PileChips columns={columns} filter={filter} onFilter={setFilter} squares={false} />
      {chosen !== null ? (
        <div className="view-codebase-dock" role="region" aria-label="Selected rule">
          <div className="view-codebase-dock-head">
            <h4>
              <ResearchInline text={chosen.heading} />
            </h4>
            <span className="source-note">
              {STRENGTH_WORDS[chosen.rule.strength]}
              {chosen.rule.checked ? ' · checked by a test or the linter' : ''}
            </span>
            <button type="button" className="view-codebase-text-link" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="view-codebase-rule-text">
            <ResearchInline text={chosen.rule.text} />
          </p>
        </div>
      ) : (
        <div className="view-codebase-dock-empty">Select a rule to read it in full.</div>
      )}
      {lifted.groups.some((group) => group.omitted > 0) ? (
        <p className="source-note">Some sections hold more rules than the picture draws; all of them are in the sections below.</p>
      ) : null}
    </div>
  );
}

/** The Testing panel (10-14, sketch 046 winner B, "Reuse"): a strip of runner plates (runner, end-to-end runner,
 * assertion library, and a hatched coverage plate), the test folder as the shipped clean tree with a quiet badge on each
 * folder a test type names, then each run command on the shared copy-command row, its comment as the caption. The copied
 * text is exactly the visible command, control characters removed; the button never runs it. */
function TestingPanel({ lifted }: { lifted: ComposedTesting }): React.JSX.Element {
  const labels = useMemo(() => new Map(lifted.badges.map((badge) => [badge.path, badge.labels] as const)), [lifted.badges]);
  const tree = lifted.tree;
  const isTree = tree !== null && classifyFence(tree.info, tree.text) === 'tree';
  return (
    <div className="view-codebase-lifted view-codebase-testing">
      {lifted.plates.length > 0 || lifted.coverage !== null ? (
        <div className="view-codebase-plates">
          {lifted.plates.map((plate, index) => (
            <div className="view-codebase-plate" key={`${index}-${plate.label}`}>
              <span className="view-codebase-micro">
                <ResearchInline text={plate.label} />
              </span>
              <span>
                <b>
                  <ResearchInline text={plate.name} />
                </b>
                {plate.version !== null ? <code>{plate.version}</code> : null}
              </span>
              {plate.config !== null ? <code>{plate.config}</code> : null}
            </div>
          ))}
          {lifted.coverage !== null ? (
            <div className="view-codebase-plate" data-kind="coverage">
              <span className="view-codebase-micro">Coverage</span>
              <span>
                <b>
                  <ResearchInline text={lifted.coverage} />
                </b>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {tree !== null ? (
        <section className="view-codebase-figure">
          {isTree ? (
            <CleanTreeFigure text={tree.text} title="Test folders" labels={labels} />
          ) : (
            <FenceFigure fence={tree} title="Test folders" />
          )}
          {lifted.unplaced.length > 0 ? (
            <p className="source-note">
              Test types with no folder on this tree: {lifted.unplaced.join(', ')}.
            </p>
          ) : null}
        </section>
      ) : null}
      {lifted.commands.length > 0 ? (
        <figure className="view-codebase-pic">
          <div className="view-codebase-pic-bar">
            <span className="view-codebase-pic-title">Run commands</span>
            <span className="view-codebase-pic-count">{lifted.commands.length} commands</span>
          </div>
          <ul className="view-codebase-pic-body view-codebase-cmds">
            {lifted.commands.map((entry, index) => (
              <li className="view-codebase-cmd" key={`${index}-${entry.command}`}>
                <CopyCommand command={entry.command} />
                {entry.caption !== null ? (
                  <span className="view-codebase-cap">
                    <ResearchInline text={entry.caption} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="view-codebase-pic-foot">
            <span>{NEVER_RUNS_NOTE}</span>
          </div>
        </figure>
      ) : null}
    </div>
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
  if (lifted.kind === 'integrations') return <IntegrationsPanel lifted={lifted} />;
  if (lifted.kind === 'conventions') return <ConventionsPanel lifted={lifted} />;
  if (lifted.kind === 'testing') return <TestingPanel lifted={lifted} />;
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
