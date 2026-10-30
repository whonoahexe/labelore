// The header project switcher (PLAT-02, D-05), laid out as the winner of sketch 039 (A, a popover under
// the name trigger). The trigger is a button beside the mark-and-wordmark link, never inside it; it
// opens the project list, which is re-read every time it opens and never loads a project (D-02, D-04).
// Choosing a row closes the list at once and, once the new project's shell has mounted, moves focus
// to the main content; Escape closes it and returns focus to the trigger (D-06). Names, meta lines and
// targets are React text nodes and props only (T-08-40); every row and 'All projects' goes through
// AppLink, which never takes the current slug (T-08-41).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { fetchProjects } from '../api.ts';
import { AppLink } from '../nav.tsx';
import { projectsKey } from '../query-keys.ts';
import { ProjectList } from './project-row.tsx';

/** Set when a row of another project is chosen: the switcher that mounts in that project's shell
 * focuses the main content once, then clears it. The whole shell is keyed by slug, so the switcher
 * that was clicked is gone by then and cannot do it itself. */
let focusMainOnNextMount = false;

/** The main content landmark, made focusable on demand: it is a plain region, so it takes focus only
 * when asked to, and never joins the tab order (tabindex -1). */
function mainContent(): HTMLElement | null {
  const main = document.getElementById('main-content');
  if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  return main;
}

function focusMainContent(): void {
  mainContent()?.focus({ preventScroll: true });
}

/** What the person chose in the list: a project row, 'All projects', or nothing yet. */
type Choice = 'project' | 'all' | null;

/**
 * The inside of the list: the 'Projects' head with its 'All projects' link, the rows (or the empty
 * note) and the footer region 08-17 fills with its 'Add or scan…' entry. The list query lives here, so
 * it is observed, and therefore refetched (staleTime 0), only while the list is open.
 */
export function ProjectSwitcherPanel({ currentSlug }: { currentSlug: string }): React.JSX.Element {
  const list = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  const entries = list.data?.projects ?? [];

  let body: React.ReactNode;
  if (entries.length > 0) {
    body = <ProjectList entries={entries} currentSlug={currentSlug} variant="switcher" />;
  } else if (list.isPending) {
    body = <p className="empty-note">Loading projects…</p>;
  } else if (list.isError) {
    body = <p className="empty-note">Labelore could not be reached. Check that it is still running, then try again.</p>;
  } else {
    body = <p className="empty-note">No projects yet.</p>;
  }

  return (
    <>
      <header>
        <p>Projects</p>
        <AppLink className="text-link" to="/">
          All projects
        </AppLink>
      </header>
      <div>{body}</div>
      <div className="project-switcher-footer" />
    </>
  );
}

export function ProjectSwitcher({
  current,
  meta,
}: {
  current: ProjectListEntry;
  meta: string | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  // The popup hangs under the header, not just under the trigger (the trigger sits in the header's
  // first row, and below 42rem the tabs sit in a second row the list must not cover).
  const [sideOffset, setSideOffset] = useState(4);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const choice = useRef<Choice>(null);

  useEffect(() => {
    if (!focusMainOnNextMount) return;
    focusMainOnNextMount = false;
    focusMainContent();
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    if (next) {
      choice.current = null;
      const trigger = triggerRef.current;
      const header = trigger?.closest('header');
      if (trigger && header) {
        const gap = header.getBoundingClientRect().bottom - trigger.getBoundingClientRect().bottom;
        setSideOffset(Math.max(0, Math.ceil(gap)));
      }
    }
    setOpen(next);
  }, []);

  // One handler for every link in the list (rows and 'All projects'): the router navigates, and the list
  // closes at once, so it never shows a spinner while the next project opens.
  const onPopupClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const link = (event.target as Element).closest('a');
      if (!link) return;
      const toAnotherProject = link.getAttribute('href') !== '/' && link.getAttribute('href') !== `/${current.slug}`;
      choice.current = link.getAttribute('href') === '/' ? 'all' : 'project';
      if (toAnotherProject) focusMainOnNextMount = true;
      setOpen(false);
    },
    [current.slug],
  );

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        ref={triggerRef}
        className="project-switcher-trigger"
        aria-label={`Switch project. Current project: ${current.name}`}
        aria-haspopup="dialog"
        title={current.target}
      >
        <span className="brand-project">
          <span className="brand-project-name">{current.name}</span>
          {meta ? <small className="brand-meta">{meta}</small> : null}
        </span>
        <ChevronsUpDown aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="project-switcher-positioner"
          sideOffset={sideOffset}
          align="start"
          collisionPadding={0}
          positionMethod="fixed"
        >
          <Popover.Popup
            className="project-switcher-popup"
            aria-label="Projects"
            initialFocus
            finalFocus={() => {
              if (choice.current === 'project') return mainContent();
              if (choice.current === 'all') return false;
              return triggerRef.current;
            }}
            onClick={onPopupClick}
          >
            <ProjectSwitcherPanel currentSlug={current.slug} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
