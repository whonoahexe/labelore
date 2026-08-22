// The single source D-09 requires: the flat snapshot.warnings array and each artifact's own
// warnings array hold references produced by this one collector, never two independently-built
// lists.
import type { ParseWarning, WarningStage } from './types.ts';

export class WarningCollector {
  private readonly warnings: ParseWarning[] = [];
  private readonly byPath = new Map<string, ParseWarning[]>();

  add(path: string, stage: WarningStage, message: string, salvage: string): ParseWarning {
    const warning: ParseWarning = { path, stage, message, salvage };
    this.warnings.push(warning);
    const existing = this.byPath.get(path);
    if (existing) {
      existing.push(warning);
    } else {
      this.byPath.set(path, [warning]);
    }
    return warning;
  }

  forPath(path: string): ParseWarning[] {
    return this.byPath.get(path) ?? [];
  }

  all(): ParseWarning[] {
    return [...this.warnings];
  }
}
