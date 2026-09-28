// The RESEARCH briefing's React surface (quick-260929-3x3, sketch-008 A): the cover facts, the
// summary + recommendation, the chapters, back matter and the "In the source only" strip.
// Every string derived from the document renders only through `ResearchInline` (tokenizeInline
// output mapped to React text/code/strong/em nodes, plus the V/C/A evidence markers) — never
// React's raw-HTML injection prop (T-3x3-01). Colour comes only from the shared tones on `.status-chip`
// and the theme tokens; the parse-degradation tones never appear on document content.
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import { tokenizeInline } from './inline-markdown.ts';
import type { InlineToken } from './inline-markdown.ts';
import type { ComposedResearchBriefing, ComposedResearchIntro } from './research-briefing.ts';
import { DocumentOutline } from '../components/document-outline.tsx';
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
              <ResearchInline text={intro.validUntil} />
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
            </aside>
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
