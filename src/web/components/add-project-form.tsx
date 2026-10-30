// The add form (PLAT-07, D-09, D-13, D-17): one component, two hosts. The switcher's add dialog and the
// landing page's "Add a project" section both render it, so one verb looks and behaves the same in
// both. A typed folder or ssh:// target goes to POST /api/projects, which validates it once; a new
// project is remembered and the host opens it, a project already in the list is named with a link to
// it and nothing is created, and a target the server cannot read keeps the dialog open with the typed
// value, the server's own words and the path it checked. A refused (403) or unreachable request shows
// its fixed copy in the same notice. Every message, name and path is a React text node (T-08-30).
import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { ApiError, addProject, type AddProjectResponse } from '../api.ts';
import { AppLink } from '../nav.tsx';
import { projectRootPath } from '../project-path.ts';
import { projectsKey } from '../query-keys.ts';
import { Button } from './ui/button.tsx';

const FAILURE_HEADING = 'Could not add this project.';

export interface AddProjectFormProps {
  /** Focus the field when the form mounts (the dialog's host asks for it). */
  autoFocus?: boolean;
  /** The field's element, so a dialog can name it as its initial focus. */
  inputRef?: React.Ref<HTMLInputElement>;
  /** A new project was added and remembered. The host opens it (adding opens a project, D-09). */
  onAdded(slug: string): void;
  /** The person followed the duplicate message's link to the project already in the list. */
  onOpenExisting?(): void;
  /** Controls placed before the submit button in its row (the dialog's "Close without adding"). */
  secondaryAction?: React.ReactNode;
}

/** What went wrong, as the notice shows it. `invalid` marks the field when the value itself is at
 * fault (the server read the text and refused it), not when the request never got an answer. */
interface Failure {
  heading: string | null;
  message: string;
  pathChecked: string | null;
  invalid: boolean;
}

function pathCheckedOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('status' in body)) return null;
  const { status } = body as { status: unknown };
  if (typeof status !== 'object' || status === null || !('pathChecked' in status)) return null;
  const { pathChecked } = status as { pathChecked: unknown };
  return typeof pathChecked === 'string' && pathChecked !== '' ? pathChecked : null;
}

function failureOf(error: unknown): Failure {
  if (!(error instanceof ApiError)) {
    return { heading: null, message: 'Labelore could not add this project.', pathChecked: null, invalid: false };
  }
  // A refused or unreachable request carries the fixed copy; the value was never judged.
  if (error.kind !== 'http') return { heading: null, message: error.message, pathChecked: null, invalid: false };
  if (error.status === 422) {
    return { heading: FAILURE_HEADING, message: error.message, pathChecked: pathCheckedOf(error.body), invalid: true };
  }
  return { heading: null, message: error.message, pathChecked: null, invalid: error.status === 400 };
}

export function AddProjectForm({
  autoFocus = false,
  inputRef,
  onAdded,
  onOpenExisting,
  secondaryAction,
}: AddProjectFormProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const noticeId = useId();
  const [value, setValue] = useState('');

  const mutation = useMutation<AddProjectResponse, unknown, string>({
    mutationFn: (target) => addProject(target),
    onSuccess: async (added) => {
      if (added.duplicate) return;
      await queryClient.invalidateQueries({ queryKey: projectsKey });
      onAdded(added.slug);
    },
  });

  const failure = mutation.isError ? failureOf(mutation.error) : null;
  const duplicate = mutation.data?.duplicate ? mutation.data : null;
  const noticeShown = failure !== null || duplicate !== null;

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(value);
  }

  function change(next: string): void {
    setValue(next);
    // The notice described the text that was typed before; once it changes the notice is stale.
    if (noticeShown) mutation.reset();
  }

  return (
    <form className="project-add-form" onSubmit={submit} noValidate>
      <Field.Root invalid={failure?.invalid === true}>
        <Field.Label>Project location</Field.Label>
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          name="target"
          placeholder="/home/you/Work/portal or ssh://host/path"
          value={value}
          onChange={(event) => change(event.currentTarget.value)}
          aria-describedby={noticeShown ? noticeId : undefined}
        />
      </Field.Root>
      {failure ? (
        <div className="notice destructive" id={noticeId} role="alert">
          {failure.heading ? (
            <p>
              <strong>{failure.heading}</strong>
            </p>
          ) : null}
          <p>{failure.message}</p>
          {failure.pathChecked ? <p className="source-note">{`Path checked: ${failure.pathChecked}`}</p> : null}
        </div>
      ) : null}
      {duplicate ? (
        <div className="notice" id={noticeId} role="status">
          <p>{`${duplicate.name} is already in your list.`}</p>
          <AppLink className="text-link" to={projectRootPath(duplicate.slug)} onClick={onOpenExisting}>
            {`Open ${duplicate.name}`}
          </AppLink>
        </div>
      ) : null}
      <div>
        {secondaryAction}
        <Button disabled={mutation.isPending} type="submit" variant="default">
          {mutation.isPending ? 'Adding…' : 'Add project'}
        </Button>
      </div>
    </form>
  );
}
