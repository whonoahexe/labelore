import type { ArtifactWarningTone } from './artifact-warning-tone.ts';

/**
 * Closes the D-11 disclosure-honesty gap recorded in 04-VERIFICATION.md. The summary branches on
 * the artifact's outcome, never its parser stage; structural damage outranks a rendering warning
 * when both are present.
 */
export const ARTIFACT_WARNING_SUMMARIES = {
  metadata:
    "Some of this document's structured metadata could not be read. The document text below was recovered and is shown normally.",
  unreadable:
    "None of this document's text could be read, so there is no document body to show below. Whatever did survive is on this page: any metadata that parsed, plus the failure record under Technical details.",
  rendering:
    "This document's stored metadata was read normally; the problem happened while rendering part of the text below. The affected part is shown as plain source instead.",
} as const;

export function artifactWarningSummary(input: {
  tone: ArtifactWarningTone;
  structuralWarningCount: number;
  renderWarningCount: number;
}): string | null {
  if (input.tone === null) return null;
  if (input.tone === 'unreadable') return ARTIFACT_WARNING_SUMMARIES.unreadable;
  if (input.structuralWarningCount > 0) return ARTIFACT_WARNING_SUMMARIES.metadata;
  if (input.renderWarningCount > 0) return ARTIFACT_WARNING_SUMMARIES.rendering;
  return null;
}
