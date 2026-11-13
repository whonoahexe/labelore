// The settings page's React surface (quick-261114-42r, SET-01, sketch 065 variant A "Reference doc"): the header override (crumbs
// "{project name} / Settings", the eyebrow "Settings", the h1 "Project settings", the read-only lock line that points to
// /gsd-settings, and a one-line lede of counts) and the page body: a sticky rail, then GSD's own sections, each key an entry with
// GSD's description, type, default and allowed values beside this project's value and its line in config.json.
//
// The page is a reference first: every key GSD understands is on it, set or not, and the reference is shown whatever the config is
// (no file, an unreadable file, no gsd-core install). It is read-only by construction: the only inputs are the rail's search box and
// the two narrow-screen selects, nothing here writes, and every string - GSD's text, a config value, a key - is rendered as React
// text through the inline tokenizer, never as React's raw-HTML injection prop (T-42r-02). Two requests feed it, both GETs: GSD's
// reference (once per session) and the file's Source text (the Source reader's own cached query, for the line of each key and the
// parser's position when the file is unreadable).
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, Lock, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SourceParseError } from '../../server/source-text.ts';
import { fetchGsdConfigReference } from '../api.ts';
import { Button } from '../components/ui/button.tsx';
import { projectKey } from '../query-keys.ts';
import { fetchSource, sourceKey } from '../source/source-api.ts';
import { tokenizeInline } from './inline-markdown.ts';
import type { InlineToken } from './inline-markdown.ts';
import { SettingsRail } from './settings-rail.tsx';
import { composeSettingsReference, filterSettings } from './settings-reference.ts';
import type {
  FilteredSection,
  SettingsEntry,
  SettingsModel,
  SettingsSubject,
  SettingsValue,
  StatusFilter,
} from './settings-reference.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type SettingsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** What the page draws: the composed model, or nothing yet while GSD's reference and the file's text are still on their way. */
export type SettingsPageModel = SettingsModel | { state: 'loading' };

const MASK_TITLE = 'Masked by Labelore; the file holds the real value';

/** The ArtifactHeader override View mode spreads over its props: the crumbs, the eyebrow, the h1, the read-only lock line and, once
 * the reference and a readable config.json are composed, the one-line lede of counts. The header keeps its own Copy path button for
 * .planning/config.json and the View · Source toggle. Both parts of the lead are spans: it sits inside `p.artifact-lead`. */
export function settingsHeaderProps(projectName: string, model: SettingsPageModel | null = null): SettingsHeaderProps {
  const counts = model !== null && model.state === 'reference' && model.config === 'ready' ? model.counts : null;
  return {
    eyebrow: 'Settings',
    title: 'Project settings',
    lead: (
      <>
        <span className="view-settings-lock">
          <Lock aria-hidden="true" />
          <span>
            Read-only. Change a setting with <code>/gsd-settings</code> in your terminal.
          </span>
        </span>
        {counts === null ? null : (
          <span className="view-settings-lede">
            <b>{counts.understood}</b> settings GSD understands, <b>{counts.set}</b> set in this project&apos;s{' '}
            <code>config.json</code>
            {counts.notRecognised > 0 ? (
              <>
                , <b>{counts.notRecognised}</b> it doesn&apos;t recognise
              </>
            ) : null}
            . Descriptions and defaults come from GSD&apos;s configuration reference.
          </span>
        )}
      </>
    ),
    crumbs: [{ label: projectName, to: '/' }, { label: 'Settings' }],
  };
}

// ---------------------------------------------------------------------------------------------------------
// The model: GSD's reference and the file's text, composed
// ---------------------------------------------------------------------------------------------------------

/**
 * The composed settings model for one subject. Two cached GETs feed it: GSD's reference (GSD-wide, kept for the session; a failed
 * request just means "unavailable", and the page shows the project's values alone) and, for a config.json that exists, its Source
 * text (the line of each key, the parser's position). The model is loading until both settle; a null subject is loading forever,
 * and neither request is made.
 */
export function useSettingsModel(
  subject: SettingsSubject | null,
  { slug, scope, route }: { slug: string; scope: string | null; route: string },
): SettingsPageModel {
  const wantsText = subject !== null && subject.state !== 'missing';
  const reference = useQuery({
    queryKey: projectKey(slug, scope, 'gsd-config-reference'),
    queryFn: () => fetchGsdConfigReference(slug),
    staleTime: Number.POSITIVE_INFINITY,
    enabled: subject !== null,
  });
  const text = useQuery({
    queryKey: sourceKey(slug, scope, route),
    queryFn: () => fetchSource(slug, scope, route),
    staleTime: Number.POSITIVE_INFINITY,
    enabled: wantsText,
  });
  const waiting = subject === null || reference.isPending || (wantsText && text.isPending);
  const referenceData = reference.data ?? null;
  const textData = text.data ?? null;
  return useMemo<SettingsPageModel>(
    () =>
      waiting
        ? { state: 'loading' }
        : composeSettingsReference(
            subject,
            referenceData,
            textData === null ? null : { text: textData.text, parseError: textData.parseError },
          ),
    [waiting, subject, referenceData, textData],
  );
}

// ---------------------------------------------------------------------------------------------------------
// Text: GSD's strings as React nodes
// ---------------------------------------------------------------------------------------------------------

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A run of text with the filter's matches wrapped in `mark`. */
function Highlighted({ text, query }: { text: string; query: string }): React.JSX.Element {
  const needle = query.trim();
  if (needle === '') return <>{text}</>;
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
        if (token.type === 'strong') return <b key={key}><Tokens tokens={token.value} query={query} /></b>;
        if (token.type === 'em') return <em key={key}><Tokens tokens={token.value} query={query} /></em>;
        if (token.type === 'code') {
          return (
            <code key={key}>
              <Highlighted text={token.value} query={query} />
            </code>
          );
        }
        return <Highlighted key={key} text={token.value} query={query} />;
      })}
    </>
  );
}

/** One of GSD's strings (or a label, or a key) as inline React nodes: code, bold and emphasis only, matches marked. Never an HTML string. */
function Marked({ text, query }: { text: string; query: string }): React.JSX.Element {
  return <Tokens tokens={tokenizeInline(text)} query={query} />;
}

// ---------------------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------------------

function isHeadingObject(item: unknown): item is { heading: string; enabled?: unknown; source?: unknown; template?: unknown } {
  return typeof item === 'object' && item !== null && 'heading' in item && typeof (item as { heading: unknown }).heading === 'string';
}

function plain(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}

function ListValue({ items }: { items: unknown[] }): React.JSX.Element {
  if (items.length === 0) return <span className="view-settings-str">[ ]</span>;
  const sections = items.every(isHeadingObject);
  const summary = sections
    ? `${items.length} sections · ${items.filter((item) => isHeadingObject(item) && item.enabled !== false).length} on`
    : `${items.length} items`;
  return (
    <>
      <span className="view-settings-sum">{summary}</span>
      <ul className="view-settings-list">
        {items.map((item, index) =>
          isHeadingObject(item) ? (
            <li key={index}>
              <span className="view-settings-bool" data-on={item.enabled !== false}>
                <i aria-hidden="true" />
                <span className="sr-only">{item.enabled !== false ? 'on' : 'off'}</span>
              </span>
              <span>{item.heading}</span>
              <span className="view-settings-meta">
                {typeof item.source === 'string' ? `from ${item.source.split('||')[0]?.trim() ?? ''}` : item.template !== undefined ? 'template' : ''}
              </span>
            </li>
          ) : (
            <li key={index} className="view-settings-mono">
              {plain(item)}
            </li>
          ),
        )}
      </ul>
    </>
  );
}

/** A value in the shape it arrives in; an unset key reads "not set". */
function Value({ value, set }: { value: SettingsValue | null; set: boolean }): React.JSX.Element {
  if (!set || value === null) return <span className="view-settings-unset">not set</span>;
  switch (value.kind) {
    case 'boolean':
      return (
        <span className="view-settings-bool" data-on={value.on}>
          <i aria-hidden="true" />
          {String(value.on)}
        </span>
      );
    case 'null':
      return <span className="view-settings-null">null</span>;
    case 'masked':
      return (
        <span className="source-t-mask view-settings-mask" title={MASK_TITLE}>
          <Lock aria-hidden="true" />
          {value.text}
        </span>
      );
    case 'number':
      return <span className="view-settings-num">{value.text}</span>;
    case 'string':
      return value.text === '' ? (
        <span className="view-settings-null">empty string</span>
      ) : (
        <span className="view-settings-str">{value.text}</span>
      );
    case 'list':
      return <ListValue items={value.value} />;
    case 'object': {
      const entries = Object.entries(value.value);
      if (entries.length === 0) return <span className="view-settings-str">{'{ }'}</span>;
      return (
        <dl className="view-settings-obj">
          {entries.map(([name, inner], index) => (
            <div key={`${index}:${name}`}>
              <dt>{name}</dt>
              <dd>{plain(inner)}</dd>
            </div>
          ))}
        </dl>
      );
    }
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------------------------------------

function EntryName({ entry, query }: { entry: SettingsEntry; query: string }): React.JSX.Element {
  return entry.label === null ? (
    <span className="view-settings-nm">
      <span className="view-settings-name" data-is-key="true">
        <Highlighted text={entry.key} query={query} />
      </span>
    </span>
  ) : (
    <span className="view-settings-nm">
      <span className="view-settings-name">
        <Highlighted text={entry.label} query={query} />
      </span>
      <span className="view-settings-key">
        <Highlighted text={entry.key} query={query} />
      </span>
    </span>
  );
}

function AllowedList({ entry, query }: { entry: SettingsEntry; query: string }): React.JSX.Element | null {
  if (entry.allowed !== null) {
    const hasDefault = entry.allowed.some((option) => option.isDefault);
    return (
      <span className="view-settings-allowed" data-has-default={hasDefault}>
        {entry.allowed.map((option) => (
          <span
            key={option.text}
            className="view-settings-option"
            data-default={option.isDefault}
            {...(option.current ? { 'aria-current': 'true' as const } : {})}
          >
            {option.text}
            {option.current ? <span className="sr-only"> (this project)</span> : null}
            {option.isDefault ? <span className="view-settings-option-default">default</span> : null}
          </span>
        ))}
      </span>
    );
  }
  return entry.allowedText === '' ? null : <Marked text={entry.allowedText} query={query} />;
}

function EntryValue({
  entry,
  onOpenSourceAt,
  lineLabel,
}: {
  entry: SettingsEntry;
  onOpenSourceAt: (line: number | null) => void;
  lineLabel: string;
}): React.JSX.Element {
  return (
    <>
      <Value value={entry.value} set={entry.set} />
      {entry.set && entry.line !== null ? (
        <button type="button" className="view-settings-line" onClick={() => onOpenSourceAt(entry.line)}>
          {lineLabel}
          {entry.line}
        </button>
      ) : null}
    </>
  );
}

function DocumentedEntry({
  entry,
  query,
  hasConfig,
  expanded,
  onToggle,
  onOpenSourceAt,
}: {
  entry: SettingsEntry;
  query: string;
  hasConfig: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element {
  const hasMore = entry.rest !== '' || entry.related.length > 0;
  const showAllowed = (entry.allowed !== null || entry.allowedText !== '') && entry.type !== 'boolean';
  return (
    <article className="view-settings-entry" id={entry.id} data-wide={entry.wide} data-set={entry.set}>
      <h3 className="view-settings-entry-key">
        <EntryName entry={entry} query={query} />
        <a className="view-settings-hash" href={`#${entry.id}`} aria-label={`Link to ${entry.key}`}>
          #
        </a>
      </h3>
      {hasConfig ? (
        <div className="view-settings-val">
          <span className="view-settings-val-label">This project</span>
          <EntryValue entry={entry} onOpenSourceAt={onOpenSourceAt} lineLabel="config.json L" />
        </div>
      ) : null}
      <p className="view-settings-desc">
        <Marked text={entry.first} query={query} />
        {expanded && entry.rest !== '' ? (
          <>
            {' '}
            <Marked text={entry.rest} query={query} />
          </>
        ) : null}
        {hasMore ? (
          <>
            {' '}
            <button type="button" className="view-settings-more" aria-expanded={expanded} onClick={onToggle}>
              {expanded ? 'less' : 'more'}
            </button>
          </>
        ) : null}
      </p>
      <div className="view-settings-facts">
        <dl>
          <dt>Type</dt>
          <dd className="view-settings-mono">{entry.type === '' ? '—' : entry.type}</dd>
        </dl>
        <dl>
          <dt>Default</dt>
          <dd>{entry.defaultText === '' ? <span className="view-settings-quiet">none documented</span> : <Marked text={entry.defaultText} query={query} />}</dd>
        </dl>
        {showAllowed ? (
          <dl>
            <dt>Allowed</dt>
            <dd>
              <AllowedList entry={entry} query={query} />
            </dd>
          </dl>
        ) : null}
      </div>
      {expanded && entry.related.length > 0 ? (
        <div className="view-settings-rel">
          {entry.related.map((note) => (
            <span key={note.title}>
              <b>
                <Marked text={note.title} query={query} />
              </b>{' '}
              — <Marked text={note.first} query={query} />
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function AcceptedFold({
  filtered,
  query,
  hasConfig,
  open,
  onToggle,
}: {
  filtered: FilteredSection;
  query: string;
  hasConfig: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
}): React.JSX.Element | null {
  if (filtered.accepted.length === 0) return null;
  const count = filtered.accepted.length;
  return (
    <details
      className="view-settings-also"
      open={open || filtered.foldOpen}
      onToggle={(event) => {
        // A fold the page opened on its own (a query, nothing documented to read) is not the reader's choice, so it is not kept.
        if (!filtered.foldOpen) onToggle(event.currentTarget.open);
      }}
    >
      <summary>
        <ChevronRight aria-hidden="true" />
        <span>
          {count} more {count === 1 ? 'key' : 'keys'} GSD accepts
        </span>
        <span className="view-settings-quiet">· no description in GSD&apos;s reference</span>
      </summary>
      <ul>
        {filtered.accepted.map((entry) => (
          <li key={entry.id} id={entry.id}>
            <span className="view-settings-also-key">
              <EntryName entry={entry} query={query} />
            </span>
            <span className="view-settings-also-default">default {entry.defaultText === '' ? '—' : <Marked text={entry.defaultText} query={query} />}</span>
            <span className="view-settings-also-value">
              {hasConfig ? <Value value={entry.value} set={entry.set} /> : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------------------------------------

/** The words for the closed set of reasons the raw-text route answers with (it never sends the parser's own message, which can quote the file). */
const REASON_WORDS: Readonly<Record<SourceParseError['reason'], string>> = {
  'unexpected-end': 'the file ends before the JSON does',
  'unexpected-character': 'an unexpected character',
  'expected-value': 'a value or a key name was expected',
  'not-valid': 'this is not valid JSON',
};

/** The notice for a config.json that is not valid JSON: the page's one error look. The sentence names the line when the parser gave
 * one, and the button switches to Source with that line selected (with no line it just opens Source). Pure, so the copy is testable. */
export function UnreadableNotice({
  parseError,
  onOpenSourceAt,
}: {
  parseError: SourceParseError | null;
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element {
  const line = parseError?.line ?? null;
  return (
    <aside className="notice source-notice view-settings-unreadable" role="status">
      <span className="source-notice-glyph" aria-hidden="true">
        <TriangleAlert />
      </span>
      <span className="status-chip" data-tone="destructive">
        {"Can't read config.json"}
      </span>
      <p className="source-notice-lead">{"The file isn't valid JSON, so this project's values aren't shown."}</p>
      {line !== null && parseError !== null ? (
        <p>
          The parser stopped at line {line}: {REASON_WORDS[parseError.reason]}.
        </p>
      ) : null}
      <p>The reference below still lists everything you can set.</p>
      <div className="source-notice-actions">
        <Button type="button" size="xs" variant="outline" onClick={() => onOpenSourceAt(line)}>
          {line === null ? 'Open Source' : `Open Source at line ${line}`}
        </Button>
      </div>
    </aside>
  );
}

/** The quiet notice for a project with no config.json: GSD runs it on its defaults, and the reference still shows everything. */
export function NoFileNotice(): React.JSX.Element {
  return (
    <aside className="notice source-notice" role="status">
      <span className="source-notice-glyph" aria-hidden="true">
        <FileText />
      </span>
      <p className="source-notice-lead">This project has no settings file</p>
      <p>
        There&apos;s no <code>.planning/config.json</code>, so GSD runs this project on its defaults. The reference below still
        lists everything you can set.
      </p>
    </aside>
  );
}

/** The quiet notice for a machine where GSD's reference cannot be read: the page falls back to the project's own values. */
export function NoReferenceNotice(): React.JSX.Element {
  return (
    <aside className="notice source-notice" role="status">
      <span className="source-notice-glyph" aria-hidden="true">
        <FileText />
      </span>
      <p className="source-notice-lead">{"GSD's configuration reference wasn't found"}</p>
      <p>
        Labelore reads descriptions and defaults from the installed gsd-core (<code>references/planning-config.md</code> and{' '}
        <code>bin/shared/config-schema.manifest.json</code>). Without them this page shows only the values this
        project&apos;s <code>config.json</code> sets.
      </p>
    </aside>
  );
}

function StateNotices({
  config,
  parseError,
  onOpenSourceAt,
}: {
  config: 'ready' | 'missing' | 'unreadable';
  parseError: SourceParseError | null;
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element | null {
  if (config === 'missing') return <NoFileNotice />;
  if (config === 'unreadable') return <UnreadableNotice parseError={parseError} onOpenSourceAt={onOpenSourceAt} />;
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------------------

function ReferenceBody({
  model,
  header,
  onOpenSourceAt,
}: {
  model: Extract<SettingsModel, { state: 'reference' }>;
  header: React.ReactNode;
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [folds, setFolds] = useState<ReadonlySet<string>>(new Set());
  const hasConfig = model.config === 'ready';
  const effectiveStatus: StatusFilter = hasConfig ? status : 'all';
  const filtered = useMemo(() => filterSettings(model, { query, status: effectiveStatus }), [model, query, effectiveStatus]);

  // A `#k-…` or `#s-…` address scrolls its element into view once the page has drawn.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === '') return;
    let target: string;
    try {
      target = decodeURIComponent(hash);
    } catch {
      return;
    }
    if (/^(?:k|s|u)-/.test(target)) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, []);

  const toggle = (id: string): void =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const setFold = (id: string, open: boolean): void =>
    setFolds((previous) => {
      if (previous.has(id) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const shown = filtered.sections.filter((section) => section.entries.length + section.accepted.length > 0);
  return (
    <div className="view-settings-page" data-rail="true">
      <SettingsRail
        query={query}
        onQuery={setQuery}
        status={effectiveStatus}
        onStatus={setStatus}
        showStatus={hasConfig}
        counts={model.counts}
        filtered={filtered}
        hasUnknown={model.unknown.length > 0}
      />
      <div className="view-settings-main">
        {header}
        <StateNotices config={model.config} parseError={model.parseError} onOpenSourceAt={onOpenSourceAt} />
        {filtered.empty ? (
          <p className="view-settings-empty">
            No setting matches &ldquo;{query}&rdquo;.{' '}
            <button
              type="button"
              className="view-settings-more"
              onClick={() => {
                setQuery('');
                setStatus('all');
              }}
            >
              Clear filter
            </button>
          </p>
        ) : null}
        {shown.map((entry) => (
          <section key={entry.section.id} className="view-settings-sec" id={entry.section.id}>
            <header className="view-settings-sec-head">
              <h2>
                {entry.section.name}
                <span className="view-settings-sec-count">
                  {entry.section.setCount} of {entry.section.total} set
                </span>
              </h2>
              {entry.section.intro === '' ? null : (
                <p>
                  <Marked text={entry.section.intro} query="" />
                </p>
              )}
            </header>
            {entry.entries.map((documented) => (
              <DocumentedEntry
                key={documented.id}
                entry={documented}
                query={query}
                hasConfig={hasConfig}
                expanded={expanded.has(documented.id)}
                onToggle={() => toggle(documented.id)}
                onOpenSourceAt={onOpenSourceAt}
              />
            ))}
            <AcceptedFold
              filtered={entry}
              query={query}
              hasConfig={hasConfig}
              open={folds.has(entry.section.id)}
              onToggle={(open) => setFold(entry.section.id, open)}
            />
          </section>
        ))}
        {filtered.unknown.length > 0 ? (
          <section className="view-settings-sec" id="s-not-recognised" data-kind="not-recognised">
            <header className="view-settings-sec-head">
              <h2>
                Not recognised<span className="view-settings-sec-count">{filtered.unknown.length}</span>
              </h2>
              <p>In this project&apos;s config.json, but not a key GSD&apos;s schema knows. Shown as it is.</p>
            </header>
            <div className="view-settings-unknown">
              {filtered.unknown.map((entry, index) => (
                <div key={`${index}:${entry.key}`} className="view-settings-unknown-row" id={entry.id}>
                  <span className="view-settings-entry-key">
                    <EntryName entry={entry} query={query} />
                  </span>
                  <span className="view-settings-unknown-value">
                    <Value value={entry.value} set={entry.set} />
                    {entry.line === null ? null : (
                      <button type="button" className="view-settings-line" onClick={() => onOpenSourceAt(entry.line)}>
                        L{entry.line}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** The values-only page: GSD's reference could not be read, so only what this project's config.json sets. */
function ValuesOnlyBody({
  model,
  header,
  onOpenSourceAt,
}: {
  model: Extract<SettingsModel, { state: 'values-only' }>;
  header: React.ReactNode;
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element {
  return (
    <div className="view-settings-page" data-rail="false">
      <div className="view-settings-main">
        {header}
        <StateNotices config={model.config} parseError={model.parseError} onOpenSourceAt={onOpenSourceAt} />
        <NoReferenceNotice />
        {model.entries.length > 0 ? (
          <section className="view-settings-sec" id="s-set-in-this-project">
            <header className="view-settings-sec-head">
              <h2>
                Set in this project<span className="view-settings-sec-count">{model.entries.length}</span>
              </h2>
            </header>
            {model.entries.map((entry, index) => (
              <article key={`${index}:${entry.key}`} className="view-settings-entry" id={entry.id} data-wide={entry.wide} data-set="true">
                <h3 className="view-settings-entry-key">
                  <EntryName entry={entry} query="" />
                </h3>
                <div className="view-settings-val">
                  <span className="view-settings-val-label">This project</span>
                  <EntryValue entry={entry} onOpenSourceAt={onOpenSourceAt} lineLabel="config.json L" />
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsView({
  model,
  header,
  onOpenSourceAt,
}: {
  model: SettingsPageModel;
  /** The ArtifactHeader node, passed in so the rail sits level with the crumbs as in the sketch. */
  header: React.ReactNode;
  /** Switches the page to Source; `line` is the line to select, or null for none. */
  onOpenSourceAt: (line: number | null) => void;
}): React.JSX.Element {
  if (model.state === 'loading') {
    return (
      <div className="view-settings-page" data-rail="false">
        <div className="view-settings-main">{header}</div>
      </div>
    );
  }
  if (model.state === 'values-only') return <ValuesOnlyBody model={model} header={header} onOpenSourceAt={onOpenSourceAt} />;
  return <ReferenceBody model={model} header={header} onOpenSourceAt={onOpenSourceAt} />;
}
