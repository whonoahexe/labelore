import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';

/** The first toast/snackbar primitive in this codebase — there is no existing mechanism to
 * extend. Thin wrapper following `reference-preview.tsx`'s convention: typed props pass-through,
 * no state duplicated from the primitive. Mount `ToastProvider` exactly once, wrapping the app
 * shell's root subtree — never per page — so every descendant's `useToastManager()` call resolves
 * against this single provider. */
export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

/** Maps every active toast to a `Toast.Root`. D-04's refresh-failure toast is the only producer
 * today, so every toast renders with the `destructive` tone. */
export function ToastList(): React.JSX.Element {
  const { toasts } = Toast.useToastManager();
  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast} className="toast" data-tone="destructive">
          <Toast.Title />
          <Toast.Description />
          <Toast.Close aria-label="Dismiss">
            <X aria-hidden="true" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </>
  );
}

// `@base-ui/react/toast`'s top-level index only re-exports `useToastManager` as a type — the
// runtime value lives on the `Toast` namespace (`export * as Toast from "./index.parts.js"`).
// Re-exported here so callers never have to know that split and never import the primitive path
// twice.
export const useToastManager = Toast.useToastManager;
