// The UI-SPEC contract page's React surface (quick-261001-qk6, sketch 014 winner): the cover's
// sign-off chip + dialog, Created and Status facts, and the three chapters. Every string derived
// from the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline output
// mapped to React nodes) or as plain React text — never React's raw-HTML injection prop (T-qk6-02).
// Colour comes only from the tone a composed value carries and the theme tokens; the
// parse-degradation tones never appear on document content.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Copy, Maximize2 } from 'lucide-react';
import { copyText } from '../components/copy-path-button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { CATEGORY_SHORT, NEVER_TONE, STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from './ui-spec.ts';
import type {
  ComposedCell,
  ComposedChoiceCard,
  ComposedChoices,
  ComposedColour,
  ComposedColourRole,
  ComposedConsiderations,
  ComposedFontCard,
  ComposedRegistry,
  ComposedSpacing,
  ComposedTypography,
  ComposedUiSpec,
  ComposedUiSpecChapter,
  ComposedUiSpecIntro,
} from './ui-spec.ts';

// ---------------------------------------------------------------------------
// Cover: sign-off chip + dialog, Created, Status
// ---------------------------------------------------------------------------

export function UiSpecIntroMeta({ intro }: { intro: ComposedUiSpecIntro }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { signoff } = intro;
  return (
    <span className="view-ui-spec-facts">
      {signoff ? (
        // The breakdown opens as a modal (a Base UI dialog, the RESEARCH confidence dialog's own
        // pattern) so the cover keeps one tidy row.
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="status-chip view-ui-spec-signoff" data-tone={signoff.tone}>
            {signoff.label}
            <Maximize2 aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="view-ui-spec-signoff-dialog">
            <DialogHeader className="view-ui-spec-signoff-dialog-head">
              <DialogTitle className="view-ui-spec-signoff-dialog-title">
                <span className="status-chip" data-tone={signoff.tone}>
                  {signoff.label.replace(/^Sign(ed)?[- ]off\s*/i, '') || '—'}
                </span>
                Checker sign-off
              </DialogTitle>
            </DialogHeader>
            <dl className="view-ui-spec-signoff-list">
              {signoff.dims.map((dim) => (
                <div key={`${dim.n}-${dim.name}`} className="view-ui-spec-signoff-row" data-bare={dim.note === null}>
                  <dt>
                    <span className="view-ui-spec-signoff-name">{dim.name}</span>
                    <span className="view-ui-spec-signoff-verdict" data-verdict={dim.tone}>
                      <span aria-hidden="true">{dim.glyph}</span>
                      {dim.verdict}
                      {dim.qualifier ? ` · ${dim.qualifier}` : ''}
                    </span>
                  </dt>
                  {dim.note ? (
                    <dd>
                      <ResearchInline text={dim.note} />
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
            {signoff.approval ? (
              <p className="view-ui-spec-signoff-approval">
                <span className="view-ui-spec-key">Approval</span> <ResearchInline text={signoff.approval} />
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
      {intro.created ? (
        <span>
          Created <b>{intro.created}</b>
        </span>
      ) : null}
      {intro.status ? (
        <span>
          Status <b>{intro.status}</b>
        </span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chapter heading
// ---------------------------------------------------------------------------

function ChapterHeading({ chapter }: { chapter: ComposedUiSpecChapter }): React.JSX.Element {
  return (
    <header className="section-heading">
      <h2>
        <span className="view-ui-spec-number">{chapter.number}</span>
        {chapter.title}
      </h2>
      <span className="view-ui-spec-aside">{chapter.aside}</span>
    </header>
  );
}

// ---------------------------------------------------------------------------
// UI considerations: meter, Needs a person, the element x state matrix, the selected cell
// ---------------------------------------------------------------------------

function cellOf(model: ComposedConsiderations, key: string): { cell: ComposedCell; code: string | null; name: string; kinds: string | null } | null {
  const bar = key.lastIndexOf('|');
  if (bar === -1) return null;
  const elementKey = key.slice(0, bar);
  const category = key.slice(bar + 1);
  const element = model.elements.find((e) => e.key === elementKey);
  const cell = element?.cells[category];
  return element && cell ? { cell, code: element.code, name: element.name, kinds: element.kinds } : null;
}

function ConsiderationsChapter({ model }: { model: ComposedConsiderations }): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);
  const toggle = (key: string): void => setSelected((current) => (current === key ? null : key));
  const detail = useMemo(() => (selected === null ? null : cellOf(model, selected)), [model, selected]);
  const author = model.coverage ? (
    <p className="view-ui-spec-author">
      Author&apos;s count: <ResearchInline text={model.coverage} />
    </p>
  ) : null;
  if (model.total === 0) return <div className="view-ui-spec-considerations">{author}</div>;
  return (
    <div className="view-ui-spec-considerations">
      <div className="view-ui-spec-meter" role="group" aria-label={`Coverage across ${model.total} considerations`}>
        <div className="view-ui-spec-meter-bar" aria-hidden="true">
          {STATUS_ORDER.map((status) =>
            model.counts[status] > 0 ? (
              <span key={status} data-status={status} style={{ flexGrow: model.counts[status] }} />
            ) : null,
          )}
        </div>
        <p className="view-ui-spec-meter-key">
          {STATUS_ORDER.map((status) => (
            <span key={status} data-status={status}>
              <i aria-hidden="true" />
              <b>{model.counts[status]}</b>
              {STATUS_LABEL[status]}
            </span>
          ))}
          <span>
            · {model.elements.length} {model.elements.length === 1 ? 'element' : 'elements'}
          </span>
        </p>
        {author}
      </div>
      {model.needs.length > 0 ? (
        <div className="view-ui-spec-strip">
          <span className="view-ui-spec-key">Needs a person</span>
          {model.needs.map((need, index) => (
            <button
              key={`${need.key}-${index}`}
              type="button"
              className="status-chip"
              data-tone={need.tone}
              data-cell={need.key}
              aria-pressed={selected === need.key}
              onClick={() => toggle(need.key)}
            >
              {need.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="view-ui-spec-matrix-wrap">
        <table className="view-ui-spec-matrix">
          <thead>
            <tr>
              <th scope="col" className="view-ui-spec-matrix-el">
                Element
              </th>
              {model.columns.map((category) => (
                <th key={category} scope="col" title={category}>
                  {CATEGORY_SHORT[category] ?? category}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.elements.map((element) => (
              <tr key={element.key}>
                <th scope="row" className="view-ui-spec-matrix-el">
                  {element.code ? <span className="view-ui-spec-code">{element.code}</span> : null}
                  <span className="view-ui-spec-matrix-name" title={element.name}>
                    {element.name}
                  </span>
                </th>
                {model.columns.map((category) => {
                  const cell = element.cells[category];
                  if (!cell) return <td key={category} />;
                  return (
                    <td key={category}>
                      <button
                        type="button"
                        data-cell={cell.key}
                        aria-pressed={selected === cell.key}
                        aria-label={`${element.name}, ${cell.title}`}
                        title={cell.title}
                        onClick={() => toggle(cell.key)}
                      >
                        <span>
                          <span className="view-ui-spec-mark" data-status={cell.worst} aria-hidden="true" />
                          {cell.rows.length > 1 ? (
                            <span className="view-ui-spec-mark-count">{cell.rows.length}</span>
                          ) : null}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="view-ui-spec-matrix-key">
        {STATUS_ORDER.map((status) => (
          <span key={status}>
            <span className="view-ui-spec-mark" data-status={status} aria-hidden="true" />
            {STATUS_LABEL[status]}
            {STATUS_HINT[status] ? ` — ${STATUS_HINT[status]}` : ''}
          </span>
        ))}
        <span>blank — not raised</span>
      </p>
      {detail ? (
        <div className="view-ui-spec-detail" role="region" aria-label={`${detail.name}, ${detail.cell.category}`}>
          <div className="view-ui-spec-detail-head">
            {detail.code ? <span className="view-ui-spec-code">{detail.code}</span> : null}
            <h3>{detail.name}</h3>
            <span className="view-ui-spec-key">· {detail.cell.category}</span>
            <button type="button" className="view-ui-spec-link" onClick={() => setSelected(null)}>
              Close ✕
            </button>
          </div>
          {detail.kinds ? <span className="view-ui-spec-key">Kinds: {detail.kinds}</span> : null}
          {detail.cell.rows.map((row, index) => (
            <div key={index} className="view-ui-spec-res">
              <span className="view-ui-spec-res-head">
                <span className="status-chip" data-tone={row.tone}>
                  {row.statusLabel}
                </span>
                {row.tag ? <span className="view-ui-spec-tag">{row.tag}</span> : null}
                {row.target ? <span className="view-ui-spec-code">{row.target}</span> : null}
              </span>
              <div className="view-ui-spec-res-text">
                <ResearchInline text={row.note} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="view-ui-spec-hint">Click a square to read how that state is handled</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Design system: the choice cards
// ---------------------------------------------------------------------------

/** Long card text clamps to two lines; "more / less" opens it. Plain React text only. */
function ClampedText({
  id,
  text,
  open,
  onToggle,
}: {
  id: string;
  text: string;
  open: boolean;
  onToggle: (key: string) => void;
}): React.JSX.Element | null {
  if (text === '') return null;
  return (
    <>
      <p className="view-ui-spec-choice-rest" data-clamped={!open}>
        {text}
      </p>
      {text.length > 90 ? (
        <button type="button" className="view-ui-spec-link" aria-expanded={open} onClick={() => onToggle(id)}>
          {open ? 'less' : 'more'}
        </button>
      ) : null}
    </>
  );
}

/** The preset as a copy field: the code, and a Copy icon that turns to Check for 1.5 s. */
function PresetField({ code }: { code: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async (): Promise<void> => {
    if (!(await copyText(code))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      className="view-ui-spec-preset"
      data-copied={copied ? 'true' : 'false'}
      aria-label={`Copy preset ${code}`}
      title="Copy preset"
      onClick={copy}
    >
      <span className="view-ui-spec-key">Preset</span>
      <code>{code}</code>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  );
}

function ShadcnCard({ card }: { card: ComposedChoices['shadcn'] }): React.JSX.Element {
  return (
    <article className="view-ui-spec-choice" data-none={!card.shadcn}>
      <span className="view-ui-spec-key">Design system</span>
      <p className="view-ui-spec-choice-value">{card.shadcn ? 'shadcn/ui' : 'No shadcn'}</p>
      <span className="view-ui-spec-choice-chips">
        <span className="status-chip" data-tone={card.tone}>
          {card.shadcn ? 'Initialized' : 'Not initialized'}
        </span>
        {card.locked ? <span className="status-chip">Preset locked</span> : null}
      </span>
      {card.code ? <PresetField code={card.code} /> : <span className="view-ui-spec-choice-rest">Preset: none</span>}
      {card.kv.length > 0 ? (
        <span className="view-ui-spec-kvs">
          {card.kv.map(([key, value]) => (
            <span key={key}>
              <i>{key}</i> {value}
            </span>
          ))}
        </span>
      ) : null}
    </article>
  );
}

function PlainCard({
  card,
  open,
  onToggle,
}: {
  card: ComposedChoiceCard;
  open: boolean;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  return (
    <article className="view-ui-spec-choice" data-none={card.none}>
      <span className="view-ui-spec-key">{card.label}</span>
      <p className="view-ui-spec-choice-value">{card.head}</p>
      <ClampedText id={`choice-${card.label}`} text={card.rest} open={open} onToggle={onToggle} />
    </article>
  );
}

function FontCard({
  card,
  open,
  onToggle,
}: {
  card: ComposedFontCard;
  open: boolean;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  return (
    <article className="view-ui-spec-choice" data-none={card.none}>
      <span className="view-ui-spec-key">Font</span>
      {card.families.length > 0 ? (
        <div className="view-ui-spec-faces">
          {card.families.map((face) => (
            <div key={face.family} className="view-ui-spec-face">
              <p className="view-ui-spec-choice-value" data-face={face.face ?? 'inherit'}>
                {face.family}
              </p>
              {face.role ? <span className="view-ui-spec-choice-rest">{face.role}</span> : null}
              <span className="view-ui-spec-aa" data-face={face.face ?? 'inherit'}>
                Aa Bb 0123
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="view-ui-spec-choice-value">{card.head}</p>
          <ClampedText id="choice-Font" text={card.rest} open={open} onToggle={onToggle} />
        </>
      )}
    </article>
  );
}

function ChoiceCards({
  choices,
  open,
  onToggle,
}: {
  choices: ComposedChoices;
  open: ReadonlySet<string>;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  return (
    <div className="view-ui-spec-choices">
      <ShadcnCard card={choices.shadcn} />
      {choices.component ? (
        <PlainCard card={choices.component} open={open.has('choice-Component library')} onToggle={onToggle} />
      ) : null}
      {choices.icon ? (
        <PlainCard card={choices.icon} open={open.has('choice-Icon library')} onToggle={onToggle} />
      ) : null}
      {choices.font ? <FontCard card={choices.font} open={open.has('choice-Font')} onToggle={onToggle} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Design system: spacing ruler, type ladder, colour
// ---------------------------------------------------------------------------

function SubHeading({ title, note }: { title: string; note?: string }): React.JSX.Element {
  return (
    <div className="view-ui-spec-sub-heading">
      <h3>{title}</h3>
      {note ? <span className="view-ui-spec-key">{note}</span> : null}
    </div>
  );
}

function pct(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

function SpacingRuler({
  spacing,
  open,
  onToggle,
}: {
  spacing: ComposedSpacing;
  open: boolean;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  return (
    <div className="view-ui-spec-compact">
      <div className="view-ui-spec-ticks">
        <div className="view-ui-spec-tickline">
          {spacing.ticks.map((tick) => (
            <Fragment key={tick.token}>
              {tick.fluid && tick.width > 0 ? (
                <span className="view-ui-spec-range" style={{ left: pct(tick.left), width: pct(tick.width) }} />
              ) : null}
              <span className="view-ui-spec-tick" data-alt={tick.alt} style={{ left: pct(tick.left) }} title={`${tick.token} · ${tick.value}`}>
                <span>{tick.token}</span>
                <i />
              </span>
            </Fragment>
          ))}
        </div>
      </div>
      <button type="button" className="view-ui-spec-link" aria-expanded={open} onClick={() => onToggle('spacing-usage')}>
        {open ? 'Hide' : 'Usage'} {open ? '▴' : '▾'}
      </button>
      {open ? (
        <div className="view-ui-spec-detail-list">
          {spacing.ticks.map((tick) => (
            <div key={tick.token}>
              <span className="view-ui-spec-dk">
                {tick.token} · {tick.value}
              </span>
              <span className="view-ui-spec-dv">
                <ResearchInline text={tick.usage} />
              </span>
            </div>
          ))}
          {spacing.prose.length > 0 ? (
            <div>
              <span className="view-ui-spec-dk">Notes</span>
              <span className="view-ui-spec-dv">
                <ResearchBlocks blocks={spacing.prose} />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TypeLadder({ typography }: { typography: ComposedTypography }): React.JSX.Element {
  return (
    <>
      <div className="view-ui-spec-ladder">
        {typography.rungs.map((rung, index) => (
          <div key={`${rung.role}-${index}`} className="view-ui-spec-rung">
            {rung.na || rung.size === null ? (
              <div className="view-ui-spec-sample" data-na="true">
                Not used in this phase
              </div>
            ) : (
              <div
                className="view-ui-spec-sample"
                data-mono={rung.mono}
                data-upper={rung.upper}
                style={{
                  fontSize: rung.size,
                  fontWeight: rung.weight ?? 400,
                  lineHeight: rung.lineHeight ?? 1.4,
                }}
              >
                {rung.sample}
              </div>
            )}
            <div className="view-ui-spec-spec">
              <b>{rung.role}</b>
              {rung.spec}
            </div>
          </div>
        ))}
      </div>
      {typography.prose.length > 0 ? (
        <details className="view-ui-spec-fold">
          <summary>Weights &amp; notes</summary>
          <div className="view-ui-spec-prose">
            <ResearchBlocks blocks={typography.prose} />
          </div>
        </details>
      ) : null}
    </>
  );
}

/** A document colour reaches the DOM only as a custom-property value on a style object, after
 * `safeColor` — never as a declaration the author controls (T-qk6-03). */
function swatchVars(light: string | null, dark: string | null): CSSProperties {
  const vars: Record<string, string> = {};
  if (light) vars['--swatch-light'] = light;
  if (dark) vars['--swatch-dark'] = dark;
  return vars as CSSProperties;
}

/** Where a stylesheet-painted value came from, appended to a chip half's title. */
function fromSuffix(from: string | null): string {
  return from ? ` · from ${from}` : '';
}

function SwatchBox({
  light,
  dark,
  from,
}: {
  light: string | null;
  dark: string | null;
  from: string | null;
}): React.JSX.Element {
  const one = !(light && dark);
  return (
    <span className="view-ui-spec-chipbox" data-one={one}>
      {light || dark ? (
        <>
          {light ? <span data-half="light" style={swatchVars(light, null)} title={`light ${light}${fromSuffix(from)}`} /> : null}
          {dark ? <span data-half="dark" style={swatchVars(null, dark)} title={`dark ${dark}${fromSuffix(from)}`} /> : null}
        </>
      ) : (
        <span data-none="true" title="Value not in the document" />
      )}
    </span>
  );
}

function RoleCard({ role }: { role: ComposedColourRole }): React.JSX.Element {
  return (
    <article className="view-ui-spec-role" data-accent={role.accent}>
      <header>
        <span className="view-ui-spec-role-name">{role.name}</span>
        {role.pct !== null ? <span className="view-ui-spec-role-pct">{role.pct}%</span> : null}
      </header>
      <div className="view-ui-spec-role-body">
        <div className="view-ui-spec-swatches">
          {role.swatches.length > 0 ? (
            role.swatches.map((swatch, index) => (
              <div key={index} className="view-ui-spec-swatch">
                <SwatchBox light={swatch.light} dark={swatch.dark} from={swatch.resolvedFrom} />
                <div>
                  <div className="view-ui-spec-swatch-name">
                    {swatch.tokens.length > 0 ? swatch.tokens.join(' · ') : 'literal'}
                  </div>
                  <div className="view-ui-spec-swatch-values">
                    {swatch.light || swatch.dark ? (
                      [swatch.light ? `${swatch.dark ? 'L ' : ''}${swatch.light}` : null, swatch.dark ? `D ${swatch.dark}` : null]
                        .filter((x): x is string => x !== null)
                        .join('  ')
                    ) : (
                      <span className="view-ui-spec-nodoc">Value not in doc</span>
                    )}
                    {swatch.resolvedFrom ? (
                      <span
                        className="view-ui-spec-from"
                        title={`Read from ${swatch.resolvedFrom} — the document names the token only`}
                      >
                        From {swatch.resolvedFrom.split('/').pop()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span className="view-ui-spec-nodoc">No token or value</span>
          )}
        </div>
        {role.never.length > 0 ? (
          <p className="view-ui-spec-usage">
            <span className="status-chip" data-tone={NEVER_TONE}>
              Never
            </span>{' '}
            {role.never.map((token) => (
              <code key={token}>{token}</code>
            ))}
          </p>
        ) : null}
        {role.note ? (
          <p className="view-ui-spec-usage">
            <em>{role.note}</em>
          </p>
        ) : null}
        {role.usage.trim() !== '' ? (
          <p className="view-ui-spec-usage">
            <ResearchInline text={role.usage} />
          </p>
        ) : null}
        {role.reserved && role.reserved.length > 0 ? (
          <div className="view-ui-spec-reserved">
            <span className="view-ui-spec-key">Reserved for</span>
            <ol>
              {role.reserved.map((item, index) => (
                <li key={index}>
                  <ResearchInline text={item} />
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ColourSpecimen({ colour }: { colour: ComposedColour }): React.JSX.Element {
  return (
    <>
      {colour.split.length > 0 ? (
        <>
          <div className="view-ui-spec-split-bar" role="img" aria-label="Colour proportion bar">
            {colour.split.map((share) => (
              <div
                key={share.name}
                data-none={!share.light && !share.dark}
                style={{ flexGrow: share.pct, ...swatchVars(share.light, share.dark) }}
              >
                <span className="view-ui-spec-split-label">
                  {share.name} {share.pct}%
                </span>
              </div>
            ))}
          </div>
          <div className="view-ui-spec-split-key">
            <span>Proportion of the screen · {colour.paintedWith}</span>
            <span>
              {colour.notShare.join(' · ')}
              {colour.notShare.length > 0 ? ' — not a share' : ''}
            </span>
          </div>
        </>
      ) : null}
      <div className="view-ui-spec-roles">
        {colour.roles.map((role, index) => (
          <RoleCard key={`${role.name}-${index}`} role={role} />
        ))}
      </div>
      {colour.prose.length > 0 ? (
        <details className="view-ui-spec-fold">
          <summary>Colour notes{colour.hasContrastTable ? ' · contrast tables' : ''}</summary>
          <div className="view-ui-spec-prose">
            <ResearchBlocks blocks={colour.prose} />
          </div>
        </details>
      ) : null}
    </>
  );
}

function DesignChapter({
  spec,
  open,
  onToggle,
}: {
  spec: ComposedUiSpec;
  open: ReadonlySet<string>;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  return (
    <>
      <ChoiceCards choices={spec.choices} open={open} onToggle={onToggle} />
      {spec.spacing ? (
        <div className="view-ui-spec-scale">
          <SubHeading title={`Spacing · ${spec.spacing.count} steps`} note="px, to scale" />
          <SpacingRuler spacing={spec.spacing} open={open.has('spacing-usage')} onToggle={onToggle} />
        </div>
      ) : null}
      {spec.typography ? (
        <div className="view-ui-spec-scale">
          <SubHeading title={`Typography · ${spec.typography.count} roles`} note="live samples" />
          <TypeLadder typography={spec.typography} />
        </div>
      ) : null}
      {spec.colour ? (
        <div className="view-ui-spec-scale">
          <SubHeading title="Colour · 60 / 30 / 10" />
          <ColourSpecimen colour={spec.colour} />
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Registry safety
// ---------------------------------------------------------------------------

function RegistryChapter({ registry }: { registry: ComposedRegistry }): React.JSX.Element {
  return (
    <>
      <div className="view-ui-spec-verdict" data-required={registry.required}>
        <span className="status-chip" data-tone={registry.tone}>
          {registry.verdict}
        </span>
        <span>
          <ResearchInline text={registry.sentence} />
        </span>
        <span className="view-ui-spec-key">{`${registry.blocks} ${registry.blocks === 1 ? 'block' : 'blocks'}`}</span>
      </div>
      <div className="view-ui-spec-regs">
        {registry.cards.map((card, index) => (
          <article key={`${card.name}-${index}`} className="view-ui-spec-reg" data-required={card.required}>
            <header>
              <span className="view-ui-spec-reg-name">{card.name}</span>
              <span className="status-chip" data-tone={card.gateTone}>
                {card.gateLabel}
              </span>
            </header>
            {card.groups.map((group) => (
              <div key={group.label} className="view-ui-spec-reg-group">
                <span className="view-ui-spec-key">{`${group.label} · ${group.names.length}`}</span>
                <span className="view-ui-spec-blocks">
                  {group.names.map((name) => (
                    <code key={name}>{name}</code>
                  ))}
                </span>
              </div>
            ))}
            {card.text ? (
              <p className="view-ui-spec-reg-text">
                <ResearchInline text={card.text} />
              </p>
            ) : null}
            {card.why ? (
              <p className="view-ui-spec-reg-why" title={card.why}>
                {card.why}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {registry.note ? <p className="view-ui-spec-reg-note">{registry.note}</p> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export function UiSpecView({
  spec,
  onShowSource,
  title,
}: {
  spec: ComposedUiSpec;
  onShowSource: (id: string | null) => void;
  title: string;
}): React.JSX.Element {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string): void =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas" aria-label={`${title} document`}>
        {spec.chapters.map((chapter) => (
          <section key={chapter.id} id={`ui-spec-${chapter.id}`} className="view-block view-ui-spec-chapter">
            <ChapterHeading chapter={chapter} />
            {chapter.id === 'design' ? (
              <DesignChapter spec={spec} open={open} onToggle={toggle} />
            ) : chapter.id === 'considerations' && spec.considerations ? (
              <ConsiderationsChapter model={spec.considerations} />
            ) : chapter.id === 'registry' && spec.registry ? (
              <RegistryChapter registry={spec.registry} />
            ) : null}
          </section>
        ))}
        {spec.sourceOnly.length > 0 ? (
          <nav id="ui-spec-source-only" className="view-block view-ui-spec-source-only" aria-label="In the source only">
            <span className="view-ui-spec-key">In the source only</span>
            <ul>
              {spec.sourceOnly.map((entry) => (
                <li key={entry.label}>
                  <button type="button" onClick={() => onShowSource(entry.targetId)}>
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
    </div>
  );
}
