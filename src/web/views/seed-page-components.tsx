// The seed page's React surface (Phase 11, 11-22, VIEW-15, sketch 057 winner C "Seed packet"): the header override
// (crumbs, the eyebrow "Seed", the idea as the h1 and the id as meta; the header keeps its own Copy path button) and
// the page body, one narrow centred column: an envelope (postmark, stamp, "Planted during", the "Surface when"
// sentence as the address, the status as a seal) over folded sheets ("audit_acknowledged", "Why this matters",
// "Breadcrumbs" and three closed bars). Every string is author text rendered as plain React text through
// ResearchInline - never React's raw-HTML injection prop - and the only href is a payload address the server resolved
// (a breadcrumb that names no payload artifact is text; T-11-35, T-11-36). A `NAME=value` pair in the prose draws the
// name and the shared "Value not shown" mark (T-11-37). Colour comes only from the tone a mark carries and the theme
// tokens: dormant and a missing trigger are `quiet`, active and triggered `in-flight`; nothing is `missing` or
// destructive (a path that moved is a fact, not a failure). The page makes no request and touches no storage.
import { ChevronRight } from 'lucide-react';
import { Link } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { ValueNotShown } from '../components/value-not-shown.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import {
  AUDIT_KEY,
  BREADCRUMBS_LABEL,
  NOT_FOUND_LABEL,
  NO_SURFACING_LABEL,
  PLANTED_DURING_LABEL,
  PLANTED_LABEL,
  SCOPE_LABEL,
  SCOPE_NOT_STATED_LABEL,
  SURFACE_WHEN_LABEL,
  TRIGGER_LABEL,
  WHY_LABEL,
} from './seed-page.ts';
import type {
  ComposedSeed,
  ComposedSeedBar,
  ComposedSeedBlock,
  ComposedSeedCrumb,
  SeedSegment,
} from './seed-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type SeedHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The ArtifactHeader override View mode spreads over its props: "Seed", the idea as the h1 and the id as meta. The
 * header keeps its own Copy path button for the one file; the sketch draws no lead line, so the manifest's stays off. */
export function seedHeaderProps(model: ComposedSeed, artifactTitle: string): SeedHeaderProps {
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta: model.head.id === '' ? null : <span className="view-seed-meta">{model.head.id}</span>,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: model.head.id === '' ? (model.head.title ?? artifactTitle) : model.head.id },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------------------------------------

function Segments({ segments }: { segments: SeedSegment[] }): React.JSX.Element {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'withheld' ? (
          <span key={index} className="view-seed-withheld">
            <code>{segment.name}</code>
            <ValueNotShown />
          </span>
        ) : (
          <ResearchInline key={index} text={segment.text} />
        ),
      )}
    </>
  );
}

function Blocks({ blocks }: { blocks: ComposedSeedBlock[] }): React.JSX.Element {
  return (
    <>
      {blocks.map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index} className="view-seed-list">
            {block.items.map((item, at) => (
              <li key={at}>
                <Segments segments={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index} className="view-seed-prose">
            <Segments segments={block.segments} />
          </p>
        ),
      )}
    </>
  );
}

function Seal({ model }: { model: ComposedSeed }): React.JSX.Element | null {
  const { status } = model.packet;
  if (status === null) return null;
  return (
    <span className="view-seed-seal" data-tone={status.tone}>
      <i className="status-square" data-tone={status.tone} aria-hidden="true" />
      {status.word}
    </span>
  );
}

function Stamp({ model }: { model: ComposedSeed }): React.JSX.Element {
  const { stamp } = model.packet;
  if (stamp.size === null) {
    return (
      <div className="view-seed-stamp" data-state="unknown">
        <span className="view-seed-stamp-letter" aria-hidden="true">
          {stamp.letter}
        </span>
        <span className="view-seed-stamp-word">{SCOPE_NOT_STATED_LABEL}</span>
      </div>
    );
  }
  return (
    <div className="view-seed-stamp" data-state="known">
      <span className="view-seed-stamp-letter" aria-hidden="true">
        {stamp.letter}
      </span>
      <span className="view-seed-stamp-word">{SCOPE_LABEL}</span>
      <span className="view-seed-stamp-word">{stamp.size}</span>
    </div>
  );
}

function Packet({ model }: { model: ComposedSeed }): React.JSX.Element {
  const { packet, head } = model;
  const foot = [head.id === '' ? null : head.id, packet.age].filter((part): part is string => part !== null);
  return (
    <article className="view-seed-packet" aria-label="Seed packet">
      <div className="view-seed-flap" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="50" y2="100" />
          <line x1="100" y1="0" x2="50" y2="100" />
        </svg>
      </div>
      <div className="view-seed-top">
        {packet.plantedDuring !== null ? (
          <div className="view-seed-from">
            <span className="view-seed-key">{PLANTED_DURING_LABEL}</span>
            <span>{packet.plantedDuring}</span>
          </div>
        ) : null}
        <div className="view-seed-marks">
          {packet.planted !== null ? (
            <div className="view-seed-postmark" aria-label={`${PLANTED_LABEL} ${packet.planted}`}>
              <span>{PLANTED_LABEL}</span>
              <span className="view-seed-nowrap">{packet.planted}</span>
            </div>
          ) : null}
          <Stamp model={model} />
        </div>
      </div>
      <div className="view-seed-address" data-empty={packet.surfaceWhen === null ? 'true' : 'false'}>
        <span className="view-seed-key">{SURFACE_WHEN_LABEL}</span>
        {packet.surfaceWhen !== null ? (
          <p className="view-seed-sentence">{packet.surfaceWhen}</p>
        ) : (
          <span className="status-chip" data-tone="quiet">
            {NO_SURFACING_LABEL}
          </span>
        )}
      </div>
      <div className="view-seed-foot">
        <span className="view-seed-meta">{foot.join(' · ')}</span>
        <Seal model={model} />
      </div>
    </article>
  );
}

function Crumb({ crumb }: { crumb: ComposedSeedCrumb }): React.JSX.Element {
  const tone = crumb.state === 'resolved' ? 'complete' : 'quiet';
  return (
    <li className="view-seed-crumb" data-state={crumb.state}>
      <i className="status-square" data-tone={tone} aria-hidden="true" />
      <span>
        {crumb.path !== null && crumb.url !== null ? (
          <Link className="view-seed-path" to={crumb.url}>
            {crumb.path}
          </Link>
        ) : null}
        {crumb.path !== null && crumb.url === null ? <span className="view-seed-path">{crumb.path}</span> : null}
        {crumb.state === 'missing' ? (
          <span className="status-chip" data-tone="quiet">
            {NOT_FOUND_LABEL}
          </span>
        ) : null}
        {crumb.text !== null ? (
          <span className="view-seed-why">
            <ResearchInline text={crumb.text} />
          </span>
        ) : null}
      </span>
    </li>
  );
}

function Bar({ bar }: { bar: ComposedSeedBar }): React.JSX.Element {
  return (
    <details className="view-seed-bar">
      <summary className="view-seed-bar-sum">
        <ChevronRight className="view-seed-bar-chev" aria-hidden="true" />
        <span>{bar.title}</span>
        {bar.count !== null ? <span className="view-seed-bar-count">{bar.count}</span> : null}
      </summary>
      <div className="view-seed-bar-body">
        {bar.strong !== null ? <strong className="view-seed-size">{bar.strong}</strong> : null}
        {bar.trigger !== null ? (
          <p className="view-seed-prose">
            <span className="view-seed-key">{TRIGGER_LABEL}</span>
            <br />
            {bar.trigger}
          </p>
        ) : null}
        <Blocks blocks={bar.blocks} />
      </div>
    </details>
  );
}

/** The seed page: an envelope over folded sheets, in one narrow centred column. */
export function SeedView({ model }: { model: ComposedSeed }): React.JSX.Element {
  return (
    <div className="view-seed-root">
      <Packet model={model} />
      {model.audit !== null ? (
        <div className="view-seed-audit">
          <span className="view-seed-audit-key">{AUDIT_KEY}</span>
          {model.audit !== '' ? <span className="view-seed-meta">{model.audit}</span> : null}
        </div>
      ) : null}
      {model.why.length > 0 ? (
        <section className="view-seed-sheet">
          <h2 className="view-seed-heading">{WHY_LABEL}</h2>
          <Blocks blocks={model.why} />
        </section>
      ) : null}
      {model.breadcrumbs.length > 0 ? (
        <section className="view-seed-sheet">
          <h2 className="view-seed-heading">{BREADCRUMBS_LABEL}</h2>
          <ul className="view-seed-crumbs">
            {model.breadcrumbs.map((crumb) => (
              <Crumb key={crumb.key} crumb={crumb} />
            ))}
          </ul>
        </section>
      ) : null}
      {model.bars.length > 0 ? (
        <div className="view-seed-bars">
          {model.bars.map((bar) => (
            <Bar key={bar.key} bar={bar} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
