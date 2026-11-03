// The milestone audit page's React surface (Phase 9, 09-14): the header override (eyebrow "Milestone audit",
// the milestone as the h1, then the verdict chip beside "Audited {date}" in the meta row) and the page body.
// Every string is author text rendered as plain React text - never React's raw-HTML injection prop - and no
// href is built from document text. The one place document markup reaches the page is the `narrative` slot,
// which the artifact page fills with the shared allow-listed document renderer. Colour comes only from the
// tone a composed model carries and the theme tokens; the parse-degradation tones never appear on document
// content (a failed gap or a verdict is document content, so it is `missing`, `in-flight` or `quiet`).
import type { ComposedMilestoneAudit } from './milestone-audit.ts';

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
      {narrative !== null ? <Narrative open={model.narrativeOpen}>{narrative}</Narrative> : null}
    </div>
  );
}
