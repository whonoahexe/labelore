// The PROJECT.md page's React surface (Phase 9, 09-07, sketch 041 B: masthead + spine): the page draws
// its own head, like the REVIEW, TODO and NOTE pages (docs/design-language.md records the deviation from
// ArtifactHeader's cover slot). A full-width masthead on the card veil: identity on the left (the eyebrow,
// the one h1, what the project is, the shared warning chip and the page tools - View / Source and copy
// path) and the core value in a framed card on the right, then the strip under it: the goal cell first
// ("Now building {milestone}" and the Current Milestone's goal, 09-08), then the four count tiles, each a
// link into traceability on exactly the rows it counts. Under the masthead the body is two columns: the
// main column (the decision spine, 09-09) and the margin (09-08) - what binds the project, what it will not
// do, when it was last updated and the way back to the dashboard.
// Every string derived from the document renders only through `LeadText` (tokenizeInline output mapped to
// React nodes) or as plain React text - never React's raw-HTML injection prop (T-09-14). The only `Link`
// targets are urls the server's `projectContext` built from the fixed state list (T-09-15). The squares
// ride the documented tones (complete, quiet) on data-tone and always sit beside a word. The margin's one
// toggle is page-local state; its only `Link` target is the context's fixed `dashboardUrl`.
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '../nav.tsx';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { LeadText } from '../components/lead-tokens.tsx';
import type { ProjectBullet } from '../../planning-repo/handlers/project.ts';
import type { ProjectTile } from '../../presentation/project-context.ts';
import type { ComposedProjectMargin, ComposedProjectPage } from './project-page.ts';

function Tile({ tile }: { tile: ProjectTile }): React.JSX.Element {
  return (
    <Link
      className="view-project-tile"
      to={tile.url}
      title={tile.title ?? undefined}
      aria-label={`${tile.count} ${tile.label} ${tile.sub}`}
    >
      <span className="view-project-tile-count">
        <i className="status-square" data-tone={tile.tone} aria-hidden="true" />
        {tile.count}
      </span>
      <span className="view-project-tile-label">{tile.label}</span>
      <span className="view-project-tile-sub">{tile.sub}</span>
    </Link>
  );
}

function Rules({
  heading,
  rules,
  refused,
}: {
  heading: string;
  rules: ProjectBullet[];
  refused: boolean;
}): React.JSX.Element | null {
  if (rules.length === 0) return null;
  return (
    <section className="view-project-rules" data-refused={refused ? 'true' : 'false'}>
      <h2 className="view-project-rules-h">{`${heading} \u00b7 ${rules.length}`}</h2>
      <dl className="view-project-rules-list">
        {rules.map((rule, index) => (
          <div key={`${index}-${rule.name}`} className="view-project-rule">
            <dt className="view-project-rule-name">
              <LeadText text={rule.name !== '' ? rule.name : rule.text} />
            </dt>
            {rule.name !== '' && rule.text !== '' ? (
              <dd className="view-project-rule-text">
                <LeadText text={rule.text} />
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function Margin({ margin }: { margin: ComposedProjectMargin }): React.JSX.Element {
  const [full, setFull] = useState(false);
  const hasLists = margin.constraints.length > 0 || margin.outOfScope.length > 0;
  return (
    <aside className="view-project-margin" aria-label="What binds the project" data-full={full ? 'true' : 'false'}>
      <Rules heading="Bound by" rules={margin.constraints} refused={false} />
      <Rules heading="Will not do" rules={margin.outOfScope} refused />
      {hasLists ? (
        <button
          type="button"
          className="text-link view-project-margin-toggle"
          aria-pressed={full}
          onClick={() => setFull((value) => !value)}
        >
          {full ? 'Shorten lists' : 'Read in full'}
        </button>
      ) : null}
      <div className="view-project-foot">
        {margin.lastUpdated !== null ? <span className="source-note">{`Last updated ${margin.lastUpdated}`}</span> : null}
        <Link className="text-link" to={margin.dashboardUrl}>
          Where the work is now
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

export interface ProjectPageViewProps {
  model: ComposedProjectPage;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  chip: React.ReactNode;
}

export function ProjectPageView({ model, path, mode, onModeChange, chip }: ProjectPageViewProps): React.JSX.Element {
  const { masthead, strip, margin } = model;
  return (
    <section className="view-project-page" aria-label={`${masthead.name} project`}>
      <header className="view-project-masthead">
        <div className="view-project-masthead-in">
          <div className="view-project-id">
            <p className="eyebrow">{masthead.eyebrow}</p>
            <h1 className="view-project-name">{masthead.name}</h1>
            {masthead.lead !== null ? (
              <p className="view-project-what">
                <LeadText text={masthead.lead} />
              </p>
            ) : null}
            <div className="view-project-tools">
              {chip}
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          {masthead.coreValue !== null ? (
            <div className="view-project-core">
              <p className="view-project-core-label">Core value</p>
              <p className="view-project-core-value">
                <LeadText text={masthead.coreValue} />
              </p>
            </div>
          ) : null}
        </div>
        {strip !== null ? (
          <nav
            className="view-project-strip"
            aria-label="Milestone goal and requirements by state"
            data-goal={strip.goalLabel !== null ? 'true' : 'false'}
            data-tiles={strip.tiles !== null ? 'true' : 'false'}
          >
            {strip.goalLabel !== null ? (
              <div className="view-project-goal">
                <p className="view-project-goal-label">{strip.goalLabel}</p>
                {strip.goal !== null ? (
                  <p className="view-project-goal-text">
                    <LeadText text={strip.goal} />
                  </p>
                ) : null}
              </div>
            ) : null}
            {strip.tiles?.map((tile) => <Tile key={tile.state} tile={tile} />)}
          </nav>
        ) : null}
      </header>
      {margin !== null ? (
        <div className="view-project-body" data-margin="true">
          <div className="view-project-main" />
          <Margin margin={margin} />
        </div>
      ) : null}
    </section>
  );
}
