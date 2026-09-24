import { describe, expect, it } from 'vitest';
import { deferredOutcome, splitEndnoteBody } from '../../src/web/views/endnote-items.ts';

describe('splitEndnoteBody', () => {
  it('splits prose around the first top-level list, keeping nested lists inside their item', () => {
    const html =
      '<p>Lead.</p>\n<ul>\n<li>One</li>\n<li>Two<ul><li>nested</li></ul></li>\n</ul>\n<p>Trailer.</p>';
    expect(splitEndnoteBody(html)).toEqual({
      lead: '<p>Lead.</p>',
      items: ['One', 'Two<ul><li>nested</li></ul>'],
      trailer: '<p>Trailer.</p>',
    });
  });

  it('returns the whole body as lead when there is no list', () => {
    expect(splitEndnoteBody('<p>Only prose.</p>')).toEqual({
      lead: '<p>Only prose.</p>',
      items: null,
      trailer: '',
    });
  });
});

describe('deferredOutcome', () => {
  it('lifts "→ Phase N" out of the idea', () => {
    expect(
      deferredOutcome('Live-socket teardown on logout → Phase 3 (<code>SessionRevocationBus</code>, ADMIN-03)'),
    ).toEqual({
      html: 'Live-socket teardown on logout (<code>SessionRevocationBus</code>, ADMIN-03)',
      outcome: '→ Phase 3',
    });
  });

  it('lifts "— offered, passed over", also inside a loose-list <p>', () => {
    expect(deferredOutcome('Login page visual treatment — offered, passed over')).toEqual({
      html: 'Login page visual treatment',
      outcome: 'Passed over',
    });
    expect(deferredOutcome('<p>Login page — offered, passed over</p>')).toEqual({
      html: '<p>Login page</p>',
      outcome: 'Passed over',
    });
  });

  it('lifts "— raised, not pursued" and keeps what follows the semicolon', () => {
    expect(
      deferredOutcome('Throttle events writing a row — raised, not pursued; candidate for Phase 3’s ADMIN-06'),
    ).toEqual({
      html: 'Throttle events writing a row — candidate for Phase 3’s ADMIN-06',
      outcome: 'Not pursued',
    });
  });

  it('chips a trailing "(Phase N, …)" destination without changing the text', () => {
    expect(deferredOutcome('Audit-log rows for role changes (Phase 3, ADMIN-06)')).toEqual({
      html: 'Audit-log rows for role changes (Phase 3, ADMIN-06)',
      outcome: '→ Phase 3',
    });
  });

  it('leaves an item with no recognised outcome unchanged', () => {
    const html = 'Server-generated passwords (D-01’s declined first option)';
    expect(deferredOutcome(html)).toEqual({ html, outcome: null });
  });
});
