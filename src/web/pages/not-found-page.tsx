// The one not-found page (D-11, D-13): an unknown address, an old link that resolves nowhere, a
// bare folder and another project's name all land here and look the same, so the page never
// reveals whether a path is hidden. It names the address as typed, as plain text.
import { Link, ProjectSlugProvider } from '../nav.tsx';

export function NotFoundPage({
  address,
  openSlug,
  wrongProject = false,
}: {
  /** The pathname as typed (slug included, no query or hash), already decoded once per segment. */
  address: string;
  /** The open project's slug; the way back leads to its dashboard. */
  openSlug: string;
  wrongProject?: boolean;
}): React.JSX.Element {
  return (
    <ProjectSlugProvider value={openSlug}>
      <main className="page-stack">
        <p className="eyebrow">Not found</p>
        <h1>This local route does not exist.</h1>
        <section className="notice">
          <h2>Nothing is mapped here</h2>
          <p>
            {wrongProject
              ? `This address starts with a different project name than the one that is open (${openSlug}).`
              : 'Labelore looked for this address and found no file or page there.'}
          </p>
          <p className="artifact-path">{address}</p>
          <Link to="/">Return to the dashboard</Link>
        </section>
      </main>
    </ProjectSlugProvider>
  );
}
