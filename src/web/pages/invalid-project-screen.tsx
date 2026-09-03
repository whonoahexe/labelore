import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import type { FailedLoadStatus } from '../../planning-repo/types.ts';
import { Button } from '../components/ui/button.tsx';
import { ThemeToggle } from '../components/theme-toggle.tsx';

/**
 * D-17: the only restart affordance on this screen is copy-to-terminal. `package.json` declares
 * no `bin` entry, so `npx gsd-lore ...` is not a real invocation for this repo — `dev` is the
 * declared script that starts the server against a path argument.
 */
const RESTART_COMMAND = 'npm run dev -- /path/to/your/project';

/**
 * D-16/D-17's copyable monospace field. Copy handler reuses `copyHeadingUrl`'s exact shape from
 * `artifact-page.tsx`: try the clipboard write, swap the icon to a checkmark for ~1.5s on
 * success, and do nothing visible on a denied permission — no toast, no error state.
 */
function CopyField({ label, value }: { label: string; value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent — the field's value remains fully visible and selectable when clipboard
      // permission is unavailable, mirroring copyHeadingUrl's own fallback.
    }
  }

  return (
    <div className="copy-field">
      <p className="copy-field-label">{label}</p>
      <div className="copy-field-row">
        <code className="copy-field-value">{value}</code>
        <Button
          aria-label="Copy to clipboard"
          className="copy-field-button"
          onClick={handleCopy}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * D-14 through D-17's whole-app failure screen — the one surface rendered for every non-ok
 * `LoadStatus`. D-15: exactly one generic heading and one visual treatment for every failure
 * kind; only the status-specific detail line below it differs, and it is rendered verbatim from
 * the server's own `LOAD_STATUS_MESSAGES` output — never re-derived or re-worded here.
 */
export function InvalidProjectScreen({
  loadStatus,
}: {
  loadStatus: FailedLoadStatus;
}): React.JSX.Element {
  const hasDistinctRawPath =
    loadStatus.status === 'path-not-found' && loadStatus.rawPath !== loadStatus.pathChecked;

  return (
    <main className="invalid-project-screen">
      <div className="invalid-project-theme-slot">
        <ThemeToggle />
      </div>
      <section className="invalid-project-panel" role="alert">
        <ShieldAlert aria-hidden="true" className="invalid-project-icon" />
        <h1>Project could not be loaded.</h1>
        <p className="invalid-project-detail">{loadStatus.message}</p>

        {loadStatus.status === 'path-not-found' && hasDistinctRawPath ? (
          <>
            <CopyField label="As typed" value={loadStatus.rawPath} />
            <CopyField label="Resolved to" value={loadStatus.pathChecked} />
          </>
        ) : (
          <CopyField label="Path checked" value={loadStatus.pathChecked} />
        )}

        <CopyField label="Restart with a corrected path" value={RESTART_COMMAND} />
      </section>
    </main>
  );
}
