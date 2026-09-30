// The PATTERNS pattern map's React surface (quick-260930-wfs, sketch 013 B): the cover facts with
// the match-quality meter and the quiet Searched line, the mapper's note, the House rules strip,
// the file map grouped by area with its sticky side panel, the collapsed back matter and the
// "In the source only" strip. Every string derived from the document renders only through
// `ResearchInline` / `ResearchBlocks` (tokenizeInline output mapped to React nodes) or as plain
// React text — never React's raw-HTML injection prop (T-wfs-02). Code excerpts never reach this
// view. Colour comes only from the tone a composed row carries and the theme tokens; the
// parse-degradation tones never appear on document content.
import { useEffect, useMemo, useState } from 'react';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import { QUALITY_LABEL, QUALITY_ORDER } from './pattern-map.ts';
import type {
  ComposedPatternIntro,
  ComposedPatternMap,
  ComposedPatternRow,
  ComposedPatternRule,
} from './pattern-map.ts';

/** Markdown markers dropped, for a hover title. */
function bare(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

// ---------------------------------------------------------------------------
// Cover: facts, match-quality meter, Searched line
// ---------------------------------------------------------------------------

export function PatternIntroMeta({ intro }: { intro: ComposedPatternIntro }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="view-patterns-cover">
      <p className="view-patterns-facts">
        {intro.mapped ? (
          <span>
            Mapped<b>{intro.mapped}</b>
          </span>
        ) : null}
        {intro.filesAnalyzed ? (
          <span>
            Files analyzed<b>{intro.filesAnalyzed.value}</b>
            {intro.filesAnalyzed.qualifier ? (
              <span className="view-patterns-qualifier">{intro.filesAnalyzed.qualifier}</span>
            ) : null}
          </span>
        ) : null}
        {intro.analogsFound ? (
          <span>
            Analogs found<b>{intro.analogsFound}</b>
          </span>
        ) : null}
      </p>
      <div
        className="view-patterns-meter"
        role="group"
        aria-label={`Match quality across ${intro.total} mapped files`}
      >
        <div className="view-patterns-meter-bar" aria-hidden="true">
          {QUALITY_ORDER.map((quality) =>
            intro.counts[quality] > 0 ? (
              <span
                key={quality}
                data-quality={quality}
                style={{ flexGrow: intro.counts[quality] }}
                title={`${QUALITY_LABEL[quality]}: ${intro.counts[quality]}`}
              />
            ) : null,
          )}
        </div>
        <ul className="view-patterns-meter-key">
          {QUALITY_ORDER.map((quality) => (
            <li key={quality} data-quality={quality}>
              <i aria-hidden="true" />
              <b>{intro.counts[quality]}</b>
              {QUALITY_LABEL[quality]}
            </li>
          ))}
        </ul>
      </div>
      {intro.scope ? (
        <p className="view-patterns-scope" data-open={open ? 'true' : undefined}>
          <span className="view-patterns-key">Searched</span>
          <span className="view-patterns-scope-text">
            <ResearchInline text={intro.scope} />
            {open && intro.scanned ? (
              <>
                {' · '}
                <ResearchInline text={intro.scanned} />
              </>
            ) : null}
          </span>
          <button
            type="button"
            className="view-patterns-link"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? 'less' : 'more'}
          </button>
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File map rows and the side panel
// ---------------------------------------------------------------------------

function AnalogShort({ row }: { row: ComposedPatternRow }): React.JSX.Element {
  const short = row.analogShort;
  if (row.origin === 'unplaced' && row.quality === null) {
    return <span className="view-patterns-muted">no classified file</span>;
  }
  if (short.kind === 'none') return <span className="view-patterns-muted">no analog</span>;
  if (short.kind === 'itself') {
    return (
      <>
        <span className="view-patterns-arrow" aria-hidden="true">
          ↺
        </span>
        extends itself
      </>
    );
  }
  return (
    <>
      <span className="view-patterns-arrow" aria-hidden="true">
        ←
      </span>
      {short.kind === 'path' ? <code>{short.name}</code> : short.text}
    </>
  );
}

function RowButton({
  row,
  selected,
  dim,
  onSelect,
}: {
  row: ComposedPatternRow;
  selected: boolean;
  dim: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <li>
      <button
        type="button"
        className="view-patterns-row"
        data-quality={row.quality ?? 'guidance'}
        data-selected={selected ? 'true' : undefined}
        data-dim={dim ? 'true' : undefined}
        aria-pressed={selected}
        onClick={onSelect}
      >
        <span>
          <span className="status-chip" data-tone={row.tone}>
            {row.chip}
          </span>
        </span>
        <span className="view-patterns-who">
          <span className="view-patterns-name">{row.name}</span>
          {row.dir ? <span className="view-patterns-dir">{row.dir}</span> : null}
        </span>
        <span className="view-patterns-analog">
          <AnalogShort row={row} />
          {row.partNew ? <span className="view-patterns-part"> ＋ part new</span> : null}
        </span>
      </button>
    </li>
  );
}

/** A lone bold line (`**Do NOT copy:**`, a sub-head) — it heads what follows rather than saying anything. */
function isSubHead(block: Block): boolean {
  return (
    block.kind === 'paragraph' &&
    block.text.startsWith('**') &&
    block.text.endsWith('**') &&
    !block.text.slice(2, -2).includes('**')
  );
}

/** How many guidance blocks open the panel: any sub-heads plus the first real paragraph or list,
 * so a warning's headline never sits alone above its own explanation. */
export function leadCount(blocks: Block[]): number {
  let count = 0;
  while (count < blocks.length && isSubHead(blocks[count])) count += 1;
  return Math.min(blocks.length, count + 1);
}

function Panel({
  row,
  rules,
  pickedRule,
  onPickRule,
  moreOpen,
  onToggleMore,
}: {
  row: ComposedPatternRow;
  rules: ComposedPatternRule[];
  pickedRule: string | null;
  onPickRule: (id: string) => void;
  moreOpen: boolean;
  onToggleMore: () => void;
}): React.JSX.Element {
  const lead = leadCount(row.guidance);
  const hasMore = row.guidance.length > lead;
  const rowRules = rules.filter((rule) => row.ruleIds.includes(rule.id));
  const showCopyFrom = row.copyFrom !== null && row.quality !== 'none';
  return (
    <aside className="view-patterns-panel" aria-label="Selected file">
      <div className="view-patterns-detail">
        <div>
          <div className="view-patterns-panel-name">{row.name}</div>
          {row.dir || row.tag ? (
            <div className="view-patterns-dir">
              {row.dir}
              {row.dir && row.tag ? ' · ' : ''}
              {row.tag}
            </div>
          ) : null}
        </div>
        <div className="view-patterns-panel-meta">
          <span className="status-chip" data-tone={row.tone}>
            {row.quality ? row.qualityLabel : row.chip}
          </span>
          {row.qualifier ? <span className="view-patterns-key">{row.qualifier}</span> : null}
          {row.role ? <span className="view-patterns-key">{row.role}</span> : null}
        </div>
        {showCopyFrom && row.copyFrom ? (
          <div className="view-patterns-kv">
            <span className="view-patterns-key">Copy from</span>
            <span className="view-patterns-value">
              <ResearchInline text={row.copyFrom} />
            </span>
          </div>
        ) : null}
        {row.useInstead ? (
          <div className="view-patterns-kv">
            <span className="view-patterns-key">Use instead</span>
            <span className="view-patterns-value">
              <ResearchInline text={row.useInstead} />
            </span>
          </div>
        ) : null}
        {row.reason ? (
          <div className="view-patterns-reason">
            <span className="view-patterns-key">
              {row.partNew ? 'No analog for part of it' : 'Why nothing matches'}
            </span>
            <span>
              <ResearchInline text={row.reason} />
            </span>
          </div>
        ) : null}
        {row.guidance.length > 0 ? (
          <>
            <div className="view-patterns-prose">
              <ResearchBlocks blocks={moreOpen ? row.guidance : row.guidance.slice(0, lead)} />
            </div>
            {hasMore ? (
              <button
                type="button"
                className="view-patterns-link"
                aria-expanded={moreOpen}
                onClick={onToggleMore}
              >
                {moreOpen ? 'Less ▴' : 'More guidance ▾'}
              </button>
            ) : null}
          </>
        ) : null}
        {rowRules.length > 0 ? (
          <div className="view-patterns-kv">
            <span className="view-patterns-key">Rules</span>
            <span className="view-patterns-rule-chips">
              {rowRules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  className="status-chip"
                  aria-pressed={pickedRule === rule.id}
                  onClick={() => onPickRule(rule.id)}
                >
                  {rule.name}
                </button>
              ))}
            </span>
          </div>
        ) : null}
        {row.excerpts > 0 ? (
          <span className="view-patterns-key">
            {row.excerpts} code excerpt{row.excerpts > 1 ? 's' : ''} in source
          </span>
        ) : null}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function PatternMapView({
  map,
  onShowSource,
  title,
}: {
  map: ComposedPatternMap;
  onShowSource: (id: string | null) => void;
  title: string;
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(map.defaultSelection);
  const [pickedRule, setPickedRule] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  // Escape clears the picked rule; the selection stays (as in the sketch).
  useEffect(() => {
    if (pickedRule === null) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPickedRule(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pickedRule]);

  const selected = useMemo(
    () =>
      map.rows.find((row) => row.id === selectedId) ??
      map.rows.find((row) => row.id === map.defaultSelection) ??
      map.rows[0],
    [map, selectedId],
  );
  const rule = pickedRule === null ? null : (map.rules.find((r) => r.id === pickedRule) ?? null);
  const hits = useMemo(() => new Set(rule?.hits ?? []), [rule]);
  const toggleRule = (id: string): void => setPickedRule((current) => (current === id ? null : id));
  const toggleMore = (id: string): void =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas" aria-label={`${title} document`}>
        {map.notes.length > 0 ? (
          <aside className="notice view-patterns-note">
            <span className="view-patterns-key">Mapper's note</span>
            <div className="view-patterns-prose">
              <ResearchBlocks blocks={map.notes} />
            </div>
          </aside>
        ) : null}
        <section id="pattern-file-map" className="view-block view-patterns-map">
          <header className="section-heading">
            <h2>File map</h2>
            <span className="view-patterns-aside">
              {map.intro.total} files · {map.areas.length}{' '}
              {map.areas.length === 1 ? 'area' : 'areas'}
            </span>
          </header>
          {map.rules.length > 0 ? (
            <div className="view-patterns-strip">
              <span className="view-patterns-key">House rules</span>
              {map.rules.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="status-chip"
                  aria-pressed={pickedRule === r.id}
                  title={bare(r.text ?? r.applyTo ?? '')}
                  onClick={() => toggleRule(r.id)}
                >
                  {r.name}
                  {r.hits.length > 0 ? ` · ${r.hits.length}` : ''}
                </button>
              ))}
            </div>
          ) : null}
          {rule ? (
            <div className="notice view-patterns-rule-note">
              <strong>
                <ResearchInline text={rule.name} />
              </strong>
              <div className="view-patterns-prose">
                {rule.text ? (
                  <p className="view-patterns-text">
                    <ResearchInline text={rule.text} />
                  </p>
                ) : null}
                {rule.applyTo ? (
                  <p className="view-patterns-text">
                    <span className="view-patterns-key">Apply to</span>{' '}
                    <ResearchInline text={rule.applyTo} />
                  </p>
                ) : null}
              </div>
              {rule.hits.length === 0 ? (
                <span className="view-patterns-key">
                  Not tied to specific files — applies broadly
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="view-patterns-grid">
            <div className="view-patterns-areas">
              {map.areas.map((area) => (
                <div key={area.label} className="view-patterns-area">
                  <p className="view-patterns-label">
                    {area.label} <span className="view-patterns-count">{area.rows.length}</span>
                  </p>
                  <ul className="view-patterns-rows">
                    {area.rows.map((row) => (
                      <RowButton
                        key={row.id}
                        row={row}
                        selected={row.id === selected.id}
                        dim={rule !== null && !hits.has(row.id)}
                        onSelect={() => setSelectedId(row.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Panel
              row={selected}
              rules={map.rules}
              pickedRule={pickedRule}
              onPickRule={toggleRule}
              moreOpen={expanded.has(selected.id)}
              onToggleMore={() => toggleMore(selected.id)}
            />
          </div>
        </section>
        {map.backMatter.length > 0 ? (
          <section id="pattern-back-matter" className="view-block view-patterns-back">
            {map.backMatter.map((entry) => (
              <details key={entry.id}>
                <summary>
                  {entry.heading} <span className="view-patterns-count">{entry.count}</span>
                </summary>
                <div className="view-patterns-prose">
                  <ResearchBlocks blocks={entry.blocks} />
                </div>
              </details>
            ))}
          </section>
        ) : null}
        {map.sourceOnly.length > 0 ? (
          <nav
            id="pattern-source-only"
            className="view-block view-patterns-source-only"
            aria-label="In the source only"
          >
            <span className="view-patterns-key">In the source only</span>
            <ul>
              {map.sourceOnly.map((entry) => (
                <li key={entry.label}>
                  <button
                    type="button"
                    className="status-chip"
                    onClick={() => onShowSource(entry.targetId)}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
    </div>
  );
}
