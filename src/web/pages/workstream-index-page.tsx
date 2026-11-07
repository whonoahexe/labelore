// The workstream index (Phase 11, 11-31, VIEW-20; sketch 056 C "Shared root"; D-10, D-12, D-13). In workstream mode
// this is the project's first screen: the project head, then a tree. The root node carries what every workstream
// shares; each branch is one workstream with its current phase, status, phase ring and plans meter; below the tree a
// closed bar lists the completed ones. Every figure comes from the model (presentation/workstream-index.ts), which
// carries each sentence; this file only draws it.
//
// Everything that came off disk (names, status words, phase names) is React text, never markup. The Active mark and
// the active branch's heavy border are plain foreground, not accent: Active is only the active-workstream hint.
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { buildWorkstreamIndex } from '../../presentation/workstream-index.ts';
import type { WorkstreamBranch, WorkstreamFileChip } from '../../presentation/workstream-index.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import type { WorkstreamInventory } from '../../server/workstreams.ts';
import { LeadText } from '../components/lead-tokens.tsx';
import { StatusMeter } from '../components/status-meter.tsx';
import { Link } from '../nav.tsx';
import { stripEmoji } from './strip-emoji.ts';

/** The most branches in one row of the tree; further workstreams wrap to more rows. */
const MAX_COLUMNS = 4;
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function Ring({ ring }: { ring: NonNullable<WorkstreamBranch['ring']> }): React.JSX.Element {
  return (
    <span className="view-workstreams-ring" role="img" aria-label={ring.label}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle className="view-workstreams-ring-track" cx="32" cy="32" r={RING_RADIUS} />
        <circle
          className="view-workstreams-ring-done"
          cx="32"
          cy="32"
          r={RING_RADIUS}
          strokeDasharray={`${RING_CIRCUMFERENCE * ring.fraction} ${RING_CIRCUMFERENCE}`}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="36" textAnchor="middle">
          {ring.text}
        </text>
      </svg>
    </span>
  );
}

function FileChips({ chips, left }: { chips: WorkstreamFileChip[]; left: number }): React.JSX.Element | null {
  if (chips.length === 0) return null;
  return (
    <ul className="view-workstreams-files">
      {chips.map((chip) => (
        <li key={chip.label}>
          {chip.url === null ? (
            <span className="view-workstreams-file">{chip.label}</span>
          ) : (
            <Link className="view-workstreams-file" to={chip.url}>
              {chip.label}
            </Link>
          )}
        </li>
      ))}
      {left > 0 ? (
        <li>
          <span className="view-workstreams-file" data-more="true">{`+${left} more`}</span>
        </li>
      ) : null}
    </ul>
  );
}

function Branch({ branch }: { branch: WorkstreamBranch }): React.JSX.Element {
  const { ring, plans, status, phase } = branch;
  return (
    <li
      className="view-workstreams-branch"
      data-active={branch.active ? 'true' : undefined}
      data-dashed={branch.dashed ? 'true' : undefined}
    >
      <div className="view-workstreams-branch-top">
        <h3 className="view-workstreams-name" title={branch.name}>
          {branch.url === null ? <span>{branch.name}</span> : <Link to={branch.url}>{branch.name}</Link>}
        </h3>
        {branch.active ? <span className="view-workstreams-active">Active</span> : null}
      </div>
      <div className="view-workstreams-state">
        {ring ? <Ring ring={ring} /> : null}
        <div className="view-workstreams-phase">
          {phase ? (
            <>
              <span className="view-workstreams-micro">{phase.label}</span>
              {phase.name ? <span className="view-workstreams-phase-name">{phase.name}</span> : null}
            </>
          ) : null}
          {branch.dashedLabel ? <span className="view-workstreams-micro">{branch.dashedLabel}</span> : null}
          {status ? (
            <span className="status-chip" data-tone={status.tone}>
              {status.word}
            </span>
          ) : null}
        </div>
      </div>
      {plans ? (
        <StatusMeter
          filled={plans.done}
          total={plans.total}
          tone="complete"
          label={plans.label}
          caption={
            <>
              <b>{plans.done}</b> of {plans.total} {plans.total === 1 ? 'plan' : 'plans'}
            </>
          }
        />
      ) : null}
      {branch.note ? <p className="view-workstreams-note">{branch.note}</p> : null}
      <FileChips chips={branch.files} left={branch.filesLeftOut} />
    </li>
  );
}

export function WorkstreamIndexPage({
  presentation,
  inventory,
}: {
  presentation: ProjectPresentation;
  inventory: WorkstreamInventory;
}): React.JSX.Element {
  const model = useMemo(() => buildWorkstreamIndex(inventory, presentation), [inventory, presentation]);
  const { head, pointer, root, branches, completed } = model;
  const columns = Math.max(1, Math.min(branches.length, MAX_COLUMNS));
  return (
    <main className="view-workstreams-page page-stack">
      <header className="view-workstreams-head">
        <nav className="view-workstreams-crumbs" aria-label="Breadcrumb">
          <ol>
            <li aria-current="page">{head.name}</li>
          </ol>
        </nav>
        <p className="eyebrow">{head.eyebrow}</p>
        <h1>{head.name}</h1>
        {head.lead ? (
          <p className="view-workstreams-lead">
            <LeadText text={stripEmoji(head.lead)} />
          </p>
        ) : null}
        <p className="view-workstreams-pointer" data-state={pointer.state}>
          {pointer.segments.map((segment, index) =>
            segment.style === 'name' ? (
              <b key={index}>{segment.text}</b>
            ) : segment.style === 'code' ? (
              <code key={index}>{segment.text}</code>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      </header>

      {model.midMigration ? (
        <div className="notice view-workstreams-migration" role="status">
          <p>{model.midMigration}</p>
        </div>
      ) : null}

      <section className="view-workstreams-section" aria-labelledby="view-workstreams-heading">
        <h2 className="sr-only" id="view-workstreams-heading">
          Workstreams
        </h2>
        <ul className="view-workstreams-tree">
          <li className="view-workstreams-root-item">
            <div className="view-workstreams-root">
              <div className="view-workstreams-root-title">
                <span className="view-workstreams-micro">{root.label}</span>
                <strong className="view-workstreams-root-name">{root.name}</strong>
              </div>
              <span className="view-workstreams-root-pointer">{root.pointerText}</span>
              <FileChips chips={root.files} left={0} />
            </div>
            <ul
              className="view-workstreams-branches"
              style={{ '--view-workstreams-cols': columns } as React.CSSProperties}
            >
              {branches.map((branch) => (
                <Branch key={branch.name} branch={branch} />
              ))}
            </ul>
          </li>
        </ul>
      </section>

      {completed ? (
        <details className="view-workstreams-completed">
          <summary>
            <ChevronRight aria-hidden="true" />
            <span>{completed.label}</span>
            <span className="view-workstreams-count">{completed.countText}</span>
          </summary>
          <ul>
            {completed.rows.map((row) => (
              <li key={row.folder}>
                <span className="status-square" data-tone="complete" aria-hidden="true" />
                <span className="view-workstreams-done-name">{row.name}</span>
                <span className="view-workstreams-meta">{row.folder}</span>
                <span className="view-workstreams-meta">{row.phasesText}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
