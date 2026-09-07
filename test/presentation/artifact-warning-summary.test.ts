import { describe, expect, it } from 'vitest';
import { artifactWarningTone } from '../../src/presentation/artifact-warning-tone.ts';
import {
  ARTIFACT_WARNING_SUMMARIES,
  artifactWarningSummary,
} from '../../src/presentation/artifact-warning-summary.ts';

describe('artifact warning summary', () => {
  it('returns nothing when the artifact is undamaged', () => {
    expect(
      artifactWarningSummary({
        tone: null,
        structuralWarningCount: 4,
        renderWarningCount: 2,
      }),
    ).toBeNull();
  });

  it('never claims the body survived when nothing did', () => {
    for (const [structuralWarningCount, renderWarningCount] of [
      [1, 0],
      [0, 1],
      [2, 3],
    ]) {
      const summary = artifactWarningSummary({
        tone: 'unreadable',
        structuralWarningCount,
        renderWarningCount,
      });
      expect(summary).toBe(ARTIFACT_WARNING_SUMMARIES.unreadable);
      expect(summary).not.toContain('recovered');
      expect(summary).not.toContain('shown normally');
      expect(summary).not.toBe(ARTIFACT_WARNING_SUMMARIES.metadata);
    }
  });

  it('keeps the shipped Warning copy byte-identical', () => {
    expect(
      artifactWarningSummary({
        tone: 'warning',
        structuralWarningCount: 1,
        renderWarningCount: 0,
      }),
    ).toBe(ARTIFACT_WARNING_SUMMARIES.metadata);
    expect(ARTIFACT_WARNING_SUMMARIES.metadata).toBe(
      "Some of this document's structured metadata could not be read. The document text below was recovered and is shown normally.",
    );
  });

  it('describes a rendering-only warning as a rendering problem', () => {
    const renderingSummary = artifactWarningSummary({
      tone: 'warning',
      structuralWarningCount: 0,
      renderWarningCount: 1,
    });
    expect(renderingSummary).toBe(ARTIFACT_WARNING_SUMMARIES.rendering);
    expect(renderingSummary).not.toContain('structured metadata could not be read');
    expect(
      artifactWarningSummary({
        tone: 'warning',
        structuralWarningCount: 2,
        renderWarningCount: 3,
      }),
    ).toBe(ARTIFACT_WARNING_SUMMARIES.metadata);
  });

  it('stays silent rather than guessing on an inconsistent input', () => {
    expect(
      artifactWarningSummary({
        tone: 'warning',
        structuralWarningCount: 0,
        renderWarningCount: 0,
      }),
    ).toBeNull();
  });

  it('composed with artifactWarningTone, a zero-length body can never produce the recovered-body sentence', () => {
    const structuralWarning = { stage: 'frontmatter' };
    const renderingWarning = 'rendering failed';
    const rows = [
      { structuralWarnings: [structuralWarning], renderWarnings: [], bodyLength: 0 },
      { structuralWarnings: [], renderWarnings: [renderingWarning], bodyLength: 0 },
      { structuralWarnings: [structuralWarning], renderWarnings: [renderingWarning], bodyLength: 0 },
      { structuralWarnings: [structuralWarning], renderWarnings: [], bodyLength: 1 },
      { structuralWarnings: [], renderWarnings: [], bodyLength: 0 },
    ];

    for (const row of rows) {
      const warnings = [...row.structuralWarnings, ...row.renderWarnings];
      const tone = artifactWarningTone({ warnings, bodyLength: row.bodyLength });
      const summary = artifactWarningSummary({
        tone,
        structuralWarningCount: row.structuralWarnings.length,
        renderWarningCount: row.renderWarnings.length,
      });

      if (tone === 'unreadable') expect(summary).toBe(ARTIFACT_WARNING_SUMMARIES.unreadable);
      if (row.bodyLength === 0 && warnings.length > 0) {
        expect(summary).not.toBe(ARTIFACT_WARNING_SUMMARIES.metadata);
      }
      if (warnings.length === 0) expect(summary).toBeNull();
    }

    expect(new Set(Object.values(ARTIFACT_WARNING_SUMMARIES))).toHaveLength(3);
  });
});
