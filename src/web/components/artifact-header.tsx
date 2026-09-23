import { Fragment } from 'react';
import { Link } from 'react-router';
import { CopyPathButton } from './copy-path-button.tsx';

export interface ArtifactCrumb {
  label: string;
  /** Omit on the last crumb — it names the current page and is not a link. */
  to?: string;
}

/**
 * The breadcrumb and heading block every document-style page opens with. ArtifactPage and
 * PlanPairPage each hand-wrote this markup; it lives here so the two cannot drift apart again and
 * so a later restyle of the page header is one edit, not two.
 *
 * `chip` sits between the eyebrow and the title (the Warning/Unreadable badge); `lead` is one
 * sentence of human-authored context under the title; `path` is the file it came from — offered as
 * a copy-path icon button (quick-260923-jxp, JXP-09), not printed; `children` render last inside
 * the header (the plan page's section jump links).
 *
 * `cover` (sketch-004 B3, quick-260922-3us) is optional: without it, the rendered markup is
 * byte-identical to before. With it, the same eyebrow/h1/lede/path fields render inside a
 * `.document-cover` sheet — `cover.facts` is the one-line facts row slotted after the path, and
 * `cover.cells` (the headline/glance/chapter-index row) renders after the sheet's own header row.
 * ArtifactHeader stays the only document-page header either way (docs/design-language.md).
 *
 * `meta` (quick-260923-lju, sketch-006 D1) is an optional plain-variant-only prop: when present,
 * one `div.artifact-meta-row` renders after the h1/lead, holding `meta` then the copy-path button
 * then `children` — replacing the separate copy button and children the plain variant otherwise
 * renders directly in `header`. Absent, the plain-variant markup stays byte-identical to before.
 */
export function ArtifactHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  path,
  chip,
  children,
  cover,
  meta,
}: {
  crumbs: ArtifactCrumb[];
  eyebrow: string;
  title: string;
  lead?: string | null;
  path?: string | null;
  chip?: React.ReactNode;
  children?: React.ReactNode;
  cover?: { facts?: React.ReactNode; cells: React.ReactNode };
  meta?: React.ReactNode;
}): React.JSX.Element {
  const breadcrumbs = (
    <nav className="artifact-breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <Fragment key={`${index}-${crumb.label}`}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {crumb.to ? (
            <Link to={crumb.to}>{crumb.label}</Link>
          ) : (
            <span aria-current="page">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );

  if (!cover) {
    return (
      <>
        {breadcrumbs}
        <header className="artifact-heading">
          <p className="eyebrow">{eyebrow}</p>
          {chip}
          <h1>{title}</h1>
          {lead ? <p className="artifact-lead">{lead}</p> : null}
          {meta ? (
            <div className="artifact-meta-row">
              {meta}
              {path ? <CopyPathButton path={path} /> : null}
              {children}
            </div>
          ) : (
            <>
              {path ? <CopyPathButton path={path} /> : null}
              {children}
            </>
          )}
        </header>
      </>
    );
  }

  return (
    <>
      {breadcrumbs}
      <section className="document-cover" id="document-cover">
        <header className="artifact-heading" data-layout="cover">
          <div className="document-cover-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {lead ? <p className="artifact-lead">{lead}</p> : null}
            {cover.facts}
          </div>
          <div className="document-cover-controls">
            {path ? <CopyPathButton path={path} /> : null}
            {chip}
            {children}
          </div>
        </header>
        {cover.cells}
      </section>
    </>
  );
}
