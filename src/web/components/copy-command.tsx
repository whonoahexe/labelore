import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { copyText } from './copy-path-button.tsx';

/** How long the button reads "Copied" before it goes back to "Copy command". */
export const COPIED_RESET_MS = 1500;

/**
 * Writes `command` to the clipboard and nothing else (D-06). The caller passes one of the constant commands,
 * never text taken from a file, and this function issues no request and runs nothing: Labelore never runs the
 * command, the person pastes it in their terminal. `copy` is the clipboard writer, replaceable so a test can
 * record what is written; it resolves `false` when the clipboard refuses, and the caller stays silent then.
 */
export async function copyCommandToClipboard(
  command: string,
  copy: (text: string) => Promise<boolean> = (text) => copyText(text),
): Promise<boolean> {
  return await copy(command);
}

/**
 * The shared "copy-command" row: the command as selectable mono text that wraps, outside its button, then a
 * "Copy command" button whose aria-label names the command. After a copy the button reads "Copied" with a
 * Check icon and a quiet sr-only status announces it; no toast is raised (RESEARCH C2: the shared Toast is
 * destructive-toned and the house copy button never used one). The command and the button's label are
 * React text, never markup.
 */
export function CopyCommandView({
  command,
  copied,
  onCopy,
}: {
  command: string;
  copied: boolean;
  onCopy: () => void;
}): React.JSX.Element {
  return (
    <div className="copy-command">
      <code className="copy-command-text">{command}</code>
      <Button
        aria-label={`Copy command: ${command}`}
        className="copy-command-button"
        data-copied={copied ? 'true' : 'false'}
        onClick={onCopy}
        size="xs"
        type="button"
        variant="secondary"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Copy command'}</span>
      </Button>
      <span className="sr-only" role="status">
        {copied ? 'Command copied' : ''}
      </span>
    </div>
  );
}

/** The copy-command row with its own "Copied" state: it flips for 1.5 seconds after a successful copy. */
export function CopyCommand({ command }: { command: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy(): Promise<void> {
    // Silent on failure, as the copy-path button is: an unavailable or denied clipboard leaves the button as it was.
    if (!(await copyCommandToClipboard(command))) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return <CopyCommandView command={command} copied={copied} onCopy={() => void handleCopy()} />;
}
