// The one project row (D-02, D-03): the landing page, the unknown-project page and (08-11) the header
// switcher all render it. Everything shown comes from the server's list entry; the client never
// guesses a home folder or a project's state. Names, paths and reasons are React text nodes only
// (T-08-22). The row is the 040 winner's arrangement: name over path on the left, load mark over
// last-opened time on the right, an unavailable project's reason on its own line below. No row
// shows a milestone, phase or progress (D-02): listing never loads a project.
//
// A row can be forgotten (D-10). The forget action is a quiet icon button beside the row, never inside
// the name link; pressing it replaces the row in place with an inline confirm, and only the confirm's
// own button sends the request. Forgetting only removes the project from Labelore's list: its files are
// never touched. Both buttons are neutral on purpose (it is undone by adding the folder again), and
// nothing leaves the list until the server has said it was forgotten.
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tooltip } from '@base-ui/react/tooltip';
import { Check, Folder, Loader, Server, X } from 'lucide-react';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { ApiError, UNREACHABLE_COPY, forgetProject } from '../api.ts';
import { AppLink, useAppNavigate } from '../nav.tsx';
import { formatOpenedAgo, openedTitle } from '../opened-ago.ts';
import { projectRootPath } from '../project-path.ts';
import { projectKey, projectsKey } from '../query-keys.ts';
import { Button } from './ui/button.tsx';

/** What the polite live region says once the server has forgotten a project. */
export function forgottenAnnouncement(name: string): string {
  return `${name} was removed from this list.`;
}

function failureText(error: unknown): string {
  return error instanceof ApiError ? error.message : UNREACHABLE_COPY;
}

/** `landing` adds the last-opened time, which needs the page's clock; `switcher` is the compact row. */
export type ProjectRowVariant = { variant: 'switcher'; now?: undefined } | { variant: 'landing'; now: number };

export type ProjectRowProps = {
  entry: ProjectListEntry;
  /** True for the project whose slug is in the address (never on the landing page). */
  current?: boolean;
  /** Present when the row can be forgotten: called with the name once the server has forgotten it. A
   * list that cannot forget (the unknown-project page) leaves it out and the row has no forget action. */
  onForgotten?: (name: string) => void;
} & ProjectRowVariant;

/**
 * The inline confirm that replaces a row while a forget is being decided. Focus starts on 'Keep project',
 * the safe default; Escape or 'Keep project' hands the row back. 'Forget project' is the only thing that
 * sends the request, is disabled while it is pending, and after a failure gets focus back with the
 * server's message (or the refused or unreachable copy) beside it, the row unchanged.
 */
export function ProjectRowConfirm({
  entry,
  current = false,
  onKeep,
  onForgotten,
}: {
  entry: ProjectListEntry;
  current?: boolean;
  onKeep: () => void;
  onForgotten: (name: string) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useAppNavigate();
  const questionId = useId();
  const noticeId = useId();
  const keepRef = useRef<HTMLButtonElement | null>(null);
  const forgetRef = useRef<HTMLButtonElement | null>(null);

  const mutation = useMutation({
    mutationFn: () => forgetProject(entry.slug),
    onSuccess: async () => {
      onForgotten(entry.name);
      // Forgetting the project that is open leaves its pages first, so nothing asks it for data again.
      if (current) navigate('/');
      await queryClient.invalidateQueries({ queryKey: projectsKey });
      queryClient.removeQueries({ queryKey: projectKey(entry.slug) });
    },
  });
  const { isPending, isError } = mutation;

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  // 'Forget project' is disabled while the request runs, which drops focus; give it back on failure.
  useEffect(() => {
    if (isError) forgetRef.current?.focus();
  }, [isError]);

  function keep(): void {
    if (!isPending) onKeep();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape') return;
    // The switcher's popup closes on Escape too; here Escape only takes back the question.
    event.stopPropagation();
    keep();
  }

  return (
    <div
      aria-labelledby={questionId}
      className="project-row-confirm"
      onKeyDown={onKeyDown}
      role="group"
    >
      <p id={questionId}>{`Forget ${entry.name}? Labelore only removes it from this list. The project's files are not touched.`}</p>
      {isError ? (
        <div className="notice" id={noticeId} role="alert">
          <p>{failureText(mutation.error)}</p>
        </div>
      ) : null}
      <div>
        <Button
          aria-describedby={isError ? noticeId : undefined}
          disabled={isPending}
          onClick={() => mutation.mutate()}
          ref={forgetRef}
          type="button"
          variant="outline"
        >
          Forget project
        </Button>
        <Button onClick={keep} ref={keepRef} type="button" variant="ghost">
          Keep project
        </Button>
      </div>
    </div>
  );
}

export function ProjectRow({ entry, current = false, variant, now, onForgotten }: ProjectRowProps): React.JSX.Element {
  const PathIcon = entry.kind === 'ssh' ? Server : Folder;
  const [confirming, setConfirming] = useState(false);
  const forgetRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef(false);

  // The confirm replaces the forget button, so a row taken back gets focus on the button again.
  useEffect(() => {
    if (confirming || !returnFocus.current) return;
    returnFocus.current = false;
    forgetRef.current?.focus();
  }, [confirming]);

  const marks = {
    'data-variant': variant,
    'data-current': current ? 'true' : undefined,
    'aria-current': current ? ('true' as const) : undefined,
  };

  if (onForgotten && confirming) {
    return (
      <li className="project-row" data-confirming="true" {...marks}>
        <ProjectRowConfirm
          current={current}
          entry={entry}
          onForgotten={onForgotten}
          onKeep={() => {
            returnFocus.current = true;
            setConfirming(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="project-row" {...marks}>
      <AppLink className="project-row-name" to={projectRootPath(entry.slug)}>
        {entry.name}
      </AppLink>
      {current ? (
        <>
          <Check aria-hidden="true" />
          <span className="sr-only">Current</span>
        </>
      ) : null}
      {entry.state === 'loading' ? (
        <span className="status-chip" data-tone="quiet">
          <Loader aria-hidden="true" />
          Opening…
        </span>
      ) : null}
      {entry.state === 'unavailable' ? (
        <>
          <span className="status-chip" data-tone="missing">
            Unavailable
          </span>
          {entry.reason ? <p className="source-note">{entry.reason}</p> : null}
        </>
      ) : null}
      <span className="project-row-path" title={entry.target}>
        <PathIcon aria-hidden="true" />
        <span>{entry.displayPath}</span>
      </span>
      {variant === 'landing' ? (
        <p className="project-row-meta" title={openedTitle(entry.lastOpened) || undefined}>
          {formatOpenedAgo(entry.lastOpened, now)}
        </p>
      ) : null}
      {onForgotten ? (
        <div className="project-row-actions">
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Button
                  aria-label={`Forget ${entry.name}`}
                  onClick={() => setConfirming(true)}
                  ref={forgetRef}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden="true" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner className="project-row-tip-positioner" side="left" sideOffset={4}>
                <Tooltip.Popup className="project-row-tip">Forget this project</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      ) : null}
    </li>
  );
}

/** The entries as rows, in the order given (the server's order, D-04). */
export function ProjectList({
  entries,
  currentSlug = null,
  variant,
  now,
  onForgotten,
}: {
  entries: readonly ProjectListEntry[];
  currentSlug?: string | null;
  /** Gives every row its forget action (see ProjectRowProps). */
  onForgotten?: (name: string) => void;
} & ProjectRowVariant): React.JSX.Element {
  return (
    <ul className="project-list">
      {entries.map((entry) => {
        const current = currentSlug !== null && entry.slug === currentSlug;
        return variant === 'landing' ? (
          <ProjectRow key={entry.slug} entry={entry} current={current} variant="landing" now={now} onForgotten={onForgotten} />
        ) : (
          <ProjectRow key={entry.slug} entry={entry} current={current} variant="switcher" onForgotten={onForgotten} />
        );
      })}
    </ul>
  );
}
