// The pause page's React surface (Phase 11, 11-10, VIEW-17, sketch 054 winner C "Gate path"): the header override
// (crumbs, the eyebrow "Paused work · {context}", the phase name as the h1, the lead "Paused in {context}, {date} ·
// {N} days ago", a copy button per file and the missing partner's note) and the page body, one ordered list on one
// rail. The stopped step carries aria-current="step". Every string is author text rendered as plain React text
// through ResearchInline - never React's raw-HTML injection prop - and no href is built from document text
// (T-11-12). Colour comes only from the tone a step carries and the theme tokens; a blocking gate is `missing`,
// never destructive. "Mark as read" is a real button whose aria-pressed is React state and nothing else: it issues no
// request, writes no file and no storage, and resets on reload (T-11-13). A pressed gate keeps its tone and gains the
// word "Read" beside the bar; it is a reading aid, never a pass.
import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { copyText } from '../components/copy-path-button.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { RecordDisagreement } from '../components/record-disagreement.tsx';
import type {
  ComposedPause,
  ComposedPauseFile,
  ComposedPauseGate,
  ComposedPauseSideNote,
  ComposedPauseTasks,
} from './pause-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type PauseHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

function PauseCopyButton({ file }: { file: ComposedPauseFile }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  async function copy(): Promise<void> {
    if (!(await copyText(file.path))) return;
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      className="view-pause-copy"
      data-copied={copied ? 'true' : 'false'}
      aria-label={`Copy path of ${file.name}`}
      title={file.path}
      onClick={() => void copy()}
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span>{file.name}</span>
    </button>
  );
}

function PauseMeta({ model }: { model: ComposedPause }): React.JSX.Element | null {
  const { files, missingPartner } = model.head;
  if (files.length === 0 && missingPartner === null) return null;
  return (
    <>
      {files.map((file) => (
        <PauseCopyButton key={file.name} file={file} />
      ))}
      {missingPartner !== null ? <span className="view-pause-meta">{missingPartner}</span> : null}
    </>
  );
}

function PauseLead({ model }: { model: ComposedPause }): React.JSX.Element | null {
  const { dateLine, age } = model.head;
  if (dateLine === null) return null;
  // The count in "31 days ago" is the one figure of the sentence, set in mono by the stylesheet; "today" has none.
  const at = age === null ? -1 : dateLine.lastIndexOf(age);
  const space = age === null ? -1 : age.indexOf(' ');
  const counted = age !== null && at >= 0 && space > 0 && age.charCodeAt(0) >= 48 && age.charCodeAt(0) <= 57;
  return (
    <span className="view-pause-lead">
      {counted ? (
        <>
          {dateLine.slice(0, at)}
          <b>{age.slice(0, space)}</b>
          {age.slice(space)}
        </>
      ) : (
        dateLine
      )}
    </span>
  );
}

/** The ArtifactHeader override View mode spreads over its props: "Paused work · {context}", the phase (or spike)
 * name as the h1, the pause's lead line and a copy button per file (so the header's own single copy button steps
 * aside with `path: null`). */
export function pauseHeaderProps(model: ComposedPause, artifactTitle: string): PauseHeaderProps {
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: model.head.dateLine === null ? null : <PauseLead model={model} />,
    meta: <PauseMeta model={model} />,
    path: null,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: 'Paused work' },
    ],
  };
}

function SourceTag({ name }: { name: string }): React.JSX.Element {
  return (
    <span className="view-pause-src" title={name}>
      {name}
    </span>
  );
}

/** One step of the path: the rail with its mark, the body, and the aside the side notes branch into. */
function Step({
  step,
  dot,
  current = false,
  rail,
  aside,
  children,
}: {
  step: string;
  dot: string;
  current?: boolean;
  rail?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <li className="view-pause-step" data-step={step} aria-current={current ? 'step' : undefined}>
      <div className="view-pause-rail" data-rail={rail}>
        <span className="view-pause-dot" data-kind={dot} aria-hidden="true" />
      </div>
      <div className="view-pause-body">{children}</div>
      <div className="view-pause-aside">{aside}</div>
    </li>
  );
}

function Chips({ tasks, tone }: { tasks: ComposedPauseTasks; tone: 'complete' | 'quiet' }): React.JSX.Element {
  return (
    <>
      <span className="view-pause-key">{tasks.label}</span>
      <ul className="view-pause-chips">
        {tasks.chips.map((chip) => (
          <li key={chip.key} className="view-pause-chip" data-tone={tone}>
            <i className="status-square view-pause-sq" data-tone={tone} aria-hidden="true" />
            <span>
              <ResearchInline text={chip.label} />
            </span>
            {chip.count !== null ? <span className="view-pause-chip-note">{chip.count}</span> : null}
            {chip.commit !== null ? <span className="view-pause-chip-note">{chip.commit}</span> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function SideNotes({ notes }: { notes: ComposedPauseSideNote[] }): React.JSX.Element | null {
  if (notes.length === 0) return null;
  return (
    <>
      {notes.map((note) => (
        <div key={note.key} className="view-pause-side">
          <span className="view-pause-key">
            <span>{note.label}</span>
            <SourceTag name={note.file} />
          </span>
          <strong>
            <ResearchInline text={note.what} />
          </strong>
          {note.detail !== null ? (
            <span>
              <ResearchInline text={note.detail} />
            </span>
          ) : null}
        </div>
      ))}
    </>
  );
}

export function GateBar({ gate }: { gate: ComposedPauseGate }): React.JSX.Element {
  // View state only: it is never sent anywhere or stored, and a reload clears it.
  const [read, setRead] = useState(false);
  return (
    <div className="view-pause-gate" data-read={read ? 'true' : 'false'}>
      <span className="view-pause-key">{gate.label}</span>
      <span className="view-pause-what">
        <ResearchInline text={gate.what} />
      </span>
      {gate.why !== null ? (
        <span className="view-pause-why">
          <ResearchInline text={gate.why} />
        </span>
      ) : null}
      {gate.how !== null ? (
        <span className="view-pause-why">
          {gate.howLabel !== null ? `${gate.howLabel}: ` : ''}
          <ResearchInline text={gate.how} />
        </span>
      ) : null}
      <span className="view-pause-foot">
        <button type="button" className="view-pause-read" aria-pressed={read} onClick={() => setRead((value) => !value)}>
          Mark as read
        </button>
        {read ? (
          <span className="status-chip" data-tone="quiet">
            Read
          </span>
        ) : null}
        <SourceTag name={gate.file} />
      </span>
    </div>
  );
}

function StopStep({ model }: { model: ComposedPause }): React.JSX.Element {
  const { stop } = model;
  return (
    <Step step="stop" dot="stop" current aside={<SideNotes notes={model.stopSideNotes} />}>
      <span className="view-pause-key">{stop.label}</span>
      {stop.title !== null ? (
        <h2 className="view-pause-stop-title">
          <ResearchInline text={stop.title} />
        </h2>
      ) : null}
      {stop.progress !== null ? (
        <span className="source-note">
          <ResearchInline text={stop.progress} />
        </span>
      ) : null}
      {stop.disagreements.map((row) => (
        <RecordDisagreement key={row.key} field={row.field} left={row.left} right={row.right} />
      ))}
      {stop.disagreements.length > 0 ? (
        <p className="source-note">The two files disagree; both values are shown as written.</p>
      ) : null}
    </Step>
  );
}

function GateSteps({ model }: { model: ComposedPause }): React.JSX.Element {
  const { items, clearedLabel } = model.gates;
  if (items.length === 0) {
    return (
      <Step step="gate" dot="cleared" aside={<SideNotes notes={model.gateSideNotes} />}>
        <p className="view-pause-cleared">{clearedLabel}</p>
      </Step>
    );
  }
  return (
    <>
      {items.map((gate, index) => (
        <Step
          key={gate.key}
          step="gate"
          dot="gate"
          aside={index === 0 ? <SideNotes notes={model.gateSideNotes} /> : undefined}
        >
          <GateBar gate={gate} />
        </Step>
      ))}
    </>
  );
}

function ResumeStep({ model }: { model: ComposedPause }): React.JSX.Element {
  const { resume } = model;
  return (
    <Step step="resume" dot="resume">
      <div className="view-pause-next">
        <span className="view-pause-key">
          <span>{resume.next !== null ? `${resume.label} · next action` : resume.label}</span>
          {resume.next !== null ? <SourceTag name={resume.next.file} /> : null}
        </span>
        {resume.next !== null ? (
          <span className="view-pause-say">
            <ResearchInline text={resume.next.text} />
          </span>
        ) : null}
        {resume.other !== null ? (
          <span className="source-note">
            {resume.other.file}: “<ResearchInline text={resume.other.text} />”
          </span>
        ) : null}
      </div>
    </Step>
  );
}

/** The pause page: the path on one rail, an ordered list from the work behind you, through where it stopped and the
 * gates to clear, to the next action and what is left ahead. */
export function PauseView({ model }: { model: ComposedPause }): React.JSX.Element {
  return (
    <div className="view-pause-root">
      <ol className="view-pause-path" role="list" aria-label="Path from the pause to the next action">
        {model.behind !== null ? (
          <Step step="behind" dot="done" rail="behind">
            <Chips tasks={model.behind} tone="complete" />
          </Step>
        ) : null}
        <StopStep model={model} />
        <GateSteps model={model} />
        <ResumeStep model={model} />
        {model.ahead !== null ? (
          <Step step="ahead" dot="ahead" rail="ahead">
            <Chips tasks={model.ahead} tone="quiet" />
          </Step>
        ) : null}
      </ol>
    </div>
  );
}
