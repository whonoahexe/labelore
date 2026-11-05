// The User setup page's React surface (Phase 10, 10-19, VIEW-11, sketch 049 winner B "Where everything goes"): the header
// override (eyebrow "Phase N · User setup", the title after "Phase N:" as the h1, the generated date and phase slug as
// meta) and the page body. The first screen is a picture: the lead "{d} of {t} steps done" over the shared status-meter,
// the file's own Status line beside it (a plain chip when it agrees with the boxes, a quiet dashed pair when it does
// not, never merged), then the map: "Get it from", every dashboard path as the shared clean tree with a clickable leaf
// per step, beside "Goes in", one card per destination file with a numbered line per variable, and the selected step's
// dock under the cards. Prose opens on demand: a step's bar below holds its fields as written. A file with no
// recognisable step opens on the plain layout instead: the quiet "Steps not stated" chip over its masked sections as
// headed text.
//
// Every string is text the handler has already masked, rendered as plain React text through `MaskedInline` - which draws
// the handler's marker as the shared quiet "Value not shown" mark - never React's raw-HTML injection prop. The document
// HTML is never read, so a value a person pasted into the file cannot reach this page (CONTEXT D-11, T-10-33). No href is
// built from document text, no title or aria-label carries a value, and a command that held a value is plain text with
// no copy control. Colour comes only from the tone a composed model carries and the theme tokens; nothing here is
// destructive, a warning or drawn missing: a step that is pending is `in-flight`, a step the page cannot classify is
// `quiet`, and the Status line that disagrees with the boxes is a dashed note, never an alarm.
import { Fragment, useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, FileText, Lock, Server } from 'lucide-react';
import { splitPhaseTitle } from '../pages/document-title.ts';
import { CleanTree } from '../components/clean-tree.tsx';
import type { CleanTreeRow } from '../components/clean-tree.tsx';
import { CopyCommand } from '../components/copy-command.tsx';
import { EmptyState } from '../components/empty-state.tsx';
import { StatusMeter } from '../components/status-meter.tsx';
import { ValueNotShown } from '../components/value-not-shown.tsx';
import { VALUE_NOT_SHOWN_MARK } from '../../planning-repo/handlers/withhold-values.ts';
import { tokenizeInline } from './inline-markdown.ts';
import type { InlineToken } from './inline-markdown.ts';
import { NO_FILE_LABEL, NO_PLACE_LABEL, STEPS_NOT_STATED_LABEL } from './user-setup-page.ts';
import type { SpecHeaderProps } from './spec-page-components.tsx';
import type {
  ComposedBarGroup,
  ComposedFileCard,
  ComposedPlainSection,
  ComposedStatusLine,
  ComposedUserSetup,
  ComposedUserSetupItem,
  UserSetupBlock,
  UserSetupTone,
} from './user-setup-page.ts';

/** Plain text with the handler's marker drawn as the quiet "Value not shown" mark. */
function Marked({ text }: { text: string }): React.JSX.Element {
  const parts = text.split(VALUE_NOT_SHOWN_MARK);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <ValueNotShown /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}

function renderTokens(tokens: InlineToken[], prefix: string): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${prefix}${index}`;
    switch (token.type) {
      case 'text':
      case 'ref':
        return <Marked key={key} text={token.value} />;
      case 'code':
        return (
          <code key={key}>
            <Marked text={token.value} />
          </code>
        );
      case 'strong':
        return <strong key={key}>{renderTokens(token.value, `${key}.`)}</strong>;
      case 'em':
        return <em key={key}>{renderTokens(token.value, `${key}.`)}</em>;
    }
  });
}

/** The only path an author string reaches this page's DOM through: the inline tokens as React nodes, the marker as the
 * quiet mark. Never markup, never a link. */
export function MaskedInline({ text }: { text: string }): React.JSX.Element {
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  return <>{renderTokens(tokens, '')}</>;
}

function UserSetupMeta({ model }: { model: ComposedUserSetup }): React.JSX.Element | null {
  if (model.generated === null && model.phase === null) return null;
  return (
    <>
      {model.generated !== null ? (
        <span className="view-user-setup-meta">Generated {model.generated}</span>
      ) : null}
      {model.phase !== null ? <span className="view-user-setup-meta">{model.phase}</span> : null}
    </>
  );
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · User setup", the title after "Phase N:" as the
 * h1, no lead, and the generated date and phase slug as meta. */
export function userSetupHeaderProps(model: ComposedUserSetup, artifactTitle: string): SpecHeaderProps {
  const split = splitPhaseTitle(artifactTitle, 'User setup');
  return {
    eyebrow: split.phase === null ? 'User setup' : `${split.phase} · User setup`,
    title: split.title,
    lead: null,
    meta: <UserSetupMeta model={model} />,
  };
}

function toneOf(item: ComposedUserSetupItem): UserSetupTone {
  return item.tone ?? 'quiet';
}

function Square({ tone }: { tone: UserSetupTone }): React.JSX.Element {
  return <i className="status-square view-user-setup-sq" data-tone={tone} aria-hidden="true" />;
}

function StateChip({ item }: { item: ComposedUserSetupItem }): React.JSX.Element | null {
  if (item.tone === null || item.word === null) return null;
  return (
    <span className="status-chip" data-tone={item.tone}>
      <Square tone={item.tone} />
      {item.word}
    </span>
  );
}

function StatusPair({ status }: { status: ComposedStatusLine }): React.JSX.Element {
  if (!status.disagrees) {
    return (
      <p className="view-user-setup-agree">
        <span className="view-user-setup-key">Status line</span>
        <span className="status-chip">
          <MaskedInline text={status.word} />
        </span>
      </p>
    );
  }
  return (
    <div
      className="view-user-setup-disagree"
      role="group"
      aria-label="The file's Status line and its boxes disagree"
    >
      <div>
        <span className="view-user-setup-key">The Status line says</span>
        <span className="view-user-setup-val">
          <MaskedInline text={status.word} />
        </span>
      </div>
      <span className="view-user-setup-ne" aria-hidden="true">
        ≠
      </span>
      <div>
        <span className="view-user-setup-key">The boxes say</span>
        <span className="view-user-setup-val">
          <span className="view-user-setup-mono">{status.boxes}</span> ticked
        </span>
      </div>
      {status.note !== null ? <p className="view-user-setup-foot">{status.note}</p> : null}
    </div>
  );
}

function Head({ model }: { model: ComposedUserSetup }): React.JSX.Element {
  return (
    <section className="view-user-setup-head" aria-label="Progress">
      <div className="view-user-setup-lead">
        {model.lead !== null && model.leadCount !== null ? (
          <>
            <p className="view-user-setup-lead-line">
              <b>{model.leadCount}</b> steps done
            </p>
            <StatusMeter
              filled={model.done}
              total={model.total}
              items={model.meter}
              label={model.lead}
              size="large"
            />
          </>
        ) : (
          <p>
            <span className="status-chip" data-tone="quiet">
              <Square tone="quiet" />
              {STEPS_NOT_STATED_LABEL}
            </span>
          </p>
        )}
      </div>
      {model.status !== null ? <StatusPair status={model.status} /> : null}
    </section>
  );
}

/** What a step asks for: a variable's three facts, or an item's fields as written. */
function Facts({ item }: { item: ComposedUserSetupItem }): React.JSX.Element | null {
  if (item.kind === 'variable') {
    if (item.destination === null && item.source === null && !item.hadValue) return null;
    return (
      <ul className="view-user-setup-facts">
        {item.destination !== null ? (
          <li>
            <FileText aria-hidden="true" />
            <span>
              Goes in{' '}
              <code>
                <Marked text={item.destination} />
              </code>
            </span>
          </li>
        ) : null}
        {item.source !== null ? (
          <li>
            <Server aria-hidden="true" />
            <span>
              Get it from <MaskedInline text={item.source} />
            </span>
          </li>
        ) : null}
        {item.hadValue ? (
          <li>
            <Lock aria-hidden="true" />
            <ValueNotShown />
          </li>
        ) : null}
      </ul>
    );
  }
  if (item.fields.length === 0) return null;
  return (
    <dl className="view-user-setup-fields">
      {item.fields.map((field, index) => (
        <div key={`${field.key}-${index}`}>
          <dt className="view-user-setup-key">{field.key}</dt>
          <dd>
            <MaskedInline text={field.text} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ItemTitle({ item }: { item: ComposedUserSetupItem }): React.JSX.Element {
  if (item.kind === 'variable') {
    return (
      <span className="view-user-setup-name">
        <Marked text={item.title} />
      </span>
    );
  }
  return <MaskedInline text={item.title} />;
}

function Dock({
  model,
  item,
  onClose,
}: {
  model: ComposedUserSetup;
  item: ComposedUserSetupItem | null;
  onClose: () => void;
}): React.JSX.Element {
  if (item === null) {
    return <div className="view-user-setup-dock-empty">Select a step to read what it asks for.</div>;
  }
  return (
    <div className="view-user-setup-dock" role="region" aria-label={`Step: ${item.title}`}>
      <div className="view-user-setup-dock-head">
        <span className="view-user-setup-key">
          <MaskedInline text={item.group} />
          {item.tone !== null ? ` · step ${item.index + 1} of ${model.total}` : ''}
        </span>
        <StateChip item={item} />
        <button type="button" className="view-user-setup-close" onClick={onClose}>
          Close
        </button>
      </div>
      <h3 className="view-user-setup-dock-title">
        <ItemTitle item={item} />
      </h3>
      <Facts item={item} />
    </div>
  );
}

function Leaf({
  item,
  at,
  selected,
  onSelect,
}: {
  item: ComposedUserSetupItem;
  at: string | null;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button type="button" className="view-user-setup-leaf" aria-pressed={selected} onClick={onSelect}>
      <Square tone={toneOf(item)} />
      {at !== null ? (
        <span className="view-user-setup-at">
          <Marked text={at} />
        </span>
      ) : null}
      <span className="view-user-setup-what">
        <ItemTitle item={item} />
      </span>
      {item.kind === 'variable' && item.destination !== null ? (
        <span className="view-user-setup-to">
          → <Marked text={item.destination} />
        </span>
      ) : null}
      {item.word !== null ? <span className="view-user-setup-meta">{item.word}</span> : null}
    </button>
  );
}

function Tree({
  model,
  selected,
  onSelect,
}: {
  model: ComposedUserSetup;
  selected: number | null;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  const rows: CleanTreeRow[] = model.tree.map((row) => {
    if (row.item === null) return { depth: row.depth, name: row.name, dir: true, parent: row.parent };
    const item = model.items[row.item];
    return {
      depth: row.depth,
      name: item.title,
      dir: false,
      parent: row.parent,
      node: <Leaf item={item} at={row.at} selected={selected === item.index} onSelect={() => onSelect(item.index)} />,
    };
  });
  return (
    <>
      {rows.length > 0 ? (
        <div className="view-user-setup-tree">
          <CleanTree rows={rows} />
        </div>
      ) : null}
      {model.tray.length > 0 ? (
        <div className="view-user-setup-tray">
          <p className="view-user-setup-key">{NO_PLACE_LABEL}</p>
          <ul>
            {model.tray.map((entry) => {
              const item = model.items[entry.item];
              return (
                <li key={item.index}>
                  <Leaf item={item} at={null} selected={selected === item.index} onSelect={() => onSelect(item.index)} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function FileCard({
  card,
  items,
  selected,
  onSelect,
}: {
  card: ComposedFileCard;
  items: readonly ComposedUserSetupItem[];
  selected: number | null;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  return (
    <div className="view-user-setup-filecard">
      <div className="view-user-setup-filecard-head">
        <FileText aria-hidden="true" />
        <span className="view-user-setup-mono">
          <Marked text={card.name ?? NO_FILE_LABEL} />
        </span>
        {card.setLabel !== null ? <span className="view-user-setup-meta">{card.setLabel}</span> : null}
      </div>
      {card.lines.map((index, n) => {
        const item = items[index];
        return (
          <button
            key={index}
            type="button"
            className="view-user-setup-fline"
            aria-pressed={selected === index}
            onClick={() => onSelect(index)}
          >
            <span className="view-user-setup-ln">{n + 1}</span>
            <span className="view-user-setup-fname">
              <Square tone={toneOf(item)} />
              <ItemTitle item={item} />
            </span>
            <span className="view-user-setup-fright">
              {item.hadValue ? <ValueNotShown /> : null}
              {item.word !== null ? <span className="view-user-setup-meta">{item.word}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MapBlock({
  model,
  selected,
  onSelect,
  onClose,
}: {
  model: ComposedUserSetup;
  selected: number | null;
  onSelect: (index: number) => void;
  onClose: () => void;
}): React.JSX.Element {
  const open = selected === null ? null : (model.items[selected] ?? null);
  return (
    <section className="view-user-setup-block" aria-labelledby="view-user-setup-map-h">
      <div className="view-user-setup-block-head">
        <h2 className="view-user-setup-h" id="view-user-setup-map-h">
          Where everything goes
        </h2>
        <span className="view-user-setup-legend">
          <span>
            <Square tone="complete" />
            done
          </span>
          <span>
            <Square tone="in-flight" />
            pending
          </span>
          <span>
            <Square tone="quiet" />
            not stated
          </span>
        </span>
      </div>
      <div className="view-user-setup-map">
        <div className="view-user-setup-col">
          <p className="view-user-setup-key">Get it from</p>
          <Tree model={model} selected={selected} onSelect={onSelect} />
        </div>
        <div className="view-user-setup-arrow" aria-hidden="true">
          <ArrowRight />
        </div>
        <div className="view-user-setup-col">
          <p className="view-user-setup-key">Goes in</p>
          {model.files.length > 0 ? (
            model.files.map((card) => (
              <FileCard
                key={card.name ?? ''}
                card={card}
                items={model.items}
                selected={selected}
                onSelect={onSelect}
              />
            ))
          ) : (
            <div className="view-user-setup-dock-empty">No variables in this file.</div>
          )}
          {model.total > 0 ? <Dock model={model} item={open} onClose={onClose} /> : null}
        </div>
      </div>
    </section>
  );
}

/** A plain section's blocks: paragraphs and list items, sub-headings, and the fenced commands as the shared copy rows. A
 * command that held a value is drawn as plain text with the mark and no copy control. */
function Blocks({ blocks }: { blocks: readonly UserSetupBlock[] }): React.JSX.Element {
  return (
    <div className="view-user-setup-blocks">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'text':
            return (
              <p key={index} className="view-user-setup-text" data-bullet={block.bullet ? 'true' : 'false'}>
                <MaskedInline text={block.text} />
              </p>
            );
          case 'heading':
            return (
              <h3 key={index} className="view-user-setup-subhead">
                <MaskedInline text={block.text} />
              </h3>
            );
          case 'note':
            return (
              <p key={index} className="view-user-setup-cmd-note">
                <Marked text={block.text} />
              </p>
            );
          case 'command':
            return block.copyable ? (
              <CopyCommand key={index} command={block.text} />
            ) : (
              <div key={index} className="view-user-setup-cmd">
                <code>
                  <Marked text={block.text} />
                </code>
              </div>
            );
        }
      })}
    </div>
  );
}

function BarRow({
  item,
  open,
  onToggle,
}: {
  item: ComposedUserSetupItem;
  open: boolean;
  onToggle: (open: boolean) => void;
}): React.JSX.Element {
  return (
    <details
      className="view-user-setup-bar"
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="view-user-setup-bar-sum">
        <ChevronRight className="view-user-setup-bar-chev" aria-hidden="true" />
        <Square tone={toneOf(item)} />
        <span className="view-user-setup-bar-name">
          <ItemTitle item={item} />
        </span>
        {item.hadValue ? <ValueNotShown /> : null}
        <span className="view-user-setup-bar-word">{item.word ?? 'Variable'}</span>
      </summary>
      <div className="view-user-setup-bar-body">
        <Facts item={item} />
      </div>
    </details>
  );
}

function PlainBar({ section }: { section: ComposedPlainSection }): React.JSX.Element {
  return (
    <details className="view-user-setup-bar">
      <summary className="view-user-setup-bar-sum">
        <ChevronRight className="view-user-setup-bar-chev" aria-hidden="true" />
        <span className="view-user-setup-bar-name">
          <MaskedInline text={section.heading} />
        </span>
      </summary>
      <div className="view-user-setup-bar-body">
        <Blocks blocks={section.blocks} />
      </div>
    </details>
  );
}

function Bars({
  model,
  onShowSource,
}: {
  model: ComposedUserSetup;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<number>>(() => new Set());
  const barGroups: readonly ComposedBarGroup[] = model.bars;
  if (barGroups.length === 0 && model.plain.length === 0) return null;
  const setOpen = (index: number, open: boolean): void => {
    setOpenKeys((current) => {
      if (current.has(index) === open) return current;
      const next = new Set(current);
      if (open) next.add(index);
      else next.delete(index);
      return next;
    });
  };
  return (
    <section className="view-user-setup-block" aria-labelledby="view-user-setup-bars-h">
      <h2 className="view-user-setup-h" id="view-user-setup-bars-h">
        Steps
      </h2>
      <div className="view-user-setup-bars">
        {barGroups.map((group) => (
          <div key={group.heading}>
            <div className="view-user-setup-bar-group">
              <span className="view-user-setup-key">
                <MaskedInline text={group.heading} />
              </span>
              {group.count !== null ? <span className="view-user-setup-meta">{group.count}</span> : null}
            </div>
            {group.items.map((index) => (
              <BarRow
                key={index}
                item={model.items[index]}
                open={openKeys.has(index)}
                onToggle={(open) => setOpen(index, open)}
              />
            ))}
          </div>
        ))}
        {model.plain.map((section) => (
          <PlainBar key={section.heading} section={section} />
        ))}
      </div>
      <SourceOnly model={model} onShowSource={onShowSource} />
    </section>
  );
}

/** "In the source only": what the page does not draw (the intro text, the template's footer), each a way to Source. */
function SourceOnly({
  model,
  onShowSource,
}: {
  model: ComposedUserSetup;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (!model.sourceOnly.intro && !model.sourceOnly.footer) return null;
  return (
    <p className="view-user-setup-only">
      <span className="view-user-setup-key">In the source only</span>
      {model.sourceOnly.intro ? (
        <button type="button" className="view-user-setup-source" onClick={() => onShowSource(null)}>
          Introduction
        </button>
      ) : null}
      {model.sourceOnly.footer ? (
        <button type="button" className="view-user-setup-source" onClick={() => onShowSource(null)}>
          Once all items complete
        </button>
      ) : null}
    </p>
  );
}

/** The plain layout: the masked sections of a file with no recognisable step, as headed text. */
function PlainLayout({ model }: { model: ComposedUserSetup }): React.JSX.Element {
  if (model.plain.length === 0) return <EmptyState />;
  return (
    <div className="view-user-setup-plain">
      {model.plain.map((section, index) => (
        <section
          key={section.heading}
          className="view-user-setup-block"
          aria-labelledby={`view-user-setup-plain-${index}`}
        >
          <h2 className="view-user-setup-h" id={`view-user-setup-plain-${index}`}>
            <MaskedInline text={section.heading} />
          </h2>
          <Blocks blocks={section.blocks} />
        </section>
      ))}
    </div>
  );
}

export function UserSetupView({
  model,
  onShowSource = () => undefined,
}: {
  model: ComposedUserSetup;
  onShowSource?: (id: string | null) => void;
}): React.JSX.Element {
  const [selected, setSelected] = useState<number | null>(model.firstOpen);
  const select = (index: number): void => setSelected((current) => (current === index ? null : index));
  return (
    <div className="view-user-setup-page">
      <Head model={model} />
      {model.kind === 'designed' ? (
        <>
          <MapBlock model={model} selected={selected} onSelect={select} onClose={() => setSelected(null)} />
          <Bars model={model} onShowSource={onShowSource} />
        </>
      ) : (
        <>
          <PlainLayout model={model} />
          <SourceOnly model={model} onShowSource={onShowSource} />
        </>
      )}
    </div>
  );
}
