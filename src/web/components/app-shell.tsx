import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, ListChecks, Map } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { formatProjectMeta, projectDisplayName } from '../../presentation/shell-header.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { LabeloreMark } from './labelore-mark.tsx';
import { SearchDialog } from './search-field.tsx';
import { SnapshotStatus } from './snapshot-status.tsx';
import { ThemeToggle } from './theme-toggle.tsx';
import { ToastProvider } from './ui/toast.tsx';
import { TreeNavigator } from './tree-navigator.tsx';

// Plan 04-02 reuses this fetcher; no second fetcher for the same endpoint.
export async function fetchPresentation(): Promise<ProjectPresentation> {
  const response = await fetch('/api/presentation', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Presentation request failed (${response.status})`);
  return (await response.json()) as ProjectPresentation;
}

function navigationClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'shell-nav-link active' : 'shell-nav-link';
}

/** The Suspense fallback shown for the brief window a lazy-loaded route chunk is fetching, on a
 * loopback-only server this normally resolves in well under a frame — kept deliberately plain
 * (no skeleton chrome) since there is nothing meaningful to preview before the page's own data
 * query even starts. */
function PageLoadingFallback(): React.JSX.Element {
  return (
    <main className="page-stack" role="status" aria-live="polite">
      <p className="eyebrow">Loading</p>
      <h1>Opening view…</h1>
    </main>
  );
}

export function AppShell(): React.JSX.Element {
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  // D-09: the sidebar has no error surface of its own (see TreeNavigator) — when it can't render,
  // the content region collapses to a single column via this data attribute rather than leaving a
  // permanently-empty sidebar track.
  const [sidebarAbsent, setSidebarAbsent] = useState(false);

  // D-09: the sidebar sits under the sticky header and must start exactly at its bottom edge —
  // .shell-header has no fixed rem height (it sizes to its own padded, responsive content), so its
  // height is measured at runtime rather than guessed, and fed to the CSS track as a custom
  // property.
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const displayName = projectDisplayName(
    presentation.data?.projectName ?? null,
    presentation.data?.rootPath ?? '',
  );
  const projectMeta = formatProjectMeta(presentation.data?.state ?? null);

  return (
    <ToastProvider>
      <div
        className="app-shell"
        style={{ '--shell-header-height': `${headerHeight}px` } as React.CSSProperties}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="shell-header" ref={headerRef}>
          <NavLink
            className="brand"
            to={presentationRoutePatterns.dashboard}
            title={presentation.data?.rootPath}
            aria-label={`Labelore — ${displayName}`}
          >
            <span className="brand-mark" aria-hidden="true">
              <LabeloreMark />
            </span>
            <strong className="brand-wordmark">Labelore</strong>
            <span className="brand-separator" aria-hidden="true">
              /
            </span>
            <span className="brand-project">
              <span className="brand-project-name">{displayName}</span>
              {projectMeta ? <small className="brand-meta">{projectMeta}</small> : null}
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
            <NavLink className={navigationClass} to={presentationRoutePatterns.traceability}>
              <ListChecks aria-hidden="true" />
              Traceability
            </NavLink>
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
        <div className="shell-content" data-sidebar={sidebarAbsent ? 'absent' : 'present'}>
          <TreeNavigator onAbsentChange={setSidebarAbsent} />
          <div className="shell-outlet" id="main-content">
            {/* quick-260910-0x4 item 10: every routed page is now React.lazy()-loaded
                (app-router.tsx), so this is the one Suspense boundary its fallback needs. A
                single shared boundary here (not one per route) since every lazy element renders
                through this same Outlet. */}
            <Suspense fallback={<PageLoadingFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
