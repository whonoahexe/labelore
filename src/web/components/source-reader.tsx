// Source mode's reader (Phase 12: SRC-02, D-01, D-05): a text file as written, one row per line, each with a
// line-number link to #L{n}. The text comes from the read-only /source route; every line is a React text
// child, so file text can never become markup (T-12-05). A line fragment on the page's URL marks its rows when
// the text first loads; a SourceTarget from the page marks and scrolls to a row the same way. The reader only
// reads window.location.hash; it never writes the URL (selection by click arrives in 12-08).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { FileClass } from '../../planning-repo/file-class.ts';
import { filePageKindOf } from '../../presentation/file-facts.ts';
import { parseLineHash } from '../../presentation/source-link.ts';
import type { LineRange } from '../../presentation/source-link.ts';
import { useProjectScope, useProjectSlug } from '../nav.tsx';
import { fetchSource, sourceKey } from '../source/source-api.ts';
import type { SourceTarget } from '../source/source-api.ts';
import { CopyPathButton, copyText } from './copy-path-button.tsx';
import { SourceNotice } from './source-notice.tsx';
import { Button } from './ui/button.tsx';

/** The rows of a text: split on newline, a final newline adds no row, a trailing carriage return is not drawn. */
export function sourceLinesOf(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
}

/**
 * The 1-based line a target lands on. A heading target with no id lands on line 1; a line target lands on its
 * line clamped to the file; any other heading id lands on line 1 until 12-08 maps headings to lines.
 */
export function resolveTargetLine(text: string, _bodyStart: number, target: SourceTarget): number {
  const lineCount = Math.max(sourceLinesOf(text).length, 1);
  if (target.kind === 'line') return Math.min(Math.max(Math.floor(target.line), 1), lineCount);
  return 1;
}

function scrollRowIntoView(line: number): void {
  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.document.getElementById(`L${line}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
}

/** Copies exactly the served (masked) text; the label becomes "Copied" for 1.5 s, silent when the clipboard refuses. */
function CopyContentsButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function handleCopy(): Promise<void> {
    if (!(await copyText(text))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button type="button" size="xs" variant="ghost" aria-label="Copy contents" data-copied={copied ? 'true' : 'false'} onClick={handleCopy}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span>{copied ? 'Copied' : 'Copy contents'}</span>
    </Button>
  );
}

interface Landing {
  /** The line to scroll to. */
  line: number;
  /** Changes with every landing so the same line twice still scrolls twice. */
  token: number;
}

function SourceRows({
  text,
  bodyStart,
  name,
  path,
  realPath,
  target,
}: {
  text: string;
  bodyStart: number;
  name: string;
  path: string;
  realPath: string | undefined;
  target: SourceTarget | null;
}): React.JSX.Element {
  const lines = useMemo(() => sourceLinesOf(text), [text]);
  const [selected, setSelected] = useState<LineRange | null>(() =>
    parseLineHash(window.location.hash, Math.max(lines.length, 1)),
  );
  const [hit, setHit] = useState<number | null>(null);
  const [landing, setLanding] = useState<Landing | null>(() =>
    selected === null ? null : { line: selected.from, token: 0 },
  );
  const [appliedSeq, setAppliedSeq] = useState<number | null>(null);

  // A new target lands once (adjusting state while rendering, keyed on the target's own seq).
  if (target !== null && target.seq !== appliedSeq) {
    setAppliedSeq(target.seq);
    const line = resolveTargetLine(text, bodyStart, target);
    setHit(line);
    if (target.kind === 'line' && target.select) {
      setSelected(parseLineHash(window.location.hash, Math.max(lines.length, 1)) ?? { from: line, to: line });
    }
    setLanding({ line, token: target.seq + 1 });
  }

  useEffect(() => {
    if (landing !== null) scrollRowIntoView(landing.line);
  }, [landing]);

  return (
    <section className="source-reader" role="region" aria-label={`Source of ${name}`}>
      <div className="source-bar" role="toolbar" aria-label="Source tools">
        <CopyPathButton path={path} {...(realPath === undefined ? {} : { realPath })} label="Copy path" />
        <CopyContentsButton text={text} />
      </div>
      <div className="source-pane">
        <div className="source-code">
          {lines.map((line, index) => {
            const number = index + 1;
            const isSelected = selected !== null && number >= selected.from && number <= selected.to;
            return (
              <div
                key={number}
                id={`L${number}`}
                className="source-row"
                data-selected={isSelected ? 'true' : undefined}
                data-source-hit={hit === number ? 'true' : undefined}
              >
                <a className="source-line-number" href={`#L${number}`} aria-label={`Line ${number}`}>
                  {number}
                </a>
                <span className="source-line-text">{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SourceReader({
  route,
  name,
  path,
  realPath,
  fileClass,
  sizeBytes,
  target,
  onOpenView,
}: {
  route: string;
  name: string;
  path: string;
  realPath?: string;
  /** From the cached presentation artifact; null when it is not known (the text is then requested). */
  fileClass: FileClass | null;
  sizeBytes: number | null;
  target: SourceTarget | null;
  onOpenView?: () => void;
}): React.JSX.Element | null {
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  // D-07: a file with no text is told apart from the presentation alone, so nothing is requested for it.
  const kind = fileClass === null || sizeBytes === null ? 'text' : filePageKindOf(fileClass, sizeBytes);
  const hasText = kind === 'text' && sizeBytes !== 0;
  const query = useQuery({
    queryKey: sourceKey(slug, scope, route),
    queryFn: () => fetchSource(slug, scope, route),
    staleTime: Number.POSITIVE_INFINITY,
    enabled: hasText,
  });
  const notice = (noticeKind: Parameters<typeof SourceNotice>[0]['kind']): React.JSX.Element | null => (
    <SourceNotice
      kind={noticeKind}
      name={name}
      path={path}
      {...(realPath === undefined ? {} : { realPath })}
      sizeBytes={sizeBytes}
      {...(onOpenView === undefined ? {} : { onOpenView })}
    />
  );
  if (kind !== 'text') return notice(kind);
  if (sizeBytes === 0) return notice('empty');
  if (query.isPending) {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="artifact-loading" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (query.isError) {
    return (
      <section className="notice destructive" role="alert">
        <p>{query.error.message}</p>
      </section>
    );
  }
  if (query.data.text === '') return notice('empty');
  return (
    <SourceRows
      text={query.data.text}
      bodyStart={query.data.bodyStart}
      name={name}
      path={path}
      realPath={realPath}
      target={target}
    />
  );
}
