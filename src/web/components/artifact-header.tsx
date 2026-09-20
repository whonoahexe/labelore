import { Fragment } from 'react';
import { Link } from 'react-router';

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
 * sentence of human-authored context under the title; `path` is the file it came from; `children`
 * render last inside the header (the plan page's section jump links).
 */
export function ArtifactHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  path,
  chip,
  children,
}: {
  crumbs: ArtifactCrumb[];
  eyebrow: string;
  title: string;
  lead?: string | null;
  path?: string | null;
  chip?: React.ReactNode;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
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
      <header className="artifact-heading">
        <p className="eyebrow">{eyebrow}</p>
        {chip}
        <h1>{title}</h1>
        {lead ? <p className="artifact-lead">{lead}</p> : null}
        {path ? <p className="artifact-path">{path}</p> : null}
        {children}
      </header>
    </>
  );
}
