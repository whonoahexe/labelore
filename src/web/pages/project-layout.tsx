// The body of the /:project route (D-06, D-07, D-08, PLAT-02, PLAT-08). The first URL segment names the
// project: this layout looks it up in the registry's list, names it in the header at once, shows
// "Opening {name}…" until that project's own presentation arrives, and only then renders the page.
//
// Nothing of another project can show here. Every query key is built by projectKey(slug, …), no query
// keeps previous data, and the shell is keyed by slug so a switch remounts the whole subtree; a cached
// entry for a project the person left is never read under the new slug.
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import { useParams } from 'react-router';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { ApiError, UNREACHABLE_COPY, fetchPresentation, fetchProjects, openProject } from '../api.ts';
import { AppShell } from '../components/app-shell.tsx';
import { PlainPage } from '../components/plain-header.tsx';
import { Button } from '../components/ui/button.tsx';
import { projectLayoutOutcome } from '../project-path.ts';
import { projectKey, projectsKey } from '../query-keys.ts';
import { InvalidProjectScreen } from './invalid-project-screen.tsx';
import { UnknownProjectPage } from './unknown-project-page.tsx';

/** The shell-less screens of a layout that cannot yet name its project. Plain values, so each renders
 * without a request (an errored query with no data re-fetches on mount, which a static render cannot show). */
export function ProjectLayoutNotice({
  kind,
  message,
  onRetry,
}: {
  kind: 'loading' | 'error';
  message?: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <PlainPage>
      <main className="page-stack projects-page">
        {kind === 'loading' ? (
          <div className="quiet-state" role="status">
            <Loader aria-hidden="true" />
            <p>Loading projects…</p>
          </div>
        ) : (
          <div className="notice destructive" role="alert">
            <p>{message}</p>
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              Retry loading projects
            </Button>
          </div>
        )}
      </main>
    </PlainPage>
  );
}

export function ProjectLayout({
  children,
}: {
  /** The page for an open project; called only once that project's own presentation has arrived. */
  children: (presentation: ProjectPresentation) => React.ReactNode;
}): React.JSX.Element {
  // The router has already decoded the segment; it is compared with the listed slugs exactly.
  const { project: slug = '' } = useParams();
  const queryClient = useQueryClient();

  const list = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  const projects = list.data?.projects;
  const entry = projects?.find((candidate) => candidate.slug === slug);
  const listed = entry !== undefined;

  // Only a listed slug is ever asked for: an unknown one requests nothing (T-08-34).
  const presentation = useQuery({
    queryKey: projectKey(slug, 'presentation'),
    queryFn: () => fetchPresentation(slug),
    enabled: listed,
  });

  // D-08: opening stamps lastOpened, once per mounted slug. The server keeps no active project; each
  // tab follows only its own URL, so this is bookkeeping for the list's order and nothing else.
  const stamped = useRef<string | null>(null);
  useEffect(() => {
    if (!listed || stamped.current === slug) return;
    stamped.current = slug;
    openProject(slug)
      .then(() => queryClient.invalidateQueries({ queryKey: projectsKey }))
      .catch(() => undefined);
  }, [listed, slug, queryClient]);

  const outcome = projectLayoutOutcome({
    slug,
    // A failed re-read of a list already in hand keeps showing that list.
    listStatus: projects ? 'success' : list.status,
    projects,
    presentationStatus: presentation.data ? 'success' : presentation.status,
    presentation: presentation.data,
  });

  switch (outcome) {
    case 'loading-list':
      return <ProjectLayoutNotice kind="loading" />;
    case 'list-error':
      return (
        <ProjectLayoutNotice
          kind="error"
          message={list.error instanceof ApiError ? list.error.message : UNREACHABLE_COPY}
          onRetry={() => void list.refetch()}
        />
      );
    case 'unknown':
      return <UnknownProjectPage slug={slug} projects={projects ?? []} />;
    default:
      break;
  }

  // The remaining outcomes all have a listed entry; the narrowing below keeps the types honest.
  if (entry === undefined) return <UnknownProjectPage slug={slug} projects={projects ?? []} />;

  if (outcome === 'opening') {
    return (
      <AppShell key={slug} project={entry} busy>
        <main className="page-stack">
          <div className="quiet-state" role="status">
            <Loader aria-hidden="true" />
            <p>{`Opening ${entry.name}…`}</p>
          </div>
        </main>
      </AppShell>
    );
  }

  const loaded = presentation.data;
  if (outcome === 'invalid' && loaded && loaded.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={loaded.loadStatus} />;
  }
  if (outcome === 'open' && loaded) {
    return (
      <AppShell key={slug} project={entry}>
        {children(loaded)}
      </AppShell>
    );
  }
  // presentation-error: the shell's own notice explains it.
  return <AppShell key={slug} project={entry} />;
}
