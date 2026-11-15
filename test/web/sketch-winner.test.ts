import { describe, expect, it } from 'vitest';
import { splitWinner } from '../../src/web/pages/sketches-page.tsx';

// Every winner shape .planning/sketches/MANIFEST.md uses gets a pick, so each card has the same layout.
describe('splitWinner', () => {
  it.each([
    ['C — status rail', 'C', null, 'status rail'],
    ['B3 — folded chapters (build it)', 'B3', null, 'folded chapters (build it)'],
    ['A Desk (build it)', 'A', null, 'Desk (build it)'],
    ['E (round 1b) — structure brackets', 'E', '1b', 'structure brackets'],
    ['Round 2: E — retrospective', 'E', '2', 'retrospective'],
    ['Round 3: R3b — one section', 'R3b', '3', 'one section'],
    ['Round 3: B + P1 — blockers lead', 'B + P1', '3', 'blockers lead'],
    ['B+B — lifted diagram', 'B + B', null, 'lifted diagram'],
    ['None — too close to the discussion log', 'None', null, 'too close to the discussion log'],
    ['Reuse — shipped lane diagram', 'Reuse', null, 'shipped lane diagram'],
    ['C Reuse — shipped chips + lanes (build it)', 'C', null, 'Reuse — shipped chips + lanes (build it)'],
  ])('%s', (cell, pick, round, text) => {
    expect(splitWinner(cell)).toEqual({ pick, round, text });
  });

  it('joins a winner per part, keeping each label and round in the text', () => {
    expect(splitWinner('Room: B: Video first (dashed screen). Create page: R3 A: The sentence (one line)')).toEqual({
      pick: 'B + A',
      round: null,
      text: 'Room: Video first (dashed screen). Create page (round 3): The sentence (one line)',
    });
  });

  it('keeps a cell with no leading variant whole', () => {
    expect(splitWinner('the folded one')).toEqual({ pick: null, round: null, text: 'the folded one' });
  });
});
