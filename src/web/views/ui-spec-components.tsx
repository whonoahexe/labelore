// The UI-SPEC contract page's React surface (quick-261001-qk6, sketch 014 winner): the cover's
// sign-off chip + dialog, Created and Status facts, and the three chapters. Every string derived
// from the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline output
// mapped to React nodes) or as plain React text — never React's raw-HTML injection prop (T-qk6-02).
// Colour comes only from the tone a composed value carries and the theme tokens; the
// parse-degradation tones never appear on document content.
import { useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { ResearchInline } from './research-briefing-components.tsx';
import { CATEGORY_SHORT, STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from './ui-spec.ts';
import type {
  ComposedCell,
  ComposedConsiderations,
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
  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas" aria-label={`${title} document`}>
        {spec.chapters.map((chapter) => (
          <section key={chapter.id} id={`ui-spec-${chapter.id}`} className="view-block view-ui-spec-chapter">
            <ChapterHeading chapter={chapter} />
            {chapter.id === 'design' ? (
              <ul className="view-ui-spec-facts-list">
                {spec.spacing ? <li>Spacing · {spec.spacing.count} steps</li> : null}
                {spec.typography ? <li>Typography · {spec.typography.count} roles</li> : null}
                {spec.colour ? <li>Colour · {spec.colour.roles.length} roles</li> : null}
              </ul>
            ) : chapter.id === 'considerations' && spec.considerations ? (
              <ConsiderationsChapter model={spec.considerations} />
            ) : chapter.id === 'registry' && spec.registry ? (
              <p className="view-ui-spec-verdict-line">
                <span className="status-chip" data-tone={spec.registry.tone}>
                  {spec.registry.verdict}
                </span>
              </p>
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
