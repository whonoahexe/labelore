import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from './ui/button.tsx';

/** `navigator.clipboard` only exists in secure contexts; over plain http fall back to execCommand. */
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/** The house copy pattern, shared with the UI-SPEC preset field (quick-261001-qk6): the clipboard
 * API when it exists, else the execCommand fallback; `false` when neither worked or the clipboard
 * refused — callers stay silent on failure. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return legacyCopy(text);
  } catch {
    return false;
  }
}

/**
 * quick-260923-jxp (JXP-09): the copy-path icon button that replaces the raw file-path caption on
 * every artifact page. Mirrors `invalid-project-screen.tsx`'s `CopyField` shape (the house copy
 * pattern): `Copy` → `Check` for ~1.5s on success, a native `title` tooltip (no Tooltip primitive
 * exists in `src/web/components/ui/`), and a silent catch so an unavailable clipboard
 * (`navigator.clipboard` undefined, or a denied permission) changes nothing — the button just sits
 * there, inert. `path` is always the project-relative artifact path; never the project root.
 */
export function CopyPathButton({ path }: { path: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy(): Promise<void> {
    // Silent on failure — an unavailable/denied clipboard (or plain http with no fallback) leaves
    // the button inert, mirroring CopyField.
    if (!(await copyText(path))) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      aria-label="Copy file path"
      className="artifact-path-copy"
      data-copied={copied ? 'true' : 'false'}
      onClick={handleCopy}
      size="icon-sm"
      title={path}
      type="button"
      variant="ghost"
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span className="sr-only" role="status">
        {copied ? 'Path copied' : ''}
      </span>
    </Button>
  );
}
