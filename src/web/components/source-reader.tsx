// Source mode's structure reader (Phase 12: SRC-01, SRC-02, D-01, D-03, D-04, D-05; sketch 062 variant E): a text
// file as written, one row per line, each row [line number | bracket gutter | tone-highlighted text]. The gutter
// draws the file's nested blocks as brackets and every block folds to one line; the sticky bar holds the fold
// presets, Wrap, the copy buttons and the "Here" path. The text comes from the read-only /source route; every
// line is a list of React text children, so file text can never become markup (T-12-05, T-12-22). A line
// fragment on the page's URL marks its rows when the text first loads; a SourceTarget from the page marks and
// scrolls to a row the same way. Clicks on line numbers select a line or a range (D-05); the selection reaches the
// URL only through writeSelectionHash in src/web/source/source-selection.ts, which replaces the current history
// entry, so this file never touches history itself.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, WrapText, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { FileClass } from '../../planning-repo/file-class.ts';
import { filePageKindOf } from '../../presentation/file-facts.ts';
import { parseLineHash } from '../../presentation/source-link.ts';
import type { LineRange } from '../../presentation/source-link.ts';
import { useProjectScope, useProjectSlug } from '../nav.tsx';
import { fetchSource, sourceKey } from '../source/source-api.ts';
import type { SourceTarget } from '../source/source-api.ts';
import { highlightLine, lineContextsOf } from '../source/source-highlight.ts';
import type { ToneToken } from '../source/source-highlight.ts';
import { selectionAfter, selectionLabel, selectionLinkOf, selectionOf, writeSelectionHash } from '../source/source-selection.ts';
import type { Selection, SelectionEvent } from '../source/source-selection.ts';
import {
  buildSourceModel,
  chainAt,
  defaultFolds,
  foldIdsOf,
  foldPresetsOf,
  gutterOf,
  hiddenLinesOf,
  languageOf,
  unfoldFor,
} from '../source/source-model.ts';
import type { FoldPreset, Gutter, SourceBlock, SourceModel } from '../source/source-model.ts';
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

/** How long a landed row flashes (the stylesheet's keyframe runs the same 1.4 s). */
const FLASH_MS = 1400;

/**
 * Scrolls a row to just under the sticky bar: the row's scroll margin is the bar's pinned top plus its height, so
 * the same call works under the 60px shell header on a wide screen and at the top of the page on a phone.
 */
function scrollRowIntoView(line: number): void {
  const row = window.document.getElementById(`L${line}`);
  if (row === null) return;
  const bar = window.document.querySelector<HTMLElement>('.source-bar');
  let offset = 0;
  if (bar !== null) {
    const pinned = Number.parseFloat(window.getComputedStyle(bar).top);
    offset = (Number.isFinite(pinned) ? pinned : 0) + bar.offsetHeight;
  }
  row.style.scrollMarginTop = `${offset + 4}px`;
  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
}

/** Every line's tone tokens, from one pass over the model (the reader holds them, memoised, for the text's life). */
export function highlightAll(model: SourceModel, masked: boolean): ToneToken[][] {
  const contexts = lineContextsOf(model);
  return model.lines.map((line, index) =>
    highlightLine(line, { language: model.language, masked, ...(contexts[index] ?? { inFrontmatter: false, inFence: false }) }),
  );
}

/** The fold set a preset button produces: None empties it, any other preset folds exactly its blocks. */
export function foldsAfterPreset(model: SourceModel, preset: FoldPreset): Set<number> {
  return foldIdsOf(model, preset);
}

/** A preset reads as pressed when the fold set equals the set that preset would produce. */
export function presetPressed(model: SourceModel, folded: ReadonlySet<number>, preset: FoldPreset): boolean {
  const ids = foldIdsOf(model, preset);
  if (ids.size !== folded.size) return false;
  for (const id of ids) if (!folded.has(id)) return false;
  return true;
}

/** The fold set with every folded block that hides a line of the range taken out (landing inside a fold opens it). */
export function foldsOpenedFor(model: SourceModel, folded: ReadonlySet<number>, range: LineRange): ReadonlySet<number> {
  const open = unfoldFor(model, folded, range);
  if (open.length === 0) return folded;
  const next = new Set(folded);
  for (const id of open) next.delete(id);
  return next;
}

/** Characters a row holds besides its text: the 6ch number column, the 1ch gutter padding and the text's 2ch end padding. */
const ROW_CHROME_CH = 9;
/** A folded row's first line is followed by its chip ("▸ name · 123 lines"), so a row is never narrower than this many characters of text. */
const MIN_TEXT_CH = 48;
/** The gutter's 1.6ch column per depth, rounded up to a whole character. */
const GUTTER_CELL_CH = 1.6;

const MASK_TITLE = 'Masked by Labelore; the file holds the real value';

function ToneText({ tokens }: { tokens: readonly ToneToken[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) =>
        token.tone === null ? (
          token.text
        ) : (
          <span
            key={index}
            className={`source-t-${token.tone}`}
            {...(token.tone === 'mask' ? { title: MASK_TITLE } : {})}
          >
            {token.text}
          </span>
        ),
      )}
    </>
  );
}

/** A block's name as the toggle, chip and crumb say it: its label, then the `<name>` of an element that has one. */
function blockNameOf(block: SourceBlock): string {
  return block.name === null ? block.label : `${block.label} ${block.name}`;
}

/** "▸ {name} · {n} lines" (frontmatter: "▸ {k} keys · {n} lines"); a section or table keeps its own first line, so just the count. */
function FoldChipText({ block, model }: { block: SourceBlock; model: SourceModel }): React.JSX.Element {
  const count = block.to - block.from + 1;
  const lead =
    block.kind === 'xml' && block.name !== null
      ? block.name
      : block.kind === 'frontmatter' && model.frontmatter !== null
        ? `${model.frontmatter.keyCount} keys`
        : null;
  return (
    <>
      {'▸ '}
      {lead === null ? null : (
        <>
          <strong>{lead}</strong>
          {' · '}
        </>
      )}
      {count} lines
    </>
  );
}

/**
 * The reader's rows, drawn without any query or state of their own so the markup can be rendered on its own:
 * hidden rows (inside a folded block) are skipped, so the numbers jump over a folded run. Hovering a bracket
 * lights that block's cells by setting `data-hot` straight on the elements (no React state per hover).
 */
export function SourceRows({
  model,
  gutter,
  tokens,
  folded,
  selected,
  hit,
  hitToken,
  onToggle,
  onNumber,
}: {
  model: SourceModel;
  gutter: Gutter;
  tokens: readonly (readonly ToneToken[])[];
  folded: ReadonlySet<number>;
  selected: LineRange | null;
  hit: number | null;
  /** Changes with every landing; it keys the landed row so the flash replays when the same line lands twice. */
  hitToken?: number;
  onToggle: (blockId: number) => void;
  /** A plain click on a line number (shift extends); without it the number is just a link to `#L{n}`. */
  onNumber?: (line: number, shift: boolean) => void;
}): React.JSX.Element {
  const hidden = useMemo(() => hiddenLinesOf(model, folded), [model, folded]);
  // The blocks that start on each line, shallowest first, so the folded one that shapes a row is found without a search.
  const startsAt = useMemo(() => {
    const map = new Map<number, SourceBlock[]>();
    for (const block of model.blocks) {
      if (block.to <= block.from) continue;
      const list = map.get(block.from);
      if (list) list.push(block);
      else map.set(block.from, [block]);
    }
    for (const list of map.values()) list.sort((a, b) => a.depth - b.depth);
    return map;
  }, [model]);
  // The widest line, in characters: the sideways-scrolling code box takes this width itself, so rows that
  // content-visibility has not laid out cannot make the scroll width jump as the file scrolls.
  const codeWidthCh = useMemo(() => {
    const widest = model.lines.reduce((width, line) => Math.max(width, line.length), MIN_TEXT_CH);
    return Math.ceil(ROW_CHROME_CH + model.maxDepth * GUTTER_CELL_CH + widest);
  }, [model]);
  const codeRef = useRef<HTMLDivElement>(null);
  const hot = useRef<number | null>(null);

  function setHot(next: number | null): void {
    const code = codeRef.current;
    if (code === null || hot.current === next) return;
    const lightCells = (id: number, on: boolean): void => {
      // The id is a number read back from a data attribute and re-checked as an integer, never file text.
      if (!Number.isInteger(id)) return;
      for (const cell of code.querySelectorAll<HTMLElement>(`[data-block="${id}"]`)) {
        if (on) cell.dataset.hot = 'true';
        else delete cell.dataset.hot;
      }
    };
    if (hot.current !== null) lightCells(hot.current, false);
    hot.current = next;
    if (next !== null) lightCells(next, true);
  }

  function blockOf(target: EventTarget): number | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest<HTMLElement>('.source-gutter-cell[data-block]');
    if (cell === null) return null;
    const id = Number(cell.dataset.block);
    return Number.isInteger(id) ? id : null;
  }

  const rows: React.JSX.Element[] = [];
  for (let number = 1; number <= model.lines.length; number += 1) {
    if (hidden[number] === 1) continue;
    const rowNumber = number;
    const starting = startsAt.get(number);
    const foldedHere = starting?.find((block) => folded.has(block.id)) ?? null;
    const cells: React.JSX.Element[] = [];
    const row = gutter[number - 1] ?? [];
    for (let depth = 0; depth < model.maxDepth; depth += 1) {
      const cell = row[depth] ?? null;
      const block = cell === null ? null : (model.blocks[cell.blockId] ?? null);
      if (cell === null || block === null || (foldedHere !== null && block !== foldedHere && block.depth > foldedHere.depth)) {
        cells.push(<span key={depth} className="source-gutter-cell" />);
        continue;
      }
      const isFolded = folded.has(block.id);
      const state = number === block.from && isFolded ? 'one' : cell.state;
      const foldable = number === block.from && block.to > block.from;
      cells.push(
        <span
          key={depth}
          className="source-gutter-cell"
          data-block={block.id}
          data-state={state}
          title={`${blockNameOf(block)} · L${block.from}–L${block.to}`}
        >
          {foldable ? (
            <button
              type="button"
              className="source-fold-toggle"
              aria-label={`${isFolded ? 'Unfold' : 'Fold'} ${blockNameOf(block)}`}
              aria-expanded={!isFolded}
              onClick={() => onToggle(block.id)}
            >
              {isFolded ? '+' : '−'}
            </button>
          ) : null}
        </span>,
      );
    }
    const isSelected = selected !== null && number >= selected.from && number <= selected.to;
    const edge =
      isSelected && selected !== null
        ? selected.from === selected.to
          ? 'only'
          : number === selected.from
            ? 'first'
            : number === selected.to
              ? 'last'
              : undefined
        : undefined;
    rows.push(
      <div
        key={hit === number && hitToken !== undefined ? `${number}-${hitToken}` : number}
        id={`L${number}`}
        className="source-row"
        data-selected={isSelected ? 'true' : undefined}
        data-selection-edge={edge}
        data-source-hit={hit === number ? 'true' : undefined}
        data-frontmatter={model.frontmatter !== null && number <= model.frontmatter.to ? 'true' : undefined}
      >
        <span className="source-lead">
          <a
            className="source-line-number"
            href={`#L${number}`}
            aria-label={`Line ${number}`}
            onClick={
              onNumber === undefined
                ? undefined
                : (event) => {
                    // A modified click keeps the browser's own link behaviour (open in a new tab).
                    if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
                    event.preventDefault();
                    onNumber(rowNumber, event.shiftKey);
                  }
            }
          >
            {number}
          </a>
          {model.maxDepth > 0 ? <span className="source-gutter">{cells}</span> : null}
        </span>
        <span className="source-line-text">
          <ToneText tokens={tokens[number - 1] ?? []} />
          {foldedHere === null ? null : (
            <>
              {' '}
              <button
                type="button"
                className="source-fold-chip"
                aria-label={`Unfold ${blockNameOf(foldedHere)}`}
                onClick={() => onToggle(foldedHere.id)}
              >
                <FoldChipText block={foldedHere} model={model} />
              </button>
            </>
          )}
        </span>
      </div>,
    );
  }

  return (
    <div
      ref={codeRef}
      className="source-code"
      style={{ '--source-code-width': `${codeWidthCh}ch` } as React.CSSProperties}
      onMouseOver={(event) => setHot(blockOf(event.target))}
      onMouseLeave={() => setHot(null)}
      onFocus={(event) => setHot(blockOf(event.target))}
      onBlur={() => setHot(null)}
    >
      {rows}
    </div>
  );
}

/** The selection chip: "L33" or "L33–L40", Copy link (the absolute link, "Copied" for 1.5 s) and a clear button. */
function SelectionChip({ range, onClear }: { range: LineRange; onClear: () => void }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function handleCopy(): Promise<void> {
    const link = selectionLinkOf(window.location.origin, window.location.pathname, range);
    if (!(await copyText(link))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }
  return (
    <span className="source-selection status-chip" data-tone="active">
      <span>{selectionLabel(range)}</span>
      <button type="button" className="source-selection-link" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <button type="button" className="source-selection-clear" aria-label="Clear selection" onClick={onClear}>
        <X aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * The "Here" path: the chain of blocks around a line, each crumb a button that jumps to its block's first row,
 * then the line number and, while a range is selected, the selection chip. A navigation landmark with no live
 * region, so the position is never announced as it changes.
 */
export function SourceHere({
  model,
  line,
  selection = null,
  onGo,
  onClear,
}: {
  model: SourceModel;
  line: number;
  selection?: LineRange | null;
  onGo?: (line: number) => void;
  onClear?: () => void;
}): React.JSX.Element {
  const chain = chainAt(model, line);
  return (
    <nav className="source-here" aria-label="Position in file">
      <span className="source-here-label">Here</span>
      {chain.length === 0 ? (
        <span className="source-here-line">top of file</span>
      ) : (
        chain.map((block, index) => (
          <span key={block.id} className="source-here-step">
            {index > 0 ? (
              <span className="source-here-sep" aria-hidden="true">
                ›
              </span>
            ) : null}
            <button
              type="button"
              className="source-here-crumb"
              title={`L${block.from}–L${block.to}`}
              data-current={index === chain.length - 1 ? 'true' : undefined}
              onClick={() => onGo?.(block.from)}
            >
              {blockNameOf(block)}
            </button>
          </span>
        ))
      )}
      <span className="source-here-line">L{line}</span>
      {selection === null ? null : <SelectionChip range={selection} onClear={() => onClear?.()} />}
    </nav>
  );
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
      <span className="source-copy-label">{copied ? 'Copied' : 'Copy contents'}</span>
    </Button>
  );
}

/**
 * The sticky bar: row 1 holds the "Fold" label with the segmented presets, then Wrap and the two copy buttons
 * pushed right; row 2 is the Here path, which follows the scroll. With no block to fold the label and
 * presets are left out, so a plain text file's bar is just the actions.
 */
export function SourceBar({
  model,
  folded,
  wrap,
  text,
  path,
  realPath,
  presets,
  hereLine,
  selection = null,
  onPreset,
  onWrap,
  onGo,
  onClear,
}: {
  model: SourceModel;
  folded: ReadonlySet<number>;
  wrap: boolean;
  text: string;
  path: string;
  realPath: string | undefined;
  presets: readonly FoldPreset[];
  hereLine: number;
  selection?: LineRange | null;
  onPreset: (preset: FoldPreset) => void;
  onWrap: () => void;
  onGo?: (line: number) => void;
  onClear?: () => void;
}): React.JSX.Element {
  return (
    <div className="source-bar">
      <div className="source-tools" role="toolbar" aria-label="Source tools">
        {presets.length > 1 ? (
          <>
            <span className="source-fold-label">Fold</span>
            <div className="source-presets" role="group" aria-label="Fold blocks">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="xs"
                  variant="outline"
                  aria-pressed={presetPressed(model, folded, preset)}
                  onClick={() => onPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </>
        ) : null}
        <div className="source-actions">
          <Button type="button" size="xs" variant="ghost" aria-label="Wrap lines" aria-pressed={wrap} onClick={onWrap}>
            <WrapText aria-hidden="true" />
            <span>Wrap</span>
          </Button>
          <CopyPathButton path={path} {...(realPath === undefined ? {} : { realPath })} label="Copy path" />
          <CopyContentsButton text={text} />
        </div>
      </div>
      <SourceHere
        model={model}
        line={hereLine}
        selection={selection}
        {...(onGo === undefined ? {} : { onGo })}
        {...(onClear === undefined ? {} : { onClear })}
      />
    </div>
  );
}

interface Landing {
  /** The line to scroll to. */
  line: number;
  /** Changes with every landing so the same line twice still scrolls twice. */
  token: number;
}

/** The fold set a file opens with: its frontmatter folded, unless the line fragment names a line inside it. */
function initialFolds(model: SourceModel, selected: LineRange | null): ReadonlySet<number> {
  const folds = defaultFolds(model);
  return selected === null ? folds : foldsOpenedFor(model, folds, selected);
}

function SourceBody({
  text,
  masked,
  bodyStart,
  name,
  path,
  realPath,
  target,
}: {
  text: string;
  masked: boolean;
  bodyStart: number;
  name: string;
  path: string;
  realPath: string | undefined;
  target: SourceTarget | null;
}): React.JSX.Element {
  const model = useMemo(() => buildSourceModel(text, languageOf(path)), [text, path]);
  const gutter = useMemo(() => gutterOf(model), [model]);
  const tokens = useMemo(() => highlightAll(model, masked), [model, masked]);
  const presets = useMemo(() => foldPresetsOf(model), [model]);
  const [selection, setSelection] = useState<Selection | null>(() => {
    const range = parseLineHash(window.location.hash, Math.max(model.lines.length, 1));
    return range === null ? null : selectionOf(range);
  });
  const [folded, setFolded] = useState<ReadonlySet<number>>(() => initialFolds(model, selection));
  const [wrap, setWrap] = useState(false);
  // The row that last landed and whether its flash is still running; the token keys the row so the flash replays.
  const [landing, setLanding] = useState<Landing | null>(() =>
    selection === null ? null : { line: selection.from, token: 1 },
  );
  const [flashing, setFlashing] = useState(selection !== null);
  const [appliedSeq, setAppliedSeq] = useState<number | null>(null);

  /** Opens any fold that hides the range, then scrolls to and flashes the line (applied by the effect below). */
  function land(line: number, range: LineRange = { from: line, to: line }): void {
    setFolded((current) => foldsOpenedFor(model, current, range));
    setLanding((previous) => ({ line, token: (previous?.token ?? 0) + 1 }));
    setFlashing(true);
  }

  // A new target lands once (adjusting state while rendering, keyed on the target's own seq).
  if (target !== null && target.seq !== appliedSeq) {
    setAppliedSeq(target.seq);
    const line = resolveTargetLine(text, bodyStart, target);
    let range: LineRange = { from: line, to: line };
    if (target.kind === 'line' && target.select) {
      range = parseLineHash(window.location.hash, Math.max(model.lines.length, 1)) ?? range;
      setSelection(selectionOf(range));
    }
    land(line, range);
  }

  useEffect(() => {
    if (landing === null) return undefined;
    scrollRowIntoView(landing.line);
    const timer = setTimeout(() => setFlashing(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [landing]);

  function select(event: SelectionEvent): void {
    const next = selectionAfter(selection, event);
    setSelection(next);
    writeSelectionHash(next);
  }

  function toggle(blockId: number): void {
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(blockId)) next.add(blockId);
      return next;
    });
  }

  return (
    <section className="source-reader" role="region" aria-label={`Source of ${name}`}>
      <SourceBar
        model={model}
        folded={folded}
        wrap={wrap}
        text={text}
        path={path}
        realPath={realPath}
        presets={presets}
        hereLine={1}
        selection={selection}
        onPreset={(preset) => setFolded(foldsAfterPreset(model, preset))}
        onWrap={() => setWrap(!wrap)}
        onGo={(line) => land(line)}
        onClear={() => select({ kind: 'clear' })}
      />
      <div className="source-pane" data-wrap={wrap ? 'true' : undefined}>
        <SourceRows
          model={model}
          gutter={gutter}
          tokens={tokens}
          folded={folded}
          selected={selection}
          hit={flashing && landing !== null ? landing.line : null}
          {...(landing === null ? {} : { hitToken: landing.token })}
          onToggle={toggle}
          onNumber={(line, shift) => select({ kind: 'number', line, shift })}
        />
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
    <SourceBody
      text={query.data.text}
      masked={query.data.masked}
      bodyStart={query.data.bodyStart}
      name={name}
      path={path}
      realPath={realPath}
      target={target}
    />
  );
}
