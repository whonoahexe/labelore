// The settings page's React surface (Phase 12, 12-09, SET-01, sketch 063 variant A "Control panel"): the header override (crumbs
// "{project name} / Settings", the eyebrow "Settings", the h1 "Project settings" and the read-only lock line that points to
// /gsd-settings) and the page body. The body is read-only by construction: four counts, then one panel per group with its square
// meter and "n of m set", every set key drawn as a read-only instrument (a boolean as a switch word, a closed-set value as a scale
// with the chosen option lit, anything else in the shape it arrives) and the unset keys folded under a native details at the panel's
// foot. The page makes no request, with one exception: the unreadable state asks /source for the parser's position (a GET, the
// same cached query the Source reader uses). Every string is author text rendered as plain React text - never React's raw-HTML
// injection prop (T-12-29) - and nothing here is an input, a form or an acting control: no pointer cursor, no focus stop, no hover.
import { ChevronRight, Lock } from 'lucide-react';
import { StatusMeter } from '../components/status-meter.tsx';
import { highlightLine } from '../source/source-highlight.ts';
import type { ToneToken } from '../source/source-highlight.ts';
import type { ComposedSettings, SettingsPanel, SettingsRow, SettingsValue } from './settings-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type SettingsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

const MASK_TITLE = 'Masked by Labelore; the file holds the real value';

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

// ---------------------------------------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------------------------------------

/** The tone-only tokens of one line, as plain React text (no markup sink): keys are `source-t-key`, a masked value `source-t-mask`. */
function Tones({ tokens }: { tokens: readonly ToneToken[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) =>
        token.tone === null ? (
          token.text
        ) : (
          <span key={index} className={`source-t-${token.tone}`} {...(token.tone === 'mask' ? { title: MASK_TITLE } : {})}>
            {token.text}
          </span>
        ),
      )}
    </>
  );
}

/** A list or object in the shape it arrives: the JSON lines the Source reader would show, keys in `--t-key`. */
function JsonLines({ value }: { value: unknown[] | Record<string, unknown> }): React.JSX.Element {
  const flat = Array.isArray(value) && value.every((item) => typeof item !== 'object' || item === null);
  const lines = (flat ? JSON.stringify(value) : JSON.stringify(value, null, 2)).split('\n');
  return (
    <code className="view-settings-json">
      {lines.map((line, index) => (
        <span key={index} className="view-settings-json-line">
          <Tones tokens={highlightLine(line, { language: 'json', masked: true, inFrontmatter: false, inFence: false })} />
        </span>
      ))}
    </code>
  );
}

function Instrument({ value }: { value: SettingsValue }): React.JSX.Element {
  switch (value.kind) {
    case 'boolean':
      return (
        <span className="view-settings-switch" data-on={value.on}>
          <span className="view-settings-track" aria-hidden="true" />
          {value.on ? 'On' : 'Off'}
        </span>
      );
    case 'enum':
      return (
        <span className="view-settings-scale">
          {value.options.map((option) =>
            option === value.chosen ? (
              <span key={String(option)} className="view-settings-option" aria-current="true">
                {String(option)}
                <span className="sr-only"> (chosen)</span>
              </span>
            ) : (
              <span key={String(option)} className="view-settings-option">
                {String(option)}
              </span>
            ),
          )}
        </span>
      );
    case 'null':
      return <span className="view-settings-null">set to null</span>;
    case 'masked':
      return (
        <span className="source-t-mask view-settings-mask" title={MASK_TITLE}>
          <Lock aria-hidden="true" />
          {value.text}
        </span>
      );
    case 'number':
      return <span className="view-settings-number">{value.text}</span>;
    case 'string':
      return value.text === '' ? (
        <span className="view-settings-null">empty text</span>
      ) : (
        <span className="view-settings-text">{value.text}</span>
      );
    case 'list':
    case 'object':
      return <JsonLines value={value.value} />;
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
}

/** The shape word under a Not recognised key's path (a catalogued key shows its key path there instead). */
function shapeOf(value: SettingsValue): string {
  switch (value.kind) {
    case 'boolean':
      return 'boolean';
    case 'enum':
      return typeof value.chosen;
    case 'null':
      return 'null';
    case 'masked':
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'list':
      return 'list';
    case 'object':
      return 'object';
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
}

function Row({ row, panel }: { row: SettingsRow; panel: SettingsPanel }): React.JSX.Element {
  return (
    <li className="view-settings-row" data-wide={row.wide}>
      <div className="view-settings-label">
        <span className="view-settings-name">{row.label}</span>
        <span className="view-settings-key">{panel.kind === 'not-recognised' ? shapeOf(row.value) : row.key}</span>
      </div>
      <div className="view-settings-value">
        <Instrument value={row.value} />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------------------------------------

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

function UnsetFold({ panel }: { panel: SettingsPanel }): React.JSX.Element | null {
  if (panel.unset.length === 0) return null;
  return (
    <details className="view-settings-unset" open={panel.openUnset}>
      <summary>
        <ChevronRight aria-hidden="true" />
        {panel.unset.length} not set
      </summary>
      <ul>
        {panel.unset.map((unset) => (
          <li key={unset.key} className="view-settings-unset-row">
            <span>
              <span className="view-settings-unset-label">{unset.label}</span> <span className="view-settings-key">{unset.key}</span>
            </span>
            <span className="view-settings-notset">not set</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Panel({ panel }: { panel: SettingsPanel }): React.JSX.Element {
  return (
    <section className="view-settings-panel" data-kind={panel.kind} data-muted={panel.muted}>
      <PanelHeader panel={panel} />
      {panel.rows.length > 0 ? (
        <ul className="view-settings-rows">
          {panel.rows.map((row) => (
            <Row key={row.key} row={row} panel={panel} />
          ))}
        </ul>
      ) : null}
      <UnsetFold panel={panel} />
    </section>
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
          <Panel key={panel.id} panel={panel} />
        ))}
      </div>
    </div>
  );
}
