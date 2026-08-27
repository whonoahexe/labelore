import { useQuery } from '@tanstack/react-query';
import { BookOpenText, LayoutDashboard, Map, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';

async function fetchPresentation(): Promise<ProjectPresentation> {
  const response = await fetch('/api/presentation', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Presentation request failed (${response.status})`);
  return (await response.json()) as ProjectPresentation;
}

function formatReadAt(readAt: string): string {
  const parsed = new Date(readAt);
  return Number.isNaN(parsed.valueOf()) ? readAt : parsed.toLocaleString();
}

function navigationClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'shell-nav-link active' : 'shell-nav-link';
}

export function AppShell(): React.JSX.Element {
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="shell-header">
        <NavLink className="brand" to={presentationRoutePatterns.dashboard}>
          <span className="brand-mark" aria-hidden="true">
            <BookOpenText />
          </span>
          <span>
            <strong>GSD Lore</strong>
            <small>{presentation.data?.projectName ?? 'Planning intelligence'}</small>
          </span>
        </NavLink>

        <nav className="shell-nav" aria-label="Primary navigation">
          <NavLink className={navigationClass} end to={presentationRoutePatterns.dashboard}>
            <LayoutDashboard aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink className={navigationClass} to={presentationRoutePatterns.roadmap}>
            <Map aria-hidden="true" />
            Roadmap
          </NavLink>
        </nav>

        <div className="snapshot-status" aria-live="polite">
          <Radio aria-hidden="true" />
          {presentation.isPending ? (
            <span>Reading snapshot…</span>
          ) : presentation.isError ? (
            <span className="snapshot-error">Snapshot metadata unavailable</span>
          ) : (
            <span>
              <small>Snapshot read</small>
              <time dateTime={presentation.data.readAt}>
                {formatReadAt(presentation.data.readAt)}
              </time>
            </span>
          )}
        </div>
      </header>

      {presentation.isError ? (
        <div className="shell-notice" role="alert">
          The shell could not refresh its snapshot metadata. Page-level data may also be
          unavailable.
        </div>
      ) : null}
      <div className="shell-content" id="main-content">
        <Outlet />
      </div>
    </div>
  );
}
