// VIEW-05's registry-completeness test: every kind in `VIEW_KINDS` (18 total: UI-SPEC's own 16
// plus `review-fix` and `findings`, RESEARCH.md § Open Question 1's recommended corpus-grep
// gap) must have a registered `VIEW_MANIFESTS` entry with a non-empty `lead` and at least one
// `promote` entry — and no manifest may exist for a kind that isn't a `VIEW_KINDS` member. Both
// directions are asserted via a single sorted-keys `toEqual`, so a new kind added to either list
// without a matching update on the other fails this suite immediately.
import { describe, expect, it } from 'vitest';
import { VIEW_KINDS } from '../../src/web/views/kinds.ts';
import { VIEW_MANIFESTS, resolveView } from '../../src/web/views/manifests.ts';
import type { BlockComponentKey } from '../../src/web/views/manifest.ts';

const KNOWN_COMPONENTS: readonly BlockComponentKey[] = [
  'discussion-questions',
  'verification-checks',
  'plan-task-index',
  'fact-list',
];

describe('view registry completeness (VIEW-05)', () => {
  it('VIEW_KINDS has exactly 18 members', () => {
    expect(VIEW_KINDS.length).toBe(18);
  });

  it('VIEW_MANIFESTS keys and VIEW_KINDS are the same set, both directions', () => {
    const manifestKeys = Object.keys(VIEW_MANIFESTS).sort();
    const kinds = [...VIEW_KINDS].sort();
    expect(manifestKeys).toEqual(kinds);
  });

  for (const kind of VIEW_KINDS) {
    describe(`kind: ${kind}`, () => {
      const manifest = VIEW_MANIFESTS[kind];

      it('has a registered manifest', () => {
        expect(manifest).toBeDefined();
      });

      it('manifest.kind matches the registry key', () => {
        expect(manifest?.kind).toBe(kind);
      });

      it('has a non-empty lead sentence ending in a period', () => {
        expect(typeof manifest?.lead).toBe('string');
        expect(manifest?.lead.trim().length).toBeGreaterThan(0);
        expect(manifest?.lead.trim().endsWith('.')).toBe(true);
      });

      it('has at least one promote entry', () => {
        expect(manifest?.promote.length).toBeGreaterThanOrEqual(1);
      });

      it('every section entry has a string or RegExp heading', () => {
        for (const entry of manifest?.promote ?? []) {
          if (entry.type !== 'section') continue;
          const headingType = typeof entry.heading;
          expect(headingType === 'string' || entry.heading instanceof RegExp).toBe(true);
        }
      });

      it('every data entry has a known component and a function select', () => {
        for (const entry of manifest?.promote ?? []) {
          if (entry.type !== 'data') continue;
          expect(KNOWN_COMPONENTS).toContain(entry.component);
          expect(typeof entry.select).toBe('function');
        }
      });

      it('resolveView(kind).recognized is true', () => {
        expect(resolveView(kind).recognized).toBe(true);
      });
    });
  }

  it('a kind with no registered manifest is unrecognized', () => {
    const resolved = resolveView('not-a-real-kind');
    expect(resolved.recognized).toBe(false);
    expect(resolved.manifest).toBeNull();
  });

  describe('UI-SPEC pinned lead copy (verbatim proof cases)', () => {
    it('discussion-log', () => {
      expect(VIEW_MANIFESTS['discussion-log']?.lead).toBe(
        'Each question, the options that were on the table, and which one was chosen.',
      );
    });

    it('verification', () => {
      expect(VIEW_MANIFESTS.verification?.lead).toBe(
        'What still needs a human to check, first — then everything already confirmed.',
      );
    });

    it('plan', () => {
      expect(VIEW_MANIFESTS.plan?.lead).toBe(
        'The task structure this plan commits to, in order, and which sections gate.',
      );
    });
  });
});
