// The one not-found page (D-11, D-13): an unknown address, an old link that resolves nowhere and a
// bare folder all land here and look the same, so the page never reveals whether a path is hidden.
// It names the address as typed, as plain text. An unknown first segment is not this page's concern:
// it gets the unknown-project page (08-08).
import { AppLink } from '../nav.tsx';
import { projectRootPath } from '../project-path.ts';

export function NotFoundPage({
  address,
  openSlug,
}: {
  /** The pathname as typed (slug included, no query or hash), already decoded once per segment. */
  address: string;
  /** The open project's slug; the way back leads to its dashboard. */
  openSlug: string;
}): React.JSX.Element {
  return (
    <main className="page-stack">
      <p className="eyebrow">Not found</p>
      <h1>This local route does not exist.</h1>
      <section className="notice">
        <h2>Nothing is mapped here</h2>
        <p>Labelore looked for this address and found no file or page there.</p>
        <p className="artifact-path">{address}</p>
        <AppLink to={projectRootPath(openSlug)}>Return to the dashboard</AppLink>
      </section>
    </main>
  );
}
