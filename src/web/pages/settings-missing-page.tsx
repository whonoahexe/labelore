// The page at the header gear's address when the project holds no root config.json (Phase 12, D-09, D-12): one
// honest notice instead of a not-found, because the gear is always shown. It reads the cached presentation only for
// the project's name; every string is React text and nothing about a file is revealed beyond its fixed name.
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { fetchPresentation } from '../api.ts';
import { ArtifactHeader } from '../components/artifact-header.tsx';
import { useProjectScope } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';
import { settingsHeaderProps } from '../views/settings-page-components.tsx';

export function SettingsMissingPage({ slug }: { slug: string }): React.JSX.Element {
  const scope = useProjectScope();
  const presentation = useQuery({
    queryKey: projectKey(slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(slug, scope),
  });
  const projectName = presentation.data?.projectName ?? slug;
  return (
    <main className="artifact-page page-stack">
      <ArtifactHeader
        crumbs={[{ label: projectName, to: '/' }, { label: 'Settings' }]}
        eyebrow="Settings"
        title="Project settings"
        lead={settingsHeaderProps(projectName).lead}
        path={null}
      />
      <aside className="notice source-notice" role="status">
        <span className="source-notice-glyph" aria-hidden="true">
          <FileText />
        </span>
        <p className="source-notice-lead">This project has no settings file.</p>
        <p>
          There is no <code>.planning/config.json</code>, so GSD runs on its built-in defaults. Labelore doesn&apos;t
          show those defaults; running <code>/gsd-settings</code> writes the file.
        </p>
      </aside>
    </main>
  );
}
