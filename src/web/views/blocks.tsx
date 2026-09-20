// The view registry's `data`-block component table (`BlockComponentKey` -> component).
// `discussion-questions` (05-01), `fact-list`/`verification-checks` (05-05 Task 1) and
// `plan-task-index` (05-05 Task 2) all render real content. Every value rendered here is plain
// JSX text — this file never injects raw HTML; the only sanctioned site for that is
// `DocumentCanvas` in `artifact-page.tsx`.
import { Fragment } from 'react';
import type { DiscussionQuestion } from '../../planning-repo/handlers/section-projection.ts';
import { ValueView } from '../components/metadata-panel.tsx';
import type { Fact } from './facts.ts';
import type { BlockComponentKey } from './manifest.ts';

function NotYetImplemented(_props: { label: string; data: unknown }): React.JSX.Element | null {
  return null;
}

/** A reusable dt/dd field-list block (`src/web/views/facts.ts`'s `selectFacts`/`factsBlock`),
 * shared by the VERIFICATION "Verdict" block and the PLAN "Plan facts" block. */
function FactList({ label, data }: { label: string; data: unknown }): React.JSX.Element | null {
  const facts = Array.isArray(data) ? (data as Fact[]) : [];
  if (facts.length === 0) return null;
  return (
    <>
      <header className="section-heading">
        <h2>{label}</h2>
      </header>
      <dl className="metadata-record">
        {facts.map((fact) => (
          <div key={fact.key}>
            <dt>{fact.label}</dt>
            <dd>
              <ValueView value={fact.value} />
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

interface RawVerificationCheck {
  test?: unknown;
  expected?: unknown;
  why_human?: unknown;
}

function checkField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** VIEW-03's leading block: `human_verification[]` promoted straight from `artifact.frontmatter`
 * (no handler work — UI-SPEC §4). Each entry renders only the Check/Expected/Why-a-person rows it
 * actually has (field-level D-06); an entry with none of the three fields is skipped entirely. */
function VerificationChecks({
  label,
  data,
}: {
  label: string;
  data: unknown;
}): React.JSX.Element | null {
  const entries = Array.isArray(data) ? (data as unknown[]) : [];
  if (entries.length === 0) return null;
  return (
    <>
      <header className="section-heading">
        <h2>{label}</h2>
      </header>
      {entries.map((entry, index) => {
        if (typeof entry !== 'object' || entry === null) return null;
        const raw = entry as RawVerificationCheck;
        const test = checkField(raw.test);
        const expected = checkField(raw.expected);
        const whyHuman = checkField(raw.why_human);
        if (test === null && expected === null && whyHuman === null) return null;
        return (
          <div className="view-verification-check" key={index}>
            <dl className="metadata-list">
              {test !== null ? (
                <div>
                  <dt>Check</dt>
                  <dd>{test}</dd>
                </div>
              ) : null}
              {expected !== null ? (
                <div>
                  <dt>Expected</dt>
                  <dd>{expected}</dd>
                </div>
              ) : null}
              {whyHuman !== null ? (
                <div>
                  <dt>Why a person</dt>
                  <dd>{whyHuman}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        );
      })}
    </>
  );
}

/** Per question (one D-06-filtered, already-resolved `DiscussionQuestion`): a `.section-heading
 * .compact` header naming the topic/question, then every option in the file's own table-row
 * order — the chosen row leads with a `Chosen` chip, every other row renders as plain muted text
 * (no chip, no strikethrough; D-04 doesn't ask for re-ranking, only for showing what was offered). */
function DiscussionQuestions({ data }: { label: string; data: unknown }): React.JSX.Element | null {
  const questions = Array.isArray(data) ? (data as DiscussionQuestion[]) : [];
  if (questions.length === 0) return null;
  return (
    <>
      {questions.map((question, questionIndex) => (
        <Fragment key={`${question.topic}::${question.question}::${questionIndex}`}>
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">{question.topic}</p>
              <h2>{question.question}</h2>
            </div>
          </header>
          <ul className="view-discussion-log-options">
            {question.options.map((option, optionIndex) => (
              <li
                key={optionIndex}
                className="view-discussion-log-option"
                data-chosen={option.chosen}
              >
                {option.chosen ? (
                  <span className="status-chip" data-tone="active">Chosen</span>
                ) : null}
                {option.description || option.option}
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </>
  );
}

export const BLOCK_COMPONENTS: Record<
  BlockComponentKey,
  React.ComponentType<{ label: string; data: unknown }>
> = {
  'discussion-questions': DiscussionQuestions,
  'verification-checks': VerificationChecks,
  'plan-task-index': NotYetImplemented,
  'fact-list': FactList,
};
