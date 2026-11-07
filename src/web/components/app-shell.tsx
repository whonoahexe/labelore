import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartLine, LayoutDashboard, ListChecks, Map, PencilRuler } from 'lucide-react';
import { Outlet } from 'react-router';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { formatProjectMeta } from '../../presentation/shell-header.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { projectMapState } from '../../presentation/project-map-state.ts';
import { projectHasResearch } from '../../presentation/project-research-files.ts';
import { projectHasSketches } from '../../presentation/sketches.ts';
import { fetchPresentation } from '../api.ts';
import { NavLink, useProjectScope } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';
import { LabeloreMark } from './labelore-mark.tsx';
import { ProjectSwitcher } from './project-switcher.tsx';
import { RouteFallback, RouteProgress } from './route-progress.tsx';
import { ScopeChip } from './scope-chip.tsx';
import { SearchDialog } from './search-field.tsx';
import { SidebarDrawer } from './sidebar-drawer.tsx';
import { SnapshotStatus } from './snapshot-status.tsx';
import { ThemeToggle } from './theme-toggle.tsx';
import { ToastProvider } from './ui/toast.tsx';

function navigationClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'shell-nav-link active' : 'shell-nav-link';
}

/**
 * The shell of one project, named by its list entry so the header is right at once. Everything it reads
 * of the project (the meta line, the tabs) comes from this slug's own presentation query, so nothing of
 * another project can show here; the layout keys it by slug, so a switch remounts the whole subtree.
 * `children` takes the Outlet's place; `busy` marks the outlet while the project's data is on its way.
 */
export function AppShell({
  project,
  busy = false,
  workstreamIndex,
  children,
}: {
  project: ProjectListEntry;
  busy?: boolean;
  /** Set only while the workstream index is the page (11-31): the header shows the workstream count beside the
   * project switcher, and Roadmap and Traceability are hidden, because the index has no roadmap or requirements of
   * its own to lead to (the map-only precedent: no tab leads nowhere). */
  workstreamIndex?: { countText: string };
  children?: React.ReactNode;
}): React.JSX.Element {
  const scope = useProjectScope();
  const presentation = useQuery({
    queryKey: projectKey(project.slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(project.slug, scope),
  });

  const onIndex = workstreamIndex !== undefined;
  const projectMeta = onIndex ? workstreamIndex.countText : formatProjectMeta(presentation.data?.state ?? null);
  // The Research tab appears only for a project with at least one of the five research files.
  const showResearch = projectHasResearch(presentation.data?.artifacts ?? []);
  // The Sketches tab appears only for a project that has sketches (todo 001).
  const showSketches = projectHasSketches(presentation.data?.artifacts ?? []);
  // A project that holds only a codebase map has no roadmap and no requirements to lead to (D-07). While
  // the presentation is still loading this is false, so a normal project's tabs never flicker.
  const mapOnly = projectMapState(presentation.data?.artifacts ?? []).mapOnly;
  // The workstream index has no roadmap or requirements of its own either (11-31): the same rule, so no tab leads
  // nowhere. Inside a workstream every tab shows, because there the roadmap and the traceability are the workstream's.
  const hideRoadmapTabs = mapOnly || onIndex;

  return (
    <ToastProvider>
      <div className="app-shell">
        <RouteProgress />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="shell-header">
          {/* D-01: rendered unconditionally. It used to be gated on the shared `['tree']` query
              succeeding, which made the icon pop in ~500 ms after the rest of the header (measured
              against a 120 KB /api/tree payload) — and the gate bought nothing, because
              PlanningPlaces already renders its own isPending/isError states inside the drawer. */}
          <SidebarDrawer />
          <div className="brand-lockup">
            {/* A link may not contain a button: the mark, the wordmark and the separator are the
                link to the open project's dashboard, and the project name beside it is the switcher. */}
            <NavLink
              className="brand"
              to={presentationRoutePatterns.dashboard}
              title={project.target}
              aria-label={`Labelore — ${project.name}`}
            >
              <span className="brand-mark" aria-hidden="true">
                <LabeloreMark />
              </span>
              <strong className="brand-wordmark">Labelore</strong>
              <span className="brand-separator" aria-hidden="true">
                /
              </span>
            </NavLink>
            <ProjectSwitcher current={project} meta={projectMeta} />
            {/* Inside a workstream (D-11) the scope chip sits beside the project switcher, a second level under it; on
                the index and in a flat project there is no scope, so there is no chip. */}
            {scope !== null ? <ScopeChip scope={scope} /> : null}
          </div>

          <nav className="shell-nav" aria-label="Primary navigation">
            <NavLink className={navigationClass} end to={presentationRoutePatterns.dashboard}>
              <LayoutDashboard aria-hidden="true" />
              Dashboard
            </NavLink>
            {hideRoadmapTabs ? null : (
              <NavLink className={navigationClass} to={presentationRoutePatterns.roadmap}>
                <Map aria-hidden="true" />
                Roadmap
              </NavLink>
            )}
            {showResearch ? (
              <NavLink className={navigationClass} to={presentationRoutePatterns.research}>
                <ChartLine aria-hidden="true" />
                Research
              </NavLink>
            ) : null}
            {hideRoadmapTabs ? null : (
              <NavLink className={navigationClass} to={presentationRoutePatterns.traceability}>
                <ListChecks aria-hidden="true" />
                Traceability
              </NavLink>
            )}
            {showSketches ? (
              <NavLink className={navigationClass} to={presentationRoutePatterns.sketches}>
                <PencilRuler aria-hidden="true" />
                Sketches
              </NavLink>
            ) : null}
          </nav>

          <div className="shell-controls">
            <SnapshotStatus
              readAt={presentation.data?.readAt ?? null}
              phase={presentation.isPending ? 'pending' : presentation.isError ? 'error' : 'ready'}
            />
            <SearchDialog />
            <ThemeToggle />
          </div>
        </header>

        {presentation.isError ? (
          <div className="shell-notice" role="alert">
            The shell could not refresh its snapshot metadata. Page-level data may also be
            unavailable.
          </div>
        ) : null}
        <div className="shell-content">
          <div className="shell-outlet" id="main-content" aria-busy={busy ? true : undefined}>
            {/* quick-260910-0x4 item 10: every routed page is now React.lazy()-loaded
                (app-router.tsx), so this is the one Suspense boundary its fallback needs. A
                single shared boundary here (not one per route) since every lazy element renders
                through this same Outlet. The fallback only holds the layout box — the visible
                loading feedback is <RouteProgress /> above, which lives OUTSIDE this boundary
                precisely so it can also paint during transition-driven navigations, when React
                never renders this fallback at all. */}
            <Suspense fallback={<RouteFallback />}>
              {children ?? <Outlet />}
            </Suspense>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
