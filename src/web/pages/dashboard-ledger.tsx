// The dashboard's expandable-ledger sections and the pieces they share (quick-261018-4tb, sketch
// 026 B): the Blocking band and, from the next step, Decisions. Every string from a planning file
// renders as React text through MarkedText (T-4tb-01): code spans stay code, emphasis is flattened,
// a search hit becomes <mark>, and there is no raw-HTML prop anywhere on this page.
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  NO_PHASE,
  blockerGroups,
  blockingLead,
  decisionPhaseCounts,
  filterBlockers,
  filterDecisions,
  groupByPhase,
  isUntagged,
  pageOf,
  type Pager,
} from '../../presentation/dashboard-ledger-view.ts';
import type { LedgerBlockerDto, LedgerDecisionDto } from '../../server/dashboard-ledger.ts';
import type { LedgerMentionDto, LedgerSourceDto } from '../../server/document-sources.ts';
import { tokenizeInline, type InlineToken } from '../views/inline-markdown.ts';
import { stripEmoji, stripMarkdown } from './strip-emoji.ts';

export const BLOCKER_PAGE_SIZE = 5;
export const DECISION_PAGE_SIZE = 8;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlighted({ text, query }: { text: string; query: string }): React.JSX.Element {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'i'));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <mark key={`${index}-${part}`}>{part}</mark> : <span key={`${index}-${part}`}>{part}</span>,
      )}
    </>
  );
}

function Tokens({ tokens, query }: { tokens: InlineToken[]; query: string }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'strong' || token.type === 'em') {
          return <Tokens key={key} tokens={token.value} query={query} />;
        }
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <Highlighted key={key} text={token.value} query={query} />;
      })}
    </>
  );
}

/** A planning-file string as inline React nodes. Never an HTML string. */
export function MarkedText({ text, query = '' }: { text: string; query?: string }): React.JSX.Element {
  return <Tokens tokens={tokenizeInline(stripEmoji(text))} query={query} />;
}

export function LedgerSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="ledger-search">
      <Search aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" className="ledger-kicker" onClick={() => onChange('')}>
          Clear
        </button>
      ) : null}
    </label>
  );
}

/** The dashboard's one pager: "Showing 1–5 of 14" and ‹ 1 / 3 ›, in the shared pagination markup. */
export function LedgerPager({
  pager,
  label,
  onPage,
}: {
  pager: Pager;
  label: string;
  onPage: (page: number) => void;
}): React.JSX.Element | null {
  if (pager.pages <= 1) return null;
  return (
    <nav className="attention-pagination" aria-label={label}>
      <span>{pager.label}</span>
      <div className="attention-pagination-actions">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPage(pager.page - 1)}
          disabled={pager.page <= 0}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="attention-page-status" aria-live="polite">
          {pager.page + 1} / {pager.pages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPage(pager.page + 1)}
          disabled={pager.page >= pager.pages - 1}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

/** A document a ledger entry names, as a card that opens it. */
export function SourceCard({ source }: { source: LedgerSourceDto }): React.JSX.Element {
  return (
    <Link className="ledger-source" to={source.url}>
      <span className="ledger-source-head">
        <span className="ledger-kicker">{source.kind}</span>
        <b>{source.label}</b>
        {source.meta ? <span className="ledger-quiet">{source.meta}</span> : null}
        <ArrowUpRight aria-hidden="true" />
      </span>
      {source.detail ? (
        <span className="ledger-source-detail">
          <MarkedText text={source.detail} />
        </span>
      ) : null}
    </Link>
  );
}

/** Copies an entry's visible text on a click. The label reads "Copied" for 1.5 s; a denied
 * clipboard stays silent, like the invalid-project screen's copy field. */
export function CopyTextButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(stripMarkdown(stripEmoji(text)));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent: the entry's text stays fully visible and selectable.
    }
  }
  return (
    <button type="button" className="ledger-go" onClick={copy}>
      {copied ? 'Copied' : 'Copy text'}
    </button>
  );
}

/** The note an entry with no resolvable source carries: its text is the whole record. */
export function UntaggedNote({ message, text }: { message: string; text: string }): React.JSX.Element {
  return (
    <div className="ledger-untagged">
      <span>{message}</span>
      <CopyTextButton text={text} />
    </div>
  );
}

/** One expandable row: a button head with a chevron, and a body only while open. */
export function LedgerRow({
  open,
  onToggle,
  head,
  children,
  dataset,
}: {
  open: boolean;
  onToggle: () => void;
  head: React.ReactNode;
  children: React.ReactNode;
  dataset?: Record<string, string | undefined>;
}): React.JSX.Element {
  return (
    <li className="ledger-row" data-open={open} {...dataset}>
      <button type="button" className="ledger-row-head" aria-expanded={open} onClick={onToggle}>
        {head}
        <ChevronRight className="ledger-row-chevron" aria-hidden="true" />
      </button>
      {open ? <div className="ledger-row-body">{children}</div> : null}
    </li>
  );
}

function MentionChips({
  mentions,
  more,
}: {
  mentions: LedgerMentionDto[];
  more: number;
}): React.JSX.Element {
  return (
    <div className="ledger-mentions">
      <div className="ledger-chips">
        {mentions.map((mention) => (
          <Link key={mention.path} className="ledger-chip" to={mention.url}>
            {mention.label}
          </Link>
        ))}
      </div>
      {more > 0 ? <span className="ledger-quiet">and {more} more</span> : null}
    </div>
  );
}

// The collapsed row's hint of where a blocker came from: its first source, or Untagged.
const SHORT_KIND: Record<string, string> = { Plan: 'Plan ', 'Quick task': 'Quick ' };

function SourceSummary({ blocker }: { blocker: LedgerBlockerDto }): React.JSX.Element {
  if (isUntagged(blocker)) {
    return (
      <span className="ledger-source-sum" data-untagged="true">
        Untagged
      </span>
    );
  }
  const first = blocker.sources[0];
  return (
    <span className="ledger-source-sum">
      {`${SHORT_KIND[first.kind] ?? ''}${first.label}`}
      {blocker.sources.length > 1 ? <b>{`+${blocker.sources.length - 1}`}</b> : null}
    </span>
  );
}

function BlockerTag({ blocker }: { blocker: LedgerBlockerDto }): React.JSX.Element {
  if (blocker.resolved) {
    return (
      <span className="blocking-tag" data-quiet="true">
        {blocker.tag ?? 'Resolved'}
      </span>
    );
  }
  if (blocker.tag) return <span className="blocking-tag">{blocker.tag}</span>;
  return blocker.urgent ? <span className="blocking-tag">Time-bound</span> : <span />;
}

function BlockerRow({
  blocker,
  open,
  query,
  onToggle,
}: {
  blocker: LedgerBlockerDto;
  open: boolean;
  query: string;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <LedgerRow
      open={open}
      onToggle={onToggle}
      dataset={{
        'data-urgent': blocker.urgent ? 'true' : undefined,
        'data-resolved': blocker.resolved ? 'true' : undefined,
      }}
      head={
        <>
          <span className="blocking-dot" aria-hidden="true" />
          <span className="ledger-row-title">
            <MarkedText text={blocker.title} query={query} />
          </span>
          <BlockerTag blocker={blocker} />
          <SourceSummary blocker={blocker} />
        </>
      }
    >
      <dl className="ledger-row-facts">
        {blocker.why ? (
          <>
            <dt className="ledger-kicker">{blocker.resolved ? 'Outcome' : 'Detail'}</dt>
            <dd>
              <MarkedText text={blocker.why} query={query} />
            </dd>
          </>
        ) : null}
        {blocker.group ? (
          <>
            <dt className="ledger-kicker">Filed under</dt>
            <dd>{stripEmoji(blocker.group)}</dd>
          </>
        ) : null}
        {isUntagged(blocker) ? (
          <>
            <dt className="ledger-kicker">Source</dt>
            <dd>
              <UntaggedNote
                message="Untagged — names no plan, quick task, review finding or requirement. This text is the whole record."
                text={blocker.text}
              />
            </dd>
          </>
        ) : (
          <>
            <dt className="ledger-kicker">{blocker.sources.length === 1 ? 'Source' : 'Sources'}</dt>
            <dd>
              <div className="ledger-sources">
                {blocker.sources.map((source) => (
                  <SourceCard key={source.path} source={source} />
                ))}
              </div>
            </dd>
            {blocker.mentions.length > 0 ? (
              <>
                <dt className="ledger-kicker">Also mentioned in</dt>
                <dd>
                  <MentionChips mentions={blocker.mentions} more={blocker.moreMentions} />
                </dd>
              </>
            ) : null}
          </>
        )}
      </dl>
    </LedgerRow>
  );
}

function BlockerLead({
  lead,
  filtered,
  query,
}: {
  lead: LedgerBlockerDto;
  filtered: boolean;
  query: string;
}): React.JSX.Element {
  const label = lead.resolved ? (
    <span className="blocking-tag" data-quiet="true">
      {lead.tag ?? 'Resolved'}
    </span>
  ) : lead.urgent ? (
    <span className="blocking-tag">Time-bound · most urgent</span>
  ) : lead.tag ? (
    <span className="blocking-tag">{lead.tag}</span>
  ) : (
    <span className="ledger-kicker">{filtered ? 'First in this view' : 'First listed'}</span>
  );
  const mentionTotal = lead.mentions.length + lead.moreMentions;
  return (
    <div className="blocking-lead">
      {label}
      <p className="blocking-lead-title">
        <MarkedText text={lead.title} query={query} />
      </p>
      {lead.why ? (
        <p className="blocking-lead-why">
          <MarkedText text={lead.why} query={query} />
        </p>
      ) : null}
      {isUntagged(lead) ? (
        <div className="blocking-lead-sources">
          <span className="ledger-source-sum" data-untagged="true">
            Untagged
          </span>
          <span className="ledger-quiet">Names no source — this text is the whole record.</span>
          <CopyTextButton text={lead.text} />
        </div>
      ) : (
        <div className="blocking-lead-sources">
          {lead.sources.map((source) => (
            <Link key={source.path} className="ledger-go" to={source.url}>
              {`${source.kind} ${source.label}`}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
          {mentionTotal > 0 ? (
            <span className="ledger-quiet">
              {`Also in ${lead.mentions
                .slice(0, 2)
                .map((mention) => mention.label)
                .join(', ')}${mentionTotal > 2 ? ` and ${mentionTotal - 2} more` : ''}`}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Blocking: a full-width red band led by the most urgent open blocker, or one quiet line. */
export function BlockingBand({ blockers }: { blockers: LedgerBlockerDto[] }): React.JSX.Element {
  const [group, setGroup] = useState<string | null>(null);
  const [untagged, setUntagged] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const open = blockers.filter((blocker) => !blocker.resolved);
  const resolvedCount = blockers.length - open.length;
  if (open.length === 0) {
    return (
      <p className="blocking-calm">
        <CheckCircle2 aria-hidden="true" />
        <span>
          <strong>Nothing blocking.</strong>
          {` No open blockers are recorded${resolvedCount > 0 ? ` (${resolvedCount} marked resolved)` : ''}.`}
        </span>
      </p>
    );
  }

  const shown = filterBlockers(blockers, { group, untagged, resolved, query });
  const lead = blockingLead(shown);
  const rest = shown.filter((blocker) => blocker !== lead);
  const pager = pageOf(rest.length, BLOCKER_PAGE_SIZE, page);
  const groups = blockerGroups(open);
  const untaggedCount = open.filter(isUntagged).length;
  const filtered = group !== null || untagged || query.trim() !== '';

  function pickGroup(next: string | null): void {
    setGroup(next);
    setUntagged(false);
    setPage(0);
  }
  function pickUntagged(): void {
    setUntagged(!untagged);
    setGroup(null);
    setPage(0);
  }

  return (
    <section className="blocking-band" aria-label="Blockers">
      <div className="blocking-summary">
        <p className="eyebrow">
          <TriangleAlert aria-hidden="true" />
          Blocking
        </p>
        <span className="blocking-total">{open.length}</span>
        <span className="ledger-quiet">
          {`${open.length === 1 ? 'open blocker' : 'open blockers'}${resolvedCount > 0 ? `, plus ${resolvedCount} marked resolved` : ''}`}
        </span>
        {groups.length > 1 || untaggedCount > 0 ? (
          <div className="blocking-legend">
            <button type="button" data-on={group === null && !untagged} onClick={() => pickGroup(null)}>
              <span>All</span>
              <b>{open.length}</b>
            </button>
            {groups.length > 1
              ? groups.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    data-on={group === entry.key}
                    onClick={() => pickGroup(entry.key)}
                  >
                    <span>{stripEmoji(entry.label)}</span>
                    <b>{entry.count}</b>
                  </button>
                ))
              : null}
            {untaggedCount > 0 ? (
              <button type="button" data-untagged="true" data-on={untagged} onClick={pickUntagged}>
                <span>Untagged</span>
                <b>{untaggedCount}</b>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="blocking-main">
        {lead ? <BlockerLead lead={lead} filtered={filtered} query={query} /> : null}
        <div className="ledger-tools">
          <LedgerSearch
            label="Search blockers"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(0);
            }}
          />
          {resolvedCount > 0 ? (
            <button
              type="button"
              className="ledger-chip"
              data-on={resolved}
              onClick={() => {
                setResolved(!resolved);
                setPage(0);
              }}
            >
              Show resolved <b>{resolvedCount}</b>
            </button>
          ) : null}
        </div>
        {rest.length > 0 ? (
          <>
            <ol className="ledger-rows">
              {rest.slice(pager.start, pager.end).map((blocker) => (
                <BlockerRow
                  key={blocker.key}
                  blocker={blocker}
                  open={openKey === blocker.key}
                  query={query}
                  onToggle={() => setOpenKey(openKey === blocker.key ? null : blocker.key)}
                />
              ))}
            </ol>
            <LedgerPager
              pager={pager}
              label="Blockers pagination"
              onPage={(next) => {
                setPage(next);
                setOpenKey(null);
              }}
            />
          </>
        ) : !lead ? (
          <p className="empty-note">{`Nothing matches${query.trim() ? ` “${query.trim()}”` : ''}.`}</p>
        ) : null}
      </div>
    </section>
  );
}

// ---------- Decisions ----------

function DecisionRow({
  decision,
  open,
  query,
  onToggle,
}: {
  decision: LedgerDecisionDto;
  open: boolean;
  query: string;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <LedgerRow
      open={open}
      onToggle={onToggle}
      head={
        <>
          <span className="ledger-row-id">{decision.plan ?? ''}</span>
          <span className="ledger-row-title">
            <MarkedText text={decision.title} query={query} />
          </span>
        </>
      }
    >
      <dl className="ledger-row-facts">
        {decision.why ? (
          <>
            <dt className="ledger-kicker">Why</dt>
            <dd>
              <MarkedText text={decision.why} query={query} />
            </dd>
          </>
        ) : null}
        <dt className="ledger-kicker">Logged</dt>
        <dd>{decision.logged}</dd>
        {decision.source ? (
          <>
            <dt className="ledger-kicker">Source</dt>
            <dd>
              <div className="ledger-sources">
                <SourceCard source={decision.source} />
              </div>
            </dd>
          </>
        ) : !decision.phase ? (
          <>
            <dt className="ledger-kicker">Source</dt>
            <dd>
              <UntaggedNote
                message="Untagged — names no plan, quick task or phase. This text is the whole record."
                text={decision.text}
              />
            </dd>
          </>
        ) : null}
      </dl>
      {decision.phase && decision.phaseUrl ? (
        <div className="ledger-row-links">
          <Link className="ledger-go" to={decision.phaseUrl}>
            {`Phase ${decision.phase}`}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </LedgerRow>
  );
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Decisions: a per-phase bar chart that filters, a search, and the log newest first, grouped by
 * phase on a rail within each page. */
export function DecisionsSection({ decisions }: { decisions: LedgerDecisionDto[] }): React.JSX.Element {
  const [phase, setPhase] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const counts = decisionPhaseCounts(decisions);
  const filtered = filterDecisions(decisions, { phase, query });
  const pager = pageOf(filtered.length, DECISION_PAGE_SIZE, page);
  const pageItems = filtered.slice(pager.start, pager.end);
  const maxCount = Math.max(1, ...counts.histogram.map((entry) => entry.count));
  const phaseWords = phase === NO_PHASE ? 'no phase' : `phase ${phase}`;

  function pickPhase(next: string | null): void {
    setPhase(next);
    setPage(0);
  }

  return (
    <section className="decisions-section" aria-labelledby="decisions-heading">
      <header className="ledger-head">
        <div>
          <p className="eyebrow">
            <Gavel aria-hidden="true" />
            Settled
          </p>
          <h2 id="decisions-heading">Decisions</h2>
        </div>
        {decisions.length > 0 ? (
          <div className="ledger-head-tools">
            <LedgerSearch
              label="Search decisions"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
            />
            <span className="ledger-count">
              <b>{phase ? filtered.length : decisions.length}</b>{' '}
              <span>{phase ? `in ${phaseWords}` : 'logged'}</span>
            </span>
          </div>
        ) : null}
      </header>
      {counts.rail.length > 1 ? (
        <div className="decisions-histogram">
          <div className="decisions-histogram-bars">
            {counts.histogram.map((entry) => (
              <button
                key={entry.key}
                type="button"
                data-on={phase === entry.key}
                title={`${entry.count} in ${entry.key === NO_PHASE ? 'no phase' : `phase ${entry.key}`}`}
                onClick={() => pickPhase(phase === entry.key ? null : entry.key)}
              >
                <span className="decisions-histogram-value">{entry.count}</span>
                <span
                  className="decisions-histogram-bar"
                  style={{ height: `${(entry.count / maxCount) * 100}%` }}
                />
              </button>
            ))}
          </div>
          <div className="decisions-histogram-labels">
            {counts.histogram.map((entry) => (
              <span key={entry.key} data-on={phase === entry.key}>
                {entry.key === NO_PHASE ? 'None' : `P${entry.key}`}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {decisions.length === 0 ? (
        <div className="quiet-state">
          <CheckCircle2 aria-hidden="true" />
          <p>No decisions are recorded.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-note">
          {`Nothing matches${query.trim() ? ` “${query.trim()}”` : ''}${
            phase ? ` in ${phase === NO_PHASE ? 'entries with no phase' : `phase ${phase}`}` : ''
          }.`}
        </p>
      ) : (
        <>
          <div className="decisions-rail">
            {groupByPhase(pageItems).map((group) => (
              <div
                key={group.key}
                className="decisions-phase"
                data-none={group.key === NO_PHASE}
              >
                <div className="decisions-phase-mark">
                  <span className="ledger-kicker">{group.key === NO_PHASE ? 'No phase' : 'Phase'}</span>
                  <span className="decisions-phase-number">{group.key === NO_PHASE ? '—' : group.key}</span>
                  <span className="ledger-quiet">
                    {plural(counts.rail.find((entry) => entry.key === group.key)?.count ?? 0, 'decision')}
                  </span>
                </div>
                <ol className="ledger-rows">
                  {group.items.map((decision) => (
                    <DecisionRow
                      key={decision.key}
                      decision={decision}
                      open={openKey === decision.key}
                      query={query}
                      onToggle={() => setOpenKey(openKey === decision.key ? null : decision.key)}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <LedgerPager
            pager={pager}
            label="Decisions pagination"
            onPage={(next) => {
              setPage(next);
              setOpenKey(null);
            }}
          />
        </>
      )}
    </section>
  );
}
