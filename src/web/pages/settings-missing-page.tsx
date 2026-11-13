// The page at the header gear's address when the project holds no root config.json (Phase 12, D-09, D-12): the same reference page as
// a project that has one, without values, under one quiet notice instead of a not-found, because the gear is always shown. It reads
// the cached presentation only for the project's name; every string is React text and nothing about a file is revealed beyond its
// fixed name. There is no Copy path, because there is no file.
import { useQuery } from '@tanstack/react-query';
import { fetchPresentation } from '../api.ts';
import { ArtifactHeader } from '../components/artifact-header.tsx';
import { useProjectScope } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';
import { SettingsView, settingsHeaderProps, useSettingsModel } from '../views/settings-page-components.tsx';
import type { SettingsSubject } from '../views/settings-reference.ts';

const MISSING: SettingsSubject = { state: 'missing' };

export function SettingsMissingPage({ slug }: { slug: string }): React.JSX.Element {
  const scope = useProjectScope();
  const presentation = useQuery({
    queryKey: projectKey(slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(slug, scope),
  });
  const model = useSettingsModel(MISSING, { slug, scope, route: '/settings' });
  const projectName = presentation.data?.projectName ?? slug;
  const header = settingsHeaderProps(projectName, model);
  return (
    <main className="artifact-page page-stack">
      <SettingsView
        model={model}
        header={
          <ArtifactHeader
            crumbs={[{ label: projectName, to: '/' }, { label: 'Settings' }]}
            eyebrow="Settings"
            title="Project settings"
            lead={header.lead}
            path={null}
          />
        }
        onOpenSourceAt={() => undefined}
      />
    </main>
  );
}
