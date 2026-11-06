// The pause page's React surface (Phase 11, 11-10, VIEW-17, sketch 054 winner C "Gate path"): the header override
// (crumbs, the eyebrow "Paused work · {context}", the phase name as the h1, the lead "Paused in {context}, {date} ·
// {N} days ago", a copy button per file and the missing partner's note) and the page body, one ordered list on one
// rail. The stopped step carries aria-current="step". Every string is author text rendered as plain React text
// through ResearchInline - never React's raw-HTML injection prop - and no href is built from document text
// (T-11-12). Colour comes only from the tone a step carries and the theme tokens; a blocking gate is `missing`,
// never destructive.
import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { copyText } from '../components/copy-path-button.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type { ComposedPause, ComposedPauseFile } from './pause-page.ts';

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

function StopStep({ model }: { model: ComposedPause }): React.JSX.Element {
  const { stop } = model;
  return (
    <li className="view-pause-stop" data-step="stop" aria-current="step">
      <div className="view-pause-rail">
        <span className="view-pause-dot" data-kind="stop" aria-hidden="true" />
      </div>
      <div className="view-pause-body">
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
      </div>
      <div className="view-pause-aside" />
    </li>
  );
}

function ResumeStep({ model }: { model: ComposedPause }): React.JSX.Element {
  const { resume } = model;
  return (
    <li className="view-pause-resume" data-step="resume">
      <div className="view-pause-rail">
        <span className="view-pause-dot" data-kind="resume" aria-hidden="true" />
      </div>
      <div className="view-pause-body">
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
      </div>
      <div className="view-pause-aside" />
    </li>
  );
}

/** The pause page: the path on one rail, an ordered list from where the work stopped to the next action. */
export function PauseView({ model }: { model: ComposedPause }): React.JSX.Element {
  return (
    <div className="view-pause-root">
      <ol className="view-pause-path" aria-label="Path from the pause to the next action">
        <StopStep model={model} />
        <ResumeStep model={model} />
      </ol>
    </div>
  );
}
