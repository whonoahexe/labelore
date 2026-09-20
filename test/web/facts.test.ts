import { describe, expect, it } from 'vitest';
import { selectFacts } from '../../src/web/views/facts.ts';
import { VIEW_MANIFESTS } from '../../src/web/views/manifests.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

function input(frontmatter: Record<string, unknown>): ViewInput {
  return { kind: 'test-kind', frontmatter, structured: {}, groups: [], planSegments: [] };
}

describe('selectFacts', () => {
  it('keeps the given key order, not the frontmatter order', () => {
    const facts = selectFacts({ b: '2', a: '1' }, ['a', 'b']);
    expect(facts?.map((fact) => fact.key)).toEqual(['a', 'b']);
  });

  it('skips a key that is absent, null, undefined, empty string, empty array, or empty object', () => {
    const facts = selectFacts(
      {
        present: 'value',
        absentIsUndefinedInFrontmatter: undefined,
        nullValue: null,
        emptyString: '',
        emptyArray: [],
        emptyObject: {},
      },
      ['present', 'missingKey', 'nullValue', 'emptyString', 'emptyArray', 'emptyObject'],
    );
    expect(facts).toEqual([{ key: 'present', label: 'Present', value: { kind: 'scalar', value: 'value' } }]);
  });

  it('returns null when nothing in the key list matched', () => {
    expect(selectFacts({ other: 'x' }, ['missing', 'also-missing'])).toBeNull();
  });

  it('humanizes behavior_unverified to "Behavior unverified"', () => {
    const facts = selectFacts({ behavior_unverified: 0 }, ['behavior_unverified']);
    expect(facts?.[0]).toMatchObject({ key: 'behavior_unverified', label: 'Behavior unverified' });
  });

  it('renders a non-empty scalar value through toFrontmatterValueView', () => {
    const facts = selectFacts({ score: '9/10' }, ['score']);
    expect(facts?.[0].value).toEqual({ kind: 'scalar', value: '9/10' });
  });
});

describe('verification manifest human-verification select', () => {
  const select = VIEW_MANIFESTS.verification?.promote[0];
  if (!select || select.type !== 'data') throw new Error('expected the human-verification data block first');
  const humanVerificationSelect = select.select;

  it('returns null for the string "resolved" (a non-array value)', () => {
    expect(humanVerificationSelect(input({ human_verification: 'resolved' }))).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(humanVerificationSelect(input({ human_verification: [] }))).toBeNull();
  });

  it('returns null when the key is missing entirely', () => {
    expect(humanVerificationSelect(input({}))).toBeNull();
  });

  it('returns the array unchanged for a two-entry array', () => {
    const entries = [
      { test: 'a', expected: 'b', why_human: 'c' },
      { test: 'd', expected: 'e', why_human: 'f' },
    ];
    expect(humanVerificationSelect(input({ human_verification: entries }))).toBe(entries);
  });
});
