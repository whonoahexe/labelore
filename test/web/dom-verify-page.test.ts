// Phase 10 (10-21, VIEW-12): the Browser check composer and the static markup of its page (sketch 051 winner A), on the
// made-up Lendshed browser checks (03 verified with failures, 01 could not look, 02 nothing to report). The first screen
// says whether the browser could look and what it found; the counts and words are shown as the file wrote them and never
// recomputed.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeDomVerify } from '../../src/web/views/dom-verify-page.ts';
import type { ComposedDomVerify } from '../../src/web/views/dom-verify-page.ts';
import { DomVerifyView, domVerifyHeaderProps } from '../../src/web/views/dom-verify-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { DomVerifyHandler } from '../../src/planning-repo/handlers/dom-verify.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const VERIFIED = fxRead('phases/03-account-admin-and-sessions/03-DOM-VERIFY.md');
const PATH = '.planning/phases/03-x/03-DOM-VERIFY.md';

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'dom-verify',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function inputOf(domVerify: unknown, phaseName: string | null = null): ViewInput {
  return {
    kind: 'dom-verify',
    frontmatter: {},
    structured: domVerify === undefined ? {} : { domVerify },
    groups: [],
    planSegments: [],
    phaseName,
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, phaseName: string | null = null, path = PATH): ComposedDomVerify | null {
  const file: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = DomVerifyHandler.parse(file, ref(path));
  return composeDomVerify(inputOf(parsed.structured?.domVerify, phaseName));
}

function markup(model: ComposedDomVerify): string {
  return renderToStaticMarkup(createElement(DomVerifyView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeDomVerify - 03-DOM-VERIFY, verified with failures', () => {
  const model = composeFile(VERIFIED, 'Account Admin & Sessions')!;

  it('leads with Verified as the complete outcome, and no reason (ok shows nothing)', () => {
    expect(model.outcome).toMatchObject({ raw: 'verified', tone: 'complete', icon: 'check', word: 'Verified', mono: false });
    expect(model.outcome.ariaLabel).toBe('Outcome: Verified');
    expect(model.reason).toBeNull();
    expect(model.view).toBe('tiles');
  });

  it("shows the frontmatter's counts: 4 passed, 2 failed, 1 needs review, 7 checked", () => {
    expect(model.counts.map((c) => [c.key, c.value, c.tone])).toEqual([
      ['passed', 4, 'complete'],
      ['failed', 2, 'missing'],
      ['needs_review', 1, 'in-flight'],
    ]);
    expect(model.checked).toBe(7);
    expect(model.noCriteria).toBe(false);
    expect(model.rowCounts).toBeNull();
  });

  it('lists seven criteria grouped failed first, then needs review, then passed', () => {
    expect(model.criteria).toHaveLength(7);
    expect(model.groups.map((g) => [g.result, g.items])).toEqual([
      ['failed', [3, 5]],
      ['needs_review', [6]],
      ['passed', [0, 1, 2, 4]],
    ]);
  });

  it('reads what was seen as the backticked values and the contract as the first double-quoted value', () => {
    expect(model.criteria[3].seen).toEqual(['Remove member']);
    expect(model.criteria[3].contract).toBe('Delete member');
    expect(model.criteria[5].seen).toEqual(['This account is turned off.']);
    expect(model.criteria[5].contract).toBe('Ask a steward.');
    expect(model.criteria[6].contract).toBeNull();
  });

  it('names the wave, the phase and the phase name the page resolved', () => {
    expect(model.wave).toBe(2);
    expect(model.phase).toBe('Phase 3');
    expect(model.phaseName).toBe('Account Admin & Sessions');
    expect(model.targets).toEqual(['/desk', '/stewards/{id}']);
  });
});

describe('Browser check page markup - 03-DOM-VERIFY', () => {
  const model = composeFile(VERIFIED, 'Account Admin & Sessions')!;
  const out = markup(model);

  it('draws the window with the outcome chip first, its accessible name and the targets in the bar', () => {
    expect(out.indexOf('view-dom-verify-outcome')).toBeGreaterThan(-1);
    expect(out).toMatch(/class="status-chip view-dom-verify-outcome" data-tone="complete"[^>]*role="img" aria-label="Outcome: Verified"/);
    expect(out).toContain('title="/desk"');
    expect(out).toContain('title="/stewards/{id}"');
    expect(out.indexOf('view-dom-verify-outcome')).toBeLessThan(out.indexOf('view-dom-verify-tiles'));
  });

  it('draws one tile per criterion, failed ones first, each with what was seen and the contract it quotes', () => {
    expect(count(out, 'class="view-dom-verify-tile"')).toBe(7);
    expect(out.indexOf('Remove member')).toBeLessThan(out.indexOf('Reset password'));
    expect(out).toContain('Contract “Delete member”');
    expect(out).toContain('Contract “Ask a steward.”');
    expect(out).toMatch(/data-tone="missing"[^>]*data-criterion="3"/);
    expect(out).toContain('Failed · 2');
    expect(out).toContain('Needs review · 1');
    expect(out).toContain('Passed · 4');
  });

  it('draws the counts in the status bar as numerals with their words, and "7 checked"', () => {
    expect(out).toMatch(/view-dom-verify-num">4<\/span><span class="view-dom-verify-key">Passed</);
    expect(out).toMatch(/view-dom-verify-num">2<\/span><span class="view-dom-verify-key">Failed</);
    expect(out).toMatch(/view-dom-verify-num">1<\/span><span class="view-dom-verify-key">Needs review</);
    expect(out).toContain('>7 checked<');
  });

  it('draws the header override: eyebrow, the phase name as the h1 and Wave 2 as meta', () => {
    const header = domVerifyHeaderProps(model, 'DOM verification: Phase 3, wave 2');
    expect(header.eyebrow).toBe('Phase 3 · Browser check');
    expect(header.title).toBe('Account Admin & Sessions');
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('Wave 2');
    expect(count(out, '<h1')).toBe(0);
  });

  it('draws "What the check wrote" as a closed bar', () => {
    expect(out).toContain('What the check wrote');
    expect(count(out, '<details')).toBe(1);
    expect(count(out, '<details open')).toBe(0);
  });
});

describe('composeDomVerify - a file the page cannot shape', () => {
  it('composes nothing without a projection, or with one that holds no outcome, count or criterion', () => {
    expect(composeDomVerify(inputOf(undefined))).toBeNull();
    expect(composeFile('# Notes\n\nSome words.\n')).toBeNull();
  });
});
