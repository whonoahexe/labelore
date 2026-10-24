// The build-order DAG layout (quick-261024-k8u, sketch 032 A, T-k8u-03): longest-chain columns, the
// transitive reduction, barycentric ordering, clamped node width, and termination on cycles.
import { describe, expect, it } from 'vitest';
import { layoutBuildOrder, type BuildOrderNode } from '../../src/rendering/build-order-layout.ts';

const step = (id: string, depends: string[] = [], name = id): BuildOrderNode => ({ id, name, depends });

describe('layoutBuildOrder', () => {
  it('puts a step in the column of its longest prerequisite chain and drops the redundant wire', () => {
    const layout = layoutBuildOrder([step('A'), step('B', ['A']), step('D', ['B', 'A'])], 960);
    expect(layout.columns).toEqual([['A'], ['B'], ['D']]);
    expect(layout.wires.map((wire) => `${wire.from}>${wire.to}`)).toEqual(['A>B', 'B>D']);
  });

  it('terminates on a cycle and a self-loop, placing every step and drawing no backward wire', () => {
    const layout = layoutBuildOrder([step('A', ['B']), step('B', ['A']), step('C', ['C'])], 960);
    expect(Object.keys(layout.positions).sort()).toEqual(['A', 'B', 'C']);
    for (const wire of layout.wires) {
      expect(layout.positions[wire.from].column).toBeLessThan(layout.positions[wire.to].column);
    }
    expect(layout.width).toBeGreaterThan(0);
  });

  it('lays out 60 chained steps without overflowing the stack, in either source order', () => {
    const forward = Array.from({ length: 60 }, (_, i) => step(`S${i}`, i === 0 ? [] : [`S${i - 1}`]));
    expect(layoutBuildOrder(forward, 960).columns).toHaveLength(60);
    const reversed = [...forward].reverse();
    const layout = layoutBuildOrder(reversed, 960);
    expect(layout.columns).toHaveLength(60);
    expect(layout.positions.S59.column).toBe(59);
  });

  it('orders a column by the mean row of its prerequisites, source order breaking ties', () => {
    const layout = layoutBuildOrder(
      [step('A'), step('B'), step('C', ['B']), step('D', ['A']), step('E', ['A', 'B'])],
      960,
    );
    // Column 0 is A, B (rows 0 and 1); D waits for row 0, E for 0.5, C for row 1.
    expect(layout.columns[1]).toEqual(['D', 'E', 'C']);
  });

  it('clamps the node width between 168 and 250 and grows the height for a long name', () => {
    const steps = [step('A'), step('B', ['A']), step('C', ['B']), step('D', ['C'])];
    expect(layoutBuildOrder(steps, 300).nodeWidth).toBe(168);
    expect(layoutBuildOrder([step('A')], 2000).nodeWidth).toBe(250);
    const short = layoutBuildOrder(steps, 960);
    const long = layoutBuildOrder([{ ...steps[0], name: 'x'.repeat(27) }, ...steps.slice(1)], 960);
    expect(long.nodeHeight).toBeGreaterThan(short.nodeHeight);
  });

  it('ignores unknown prerequisites and repeated ids, and handles no steps', () => {
    const layout = layoutBuildOrder([step('A', ['spike']), step('A'), step('B', ['A', 'ghost'])], 960);
    expect(layout.columns).toEqual([['A'], ['B']]);
    expect(layoutBuildOrder([], 960)).toMatchObject({ columns: [], wires: [], width: 0, height: 0 });
  });
});
