// An address whose first segment names no remembered project (D-07 for an unknown slug; mounted by the
// project layout in 08-08). Shell-less, like the landing page: it names the slug as typed, offers the
// same rows and a way back to `/`. It fetches nothing and never loads or guesses a project.
import { useState } from 'react';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { PlainPage } from '../components/plain-header.tsx';
import { ProjectList } from '../components/project-row.tsx';
import { AppLink } from '../nav.tsx';

export function UnknownProjectPage({
  slug,
  projects,
}: {
  /** The first segment as typed. Rendered as text only (T-08-22). */
  slug: string;
  projects: ProjectListEntry[];
}): React.JSX.Element {
  const [now] = useState(() => Date.now());
  return (
    <PlainPage>
      <main className="page-stack projects-page">
        <header className="page-intro">
          <div>
            <h1>{`No project called “${slug}”.`}</h1>
            <p className="lede">
              Labelore does not know a project by this name. It may have been forgotten, or the link
              came from another run.
            </p>
          </div>
        </header>
        <section aria-label="Known projects">
          {projects.length > 0 ? <ProjectList entries={projects} variant="landing" now={now} /> : null}
          <AppLink className="text-link" to="/">
            See all projects
          </AppLink>
        </section>
      </main>
    </PlainPage>
  );
}
