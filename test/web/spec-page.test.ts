// Phase 10 (10-16, VIEW-11): the Spec composer and the static markup of its page, on the made-up Lendshed specs.
// The first screen says whether the spec is locked enough to plan: a verdict chip and "{score} against a gate of
// {gate}", five column gauges, and each requirement as a row with Current, Target and Acceptance.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LOCKED_LABEL,
  NOT_LOCKED_LABEL,
  NOT_STATED_LABEL,
  composeSpec,
} from '../../src/web/views/spec-page.ts';
import type { ComposedSpec } from '../../src/web/views/spec-page.ts';
import { SpecView, specHeaderProps } from '../../src/web/views/spec-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { SpecHandler } from '../../src/planning-repo/handlers/spec.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

function inputOf(spec: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'spec',
    frontmatter: {},
    structured: spec === undefined ? {} : { spec },
    groups,
    planSegments: [],
  };
}

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'spec',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, groups: ViewInput['groups'] = []): ComposedSpec | null {
  const path = '.planning/phases/01-x/01-SPEC.md';
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = SpecHandler.parse(raw, ref(path));
  return composeSpec(inputOf(parsed.structured?.spec, groups));
}

function markup(model: ComposedSpec): string {
  return renderToStaticMarkup(createElement(SpecView, { model }));
}

const LOCKED = fxRead('phases/01-member-sign-in-sessions/01-SPEC.md');

describe('composeSpec - 01-SPEC, locked', () => {
  const model = composeFile(LOCKED)!;

  it('says "Locked enough to plan" with "0.14 against a gate of 0.20"', () => {
    expect(model.verdict.label).toBe(LOCKED_LABEL);
    expect(model.verdict.label).toBe('Locked enough to plan');
    expect(model.verdict.tone).toBe('complete');
    expect(model.verdict.numbers).toBe('0.14 against a gate of 0.20');
    expect(model.verdict.note).toBeNull();
  });

  it('draws the ambiguity column against the gate and four dimension columns against their minimums', () => {
    expect(model.ambiguity.lowerIsBetter).toBe(true);
    expect(model.ambiguity.fill).toBe(28);
    expect(model.ambiguity.mark).toBe(40);
    expect(model.dimensions.map((d) => d.label)).toEqual(['Goal', 'Boundary', 'Constraint', 'Acceptance Criteria']);
    expect(model.dimensions.map((d) => d.statusLabel)).toEqual(['Met minimum', 'Met minimum', 'Met minimum', 'Met minimum']);
    expect(model.dimensions[2].mark).toBe(65);
    expect(model.dimensions[2].fill).toBe(78);
  });

  it('reads the count line from the file and the created date', () => {
    expect(model.countLine).toBe('5 requirements locked');
    expect(model.created).toBe('2026-03-22');
  });

  it('lays out five requirements with all three fields and no "No acceptance stated"', () => {
    expect(model.requirements).toHaveLength(5);
    expect(model.requirements.every((r) => !r.noAcceptance)).toBe(true);
    expect(model.requirements[0].fields.map((f) => f.label)).toEqual(['Current', 'Target', 'Acceptance']);
    expect(model.hasCoverage).toBe(false);
  });
});

describe('composeSpec - nothing to shape', () => {
  it('returns null without a projection, and for a projection with no score, requirement, dimension, goal or scope', () => {
    expect(composeSpec(inputOf(undefined))).toBeNull();
    expect(composeSpec(inputOf('not a record'))).toBeNull();
    expect(composeSpec(inputOf({}))).toBeNull();
    expect(composeFile('# Just a title\n\nSome words.\n')).toBeNull();
  });
});

describe('SpecView - the first screen', () => {
  const html = markup(composeFile(LOCKED)!);

  it('opens with the verdict chip and the numbers line', () => {
    expect(html).toContain('Locked enough to plan');
    expect(html).toContain('<b>0.14</b> against a gate of <b>0.20</b>');
    expect(html.indexOf('Locked enough to plan')).toBeLessThan(html.indexOf('Requirements'));
  });

  it('lists every requirement as a numbered row in author order, with a closed panel', () => {
    for (const label of ['Account sign-in', 'Session survives a restart', 'Sign-out', 'Forced first password change', 'Sign-in rate limiting']) {
      expect(html).toContain(label);
    }
    expect(html.indexOf('Account sign-in')).toBeLessThan(html.indexOf('Sign-in rate limiting'));
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('view-spec-open');
  });

  it('shows the dimensions with the status as an aria-labelled square', () => {
    expect(html).toContain('aria-label="Met minimum"');
    expect(html).toContain('min 0.65');
  });

  it('writes the goal under the strip', () => {
    expect(html).toContain('A member signs in to Lendshed with a username and password Lendshed itself holds');
  });

  it('renders no destructive, warning or missing tone', () => {
    expect(html).not.toMatch(/data-tone="(destructive|warning|missing)"/);
  });
});

describe('specHeaderProps', () => {
  it('sets "Phase N · Spec", the phase name as the h1 and the created date and count as meta', () => {
    const model = composeFile(LOCKED)!;
    const header = specHeaderProps(model, 'Phase 1: Member Sign-In & Sessions — Specification');
    expect(header.eyebrow).toBe('Phase 1 · Spec');
    expect(header.title).toBe('Member Sign-In & Sessions');
    expect(header.lead).toBeNull();
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Created 2026-03-22');
    expect(meta).toContain('5 requirements locked');
  });

  it('keeps a title that does not open with Phase N whole', () => {
    const header = specHeaderProps(composeFile(LOCKED)!, 'A loose spec');
    expect(header.eyebrow).toBe('Spec');
    expect(header.title).toBe('A loose spec');
  });
});

describe('the verdict words', () => {
  it('are the documented ones', () => {
    expect(NOT_LOCKED_LABEL).toBe('Not locked yet');
    expect(NOT_STATED_LABEL).toBe('Ambiguity not stated');
  });
});
