// The projects landing page at `/` (D-01, D-03): the list of every remembered project, never a
// redirect, even with exactly one. The list is the registry's cheap GET /api/projects (D-02), laid out
// as the 040 winner (B): rows on the left; the add form (08-17) and the scan (08-13) sit in a side
// column, an `<aside>` that is a direct child of the page's `<main>`: from 62rem the stylesheet turns the
// page into two columns only when that aside exists, and below it the column stacks under the list.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderPlus, Loader } from 'lucide-react';
import type { ProjectListResponse } from '../../presentation/project-list.ts';
import { ApiError, UNREACHABLE_COPY, fetchProjects } from '../api.ts';
import { AddProjectForm } from '../components/add-project-form.tsx';
import { PlainPage } from '../components/plain-header.tsx';
import { ProjectList, forgottenAnnouncement } from '../components/project-row.tsx';
import { Button } from '../components/ui/button.tsx';
import { useAppNavigate } from '../nav.tsx';
import { projectRootPath } from '../project-path.ts';
import { projectsKey } from '../query-keys.ts';

/** What the list section shows: a plain value, so every state can be rendered without a request. */
export type ProjectsListState =
  | { kind: 'pending' }
  | { kind: 'error'; message: string; onRetry: () => void }
  | { kind: 'ready'; response: ProjectListResponse; now: number };

export function ProjectsListSection({ state }: { state: ProjectsListState }): React.JSX.Element {
  // The outcome of a forget is announced from here, outside the rows: the row is gone by then.
  const [announcement, setAnnouncement] = useState('');
  if (state.kind === 'pending') {
    return (
      <section aria-label="Project list">
        <div className="quiet-state" role="status">
          <Loader aria-hidden="true" />
          <p>Loading projects…</p>
        </div>
      </section>
    );
  }
  if (state.kind === 'error') {
    return (
      <section aria-label="Project list">
        <div className="notice destructive" role="alert">
          <p>{state.message}</p>
          <Button onClick={state.onRetry} size="sm" type="button" variant="outline">
            Retry loading projects
          </Button>
        </div>
      </section>
    );
  }
  const { response, now } = state;
  return (
    <section aria-label="Project list">
      {response.notices.map((notice) => (
        <div className="notice" key={notice} role="status">
          <p>{notice}</p>
        </div>
      ))}
      {response.projects.length === 0 ? (
        <div className="empty-flow" data-tone="quiet">
          <FolderPlus aria-hidden="true" />
          <div>
            <h3>No projects yet.</h3>
            <p>
              Add a folder or an ssh:// target beside, or scan a folder such as ~/Work to find GSD
              projects.
            </p>
          </div>
        </div>
      ) : (
        <ProjectList
          entries={response.projects}
          variant="landing"
          now={now}
          onForgotten={(name) => setAnnouncement(forgottenAnnouncement(name))}
        />
      )}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}

/** The side column's "Add a project" section: the same form the switcher's dialog holds (one component,
 * two hosts, D-13). Adding opens the new project and remembers it (D-09). */
export function AddProjectSection(): React.JSX.Element {
  const navigate = useAppNavigate();
  return (
    <section aria-labelledby="add-project-heading">
      <header className="section-heading">
        <h2 id="add-project-heading">Add a project</h2>
      </header>
      <AddProjectForm onAdded={(slug) => navigate(projectRootPath(slug))} />
    </section>
  );
}

export function ProjectsPage(): React.JSX.Element {
  const projects = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  // Taken once, so a render stays pure and every row's relative time agrees.
  const [now] = useState(() => Date.now());

  let state: ProjectsListState;
  if (projects.data) state = { kind: 'ready', response: projects.data, now };
  else if (projects.isError) {
    const message = projects.error instanceof ApiError ? projects.error.message : UNREACHABLE_COPY;
    state = { kind: 'error', message, onRetry: () => void projects.refetch() };
  } else state = { kind: 'pending' };

  return (
    <PlainPage>
      <main className="page-stack projects-page">
        <header className="page-intro">
          <div>
            <p className="eyebrow">Projects</p>
            <h1>Projects</h1>
            <p className="lede">
              Open a GSD project to see where its work stands. Labelore only reads them and never
              changes them.
            </p>
          </div>
        </header>
        <ProjectsListSection state={state} />
        <aside aria-label="Add or scan projects">
          <AddProjectSection />
        </aside>
      </main>
    </PlainPage>
  );
}
