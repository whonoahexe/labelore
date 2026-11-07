// The report page's React surface (Phase 11, 11-24, VIEW-18, sketch 059 winner A "Time ruler"): the header override
// (crumbs, the eyebrow "Session report", the file's own title as the h1, "Generated {stamp}" and the project and milestone
// as meta; the header keeps its own Copy path button) and the page body: a card that opens with the headline numerals
// "Duration", "Commits" and "Plans", each shown exactly as the report wrote it. Every string is author text rendered as
// plain React text through ResearchInline - never React's raw-HTML injection prop - and the page makes no request and
// touches no storage (T-11-38). Headline numerals are untoned; colour comes only from the tone a mark carries and the theme
// tokens.
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ComposedReport, ReportNumeral } from './report-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type ReportHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The file name without its folder and its `.md` ending: the header only lays its meta row out when it has a meta item. */
function fileStemOf(path: string | undefined): string | null {
  if (path === undefined) return null;
  const name = path.split('/').pop() ?? '';
  const stem = name.endsWith('.md') ? name.slice(0, -3) : name;
  return stem === '' ? null : stem;
}

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the report's title as the h1 and the stamp and
 * context as meta. The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function reportHeaderProps(model: ComposedReport, artifactTitle: string, artifactPath?: string): ReportHeaderProps {
  const stem = fileStemOf(artifactPath);
  const parts = [model.head.generated === null ? null : `Generated ${model.head.generated}`, model.head.context].filter(
    (part): part is string => part !== null,
  );
  const meta = parts.length > 0 ? parts : stem === null ? [] : [stem];
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta:
      meta.length === 0 ? null : (
        <span className="view-report-metas">
          {meta.map((part) => (
            <span key={part} className="view-report-meta">
              {part}
            </span>
          ))}
        </span>
      ),
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: stem ?? model.head.title ?? artifactTitle },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------------------------------------

function Numeral({ numeral }: { numeral: ReportNumeral }): React.JSX.Element {
  return (
    <div className="view-report-num" data-numeral={numeral.key}>
      <span className="view-report-micro">{numeral.label}</span>
      <span className="view-report-numeral" data-long={numeral.long ? 'true' : 'false'}>
        {numeral.main}
      </span>
      {numeral.note === null ? null : <span className="view-report-meta">{numeral.note}</span>}
      {numeral.chips.length === 0 ? null : (
        <span className="view-report-chips">
          {numeral.chips.map((chip) => (
            <span key={chip} className="status-chip">
              {chip}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** The report page: a card of headline numerals first. */
export function ReportView({ model }: { model: ComposedReport; renderHtml?: (html: string) => React.ReactNode }): React.JSX.Element {
  return (
    <div className="view-report-root">
      <div className="view-report-card">
        {model.numerals.length === 0 ? null : (
          <section className="view-report-band">
            <div className="view-report-nums" style={{ '--view-report-cols': model.numerals.length } as React.CSSProperties}>
              {model.numerals.map((numeral) => (
                <Numeral key={numeral.key} numeral={numeral} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
