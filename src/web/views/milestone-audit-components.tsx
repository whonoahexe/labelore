// The milestone audit page's React surface (Phase 9, 09-14): the header override (eyebrow "Milestone audit",
// the milestone as the h1, then the verdict chip beside "Audited {date}" in the meta row) and the page body:
// Scores (a tile per key with a segmented bar), Gaps (Requirements, Integration, Flows - an empty group reads
// "No gaps"), Tech debt grouped by phase, the Nyquist chip row, every frontmatter key nothing above claimed, and
// the folded narrative. Every string is author text rendered as plain React text through
// ResearchInline - never React's raw-HTML injection prop - and no href is built from document text. The one
// place document markup reaches the page is the `narrative` slot, which the artifact page fills with the shared
// allow-listed document renderer. Colour comes only from the tone a composed model carries and the theme
// tokens; the parse-degradation tones never appear on document content (a failed gap or a verdict is document
// content, so it is `missing`, `in-flight` or `quiet`).
import { useState } from 'react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type {
  ComposedAuditDebt,
  ComposedAuditDebtGroup,
  ComposedAuditDebtItem,
  ComposedAuditExtra,
  ComposedAuditField,
  ComposedAuditGap,
  ComposedAuditGapGroup,
  ComposedAuditNyquist,
  ComposedAuditScore,
  ComposedMilestoneAudit,
} from './milestone-audit.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial
 * keeps TypeScript from flagging the intentional override. The breadcrumb row stays, and the manifest lead
 * is dropped (the verdict says what the page is for). */
export type AuditHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props. */
export function auditHeaderProps(model: ComposedMilestoneAudit, fallbackTitle: string): AuditHeaderProps {
  const { intro } = model;
  return {
    eyebrow: intro.eyebrow,
    title: intro.title ?? fallbackTitle,
    lead: null,
    meta: (
      <span className="view-milestone-audit-cover">
        <span className="status-chip view-milestone-audit-verdict" data-tone={intro.verdict.tone}>
          {intro.verdict.label}
        </span>
        {intro.audited !== null ? <span className="view-milestone-audit-audited">Audited {intro.audited}</span> : null}
      </span>
    ),
  };
}

/** A block of author text, clamped to 3 lines with an in-place "Read more" when it is long. */
function Clamped({ text, long, className }: { text: string; long: boolean; className: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const clamped = long && !open;
  return (
    <>
      <div className={className} data-clamped={clamped ? 'true' : 'false'}>
        <ResearchInline text={text} />
      </div>
      {long ? (
        <button
          type="button"
          className="view-milestone-audit-more"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </>
  );
}

/** Labelled rows as a definition list; a lone unlabelled row is just its value. */
function Fields({ fields }: { fields: ComposedAuditField[] }): React.JSX.Element | null {
  if (fields.length === 0) return null;
  if (fields.length === 1 && fields[0].label === '') {
    return <Clamped text={fields[0].value} long={fields[0].long} className="view-milestone-audit-text" />;
  }
  return (
    <dl className="view-milestone-audit-fields">
      {fields.map((field, index) => (
        <div className="view-milestone-audit-field" key={`${field.label}-${index}`}>
          <dt>{field.label === '' ? 'Value' : field.label}</dt>
          <dd>
            <Clamped text={field.value} long={field.long} className="view-milestone-audit-field-value" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

function ScoreTile({ score }: { score: ComposedAuditScore }): React.JSX.Element {
  return (
    <li className="view-milestone-audit-score" data-tone={score.tone}>
      <span className="view-milestone-audit-score-label">
        <i className="status-square" data-tone={score.tone} aria-hidden="true" />
        {score.label}
      </span>
      <span className="view-milestone-audit-score-value" data-read={score.read ? 'true' : 'false'}>
        {score.value}
      </span>
      {score.segments !== null ? (
        <span className="view-milestone-audit-segments" role="img" aria-label={`${score.label} ${score.value}`}>
          {score.segments.map((tone, index) => (
            <i key={index} data-tone={tone} />
          ))}
        </span>
      ) : score.fill !== null ? (
        <span className="view-milestone-audit-meter" role="img" aria-label={`${score.label} ${score.value}`}>
          <i data-tone={score.tone} style={{ width: `${score.fill}%` }} />
        </span>
      ) : null}
    </li>
  );
}

function ScoresSection({ scores }: { scores: ComposedAuditScore[] }): React.JSX.Element {
  return (
    <section className="view-milestone-audit-section" aria-label="Scores">
      <h2 className="view-milestone-audit-heading">Scores</h2>
      <ul className="view-milestone-audit-scores">
        {scores.map((score, index) => (
          <ScoreTile key={`${score.key}-${index}`} score={score} />
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

function GapRow({ gap }: { gap: ComposedAuditGap }): React.JSX.Element {
  return (
    <li className="view-milestone-audit-row" data-tone="missing">
      {gap.id !== null || gap.status !== null ? (
        <div className="view-milestone-audit-row-head">
          {gap.id !== null ? (
            <span className="view-milestone-audit-id" title={gap.id}>
              {gap.id}
            </span>
          ) : null}
          {gap.status !== null ? (
            <span className="status-chip" data-tone="quiet">
              {gap.status}
            </span>
          ) : null}
        </div>
      ) : null}
      {gap.text !== '' ? <Clamped text={gap.text} long={gap.long} className="view-milestone-audit-text" /> : null}
      {gap.evidence !== null ? (
        <Clamped text={gap.evidence} long={gap.evidenceLong} className="view-milestone-audit-evidence" />
      ) : null}
      <Fields fields={gap.fields} />
    </li>
  );
}

function GapGroup({ group }: { group: ComposedAuditGapGroup }): React.JSX.Element {
  return (
    <div className="view-milestone-audit-group">
      <h3 className="view-milestone-audit-group-head">
        <i className="status-square" data-tone={group.tone} aria-hidden="true" />
        <span className="view-milestone-audit-group-label" title={group.label}>
          {group.label}
        </span>
        <span className="view-milestone-audit-group-count">{group.count}</span>
      </h3>
      {group.emptyText !== null ? (
        <p className="view-milestone-audit-none" data-tone="complete">
          {group.emptyText}
        </p>
      ) : (
        <ul className="view-milestone-audit-rows">
          {group.items.map((gap, index) => (
            <GapRow key={`${gap.id ?? 'gap'}-${index}`} gap={gap} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GapsSection({ groups }: { groups: ComposedAuditGapGroup[] }): React.JSX.Element {
  return (
    <section className="view-milestone-audit-section" aria-label="Gaps">
      <h2 className="view-milestone-audit-heading">Gaps</h2>
      {groups.map((group, index) => (
        <GapGroup key={`${group.key}-${index}`} group={group} />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tech debt
// ---------------------------------------------------------------------------

function DebtRow({ item }: { item: ComposedAuditDebtItem }): React.JSX.Element {
  return (
    <li className="view-milestone-audit-row" data-tone={item.tone}>
      <div className="view-milestone-audit-row-head">
        <i className="status-square" data-tone={item.tone} aria-hidden="true" />
        {item.id !== null ? (
          <span className="view-milestone-audit-id" title={item.id}>
            {item.id}
          </span>
        ) : null}
        {item.status !== null ? (
          <span className="status-chip" data-tone={item.closed ? 'complete' : 'quiet'}>
            {item.status}
          </span>
        ) : null}
      </div>
      {item.text !== '' ? <Clamped text={item.text} long={item.long} className="view-milestone-audit-text" /> : null}
      <Fields fields={item.fields} />
    </li>
  );
}

function DebtGroup({ group }: { group: ComposedAuditDebtGroup }): React.JSX.Element {
  return (
    <div className="view-milestone-audit-group">
      <h3 className="view-milestone-audit-group-head">
        {group.number !== null ? <span className="view-milestone-audit-phase-number">{group.number}</span> : null}
        <span className="view-milestone-audit-group-label" title={group.phase}>
          {group.name}
        </span>
        <span className="view-milestone-audit-group-count">{group.count === 1 ? '1 item' : `${group.count} items`}</span>
      </h3>
      <ul className="view-milestone-audit-rows">
        {group.items.map((item, index) => (
          <DebtRow key={`${item.id ?? 'item'}-${index}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

function DebtSection({ debt }: { debt: ComposedAuditDebt }): React.JSX.Element {
  return (
    <section className="view-milestone-audit-section" aria-label="Tech debt">
      <h2 className="view-milestone-audit-heading">
        Tech debt
        <span className="view-milestone-audit-heading-count">{debt.heading}</span>
        {debt.closedNote !== null ? <span className="view-milestone-audit-heading-count">{debt.closedNote}</span> : null}
      </h2>
      {debt.groups.map((group, index) => (
        <DebtGroup key={`${group.phase}-${index}`} group={group} />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Nyquist and unclaimed keys
// ---------------------------------------------------------------------------

function NyquistSection({ nyquist }: { nyquist: ComposedAuditNyquist }): React.JSX.Element {
  return (
    <section className="view-milestone-audit-section" aria-label="Nyquist">
      <h2 className="view-milestone-audit-heading">Nyquist</h2>
      {nyquist.chips.length > 0 ? (
        <ul className="view-milestone-audit-chips">
          {nyquist.chips.map((chip) => (
            <li key={chip.key}>
              <span className="status-chip" data-tone={chip.tone}>
                {chip.label}
                <span className="view-milestone-audit-chip-phases">{chip.phases}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {nyquist.reason !== null ? (
        <p className="source-note view-milestone-audit-reason">
          <ResearchInline text={nyquist.reason} />
        </p>
      ) : null}
    </section>
  );
}

function ExtrasSection({ extras }: { extras: ComposedAuditExtra[] }): React.JSX.Element {
  return (
    <section className="view-milestone-audit-section" aria-label="Other frontmatter">
      <h2 className="view-milestone-audit-heading view-milestone-audit-heading-quiet">Other frontmatter</h2>
      {extras.map((extra, index) => (
        <div className="view-milestone-audit-group" key={`${extra.label}-${index}`}>
          <h3 className="view-milestone-audit-group-head">
            <span className="view-milestone-audit-group-label" title={extra.label}>
              {extra.label}
            </span>
          </h3>
          <Fields fields={extra.rows} />
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Narrative({ open, children }: { open: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <details className="artifact-metadata view-milestone-audit-narrative" open={open}>
      <summary>Audit narrative</summary>
      <div className="view-milestone-audit-narrative-body">{children}</div>
    </details>
  );
}

export function MilestoneAuditView({
  model,
  narrative,
}: {
  model: ComposedMilestoneAudit;
  narrative: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="view-milestone-audit-page">
      {model.scores !== null ? <ScoresSection scores={model.scores} /> : null}
      {model.gaps !== null ? <GapsSection groups={model.gaps} /> : null}
      {model.debt !== null ? <DebtSection debt={model.debt} /> : null}
      {model.nyquist !== null ? <NyquistSection nyquist={model.nyquist} /> : null}
      {model.extras.length > 0 ? <ExtrasSection extras={model.extras} /> : null}
      {narrative !== null ? <Narrative open={model.narrativeOpen}>{narrative}</Narrative> : null}
    </div>
  );
}
