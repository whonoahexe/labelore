// The dashboard's "Where the work stands" line (quick-261115-o34, sketch 066 C with 067 S's stage detail):
// Then, Now and Next as three points on one line. Author text renders only as React text nodes, run through
// stripMarkdown(stripEmoji()); every link is an artifact key, a phase route or a STATE.md source anchor from
// the dashboard view model, and no raw-HTML prop is used.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  DashboardPosition,
  PositionEmpty,
  PositionFile,
  PositionStage,
} from '../../presentation/dashboard-position.ts';
import { CopyCommand } from '../components/copy-command.tsx';
import { Link } from '../nav.tsx';
import { stripEmoji, stripMarkdown } from './strip-emoji.ts';

const clean = (text: string): string => stripMarkdown(stripEmoji(text));

/** The toggle rule: choosing the open cell closes it; choosing another cell switches to it. */
export function nextOpenStage(current: number | null, index: number): number | null {
  return current === index ? null : index;
}

function FileRow({ file }: { file: PositionFile }): React.JSX.Element {
  return (
    <li>
      <span className="position-one-line">
        <Link className="position-file" to={file.url}>
          {file.name}
        </Link>
      </span>
    </li>
  );
}

function EmptyText({ empty }: { empty: PositionEmpty }): React.JSX.Element {
  return (
    <p className="position-empty">
      {empty.text}
      {empty.command ? (
        <>
          {' '}
          <b>{empty.command}</b>
        </>
      ) : null}
      {empty.tail ? ` ${empty.tail}` : null}
    </p>
  );
}

function StageDetail({ stage }: { stage: PositionStage }): React.JSX.Element {
  let body: React.JSX.Element;
  if (stage.name === 'Plan' || stage.name === 'Execute') {
    body =
      stage.plansTotal > 0 ? (
        <p className="position-empty">
          {stage.name === 'Plan'
            ? `${stage.plansTotal} ${stage.plansTotal === 1 ? 'plan' : 'plans'}`
            : `${stage.plansDone} of ${stage.plansTotal} plans done`}
        </p>
      ) : stage.empty ? (
        <EmptyText empty={stage.empty} />
      ) : (
        <p className="position-empty">Nothing on disk for this stage.</p>
      );
  } else if (stage.files.length > 0) {
    body = (
      <ul className="position-detail-list">
        {stage.files.map((file) => (
          <FileRow file={file} key={file.path} />
        ))}
      </ul>
    );
  } else if (stage.empty) {
    body = <EmptyText empty={stage.empty} />;
  } else {
    body = <p className="position-empty">Nothing on disk for this stage.</p>;
  }
  return (
    <div className="position-detail" id="position-detail">
      <span className="position-label">{stage.name}</span>
      {body}
    </div>
  );
}

function ThenPoint(): React.JSX.Element {
  return (
    <div className="position-point" data-point="then">
      <span className="position-pin" aria-hidden="true" />
      <p className="position-when">Then</p>
      <p className="position-why">Nothing on disk is dated yet.</p>
    </div>
  );
}

/** The stateless line: `open` is the index of the open stage cell, or null while every cell is closed. */
export function PositionLineView({
  position,
  open,
  onToggle,
}: {
  position: DashboardPosition;
  open: number | null;
  onToggle: (index: number) => void;
}): React.JSX.Element {
  const { now, next } = position;
  const openStage = now.kind === 'phase' && open !== null ? now.stages[open] : undefined;
  return (
    <section className="position-line" aria-label="Where the work stands">
      <ThenPoint />
      <div className="position-point" data-point="now">
        <span className="position-pin" aria-hidden="true" />
        <p className="position-when">{clean(now.when)}</p>
        <h2>{clean(now.title)}</h2>
        {now.kind === 'phase' ? (
          <>
            <div className="position-cells" role="group" aria-label="Phase stages">
              {now.stages.map((stage, index) => (
                <button
                  aria-controls={open === index ? 'position-detail' : undefined}
                  aria-expanded={open === index}
                  className="position-cell"
                  data-state={stage.state}
                  key={stage.name}
                  onClick={() => onToggle(index)}
                  type="button"
                >
                  <span className="position-cell-name">{stage.name}</span>
                  <span className="position-cell-count">
                    {stage.count}
                    <ChevronDown aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
            {openStage ? <StageDetail stage={openStage} /> : null}
          </>
        ) : (
          <p className="position-why">{clean(now.why)}</p>
        )}
      </div>
      <div className="position-point" data-point="next">
        <span className="position-pin" aria-hidden="true" />
        <p className="position-when">Next</p>
        <p className="position-what">
          {next.title}
          {next.plan ? (
            <>
              {', from '}
              <Link className="position-file" to={next.plan.url}>
                {next.plan.id}
              </Link>
            </>
          ) : null}
        </p>
        <CopyCommand command={next.command} />
        <p className="position-why">{clean(next.why)}</p>
      </div>
    </section>
  );
}

/** The line with its own open cell: closed at first, one open at a time. */
export function PositionLine({ position }: { position: DashboardPosition }): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null);
  return <PositionLineView position={position} open={open} onToggle={(index) => setOpen((current) => nextOpenStage(current, index))} />;
}
