// The PROJECT.md page's React surface (Phase 9, 09-07, sketch 041 B: masthead + spine): the page draws
// its own head, like the REVIEW, TODO and NOTE pages (docs/design-language.md records the deviation from
// ArtifactHeader's cover slot). A full-width masthead on the card veil: identity on the left (the eyebrow,
// the one h1, what the project is, the shared warning chip and the page tools - View / Source and copy
// path) and the core value in a framed card on the right, then the strip under it with the four count
// tiles, each a link into traceability on exactly the rows it counts.
// Every string derived from the document renders only through `LeadText` (tokenizeInline output mapped to
// React nodes) or as plain React text - never React's raw-HTML injection prop (T-09-14). The only `Link`
// targets are urls the server's `projectContext` built from the fixed state list (T-09-15). The squares
// ride the documented tones (complete, quiet) on data-tone and always sit beside a word.
import { Link } from '../nav.tsx';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { LeadText } from '../components/lead-tokens.tsx';
import type { ProjectTile } from '../../presentation/project-context.ts';
import type { ComposedProjectPage } from './project-page.ts';

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

export interface ProjectPageViewProps {
  model: ComposedProjectPage;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  chip: React.ReactNode;
}

export function ProjectPageView({ model, path, mode, onModeChange, chip }: ProjectPageViewProps): React.JSX.Element {
  const { masthead, strip } = model;
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
            aria-label="Requirements by state"
            data-goal={strip.goal !== null ? 'true' : 'false'}
          >
            {strip.tiles.map((tile) => (
              <Tile key={tile.state} tile={tile} />
            ))}
          </nav>
        ) : null}
      </header>
    </section>
  );
}
