// The view registry's `data`-block component table (`BlockComponentKey` -> component). Only
// `discussion-questions` renders real content in this plan; the other three keys are declared now
// (see `manifest.ts`) so Plan 05-05 only has to swap in real components, never widen the union.
// Every value rendered here is plain JSX text — this file never injects raw HTML; the only
// sanctioned site for that is `DocumentCanvas` in `artifact-page.tsx`.
import { Fragment } from 'react';
import type { DiscussionQuestion } from '../../planning-repo/handlers/section-projection.ts';
import type { BlockComponentKey } from './manifest.ts';

function NotYetImplemented(_props: { label: string; data: unknown }): React.JSX.Element | null {
  return null;
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
  'verification-checks': NotYetImplemented,
  'plan-task-index': NotYetImplemented,
  'fact-list': NotYetImplemented,
};
