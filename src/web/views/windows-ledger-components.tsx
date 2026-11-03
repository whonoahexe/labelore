// The WINDOWS.md ledger's React surface (Phase 9, 09-10): the source-note line under the header and the lead
// band that always comes first - the open count in the lead number style beside the word "open", a tone chip
// and the one muted line. Every string is author text rendered as plain React text - never React's raw-HTML
// injection prop - and no href is built from document text. Colour comes only from the tone a composed model
// carries and the theme tokens; the parse-degradation tones never appear on document content (the open count
// is document content, so it is `complete` or `in-flight`, never destructive).
import type { ComposedWindowsLedger } from './windows-ledger.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial
 * keeps TypeScript from flagging the intentional override. The breadcrumb row stays, and the manifest lead
 * is dropped (the note under the header says it). */
export type WindowsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the h1 and no lead. */
export function windowsHeaderProps(model: ComposedWindowsLedger, fallbackTitle: string): WindowsHeaderProps {
  return {
    eyebrow: model.intro.eyebrow,
    title: model.intro.title || fallbackTitle,
    lead: null,
  };
}

export function WindowsLedgerView({ model }: { model: ComposedWindowsLedger }): React.JSX.Element {
  const { intro, lead, notice } = model;
  return (
    <div className="view-windows-page">
      <p className="source-note view-windows-note">{intro.note}</p>
      {notice !== null ? (
        <p className="notice view-windows-notice" role="status">
          {notice}
        </p>
      ) : null}
      <section className="view-windows-lead" aria-label="Open windows" data-tone={lead.tone}>
        <div className="view-windows-count">
          <span className="view-windows-number">{lead.open}</span>
          <span className="view-windows-word">open</span>
          <span className="status-chip" data-tone={lead.tone}>
            {lead.open} open
          </span>
        </div>
        <p className="view-windows-sentence">{lead.sentence}</p>
      </section>
    </div>
  );
}
