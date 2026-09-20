// VIEW-04's pure row selector: turns the flat `PlanSegmentAttributes[]` `extractPlanSegments`
// reads off the rendered plan HTML into the task-structure index rows the page promotes ahead of
// the plan body — completeness of gating status, not a second outline (UI-SPEC §5).
import type { PlanSegmentAttributes } from './document-sections.ts';
import type { PromotedBlock } from './manifest.ts';

export interface PlanIndexRow {
  ordinal: string;
  depth: number;
  label: string;
  gate: string | null;
  type: string | null;
}

function ordinalDepth(ordinal: string): number {
  return ordinal.split('.').filter((part) => part.length > 0).length;
}

/**
 * Keeps a segment when `depth <= 2` OR it carries a `gate` (planner decision: a task's own
 * `<name>`/`<files>`/`<action>` children are depth-3 leaves that would swamp the index, while any
 * gated segment — at any depth — must stay visible for gating completeness, UI-SPEC §5). Row
 * order is document order (never sorted); `label` prefers a task's own `name` when present.
 * Returns `null` when nothing was kept (D-06).
 */
export function selectPlanIndexRows(
  segments: readonly PlanSegmentAttributes[],
): PlanIndexRow[] | null {
  const rows: PlanIndexRow[] = [];
  for (const segment of segments) {
    const depth = ordinalDepth(segment.ordinal);
    if (depth > 2 && segment.gate === null) continue;
    rows.push({
      ordinal: segment.ordinal,
      depth,
      label: segment.name ?? segment.label,
      gate: segment.gate,
      type: segment.type,
    });
  }
  return rows.length > 0 ? rows : null;
}

export const planTaskIndexBlock: PromotedBlock = {
  type: 'data',
  id: 'task-structure',
  label: 'Task structure',
  component: 'plan-task-index',
  select: (input) => selectPlanIndexRows(input.planSegments),
};
