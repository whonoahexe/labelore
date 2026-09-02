import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, LayoutDashboard, ListChecks, Map, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { SearchField } from './search-field.tsx';
import { ThemeToggle } from './theme-toggle.tsx';
import { TreeNavigator } from './tree-navigator.tsx';

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

  return (
    <div
      className="app-shell"
      style={{ '--shell-header-height': `${headerHeight}px` } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="shell-header" ref={headerRef}>
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
          <NavLink className={navigationClass} to={presentationRoutePatterns.traceability}>
            <ListChecks aria-hidden="true" />
            Traceability
          </NavLink>
        </nav>

        <div className="shell-controls">
          <SearchField />
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
          <Outlet />
        </div>
      </div>
    </div>
  );
}
