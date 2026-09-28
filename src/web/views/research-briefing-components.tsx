// The RESEARCH briefing's React surface (quick-260929-3x3, sketch-008 A): the cover facts, the
// summary + recommendation, the chapters, back matter and the "In the source only" strip.
// Every string derived from the document renders only through `ResearchInline` (tokenizeInline
// output mapped to React text/code/strong/em nodes, plus the V/C/A evidence markers) — never
// React's raw-HTML injection prop (T-3x3-01). Colour comes only from the shared tones on `.status-chip`
// and the theme tokens; the parse-degradation tones never appear on document content.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import { tokenizeInline } from './inline-markdown.ts';
import type { InlineToken } from './inline-markdown.ts';
import { splitSourceLinks } from './research-briefing.ts';
import type {
  ComposedArchitecture,
  ComposedAudit,
  ComposedBackRow,
  ComposedChapter,
  ComposedEnvironment,
  ComposedPitfall,
  ComposedPitfalls,
  ComposedQuestions,
  ComposedResearchBriefing,
  ComposedResearchIntro,
  ComposedSources,
  ComposedStack,
  ResearchTone,
  LaneApprovedItem,
  LaneFlaggedItem,
} from './research-briefing.ts';
import { DocumentOutline } from '../components/document-outline.tsx';
import { FigureFrame } from '../components/figure-frame.tsx';
import { LiftedDiagram, PlainDiagram } from '../components/lifted-diagram.tsx';
import { CleanTree } from '../components/clean-tree.tsx';
import { useActiveSection } from '../components/use-active-section.ts';

// ---------------------------------------------------------------------------
// Inline rendering, with the [VERIFIED] / [CITED] / [ASSUMED] evidence markers (S-12)
// ---------------------------------------------------------------------------

type EvidenceKind = 'verified' | 'cited' | 'assumed';

interface EvidenceTag {
  kind: EvidenceKind;
  detail: string;
}

const EVIDENCE_LETTER: Record<EvidenceKind, string> = { verified: 'V', cited: 'C', assumed: 'A' };
const EVIDENCE_TAG_RE = /\[(VERIFIED|CITED|ASSUMED)(?:\s*[:—–-]\s*([^\]]{0,400}))?\]/y;
// Private-use sentinels: they never occur in prose, and unlike C0 controls they satisfy no-control-regex.
const MARK_OPEN = '\uE000';
const MARK_CLOSE = '\uE001';
const MARK_SPLIT_RE = /(\uE000\d{1,4}\uE001)/;
const MARK_RE = /^\uE000(\d{1,4})\uE001$/;

/** Replaces every evidence tag outside a code span with a numbered placeholder (the tag itself may
 * contain backticks — `[VERIFIED: \`src/x.ts:1\`]` — so it is consumed whole, before the code-span
 * scan sees them). One left-to-right pass, no whole-text regex backtracking. */
function extractEvidence(text: string): { text: string; tags: EvidenceTag[] } {
  const tags: EvidenceTag[] = [];
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '[' && (text.startsWith('[VERIFIED', i) || text.startsWith('[CITED', i) || text.startsWith('[ASSUMED', i))) {
      EVIDENCE_TAG_RE.lastIndex = i;
      const match = EVIDENCE_TAG_RE.exec(text);
      if (match) {
        tags.push({
          kind: match[1].toLowerCase() as EvidenceKind,
          detail: (match[2] ?? '').replace(/`/g, '').trim(),
        });
        out += `${MARK_OPEN}${tags.length - 1}${MARK_CLOSE}`;
        i += match[0].length;
        continue;
      }
    }
    if (ch === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        out += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return { text: out, tags };
}

function EvidenceMarker({ tag }: { tag: EvidenceTag }): React.JSX.Element {
  const label = tag.detail === '' ? tag.kind : `${tag.kind}: ${tag.detail}`;
  return (
    <sup className="view-research-evidence" data-evidence={tag.kind} title={label} aria-label={label}>
      {EVIDENCE_LETTER[tag.kind]}
    </sup>
  );
}

function TextWithEvidence({ value, tags }: { value: string; tags: EvidenceTag[] }): React.JSX.Element {
  if (tags.length === 0 || !value.includes(MARK_OPEN)) return <>{value}</>;
  return (
    <>
      {value.split(MARK_SPLIT_RE).map((part, index) => {
        const mark = MARK_RE.exec(part);
        if (!mark) return part === '' ? null : <Fragment key={index}>{part}</Fragment>;
        const tag = tags[Number(mark[1])];
        return tag ? <EvidenceMarker key={index} tag={tag} /> : null;
      })}
    </>
  );
}

function InlineTokens({ tokens, tags }: { tokens: InlineToken[]; tags: EvidenceTag[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'strong') {
          return (
            <strong key={key}>
              <InlineTokens tokens={token.value} tags={tags} />
            </strong>
          );
        }
        if (token.type === 'em') {
          return (
            <em key={key}>
              <InlineTokens tokens={token.value} tags={tags} />
            </em>
          );
        }
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <TextWithEvidence key={key} value={token.value} tags={tags} />;
      })}
    </>
  );
}

/** Renders `text` as tokenized inline markdown with V/C/A evidence markers — the only path any
 * briefing string reaches the DOM through (T-3x3-01). A `D-NN` mention stays plain text. */
export function ResearchInline({ text }: { text: string }): React.JSX.Element {
  const { text: cleaned, tags } = useMemo(() => extractEvidence(text), [text]);
  const tokens = useMemo(() => tokenizeInline(cleaned), [cleaned]);
  return <InlineTokens tokens={tokens} tags={tags} />;
}

/** paragraph / list / table / code — every string through `ResearchInline`. */
export function ResearchBlocks({ blocks }: { blocks: Block[] }): React.JSX.Element {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.kind === 'paragraph') {
          return (
            <p key={key} className="view-research-text">
              <ResearchInline text={block.text} />
            </p>
          );
        }
        if (block.kind === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={key} className="view-research-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <ResearchInline text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.kind === 'table') {
          const headers = block.rows.length > 0 ? Object.keys(block.rows[0]) : [];
          return (
            <div key={key} className="document-overflow-boundary">
              <table className="view-research-table">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {headers.map((header) => (
                        <td key={header}>
                          <ResearchInline text={row[header] ?? ''} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <pre key={key}>
            <code>{block.text}</code>
          </pre>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Intro meta — the cover's facts line, the confidence breakdown, the quiet Domain caption
// ---------------------------------------------------------------------------

export function ResearchIntroMeta({ intro }: { intro: ComposedResearchIntro }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { confidence } = intro;
  const showBreakdown = open && confidence !== null;
  return (
    <>
      <span className="view-research-facts">
        {intro.researched ? (
          <span>
            Researched <b>{intro.researched}</b>
          </span>
        ) : null}
        {confidence ? (
          <button
            type="button"
            className="status-chip view-research-confidence"
            data-tone={confidence.tone}
            aria-expanded={open}
            aria-controls="research-confidence"
            onClick={() => setOpen((previous) => !previous)}
          >
            {confidence.label} confidence
            <ChevronDown className="view-research-confidence-chevron" aria-hidden="true" />
          </button>
        ) : null}
        {intro.validUntilShort ? (
          <span>
            Valid until <b>{intro.validUntilShort}</b>
          </span>
        ) : null}
      </span>
      {showBreakdown && confidence ? (
        <div id="research-confidence" className="view-research-breakdown">
          <p className="view-research-breakdown-note">
            <ResearchInline text={confidence.raw} />
          </p>
          {confidence.rows.length === 0 && confidence.text ? (
            <p className="view-research-breakdown-note">
              <ResearchInline text={confidence.text} />
            </p>
          ) : null}
          {confidence.rows.map((row, index) => (
            <div key={`${row.area}-${index}`} className="view-research-breakdown-row">
              <span className="view-research-breakdown-area">{row.area}</span>
              <span>
                {row.label ? (
                  <span className="status-chip" data-tone={row.tone}>
                    {row.label}
                  </span>
                ) : null}
              </span>
              <span className="view-research-breakdown-note">
                <ResearchInline text={row.note} />
              </span>
            </div>
          ))}
          {intro.validUntil ? (
            <p className="view-research-valid">
              <span className="view-research-key">Valid until</span>
              <span>
                <ResearchInline text={intro.validUntil} />
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {intro.domain ? (
        <p className="view-research-domain">
          <span className="view-research-key">Domain</span>
          <ResearchInline text={intro.domain} />
        </p>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

function ChapterHeading({ chapter }: { chapter: ComposedChapter }): React.JSX.Element {
  return (
    <header className="section-heading">
      <h2>
        <span className="view-research-chapter-number">{chapter.number}</span>
        {chapter.title}
      </h2>
    </header>
  );
}

/** A small uppercase sub-block label with an optional count (`Core 6`). */
function ChapterLabel({
  children,
  count,
  accent = false,
}: {
  children: React.ReactNode;
  count?: number;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <p className="view-research-label" data-accent={accent ? 'true' : undefined}>
      {children}
      {count !== undefined ? <span className="view-research-count">{count}</span> : null}
    </p>
  );
}

function ArchitectureChapter({
  chapter,
  onShowSource,
}: {
  chapter: ComposedArchitecture;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<'patterns' | 'anti'>('patterns');
  const { diagram, structure, patterns, antiPatterns, handRoll } = chapter;
  const showAnti = patterns.length === 0 && antiPatterns.length > 0 ? true : mode === 'anti';
  const both = patterns.length > 0 && antiPatterns.length > 0;
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      {diagram ? (
        <FigureFrame
          title="System architecture"
          caption={diagram.caption.length > 0 ? <ResearchBlocks blocks={diagram.caption} /> : undefined}
        >
          {(fit) => (diagram.lifted ? <LiftedDiagram text={diagram.text} fit={fit} /> : <PlainDiagram text={diagram.text} />)}
        </FigureFrame>
      ) : null}
      {structure ? (
        <div className="view-research-sub">
          <ChapterLabel>Directory structure</ChapterLabel>
          {structure.isTree ? (
            <CleanTree text={structure.text} />
          ) : (
            <FigureFrame title="Directory structure">{() => <PlainDiagram text={structure.text} />}</FigureFrame>
          )}
          {structure.notes.length > 0 ? (
            <div className="view-research-note">
              <ResearchBlocks blocks={structure.notes} />
            </div>
          ) : null}
        </div>
      ) : null}
      {patterns.length > 0 || antiPatterns.length > 0 ? (
        <div className="view-research-sub">
          {both ? (
            <div className="view-research-segmented" role="group" aria-label="Patterns or anti-patterns">
              <button type="button" aria-pressed={!showAnti} onClick={() => setMode('patterns')}>
                Patterns {patterns.length}
              </button>
              <button type="button" aria-pressed={showAnti} onClick={() => setMode('anti')}>
                Anti-patterns {antiPatterns.length}
              </button>
            </div>
          ) : (
            <ChapterLabel count={showAnti ? antiPatterns.length : patterns.length}>
              {showAnti ? 'Anti-patterns' : 'Patterns'}
            </ChapterLabel>
          )}
          {showAnti ? (
            <ol className="view-research-patterns" data-kind="anti">
              {antiPatterns.map((entry, index) => (
                <li key={index}>
                  <div>
                    <span className="view-research-pattern-title">
                      <ResearchInline text={entry.lead} />
                    </span>
                    {entry.rest !== '' ? (
                      <span className="view-research-pattern-what">
                        <ResearchInline text={entry.rest} />
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="view-research-patterns" data-kind="patterns">
              {patterns.map((pattern, index) => (
                <li key={index}>
                  <div>
                    <span className="view-research-pattern-title">
                      <ResearchInline text={pattern.title} />
                    </span>
                    {pattern.what !== '' ? (
                      <span className="view-research-pattern-what">
                        <ResearchInline text={pattern.what} />
                      </span>
                    ) : null}
                    {pattern.when ? (
                      <span className="view-research-pattern-when">
                        <span className="view-research-key">Use when</span>
                        <ResearchInline text={pattern.when} />
                      </span>
                    ) : null}
                    {pattern.sourceTarget ? (
                      <button
                        type="button"
                        className="view-research-link"
                        onClick={() => onShowSource(pattern.sourceTarget)}
                      >
                        source
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
      {handRoll ? (
        <div className="view-research-sub">
          <ChapterLabel count={handRoll.rows.length}>Don&apos;t hand-roll</ChapterLabel>
          {handRoll.rows.length > 0 ? (
            <ul className="view-research-handroll">
              {handRoll.rows.map((row, index) => (
                <li key={index}>
                  <span className="view-research-handroll-problem">
                    <ResearchInline text={row.problem} />
                  </span>
                  <span className="view-research-handroll-dont">
                    <ResearchInline text={row.dont} />
                  </span>
                  <span className="view-research-handroll-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="view-research-handroll-use">
                    <ResearchInline text={row.use} />
                  </span>
                  {row.why !== '' ? (
                    <span className="view-research-handroll-why">
                      <ResearchInline text={row.why} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {handRoll.insight ? (
            <p className="view-research-insight">
              <span className="view-research-key">Key insight</span>
              <ResearchInline text={handRoll.insight} />
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// --- jump (At a glance) -----------------------------------------------------------------------

/** Scrolls to a chapter and focuses it: the pending id lives in a ref and is cleared only when the
 * frame callback fires, so a re-run of the effect (StrictMode) still lands on it. */
function useChapterJump(): (id: string) => void {
  const pending = useRef<string | null>(null);
  const [tick, setTick] = useState(0);
  const jump = useCallback((id: string) => {
    pending.current = id;
    setTick((previous) => previous + 1);
  }, []);
  useEffect(() => {
    if (pending.current === null) return;
    const frame = window.requestAnimationFrame(() => {
      const id = pending.current;
      pending.current = null;
      if (id === null) return;
      const element = document.getElementById(id);
      if (!element) return;
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      element.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tick]);
  return jump;
}

function Chip({ label, tone }: { label: string; tone: ResearchTone }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={tone}>
      {label}
    </span>
  );
}

// --- 01 Standard stack + Package legitimacy (sketch 010 B: lanes by verdict) ----------------------

const LANE_CAP = 4;

function Lane<T>({
  verdict,
  title,
  count,
  noun,
  items,
  note,
  render,
  after,
}: {
  verdict: 'slop' | 'sus' | 'ok';
  title: string;
  count: number;
  noun: string;
  items: T[];
  note?: string | null;
  render: (shown: T[]) => React.ReactNode;
  after?: React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, LANE_CAP);
  const more = items.length - LANE_CAP;
  return (
    <section className="view-research-lane" data-verdict={verdict}>
      <div className="view-research-lane-head">
        <span className="view-research-lane-title">{title}</span>
        <span className="view-research-lane-count">{count}</span>
      </div>
      {note ? (
        <p className="view-research-lane-note">
          <ResearchInline text={note} />
        </p>
      ) : null}
      {items.length === 0 ? <p className="view-research-lane-empty">None.</p> : render(shown)}
      {more > 0 ? (
        <button
          type="button"
          className="view-research-lane-more"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? 'Show fewer' : `Show ${more} more ${noun}`}
        </button>
      ) : null}
      {after}
    </section>
  );
}

function Signals({ item }: { item: LaneFlaggedItem }): React.JSX.Element {
  return (
    <span className="view-research-signals">
      {item.signals.map((signal) => (
        <span
          key={signal.label}
          className="view-research-signal"
          data-bad={signal.bad ? 'true' : undefined}
        >
          {signal.label === 'age' || signal.label === 'rule' ? (
            <>
              {signal.label} <b>{signal.value}</b>
            </>
          ) : (
            signal.value
          )}
        </span>
      ))}
    </span>
  );
}

function FlaggedItems({ items, struck }: { items: LaneFlaggedItem[]; struck: boolean }): React.JSX.Element {
  return (
    <ul className="view-research-lane-items">
      {items.map((item) => (
        <li key={item.name}>
          <span className="view-research-lane-name" data-struck={struck ? 'true' : undefined}>
            {item.name}
          </span>
          <Signals item={item} />
          {item.reason ? (
            <span className="view-research-lane-why">
              <ResearchInline text={item.reason} />
            </span>
          ) : null}
          {item.replacement ? (
            <span className="view-research-lane-why">
              <span className="view-research-key">Replaced by</span> <ResearchInline text={item.replacement} />
            </span>
          ) : null}
          {item.disposition ? (
            <span className="view-research-lane-why">
              <ResearchInline text={item.disposition} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ApprovedItems({ items }: { items: LaneApprovedItem[] }): React.JSX.Element {
  return (
    <div className="view-research-approved-list">
      {items.map((item) => (
        <span
          key={item.name}
          className="view-research-approved"
          data-dashed={item.dashed ? 'true' : undefined}
          title={item.disposition}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
}

function AuditBlock({ audit }: { audit: ComposedAudit }): React.JSX.Element {
  const [tableOpen, setTableOpen] = useState(false);
  const { lanes } = audit;
  const dashed = lanes ? lanes.ok.items.filter((item) => item.dashed) : [];
  return (
    <div className="view-research-sub">
      <ChapterLabel>Package legitimacy</ChapterLabel>
      {audit.intro.map((line, index) => (
        <p key={index} className="view-research-note">
          <ResearchInline text={line} />
        </p>
      ))}
      {lanes ? (
        <div className="view-research-lanes">
          <Lane
            verdict="slop"
            title="Removed · slop"
            count={lanes.slop.count}
            noun="removed"
            items={lanes.slop.items}
            render={(shown) => <FlaggedItems items={shown} struck />}
          />
          <Lane
            verdict="sus"
            title="Flagged · suspicious"
            count={lanes.sus.count}
            noun="flagged"
            items={lanes.sus.items}
            note={lanes.sus.count > 0 ? audit.susNote : null}
            render={(shown) => <FlaggedItems items={shown} struck={false} />}
          />
          <Lane
            verdict="ok"
            title="Approved"
            count={lanes.ok.count}
            noun="approved"
            items={lanes.ok.items}
            render={(shown) => <ApprovedItems items={shown} />}
            after={
              dashed.length > 0 ? (
                <ul className="view-research-lane-items view-research-approved-notes">
                  {dashed.map((item) => (
                    <li key={item.name}>
                      <span className="view-research-lane-name">{item.name}</span>
                      <span className="view-research-lane-why">{item.disposition}</span>
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
        </div>
      ) : (
        (audit.prose ?? []).map((line, index) => (
          <p key={index} className="view-research-note">
            <ResearchInline text={line} />
          </p>
        ))
      )}
      {audit.extraNotes.map((note, index) => (
        <p key={index} className="view-research-note">
          <ResearchInline text={note} />
        </p>
      ))}
      {lanes && audit.seamRows.length > 0 ? (
        <div>
          <button
            type="button"
            className="view-research-link"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((previous) => !previous)}
          >
            {tableOpen ? 'Hide' : 'Show'} the seam table ({audit.seamRows.length} rows)
          </button>
          {tableOpen ? (
            <div className="document-overflow-boundary">
              <table className="view-research-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Registry</th>
                    <th>Age</th>
                    <th>Downloads</th>
                    <th>Source repo</th>
                    <th>Verdict</th>
                    <th>Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.seamRows.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <code>{row.name}</code>
                      </td>
                      <td>{row.registry}</td>
                      <td>{row.age}</td>
                      <td>{row.downloads}</td>
                      <td>{row.repo}</td>
                      <td>
                        <Chip label={row.verdict} tone={row.verdictTone} />
                        {row.rule ? <span className="view-research-key"> {row.rule}</span> : null}
                      </td>
                      <td>{row.disposition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StackChapter({ chapter }: { chapter: ComposedStack }): React.JSX.Element {
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      {chapter.intro.length > 0 ? (
        <div className="view-research-note">
          <ResearchBlocks blocks={chapter.intro} />
        </div>
      ) : null}
      {chapter.groups.map((group, groupIndex) => (
        <div key={`${group.label}-${groupIndex}`} className="view-research-sub">
          <ChapterLabel count={group.packages.length} accent={group.kind === 'core'}>
            {group.label}
          </ChapterLabel>
          <ul className="view-research-packages">
            {group.packages.map((pkg, index) => (
              <li key={`${pkg.name}-${index}`} className="view-research-package">
                <div className="view-research-package-id">
                  <span className="view-research-package-name">{pkg.name}</span>
                  <span className="view-research-package-version">
                    {pkg.version}
                    {pkg.date ? ` · ${pkg.date}` : ''}
                    {pkg.badges.map((badge) => (
                      <Chip key={badge.label} label={badge.label} tone={badge.tone} />
                    ))}
                  </span>
                </div>
                <div>
                  {pkg.purpose !== '' ? (
                    <div className="view-research-package-purpose">
                      <ResearchInline text={pkg.purpose} />
                    </div>
                  ) : null}
                  {pkg.why !== '' ? (
                    <div className="view-research-package-why">
                      <ResearchInline text={pkg.why} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {group.notes.length > 0 ? (
            <div className="view-research-note">
              <ResearchBlocks blocks={group.notes} />
            </div>
          ) : null}
        </div>
      ))}
      {chapter.alternatives.length > 0 ? (
        <div className="view-research-sub">
          <ChapterLabel count={chapter.alternatives.length}>Alternatives considered</ChapterLabel>
          <ul className="view-research-alts">
            {chapter.alternatives.map((alt, index) => (
              <li key={index} className="view-research-alt" data-verdict={alt.verdict}>
                <span className="view-research-alt-chosen">
                  <ResearchInline text={alt.chosen} />
                </span>
                <span className="view-research-alt-over">over</span>
                <span className="view-research-alt-other" data-struck={alt.struck ? 'true' : undefined}>
                  <span>
                    <ResearchInline text={alt.other} />
                  </span>
                  <Chip label={alt.verdictLabel} tone={alt.tone} />
                </span>
                {alt.tradeoff !== '' ? (
                  <span className="view-research-alt-trade">
                    <ResearchInline text={alt.tradeoff} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {chapter.audit ? <AuditBlock audit={chapter.audit} /> : null}
    </section>
  );
}

// --- 03 Common pitfalls -----------------------------------------------------------------------

function PitfallCard({ pitfall }: { pitfall: ComposedPitfall }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const expandable = pitfall.more.length > 0;
  const head = (
    <>
      <span className="view-research-pitfall-number">{pitfall.number}</span>
      <span className="view-research-pitfall-title">
        <ResearchInline text={pitfall.title} />
      </span>
      <span className="view-research-pitfall-tags">
        {pitfall.chips.map((chip) => (
          <Chip key={chip.label} label={chip.label} tone={chip.tone} />
        ))}
        {expandable ? <ChevronDown className="view-research-pitfall-chevron" aria-hidden="true" /> : null}
      </span>
    </>
  );
  return (
    <li id={pitfall.id} className="view-research-pitfall" data-severity={pitfall.severity ?? ''}>
      {expandable ? (
        <button
          type="button"
          className="view-research-pitfall-head"
          aria-expanded={open}
          aria-controls={`${pitfall.id}-more`}
          onClick={() => setOpen((previous) => !previous)}
        >
          {head}
        </button>
      ) : (
        <div className="view-research-pitfall-head">{head}</div>
      )}
      {pitfall.visible ? (
        <p className="view-research-pitfall-what">
          <ResearchInline text={pitfall.visible.text} />
        </p>
      ) : null}
      {open && expandable ? (
        <div id={`${pitfall.id}-more`} className="view-research-pitfall-more">
          {pitfall.more.map((row, index) => (
            <div key={index} className="view-research-pitfall-row">
              <span className="view-research-key">{row.label ?? 'Note'}</span>
              <span>
                <ResearchInline text={row.text} />
                {row.code.map((code, codeIndex) => (
                  <pre key={codeIndex}>
                    <code>{code}</code>
                  </pre>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function PitfallsChapter({ chapter }: { chapter: ComposedPitfalls }): React.JSX.Element {
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      <ol className="view-research-pitfalls">
        {chapter.pitfalls.map((pitfall) => (
          <PitfallCard key={pitfall.id} pitfall={pitfall} />
        ))}
      </ol>
    </section>
  );
}

// --- 04 Open questions | 05 Environment -----------------------------------------------------------

function QuestionRow({ item }: { item: ComposedQuestions['items'][number] }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const expandable = item.body.length > 0;
  return (
    <li id={item.id} className="view-research-question" data-resolved={item.resolved ? 'true' : 'false'}>
      <span className="view-research-question-number">{item.number}</span>
      <span className="view-research-question-title">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${item.id}-body`}
            onClick={() => setOpen((previous) => !previous)}
          >
            <ResearchInline text={item.title} />
          </button>
        ) : (
          <span>
            <ResearchInline text={item.title} />
          </span>
        )}
        <Chip label={item.chip.label} tone={item.chip.tone} />
      </span>
      {open && expandable ? (
        <div id={`${item.id}-body`} className="view-research-question-body">
          <ResearchBlocks blocks={item.body} />
        </div>
      ) : null}
    </li>
  );
}

function QuestionsChapter({ chapter }: { chapter: ComposedQuestions }): React.JSX.Element {
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      {chapter.lead.length > 0 ? (
        <div className="view-research-note">
          <ResearchBlocks blocks={chapter.lead} />
        </div>
      ) : null}
      <ol className="view-research-questions">
        {chapter.items.map((item) => (
          <QuestionRow key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}

function EnvironmentChapter({ chapter }: { chapter: ComposedEnvironment }): React.JSX.Element {
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      {chapter.rows.length > 0 ? (
        <div className="document-overflow-boundary">
          <table className="view-research-table view-research-env">
            <thead>
              <tr>
                <th>Dependency</th>
                <th>Required by</th>
                <th>
                  <span className="sr-only">Available</span>
                </th>
                <th>Version</th>
                <th>Fallback</th>
              </tr>
            </thead>
            <tbody>
              {chapter.rows.map((row, index) => (
                <tr key={index} data-blocking={row.blocking ? 'true' : 'false'}>
                  <td>
                    <ResearchInline text={row.dependency} />
                  </td>
                  <td className="view-research-env-muted">
                    <ResearchInline text={row.requiredBy} />
                  </td>
                  <td>
                    <span className="view-research-available" data-available={row.available}>
                      {row.available === 'yes' ? '✓' : row.available === 'no' ? '✗' : row.availableText}
                    </span>
                  </td>
                  <td className="view-research-env-muted">
                    <ResearchInline text={row.version} />
                  </td>
                  <td>
                    {row.blocking ? <Chip label="blocking" tone="missing" /> : null}
                    {row.fallbackRest !== '' ? (
                      <>
                        {row.blocking ? ' ' : ''}
                        <ResearchInline text={row.fallbackRest} />
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {chapter.notes.length > 0 ? (
        <div className="view-research-note">
          <ResearchBlocks blocks={chapter.notes} />
        </div>
      ) : null}
      {chapter.prose.length > 0 ? (
        <div className="view-research-note">
          <ResearchBlocks blocks={chapter.prose} />
        </div>
      ) : null}
    </section>
  );
}

// --- 06 Sources -------------------------------------------------------------------------------

function SourceItem({ text }: { text: string }): React.JSX.Element {
  return (
    <>
      {splitSourceLinks(text).map((part, index) =>
        part.type === 'link' ? (
          <a
            key={index}
            className="source-link"
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.label}
          </a>
        ) : (
          <ResearchInline key={index} text={part.text} />
        ),
      )}
    </>
  );
}

function SourcesChapter({ chapter }: { chapter: ComposedSources }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <section id={chapter.id} className="view-block view-research-chapter" tabIndex={-1}>
      <ChapterHeading chapter={chapter} />
      {open ? (
        <div className="view-research-sources">
          {chapter.tiers.map((tier) => (
            <div key={tier.tier} className="view-research-source-tier" data-tier={tier.tier}>
              <ChapterLabel count={tier.items.length}>{tier.label}</ChapterLabel>
              <ul>
                {tier.items.map((item, index) => (
                  <li key={index}>
                    <SourceItem text={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button
            type="button"
            className="view-research-sources-toggle"
            aria-expanded="true"
            onClick={() => setOpen(false)}
          >
            Collapse
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="view-research-sources-toggle"
          aria-expanded="false"
          onClick={() => setOpen(true)}
        >
          {chapter.summary} — show all
        </button>
      )}
    </section>
  );
}

// --- back matter --------------------------------------------------------------------------------

function BackRow({ row }: { row: ComposedBackRow }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const bodyId = `${row.id}-body`;
  return (
    <div className="view-research-back-row" id={row.id}>
      <button
        type="button"
        className="view-research-back-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="view-research-back-title">{row.title}</span>
        <span className="view-research-back-summary">{row.summary}</span>
        <ChevronDown className="view-research-back-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div id={bodyId} className="view-research-back-body">
          {row.kind === 'table' ? (
            <ResearchBlocks blocks={[{ kind: 'table', rows: row.rows }]} />
          ) : (
            <>
              {row.contextUrl && row.contextName ? (
                <p className="view-research-note">
                  Copied from <Link to={row.contextUrl}>{row.contextName}</Link> — open it for the decision text.
                </p>
              ) : null}
              {row.groups.length > 0 ? (
                <div>
                  <ChapterLabel count={row.lockedCount}>Locked decisions</ChapterLabel>
                  {row.groups.map((group, index) => (
                    <div key={index} className="view-research-back-group">
                      {group.group ? <span className="view-research-back-group-name">{group.group}</span> : null}
                      <span className="view-research-ids">
                        {group.ids.map((decision) =>
                          decision.href ? (
                            <Link key={decision.id} className="view-research-id" to={decision.href}>
                              {decision.id}
                            </Link>
                          ) : (
                            <span key={decision.id} className="view-research-id">
                              {decision.id}
                            </span>
                          ),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {row.discretion.length > 0 ? (
                <div>
                  <ChapterLabel count={row.discretion.length}>Claude&apos;s discretion</ChapterLabel>
                  <ul className="view-research-plain-list">
                    {row.discretion.map((item, index) => (
                      <li key={index}>
                        <ResearchInline text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {row.deferred.length > 0 ? (
                <div>
                  <ChapterLabel>Deferred</ChapterLabel>
                  <ul className="view-research-plain-list">
                    {row.deferred.map((item, index) => (
                      <li key={index}>
                        <ResearchInline text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ChapterView({
  chapter,
  onShowSource,
}: {
  chapter: ComposedChapter;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  switch (chapter.kind) {
    case 'architecture':
      return <ArchitectureChapter chapter={chapter} onShowSource={onShowSource} />;
    case 'stack':
      return <StackChapter chapter={chapter} />;
    case 'pitfalls':
      return <PitfallsChapter chapter={chapter} />;
    case 'questions':
      return <QuestionsChapter chapter={chapter} />;
    case 'environment':
      return <EnvironmentChapter chapter={chapter} />;
    case 'sources':
      return <SourcesChapter chapter={chapter} />;
  }
}

// ---------------------------------------------------------------------------
// ResearchBriefingView
// ---------------------------------------------------------------------------

export function ResearchBriefingView({
  briefing,
  onShowSource,
  title,
}: {
  briefing: ComposedResearchBriefing;
  onShowSource: (id: string | null) => void;
  title: string;
}): React.JSX.Element {
  const entries = briefing.outline.length < 2 ? [] : briefing.outline;
  const activeId = useActiveSection(entries.map((entry) => entry.id));
  const { summary } = briefing;
  const jump = useChapterJump();
  const blocks: React.ReactNode[] = [];
  for (let index = 0; index < briefing.chapters.length; index++) {
    const chapter = briefing.chapters[index];
    const next = briefing.chapters[index + 1];
    if (chapter.kind === 'questions' && next?.kind === 'environment') {
      blocks.push(
        <div key={`${chapter.id}-pair`} className="view-research-pair">
          <ChapterView chapter={chapter} onShowSource={onShowSource} />
          <ChapterView chapter={next} onShowSource={onShowSource} />
        </div>,
      );
      index += 1;
      continue;
    }
    blocks.push(<ChapterView key={chapter.id} chapter={chapter} onShowSource={onShowSource} />);
  }
  return (
    <div className="document-reader-layout" data-outline={entries.length > 0 ? 'true' : 'false'}>
      <DocumentOutline entries={entries} activeId={activeId} />
      <article className="document-canvas" aria-label={`${title} document`}>
        {summary ? (
          <section id="research-summary" className="view-block view-research-summary">
            <div className="view-research-summary-text">
              {briefing.intro.preamble.length > 0 ? (
                <div className="view-research-note">
                  <ResearchBlocks blocks={briefing.intro.preamble} />
                </div>
              ) : null}
              {summary.lead !== '' ? (
                <p className="view-research-lead">
                  <ResearchInline text={summary.lead} />
                </p>
              ) : null}
              {summary.rest.length > 0 ? (
                <div className="view-research-rest">
                  <ResearchBlocks blocks={summary.rest} />
                </div>
              ) : null}
            </div>
            <aside className="view-research-aside">
              {summary.recommendation ? (
                <div className="view-research-recommendation">
                  <span className="eyebrow">Primary recommendation</span>
                  <p>
                    <ResearchInline text={summary.recommendation} />
                  </p>
                </div>
              ) : null}
              {briefing.glance.length > 0 ? (
                <div className="view-research-glance">
                  <ChapterLabel>At a glance</ChapterLabel>
                  {briefing.glance.map((row) => (
                    <button
                      key={row.targetId}
                      type="button"
                      className="view-research-glance-row"
                      onClick={() => jump(row.targetId)}
                    >
                      <span>{row.label}</span>
                      <b>
                        {row.value}
                        {row.sub ? <span className="view-research-glance-sub">{row.sub}</span> : null}
                      </b>
                    </button>
                  ))}
                </div>
              ) : null}
            </aside>
          </section>
        ) : null}
        {blocks}
        {briefing.backMatter.length > 0 ? (
          <section id="research-back-matter" className="view-block view-research-back">
            <ChapterLabel>Back matter</ChapterLabel>
            <div className="view-research-back-rows">
              {briefing.backMatter.map((row) => (
                <BackRow key={row.id} row={row} />
              ))}
            </div>
          </section>
        ) : null}
        {briefing.sourceOnly.length > 0 ? (
          <nav
            id="research-source-only"
            className="view-block view-research-source-only"
            aria-label="In the source only"
          >
            <span className="view-research-key">In the source only</span>
            <ul>
              {briefing.sourceOnly.map((entry, index) => (
                <li key={`${entry.label}-${index}`}>
                  <button type="button" onClick={() => onShowSource(entry.targetId)}>
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
