// The forensics page's React surface (Phase 11, 11-25, VIEW-18, sketch 060 winner B "Evidence rail"): the header override
// (crumbs, the eyebrow "Forensics", the report's own title as the h1 and "Generated {stamp}" as meta; the header keeps its own
// Copy path button) and the page body: the Problem sentence as a quiet note, then on the left, in the report's own order, the
// root cause hypothesis (a heavy left rule), the numbered recommended actions and the anomaly cards, and on a sticky right rail
// the artifact grid as a heat map over the evidence summary. The rail stacks last on a narrow screen. Every string is author
// text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop - and the page makes no
// request and touches no storage (T-11-40). Confidence has no good or bad polarity, so its chip is untoned and the card's rule
// weight repeats it; an absent artifact is a `missing` square with the word "Absent", a present one `complete`. Nothing is
// destructive or warning: a high-confidence anomaly and an absent artifact are the report's content, not a read failure.
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { ACTIONS_LABEL, HYPOTHESIS_LABEL, PROBLEM_LABEL } from './forensics-page.ts';
import type { ComposedForensics } from './forensics-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type ForensicsHeaderProps = Partial<{
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

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the report's title as the h1 and the stamp as
 * meta. The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function forensicsHeaderProps(model: ComposedForensics, artifactTitle: string, artifactPath?: string): ForensicsHeaderProps {
  const stem = fileStemOf(artifactPath);
  const parts = [model.head.generated === null ? null : `Generated ${model.head.generated}`].filter(
    (part): part is string => part !== null,
  );
  const meta = parts.length > 0 ? parts : stem === null ? [] : [stem];
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta:
      meta.length === 0 ? null : (
        <span className="view-forensics-metas">
          {meta.map((part) => (
            <span key={part} className="view-forensics-meta">
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
// Sections
// ---------------------------------------------------------------------------------------------------------

function Problem({ problem }: { problem: string | null }): React.JSX.Element | null {
  if (problem === null) return null;
  return (
    <p className="view-forensics-problem">
      <span className="view-forensics-micro">{PROBLEM_LABEL}</span>
      <span className="view-forensics-quiet">
        <ResearchInline text={problem} />
      </span>
    </p>
  );
}

function Hypothesis({ paragraphs }: { paragraphs: string[] }): React.JSX.Element | null {
  if (paragraphs.length === 0) return null;
  return (
    <section className="view-forensics-section" aria-labelledby="view-forensics-hypothesis">
      <h2 className="view-forensics-heading" id="view-forensics-hypothesis">
        {HYPOTHESIS_LABEL}
      </h2>
      <div className="view-forensics-hyp">
        {paragraphs.map((paragraph, at) => (
          <p key={at} className={at === 0 ? 'view-forensics-sentence' : 'view-forensics-text'}>
            <ResearchInline text={paragraph} />
          </p>
        ))}
      </div>
    </section>
  );
}

function Actions({ actions }: { actions: string[] }): React.JSX.Element | null {
  if (actions.length === 0) return null;
  return (
    <section className="view-forensics-section" aria-labelledby="view-forensics-actions">
      <h2 className="view-forensics-heading" id="view-forensics-actions">
        {ACTIONS_LABEL}
      </h2>
      <ol className="view-forensics-actions">
        {actions.map((action, at) => (
          <li key={at}>
            <span>
              <ResearchInline text={action} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The forensics page body. `model` is composed and pure; the view makes no request and holds no state. */
export function ForensicsView({ model }: { model: ComposedForensics }): React.JSX.Element {
  return (
    <div className="view-forensics-root" data-view="forensics">
      <Problem problem={model.head.problem} />
      <div className="view-forensics-grid">
        <div className="view-forensics-main">
          <Hypothesis paragraphs={model.hypothesis} />
          <Actions actions={model.actions} />
        </div>
      </div>
    </div>
  );
}
