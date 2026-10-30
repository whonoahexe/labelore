// The add dialog (PLAT-07, D-13): opened from the switcher's "Add or scan…" entry. It is modal, starts
// with focus in the "Project location" field and hosts the same AddProjectForm the landing page
// holds. A new project is remembered and opened at once (D-09): the dialog closes and the app goes to
// that project's dashboard. "Scan a folder instead" goes to the landing page, where the scan lives.
import { useRef } from 'react';
import { AddProjectForm } from './add-project-form.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';
import { AppLink, useAppNavigate } from '../nav.tsx';
import { projectRootPath } from '../project-path.ts';

export function ProjectAddDialog({
  open,
  onOpenChange,
  finalFocus,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Where focus goes when the dialog closes without opening a project (the switcher's trigger). */
  finalFocus?: React.RefObject<HTMLElement | null>;
}): React.JSX.Element {
  const navigate = useAppNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="project-add-dialog"
        showCloseButton={false}
        initialFocus={inputRef}
        {...(finalFocus ? { finalFocus } : {})}
      >
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Enter a folder on this machine or an ssh:// target. Labelore reads it and never changes it.
          </DialogDescription>
        </DialogHeader>
        <AddProjectForm
          autoFocus
          inputRef={inputRef}
          onAdded={(slug) => {
            onOpenChange(false);
            navigate(projectRootPath(slug));
          }}
          onOpenExisting={() => onOpenChange(false)}
          secondaryAction={
            <DialogClose render={<Button type="button" variant="ghost" />}>Close without adding</DialogClose>
          }
        />
        <AppLink className="text-link" to="/" onClick={() => onOpenChange(false)}>
          Scan a folder instead
        </AppLink>
      </DialogContent>
    </Dialog>
  );
}
