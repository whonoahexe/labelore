// The projects landing page at `/` (D-01, D-03): the list of every remembered project, never a
// redirect, even with exactly one. The list is the registry's cheap GET /api/projects (D-02).
import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '../api.ts';
import { ProjectList } from '../components/project-row.tsx';
import { projectsKey } from '../query-keys.ts';

export function ProjectsPage(): React.JSX.Element {
  const projects = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  return (
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
      <section aria-label="Projects">
        {projects.data ? <ProjectList entries={projects.data.projects} variant="landing" /> : null}
      </section>
    </main>
  );
}
