import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

/** Inside a workstream scope an artifact's `path` is the scope's virtual `.planning/...` path and its
 * `realPath` is the file on disk (Phase 11, 11-28 scope decision: realPath is what copy-path and file facts
 * show). The map is path to realPath for the artifacts that carry one; a flat project's is empty. */
const RealPathContext = createContext<ReadonlyMap<string, string>>(new Map());

/** Path to realPath for every artifact that has a realPath. */
export function realPathMap(
  artifacts: ReadonlyArray<{ path: string; realPath?: string }>,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const artifact of artifacts) if (artifact.realPath !== undefined) map.set(artifact.path, artifact.realPath);
  return map;
}

/** What copy-path copies: the artifact's realPath when it has one, else its path. An explicit `realPath`
 * wins over the map. */
export function copyPathText(path: string, realPaths: ReadonlyMap<string, string>, realPath?: string): string {
  return realPath ?? realPaths.get(path) ?? path;
}

/** Hands a scoped presentation's real paths to every copy-path button below it. */
export function RealPathProvider({
  artifacts,
  children,
}: {
  artifacts: ReadonlyArray<{ path: string; realPath?: string }>;
  children: React.ReactNode;
}): React.JSX.Element {
  const map = useMemo(() => realPathMap(artifacts), [artifacts]);
  return <RealPathContext.Provider value={map}>{children}</RealPathContext.Provider>;
}

/**
 * quick-260923-jxp (JXP-09): the copy-path icon button that replaces the raw file-path caption on
 * every artifact page. Mirrors `invalid-project-screen.tsx`'s `CopyField` shape (the house copy
 * pattern): `Copy` → `Check` for ~1.5s on success, a native `title` tooltip (no Tooltip primitive
 * exists in `src/web/components/ui/`), and a silent catch so an unavailable clipboard
 * (`navigator.clipboard` undefined, or a denied permission) changes nothing — the button just sits
 * there, inert. `path` is always the project-relative artifact path; never the project root. Inside a workstream scope the
 * button copies the file's real path instead (`realPath`, or the one the scope's presentation maps `path` to).
 */
export function CopyPathButton({ path, realPath }: { path: string; realPath?: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const text = copyPathText(path, useContext(RealPathContext), realPath);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy(): Promise<void> {
    // Silent on failure — an unavailable/denied clipboard (or plain http with no fallback) leaves
    // the button inert, mirroring CopyField.
    if (!(await copyText(text))) return;
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
      title={text}
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
