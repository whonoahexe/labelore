// The folder scan (PLAT-05, D-13 to D-16): a field to name a folder inside home, a button that starts the
// scan, and a checklist of the GSD projects it found. Scanning happens only when the button is pressed,
// never at startup and never by itself (D-16). The checklist counts the projects that can still be added;
// one already in the list is shown, disabled and marked 'Already added'. Adding the picked ones remembers
// them without loading any (D-14): the list above gains rows, focus moves to the status line, and nothing
// navigates. Checked state is local; a new scan, or leaving the page, clears the results. Every name, path
// and message is a React text node (T-08-38).
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@base-ui/react/checkbox';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Check, Folder, Loader } from 'lucide-react';
import {
  ApiError,
  UNREACHABLE_COPY,
  addProjects,
  scanFolder,
  type AddProjectsResponse,
  type ScanFolderResponse,
  type ScannedProject,
} from '../api.ts';
import { projectsKey } from '../query-keys.ts';
import { Button } from './ui/button.tsx';

/** The scan legend and the add button for `n` projects that can still be added (UI-SPEC zero-one-many). */
export function scanCopy(n: number, folder: string): { legend: string; add: string } {
  return {
    legend: `Found ${n} ${n === 1 ? 'project' : 'projects'} in ${folder}`,
    add: n === 0 ? 'Add projects' : `Add ${n} ${n === 1 ? 'project' : 'projects'}`,
  };
}

/** What the status line and the polite live region say once the picked projects are remembered. */
export function addedCopy(n: number): string {
  return n === 1
    ? 'Added 1 project. It opens the first time you choose it.'
    : `Added ${n} projects. They open the first time you choose them.`;
}

function failureText(error: unknown): string {
  return error instanceof ApiError ? error.message : UNREACHABLE_COPY;
}

/** True when the server read the folder text and refused it, so the field is marked invalid. */
function refusedFolder(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'http' && (error.status === 400 || error.status === 422);
}

function ScanItem({
  project,
  checked,
  added,
  onToggle,
}: {
  project: ScannedProject;
  checked: boolean;
  /** Already in the list: from the scan itself, or added by the button above. */
  added: boolean;
  onToggle: (path: string, next: boolean) => void;
}): React.JSX.Element {
  const nameId = useId();
  const pathId = useId();
  const chipId = useId();
  return (
    <label className="project-scan-item" data-disabled={added ? 'true' : 'false'}>
      <Checkbox.Root
        aria-describedby={added ? `${pathId} ${chipId}` : pathId}
        aria-labelledby={nameId}
        checked={added ? false : checked}
        disabled={added}
        onCheckedChange={(next) => onToggle(project.path, next)}
      >
        <Checkbox.Indicator>
          <Check aria-hidden="true" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span data-part="text">
        <span data-part="name" id={nameId}>
          {project.name}
        </span>
        <span data-part="path" id={pathId} title={project.path}>
          <Folder aria-hidden="true" />
          <span>{project.displayPath}</span>
        </span>
      </span>
      {added ? (
        <span className="status-chip" data-tone="quiet" id={chipId}>
          Already added
        </span>
      ) : null}
    </label>
  );
}

export function ProjectScan(): React.JSX.Element {
  const queryClient = useQueryClient();
  const noticeId = useId();
  const [folder, setFolder] = useState('');
  /** The folder as typed when the running scan started, for 'Scanning {folder}…'. */
  const [scanning, setScanning] = useState('');
  const [result, setResult] = useState<ScanFolderResponse | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  /** The projects this checklist has added since the scan, so they read 'Already added'. */
  const [addedNow, setAddedNow] = useState<ReadonlySet<string>>(new Set());
  const [done, setDone] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const selectAllRef = useRef<HTMLButtonElement | null>(null);
  const clearRef = useRef<HTMLButtonElement | null>(null);

  const scan = useMutation<ScanFolderResponse, unknown, string>({
    mutationFn: (typed) => scanFolder(typed),
    onSuccess: (found) => {
      setResult(found);
      setChecked(new Set(found.found.filter((project) => !project.alreadyAdded).map((project) => project.path)));
    },
  });

  const add = useMutation<AddProjectsResponse, unknown, string[]>({
    mutationFn: (targets) => addProjects(targets),
    onSuccess: async (answer, targets) => {
      // A target the server could not add keeps its box; the rest are in the list now.
      const failed = new Set(answer.results.filter((entry) => entry.error !== undefined).map((entry) => entry.target));
      const remembered = targets.filter((target) => !failed.has(target));
      setAddedNow((before) => new Set([...before, ...remembered]));
      setChecked((before) => new Set([...before].filter((path) => failed.has(path))));
      setSkipped(answer.results.flatMap((entry) => (entry.error === undefined ? [] : [entry.error])));
      setDone(remembered.length > 0 ? addedCopy(remembered.length) : null);
      await queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });

  // The status line takes focus once, when the picked projects have been remembered.
  useEffect(() => {
    if (done !== null) statusRef.current?.focus();
  }, [done]);

  const scanFailure = scan.isError ? failureText(scan.error) : null;
  const addFailure = add.isError ? failureText(add.error) : null;
  const noticeShown = scanFailure !== null;

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // A second scan cannot start until the first ends.
    if (scan.isPending) return;
    const typed = folder.trim();
    setScanning(typed);
    // A new scan clears the last one's results (UI-SPEC section 6).
    setResult(null);
    setChecked(new Set());
    setAddedNow(new Set());
    setDone(null);
    setSkipped([]);
    add.reset();
    scan.mutate(typed);
  }

  function change(next: string): void {
    setFolder(next);
    // The notice described the text that was typed before; once it changes the notice is stale.
    if (scan.isError) scan.reset();
  }

  function toggle(path: string, next: boolean): void {
    setChecked((before) => {
      const after = new Set(before);
      if (next) after.add(path);
      else after.delete(path);
      return after;
    });
  }

  const found = result?.found ?? [];
  const selectable = found.filter((project) => !project.alreadyAdded);
  const open = selectable.filter((project) => !addedNow.has(project.path));
  const picked = open.filter((project) => checked.has(project.path));
  const copy = scanCopy(selectable.length, result?.folder ?? '');

  function selectAll(): void {
    setChecked(new Set(open.map((project) => project.path)));
    // The button that was pressed is disabled now; the other one is the next thing a person may want.
    clearRef.current?.focus();
  }

  function clearSelection(): void {
    setChecked(new Set());
    selectAllRef.current?.focus();
  }

  function addPicked(): void {
    if (add.isPending || picked.length === 0) return;
    add.mutate(picked.map((project) => project.path));
  }

  return (
    <div>
      <form className="project-add-form" noValidate onSubmit={submit}>
        <Field.Root invalid={scan.isError && refusedFolder(scan.error)}>
          <Field.Label>Folder to scan</Field.Label>
          <Input
            aria-describedby={noticeShown ? noticeId : undefined}
            autoComplete="off"
            name="folder"
            onChange={(event) => change(event.currentTarget.value)}
            placeholder="~/Work"
            spellCheck={false}
            value={folder}
          />
          <Field.Description>
            Looks two levels down inside your home folder. Hidden folders, node_modules and symlinks are skipped.
          </Field.Description>
        </Field.Root>
        {scanFailure !== null ? (
          <div className="notice destructive" id={noticeId} role="alert">
            <p>{scanFailure}</p>
          </div>
        ) : null}
        <div>
          <Button disabled={scan.isPending} type="submit" variant="outline">
            {scan.isPending ? 'Scanning…' : 'Scan folder'}
          </Button>
        </div>
      </form>

      {scan.isPending ? (
        <div className="quiet-state" role="status">
          <Loader aria-hidden="true" />
          <p>{`Scanning ${scanning}…`}</p>
        </div>
      ) : null}

      {result !== null && found.length === 0 ? (
        <div className="empty-flow" data-tone="quiet" role="status">
          <Folder aria-hidden="true" />
          <div>
            <h3>{`No GSD projects found in ${result.folder}.`}</h3>
            <p>
              Labelore looked two levels down. Try a folder one level up, or add a project by its location above.
            </p>
          </div>
        </div>
      ) : null}

      {result !== null && found.length > 0 ? (
        <div className="project-scan-results">
          {result.capped ? (
            <div className="notice" role="status">
              <p>{`Showing the first ${result.cap} projects found. Scan a narrower folder to see the rest.`}</p>
            </div>
          ) : null}
          {/* Mounted before it has words, so the polite region is already there when the line fills. */}
          <p ref={statusRef} role="status" tabIndex={-1}>
            {done}
          </p>
          {skipped.length > 0 ? (
            <div className="notice destructive" role="alert">
              {skipped.map((message, index) => (
                <p key={`${index}:${message}`}>{message}</p>
              ))}
            </div>
          ) : null}
          {addFailure !== null ? (
            <div className="notice destructive" role="alert">
              <p>{addFailure}</p>
            </div>
          ) : null}
          <fieldset>
            <legend aria-live="polite">{copy.legend}</legend>
            <div data-part="controls">
              <button
                className="text-link"
                disabled={open.length === 0 || picked.length === open.length}
                onClick={selectAll}
                ref={selectAllRef}
                type="button"
              >
                Select all projects
              </button>
              <button
                className="text-link"
                disabled={picked.length === 0}
                onClick={clearSelection}
                ref={clearRef}
                type="button"
              >
                Clear selection
              </button>
            </div>
            {found.map((project) => (
              <ScanItem
                added={project.alreadyAdded || addedNow.has(project.path)}
                checked={checked.has(project.path)}
                key={project.path}
                onToggle={toggle}
                project={project}
              />
            ))}
            <div data-part="foot">
              <Button
                disabled={picked.length === 0 || add.isPending}
                onClick={addPicked}
                type="button"
                variant="default"
              >
                {add.isPending ? 'Adding…' : scanCopy(picked.length, result.folder).add}
              </Button>
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
