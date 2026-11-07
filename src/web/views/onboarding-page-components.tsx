// The onboarding page's React surface (Phase 11, 11-26, VIEW-18, sketch 061 winner A "Desk"): the header override (crumbs, the
// eyebrow "Onboarding", the file's own title as the h1 and the file name as meta; the header keeps its own Copy path button) and
// the page body. It leads with "Recommended next step": the summary's command in the shared copy-command row and, once under
// it, the sentence that Labelore does not run commands. When a map-only project's first screen suggests a different command, a
// quiet dashed block "The first screen suggests" stands beside it (under it on a narrow screen) with its own copy row. Below, the
// project is one desk with three objects standing on it - a folder of four sheet slots (the planning files), a smaller folder of
// seven mini documents (the codebase map and its readiness) and a pile of candidate documents - over three closed bars that hold
// the same facts as words; pressing an object opens its bar. The page makes no request and touches no storage: the only action
// is copying a command's text to the clipboard (T-11-39). Every string is author text rendered as plain React text - never
// React's raw-HTML injection prop (T-11-58). Nothing here is destructive or warning: an absent file is an absence, not a failed
// read, so a missing project file or map is `quiet` and dashed.
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { CopyCommand } from '../components/copy-command.tsx';
import {
  CODEBASE_LABEL,
  DOCUMENTS_LABEL,
  FILES_LABEL,
  FIRST_SCREEN_LABEL,
  FROM_SUMMARY,
  MAP_DOCUMENT_TOTAL,
  NEVER_RUNS,
  NEXT_LABEL,
  NOT_FOUND_WORD,
  NOT_STATED_WORD,
  NO_COMMAND,
} from './onboarding-page.ts';
import type {
  ComposedFirstScreen,
  ComposedOnboarding,
  ComposedOnboardingCodebase,
  ComposedOnboardingDocuments,
  ComposedOnboardingFile,
  ComposedOnboardingFiles,
  ComposedOnboardingNext,
  ComposedReadiness,
} from './onboarding-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type OnboardingHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The file name without its folder: the header only lays its meta row out when it has a meta item. */
function fileNameOf(path: string | undefined): string | null {
  if (path === undefined) return null;
  const name = path.split('/').pop() ?? '';
  return name === '' ? null : name;
}

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the file's title as the h1 and its name as meta.
 * The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function onboardingHeaderProps(model: ComposedOnboarding, artifactTitle: string, artifactPath?: string): OnboardingHeaderProps {
  const name = fileNameOf(artifactPath);
  return {
    eyebrow: model.head.eyebrow,
    title: artifactTitle,
    lead: null,
    meta: name === null ? null : <span className="view-onboarding-meta">{name}</span>,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: name ?? artifactTitle },
    ],
  };
}

type BarKey = 'files' | 'codebase' | 'documents';

const BAR_IDS: Readonly<Record<BarKey, string>> = {
  files: 'view-onboarding-bar-files',
  codebase: 'view-onboarding-bar-codebase',
  documents: 'view-onboarding-bar-documents',
};

// ---------------------------------------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------------------------------------

function Square({ tone }: { tone: 'complete' | 'quiet' }): React.JSX.Element {
  return <i className="status-square view-onboarding-sq" data-tone={tone} aria-hidden="true" />;
}

/** The readiness chip: Complete map is `complete`, Fast and Partial map `in-flight`, a word outside the three is shown as written
 * in a dashed plain chip. */
function ReadinessChip({ readiness }: { readiness: ComposedReadiness }): React.JSX.Element {
  return readiness.tone === null ? (
    <span className="status-chip view-onboarding-chip" data-form="other">
      {readiness.label}
    </span>
  ) : (
    <span className="status-chip view-onboarding-chip" data-tone={readiness.tone}>
      {readiness.label}
    </span>
  );
}

function NotFoundChip({ word }: { word: string }): React.JSX.Element {
  return (
    <span className="status-chip view-onboarding-chip" data-tone="quiet">
      {word}
    </span>
  );
}

function yesNo(value: boolean | null): string {
  return value === true ? 'Yes' : value === false ? 'No' : NOT_STATED_WORD;
}

// ---------------------------------------------------------------------------------------------------------
// Recommended next step
// ---------------------------------------------------------------------------------------------------------

/** The summary's command. The quiet "From the onboarding summary" line is drawn only when the first screen suggests another. */
function NextStep({ next }: { next: ComposedOnboardingNext }): React.JSX.Element {
  return (
    <section className="view-onboarding-section" aria-labelledby="view-onboarding-next">
      <h2 className="view-onboarding-heading" id="view-onboarding-next">
        {NEXT_LABEL}
      </h2>
      <div className="view-onboarding-next">
        {next.labelled ? <p className="view-onboarding-meta">{FROM_SUMMARY}</p> : null}
        {next.command === null ? (
          <div className="view-onboarding-dashbox">
            <span>{NO_COMMAND}</span>
          </div>
        ) : (
          <>
            <CopyCommand command={next.command} />
            <p className="view-onboarding-quiet">{NEVER_RUNS}</p>
          </>
        )}
      </div>
    </section>
  );
}

/** The quiet second block: the command the Phase 10 first screen suggests, with its own copy row and no second note. */
function FirstScreen({ screen }: { screen: ComposedFirstScreen }): React.JSX.Element {
  return (
    <section className="view-onboarding-first" aria-labelledby="view-onboarding-first">
      <span className="view-onboarding-micro" id="view-onboarding-first">
        {FIRST_SCREEN_LABEL}
      </span>
      {screen.reason === '' ? null : <p className="view-onboarding-quiet">{screen.reason}</p>}
      <CopyCommand command={screen.command} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------------------------------------

function Sheet({ file }: { file: ComposedOnboardingFile }): React.JSX.Element {
  if (file.present === true) {
    return (
      <span className="view-onboarding-sheet" data-ok="yes">
        <span className="view-onboarding-sheet-top">
          <Square tone="complete" />
        </span>
        <span className="view-onboarding-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="view-onboarding-name">{file.name}</span>
      </span>
    );
  }
  return (
    <span className="view-onboarding-sheet" data-ok="no">
      <span className="view-onboarding-sheet-top">
        <Square tone="quiet" />
      </span>
      <span className="view-onboarding-nf">{file.present === false ? NOT_FOUND_WORD : NOT_STATED_WORD}</span>
      <span className="view-onboarding-name">{file.name}</span>
    </span>
  );
}

function ObjectCaption({ label, note, extra }: { label: string; note?: string; extra?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="view-onboarding-cap">
      <h2 className="view-onboarding-heading">{label}</h2>
      {note === undefined ? null : <span className="view-onboarding-count">{note}</span>}
      {extra ?? null}
    </div>
  );
}

function FilesObject({ files, onOpen }: { files: ComposedOnboardingFiles; onOpen: () => void }): React.JSX.Element {
  return (
    <div className="view-onboarding-obj">
      <ObjectCaption label={FILES_LABEL} note={files.summary} />
      <button type="button" className="view-onboarding-fig" aria-label={`Show details: ${FILES_LABEL}`} onClick={onOpen}>
        <span className="view-onboarding-folder">
          <span className="view-onboarding-tab">.planning/</span>
          <span className="view-onboarding-slots">
            {files.rows.map((file) => (
              <Sheet key={file.key} file={file} />
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}

function CodebaseObject({ codebase, onOpen }: { codebase: ComposedOnboardingCodebase; onOpen: () => void }): React.JSX.Element {
  const tone = codebase.readiness?.tone === 'in-flight' ? 'in-flight' : 'complete';
  return (
    <div className="view-onboarding-obj">
      <ObjectCaption
        label={CODEBASE_LABEL}
        extra={codebase.found && codebase.readiness !== null ? <ReadinessChip readiness={codebase.readiness} /> : <NotFoundChip word={NOT_FOUND_WORD} />}
      />
      <button type="button" className="view-onboarding-fig" aria-label={`Show details: ${CODEBASE_LABEL}`} onClick={onOpen}>
        <span className="view-onboarding-folder" data-small="true" data-found={codebase.found ? 'yes' : 'no'}>
          <span className="view-onboarding-tab">codebase/</span>
          <span className="view-onboarding-minis" aria-hidden="true">
            {Array.from({ length: MAP_DOCUMENT_TOTAL }, (_, at) => (
              <span key={at} className="view-onboarding-mini" data-tone={codebase.mapped !== null && at < codebase.mapped ? tone : 'quiet'} />
            ))}
          </span>
          <span className="view-onboarding-cap-note">{codebase.caption}</span>
        </span>
      </button>
    </div>
  );
}

function DocumentsObject({ documents, onOpen }: { documents: ComposedOnboardingDocuments; onOpen: () => void }): React.JSX.Element {
  const note = documents.count === null ? NOT_STATED_WORD : `${documents.count} ${documents.count === 1 ? 'candidate' : 'candidates'}`;
  return (
    <div className="view-onboarding-obj">
      <ObjectCaption label={DOCUMENTS_LABEL} note={note} />
      <button type="button" className="view-onboarding-fig" aria-label={`Show details: ${DOCUMENTS_LABEL}`} onClick={onOpen}>
        <span className="view-onboarding-pile" data-n={documents.count ?? 0} aria-hidden="true">
          {Array.from({ length: documents.layers }, (_, at) => {
            const top = at === documents.layers - 1;
            return (
              <span key={at} className={top ? 'view-onboarding-paper view-onboarding-paper-top' : 'view-onboarding-paper'} style={{ ['--k' as string]: at }}>
                {top ? (
                  <>
                    <span className="view-onboarding-big">{documents.count ?? '-'}</span>
                    <span className="view-onboarding-lines">
                      <i />
                      <i />
                    </span>
                  </>
                ) : null}
              </span>
            );
          })}
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The bars
// ---------------------------------------------------------------------------------------------------------

function Bar({
  id,
  label,
  note,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  note: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <details className="view-onboarding-bar" id={id} open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary>
        <ChevronRight className="view-onboarding-chev" aria-hidden="true" />
        <span>{label}</span>
        <span className="view-onboarding-count">{note}</span>
      </summary>
      <div className="view-onboarding-bar-body">{children}</div>
    </details>
  );
}

function FilePills({ files }: { files: ComposedOnboardingFiles }): React.JSX.Element {
  return (
    <div className="view-onboarding-chips">
      {files.rows.map((file) =>
        file.present === true ? (
          <span key={file.key} className="status-chip view-onboarding-chip" data-tone="complete">
            <Square tone="complete" />
            {file.name}
          </span>
        ) : (
          <span key={file.key} className="status-chip view-onboarding-chip" data-tone="quiet">
            <Square tone="quiet" />
            {file.name} · {file.present === false ? NOT_FOUND_WORD : NOT_STATED_WORD}
          </span>
        ),
      )}
    </div>
  );
}

function CodebaseFacts({ codebase }: { codebase: ComposedOnboardingCodebase }): React.JSX.Element {
  return (
    <dl className="view-onboarding-kv">
      <div>
        <dt>Brownfield repo</dt>
        <dd>{yesNo(codebase.brownfield)}</dd>
      </div>
      <div>
        <dt>Map readiness</dt>
        <dd>
          {codebase.readiness !== null ? <ReadinessChip readiness={codebase.readiness} /> : codebase.readinessNone ? 'None' : NOT_STATED_WORD}
        </dd>
      </div>
      <div>
        <dt>Codebase map</dt>
        <dd>
          {codebase.mapPath === null ? (
            <NotFoundChip word={NOT_FOUND_WORD} />
          ) : (
            <>
              <span className="view-onboarding-path">{codebase.mapPath}</span>
              {codebase.mapDetail === null ? null : <span className="view-onboarding-quiet"> ({codebase.mapDetail})</span>}
            </>
          )}
        </dd>
      </div>
      <div>
        <dt>Fast map available</dt>
        <dd>{yesNo(codebase.fastMap)}</dd>
      </div>
    </dl>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------------------

export function OnboardingView({ model }: { model: ComposedOnboarding }): React.JSX.Element {
  const [open, setOpen] = useState<Readonly<Record<BarKey, boolean>>>({ files: false, codebase: false, documents: false });

  function setBar(key: BarKey, value: boolean): void {
    setOpen((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }

  /** Pressing an object opens its bar and brings it into view. */
  function showBar(key: BarKey): void {
    setBar(key, true);
    requestAnimationFrame(() => {
      const bar = document.getElementById(BAR_IDS[key]);
      if (bar !== null && typeof bar.scrollIntoView === 'function') bar.scrollIntoView({ block: 'center' });
    });
  }

  const { files, codebase, documents, firstScreen } = model;
  return (
    <div className="view-onboarding-root" data-view="onboarding">
      <div className="view-onboarding-lead" data-split={firstScreen === null ? 'no' : 'yes'}>
        <NextStep next={model.next} />
        {firstScreen === null ? null : <FirstScreen screen={firstScreen} />}
      </div>
      <div className="view-onboarding-desk" data-files={files === null ? 'no' : 'yes'} role="group" aria-label="The project at a glance">
        {files === null ? null : <FilesObject files={files} onOpen={() => showBar('files')} />}
        <CodebaseObject codebase={codebase} onOpen={() => showBar('codebase')} />
        <DocumentsObject documents={documents} onOpen={() => showBar('documents')} />
      </div>
      <div className="view-onboarding-bars">
        {files === null ? null : (
          <Bar
            id={BAR_IDS.files}
            label={FILES_LABEL}
            note={`${files.summary} present`}
            open={open.files}
            onToggle={(value) => setBar('files', value)}
          >
            <FilePills files={files} />
          </Bar>
        )}
        <Bar
          id={BAR_IDS.codebase}
          label={CODEBASE_LABEL}
          note={codebase.mapPath ?? NOT_FOUND_WORD}
          open={open.codebase}
          onToggle={(value) => setBar('codebase', value)}
        >
          <CodebaseFacts codebase={codebase} />
        </Bar>
        <Bar
          id={BAR_IDS.documents}
          label={DOCUMENTS_LABEL}
          note={documents.count === null ? NOT_STATED_WORD : documents.count === 0 ? 'None' : String(documents.count)}
          open={open.documents}
          onToggle={(value) => setBar('documents', value)}
        >
          <p>{documents.line}</p>
        </Bar>
      </div>
    </div>
  );
}
