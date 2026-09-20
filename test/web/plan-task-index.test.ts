import { describe, expect, it } from 'vitest';
import { selectPlanIndexRows } from '../../src/web/views/plan-task-index.ts';
import type { PlanSegmentAttributes } from '../../src/web/views/document-sections.ts';

function segment(
  ordinal: string,
  tag: string,
  overrides: Partial<PlanSegmentAttributes> = {},
): PlanSegmentAttributes {
  return {
    ordinal,
    tag,
    label: tag[0]?.toUpperCase() + tag.slice(1),
    gate: null,
    type: null,
    name: null,
    ...overrides,
  };
}

describe('selectPlanIndexRows', () => {
  it('keeps depth <= 2 segments, drops depth-3 leaves without a gate, and preserves task names/gates', () => {
    const segments: PlanSegmentAttributes[] = [
      segment('1', 'objective'),
      segment('2', 'tasks'),
      segment('2.1', 'task', { name: 'Task 1: Wire it', type: 'auto' }),
      segment('2.1.1', 'name'),
      segment('2.1.2', 'action'),
      segment('2.2', 'task', { gate: 'blocking-human', type: 'checkpoint:human-verify' }),
      segment('2.2.3', 'verify'),
      segment('3', 'verification'),
    ];

    const rows = selectPlanIndexRows(segments);

    expect(rows?.map((row) => row.ordinal)).toEqual(['1', '2', '2.1', '2.2', '3']);
    const taskRow = rows?.find((row) => row.ordinal === '2.1');
    expect(taskRow?.label).toBe('Task 1: Wire it');
    const gatedRow = rows?.find((row) => row.ordinal === '2.2');
    expect(gatedRow?.gate).toBe('blocking-human');
  });

  it('keeps a depth-3 segment that carries a gate', () => {
    const segments: PlanSegmentAttributes[] = [
      segment('1', 'tasks'),
      segment('1.1', 'task'),
      segment('1.1.1', 'checkpoint', { gate: 'blocking-human' }),
    ];

    const rows = selectPlanIndexRows(segments);

    expect(rows?.map((row) => row.ordinal)).toContain('1.1.1');
    expect(rows?.find((row) => row.ordinal === '1.1.1')?.gate).toBe('blocking-human');
  });

  it('returns null for an empty segment list', () => {
    expect(selectPlanIndexRows([])).toBeNull();
  });

  it('keeps two sibling tasks with distinct ordinals', () => {
    const segments: PlanSegmentAttributes[] = [
      segment('1', 'tasks'),
      segment('1.1', 'task', { name: 'Task 1' }),
      segment('1.2', 'task', { name: 'Task 2' }),
    ];

    const rows = selectPlanIndexRows(segments);

    expect(rows?.map((row) => row.ordinal)).toEqual(['1', '1.1', '1.2']);
    expect(rows?.map((row) => row.label)).toEqual(['Tasks', 'Task 1', 'Task 2']);
  });

  it('preserves input order rather than sorting by ordinal', () => {
    const segments: PlanSegmentAttributes[] = [
      segment('3', 'verification'),
      segment('1', 'objective'),
      segment('2', 'tasks'),
    ];

    const rows = selectPlanIndexRows(segments);

    expect(rows?.map((row) => row.ordinal)).toEqual(['3', '1', '2']);
  });

  it('never truncates a 40-segment input', () => {
    const segments: PlanSegmentAttributes[] = Array.from({ length: 40 }, (_, i) =>
      segment(`${i + 1}`, 'section'),
    );

    const rows = selectPlanIndexRows(segments);

    expect(rows).toHaveLength(40);
  });
});
