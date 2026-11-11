// The settings page's React surface (Phase 12, 12-09, SET-01, sketch 063 variant A "Control panel"): the header override (crumbs
// "{project name} / Settings", the eyebrow "Settings", the h1 "Project settings" and the read-only lock line that points to
// /gsd-settings) and the page body. The body is read-only by construction: four counts, then one panel per group with its square
// meter and "n of m set". The page makes no request, with one exception: the unreadable state asks /source for the parser's position
// (a GET, the same cached query the Source reader uses). Every string is author text rendered as plain React text - never React's
// raw-HTML injection prop (T-12-29) - and nothing here is an input, a form or an acting control.
import { Lock } from 'lucide-react';
import { StatusMeter } from '../components/status-meter.tsx';
import type { ComposedSettings, SettingsPanel } from './settings-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type SettingsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props: the crumbs, the eyebrow, the h1 and the read-only lock line. The
 * header keeps its own Copy path button for .planning/config.json and the View · Source toggle. */
export function settingsHeaderProps(projectName: string): SettingsHeaderProps {
  return {
    eyebrow: 'Settings',
    title: 'Project settings',
    lead: (
      <span className="view-settings-lock">
        <Lock aria-hidden="true" />
        <span>
          Read-only. Change a setting with <code>/gsd-settings</code> in your terminal.
        </span>
      </span>
    ),
    crumbs: [{ label: projectName, to: '/' }, { label: 'Settings' }],
  };
}

const COUNT_CAPTIONS = [
  ['set', 'Set'],
  ['notSet', 'Not set'],
  ['notRecognised', 'Not recognised'],
  ['masked', 'Masked'],
] as const;

function Counts({ counts }: { counts: { set: number; notSet: number; notRecognised: number; masked: number } }): React.JSX.Element {
  return (
    <ul className="view-settings-counts" aria-label="Setting counts">
      {COUNT_CAPTIONS.map(([key, caption]) => (
        <li key={key} className="view-settings-count" data-count={key}>
          <span className="view-settings-count-number">{counts[key]}</span>
          <span className="view-settings-count-caption">{caption}</span>
        </li>
      ))}
    </ul>
  );
}

function PanelHeader({ panel }: { panel: SettingsPanel }): React.JSX.Element {
  const label = `${panel.setCount} of ${panel.total} set`;
  return (
    <header className="view-settings-panel-head">
      <h2>{panel.name}</h2>
      {panel.kind === 'group' ? (
        <StatusMeter
          filled={panel.setCount}
          total={panel.total}
          items={Array.from({ length: panel.total }, (_unused, index) => index < panel.setCount)}
          label={label}
        />
      ) : null}
      <span className="view-settings-panel-meta">{panel.kind === 'group' ? label : `${panel.setCount} keys`}</span>
    </header>
  );
}

export function SettingsView({ model }: { model: ComposedSettings }): React.JSX.Element {
  if (model.state === 'unreadable') {
    return (
      <aside className="notice" role="status">
        <p>The file isn&apos;t valid JSON, so no settings are shown.</p>
      </aside>
    );
  }
  return (
    <div className="view-settings-page">
      <Counts counts={model.counts} />
      <div className="view-settings-panels">
        {model.panels.map((panel) => (
          <section key={panel.id} className="view-settings-panel" data-kind={panel.kind} data-muted={panel.muted}>
            <PanelHeader panel={panel} />
          </section>
        ))}
      </div>
    </div>
  );
}
