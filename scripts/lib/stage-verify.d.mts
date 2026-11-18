// Types for scripts/lib/stage-verify.mjs, so strict TypeScript tests can import the .mjs.

export const SIZE_BUDGET_BYTES: number;
export const CONSENT_CAP_BYTES: number;
export const RUNTIME_FILES: readonly string[];

export interface StageEntry {
  /** Posix path relative to the stage root. */
  path: string;
  size: number;
  kind: 'file' | 'dir' | 'symlink' | 'other';
}

export interface StageReport {
  ok: boolean;
  problems: string[];
}

export interface StageVerification extends StageReport {
  /** The exact sum of the lstat sizes of every regular file. */
  bytes: number;
  /** The count of regular files. */
  files: number;
}

export interface VerifyStageOptions {
  budgetBytes?: number;
  version?: string;
}

export function listStage(dir: string): StageEntry[];
export function verifyStage(dir: string, options?: VerifyStageOptions): StageVerification;
export function smokeStage(dir: string, version: string): Promise<StageReport>;
export function verifyPacked(buffer: Buffer, stageListing: readonly StageEntry[], integrity: string): StageReport;
