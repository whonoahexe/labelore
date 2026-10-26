import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Link, useProjectPathname } from '../nav.tsx';
import type {
  DrawerFileRow,
  DrawerMilestonePlace,
  DrawerPhasePlace,
  DrawerPlanRow,
  DrawerQuickGroup,
  DrawerQuickPlace,
  DrawerViewModel,
} from '../../presentation/drawer.ts';
import {
  findPlace,
  placeKeyForPath,
  quickTaskKeyForPath,
  shippedOwnerOf,
} from '../../presentation/drawer-route.ts';
import { stripEmoji } from '../pages/strip-emoji.ts';

async function fetchDrawer(): Promise<DrawerViewModel> {
  const response = await fetch('/api/drawer', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Drawer request failed (${response.status})`);
  return (await response.json()) as DrawerViewModel;
}

/** The drawer's data: the places and their files, projected server-side from the real reader. */
export function useDrawerQuery() {
  return useQuery({ queryKey: ['drawer'], queryFn: fetchDrawer });
}

/** The drawer half of the shared Warning/Unreadable vocabulary — same tones and labels as the
 * artifact-page badge and the search-page chip. Null tone renders nothing; the row stays a normal,
 * clickable row either way (marked, never disabled and never hidden). */
function WarningIndicator({
  warningTone,
}: {
  warningTone: DrawerFileRow['warningTone'];
}): React.JSX.Element | null {
  if (warningTone === null) return null;
  return (
    <span
      className="places-warning status-chip"
      data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}
    >
      <span className="sr-only">, status: </span>
      {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
    </span>
  );
}

function FileRow({
  row,
  pathname,
  onNavigate,
}: {
  row: DrawerFileRow;
  pathname: string;
  onNavigate: () => void;
}): React.JSX.Element {
  const active = row.url === pathname;
  return (
    <Link
      to={row.url}
      className="places-file-row"
      data-active={active ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <span className="places-row-spacer" aria-hidden="true" />
      <span className="places-label" title={row.path}>
        {row.label}
      </span>
      <WarningIndicator warningTone={row.warningTone} />
    </Link>
  );
}

function PlanRow({
  plan,
  pathname,
  onNavigate,
}: {
  plan: DrawerPlanRow;
  pathname: string;
  onNavigate: () => void;
}): React.JSX.Element {
  const active = plan.url === pathname || plan.matchUrls.includes(pathname);
  return (
    <Link
      to={plan.url}
      className="places-file-row"
      data-active={active ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <span className="places-plan-square" data-tone={plan.done ? 'complete' : 'quiet'}>
        <span className="sr-only">{plan.done ? 'summary written' : 'no summary yet'}</span>
      </span>
      <span className="places-label">{plan.label}</span>
      <span className="places-badge">{plan.badge}</span>
      <WarningIndicator warningTone={plan.warningTone} />
    </Link>
  );
}

function Stage({ label, count }: { label: string; count?: string }): React.JSX.Element {
  return (
    <div className="places-stage">
      <span>{label}</span>
      {count !== undefined ? <span>{count}</span> : null}
    </div>
  );
}

function PhaseFiles({
  phase,
  pathname,
  onNavigate,
}: {
  phase: DrawerPhasePlace;
  pathname: string;
  onNavigate: () => void;
}): React.JSX.Element {
  const where =
    phase.milestoneVersion !== null
      ? `${phase.milestoneVersion} · Phase ${phase.number}`
      : `Phase ${phase.number}`;
  return (
    <>
      <div className="places-files-head">
        <span className="places-where">{where}</span>
        <h3 className="places-files-title">{phase.name}</h3>
        <span className="status-chip" data-tone={phase.status.tone}>
          {phase.status.label}
        </span>
      </div>
      {phase.before.length > 0 ? <Stage label="Before plans" /> : null}
      {phase.before.map((row) => (
        <FileRow key={row.key} row={row} pathname={pathname} onNavigate={onNavigate} />
      ))}
      <Stage label="Plans" count={phase.total > 0 ? `${phase.done} of ${phase.total} done` : 'none yet'} />
      {phase.plans.map((plan) => (
        <PlanRow key={plan.key} plan={plan} pathname={pathname} onNavigate={onNavigate} />
      ))}
      {phase.after.length > 0 ? <Stage label="After" /> : null}
      {phase.after.map((row) => (
        <FileRow key={row.key} row={row} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </>
  );
}

function MilestoneFiles({
  milestone,
  onSelect,
}: {
  milestone: DrawerMilestonePlace;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const name = stripEmoji(milestone.name);
  return (
    <>
      <div className="places-files-head">
        <span className="places-where">
          {milestone.shippedLabel !== null ? `Shipped ${milestone.shippedLabel}` : 'Shipped'}
        </span>
        <h3 className="places-files-title">
          {name === '' || name === milestone.version ? milestone.version : `${milestone.version} · ${name}`}
        </h3>
      </div>
      <Stage label="Phases" count={String(milestone.phases.length)} />
      {milestone.phases.map((phase) => (
        <button
          key={phase.key}
          type="button"
          className="places-row"
          onClick={() => onSelect(phase.key)}
        >
          <span className="places-number">{phase.number}</span>
          <span className="places-label">{phase.name}</span>
        </button>
      ))}
    </>
  );
}

/** A quick-task group's heading: the current milestone's version, or a shipped one's version and name. */
function quickGroupLabel(group: DrawerQuickGroup): string {
  if (group.current) return group.version !== null ? `${group.version} · Current` : 'Current';
  const name = stripEmoji(group.name ?? '');
  return name === '' || name === group.version ? (group.version ?? '') : `${group.version} · ${name}`;
}

function QuickFiles({
  place,
  activeTaskKey,
  onNavigate,
}: {
  place: DrawerQuickPlace;
  activeTaskKey: string | null;
  onNavigate: () => void;
}): React.JSX.Element {
  return (
    <>
      <div className="places-files-head">
        <h3 className="places-files-title">Quick tasks · {place.count}</h3>
      </div>
      {place.count === 0 ? <p className="empty-note">Nothing here yet.</p> : null}
      {place.groups.map((group) => (
        <div key={group.key} className="places-quick-group">
          <Stage label={quickGroupLabel(group)} count={String(group.tasks.length)} />
          {group.tasks.map((task) => {
            // One row per task, opening its plan; the plan page switches to the summary. The row
            // stays marked while any of the task's own pages is open.
            const active = task.key === activeTaskKey;
            return (
              <Link
                key={task.key}
                to={task.url}
                className="places-file-row places-quick-task"
                data-active={active ? 'true' : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                {task.dateBadge !== null ? (
                  <span className="places-badge">{task.dateBadge}</span>
                ) : (
                  <span className="places-row-spacer" aria-hidden="true" />
                )}
                <span className="places-label" title={task.key}>
                  {task.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** The drawer body (sketch 038 C): places on the left, the chosen place's files on the right.
 * No separate error surface of its own — a failure here simply means the drawer renders nothing,
 * relying on the shell's own existing snapshot-error notice. */
export function PlanningPlaces({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}): React.JSX.Element | null {
  const pathname = useProjectPathname();
  const query = useDrawerQuery();
  const navRef = useRef<HTMLElement | null>(null);
  const model = query.data;

  // The chosen place is remembered together with the (open, route, data) it was chosen under.
  // Each time the drawer opens, the route changes or the data arrives, that memory no longer
  // matches and the drawer lands on the place that holds the current page — with none, on the
  // model's own default. Derived during render, so there is no frame showing a stale place.
  const [picked, setPicked] = useState<{
    open: boolean;
    pathname: string;
    model: DrawerViewModel | undefined;
    key: string | null;
    drilled: boolean;
  } | null>(null);
  const routeKey = model ? (placeKeyForPath(model, pathname) ?? model.defaultPlaceKey) : null;
  const pickedHere =
    picked !== null && picked.open === open && picked.pathname === pathname && picked.model === model
      ? picked
      : null;
  const selectedKey = pickedHere ? pickedHere.key : routeKey;
  // On a phone the drawer is one column: false shows the places, true shows the chosen place's
  // files. It starts false on every open and turns true once any place is chosen.
  const drilled = pickedHere?.drilled ?? false;
  const setSelectedKey = (key: string | null) => setPicked({ open, pathname, model, key, drilled: true });
  const backToPlaces = () => setPicked({ open, pathname, model, key: selectedKey, drilled: false });

  // On open, scroll the current page's row and the selected place into view. A rAF defers past
  // the paint that makes the keepMounted popup visible, so the just-unhidden elements have layout.
  useEffect(() => {
    if (!open || navRef.current === null) return;
    const frame = requestAnimationFrame(() => {
      for (const selector of ["[data-active='true']", "[data-selected='true']"]) {
        navRef.current?.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (query.isError) return null;

  // Loading: the track holds its width via CSS with no skeleton rows and no layout shift — a
  // local filesystem read resolves in milliseconds.
  if (query.isPending) {
    return <nav className="places-navigator" aria-hidden="true" data-state="loading" />;
  }

  const data = query.data;
  const shippedOwner = shippedOwnerOf(data, selectedKey);
  const place = findPlace(data, selectedKey);

  return (
    <nav
      className="places-navigator"
      aria-label="Planning files"
      data-drilled={drilled ? 'true' : 'false'}
      ref={navRef}
    >
      <div className="places-list">
        <section className="places-group">
          <h2 className="places-group-label">
            Current
            {data.current.version !== null ? (
              <span className="places-group-version">{data.current.version}</span>
            ) : null}
          </h2>
          {data.current.phases.length === 0 ? <p className="empty-note">Nothing here yet.</p> : null}
          {data.current.phases.map((phase) => (
            <button
              key={phase.key}
              type="button"
              className="places-row"
              data-selected={selectedKey === phase.key ? 'true' : undefined}
              aria-current={selectedKey === phase.key ? 'true' : undefined}
              onClick={() => setSelectedKey(phase.key)}
            >
              <span className="places-number">{phase.number}</span>
              <span className="places-label">{phase.name}</span>
              {phase.total > 0 ? (
                <span className="places-badge">
                  {phase.done}/{phase.total}
                </span>
              ) : null}
            </button>
          ))}
        </section>
        <section className="places-group">
          <h2 className="places-group-label">Shipped</h2>
          {data.shipped.length === 0 ? <p className="empty-note">Nothing here yet.</p> : null}
          {data.shipped.map((milestone) => (
            <div key={milestone.key} className="places-fold">
              <button
                type="button"
                className="places-row"
                data-selected={selectedKey === milestone.key ? 'true' : undefined}
                aria-current={selectedKey === milestone.key ? 'true' : undefined}
                onClick={() => setSelectedKey(milestone.key)}
              >
                <span className="places-number">{milestone.version}</span>
                <span className="places-label">{stripEmoji(milestone.name)}</span>
                {milestone.shippedLabel !== null ? (
                  <span className="places-badge">{milestone.shippedLabel}</span>
                ) : null}
              </button>
              {shippedOwner === milestone.key
                ? milestone.phases.map((phase) => (
                    <button
                      key={phase.key}
                      type="button"
                      className="places-row"
                      data-depth="1"
                      data-selected={selectedKey === phase.key ? 'true' : undefined}
                      aria-current={selectedKey === phase.key ? 'true' : undefined}
                      onClick={() => setSelectedKey(phase.key)}
                    >
                      <span className="places-number">{phase.number}</span>
                      <span className="places-label">{phase.name}</span>
                    </button>
                  ))
                : null}
            </div>
          ))}
        </section>
        {/* Every quick task, current and shipped, lives in this one place, grouped by milestone. */}
        <section className="places-group" aria-label="Quick tasks">
          <button
            type="button"
            className="places-row"
            data-selected={selectedKey === data.quick.key ? 'true' : undefined}
            aria-current={selectedKey === data.quick.key ? 'true' : undefined}
            onClick={() => setSelectedKey(data.quick.key)}
          >
            <span className="places-label">Quick tasks</span>
            <span className="places-badge">{data.quick.count}</span>
          </button>
        </section>
      </div>
      <div className="places-files">
        <button type="button" className="places-back" onClick={backToPlaces}>
          <ChevronLeft aria-hidden="true" />
          All places
        </button>
        {place?.kind === 'phase' ? (
          <PhaseFiles phase={place} pathname={pathname} onNavigate={onNavigate} />
        ) : null}
        {place?.kind === 'milestone' ? (
          <MilestoneFiles milestone={place} onSelect={setSelectedKey} />
        ) : null}
        {place?.kind === 'quick' ? (
          <QuickFiles
            place={place}
            activeTaskKey={quickTaskKeyForPath(data, pathname)}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    </nav>
  );
}
