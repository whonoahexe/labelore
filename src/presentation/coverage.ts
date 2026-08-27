export interface CoverageStatement {
  key: string;
  text: string;
  requirementIds: string[];
}

export interface CoverageMatch {
  truth: CoverageStatement;
  coverage: CoverageStatement;
  kind: 'exact' | 'inferred';
  score: number;
}

export interface CoverageMatrix {
  matches: CoverageMatch[];
  unmatchedTruths: CoverageStatement[];
  unmatchedCoverage: CoverageStatement[];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'with',
]);

function normalizeText(value: string): string {
  return (
    value
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .match(/[\p{Letter}\p{Number}]+/gu)
      ?.join(' ') ?? ''
  );
}

function significantTokens(value: string): Set<string> {
  const withoutIds = value.replace(/\b[A-Z][A-Z0-9]+-\d+\b/giu, ' ');
  const tokens = normalizeText(withoutIds).split(' ').filter(Boolean);
  return new Set(tokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function jaccard(left: CoverageStatement, right: CoverageStatement): number {
  const leftTokens = significantTokens(left.text);
  const rightTokens = significantTokens(right.text);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

function sharesApplicableId(left: CoverageStatement, right: CoverageStatement): boolean {
  if (left.requirementIds.length === 0 || right.requirementIds.length === 0) return true;
  const rightIds = new Set(right.requirementIds.map((id) => id.toLocaleUpperCase('en-US')));
  return left.requirementIds.some((id) => rightIds.has(id.toLocaleUpperCase('en-US')));
}

function byKey(left: CoverageStatement, right: CoverageStatement): number {
  return left.key.localeCompare(right.key);
}

function soleCandidate<T>(candidates: T[]): T | null {
  return candidates.length === 1 ? candidates[0] : null;
}

/** Builds a count-preserving matrix without using input position as pairing evidence. */
export function buildCoverageMatrix(
  authoredTruths: readonly CoverageStatement[],
  authoredCoverage: readonly CoverageStatement[],
): CoverageMatrix {
  const truths = authoredTruths.map((item) => ({
    ...item,
    requirementIds: [...item.requirementIds],
  }));
  const coverage = authoredCoverage.map((item) => ({
    ...item,
    requirementIds: [...item.requirementIds],
  }));
  const remainingTruths = new Map(truths.map((item) => [item.key, item]));
  const remainingCoverage = new Map(coverage.map((item) => [item.key, item]));
  const matches: CoverageMatch[] = [];

  // Exact matching is one-to-one and ambiguity-preserving: duplicate normalized text is not
  // silently paired by array position.
  const exactText = new Set([
    ...truths.map((item) => normalizeText(item.text)),
    ...coverage.map((item) => normalizeText(item.text)),
  ]);
  for (const normalized of [...exactText].filter(Boolean).sort()) {
    const truthCandidates = [...remainingTruths.values()].filter(
      (item) => normalizeText(item.text) === normalized,
    );
    const coverageCandidates = [...remainingCoverage.values()].filter(
      (item) => normalizeText(item.text) === normalized,
    );
    if (truthCandidates.length !== 1 || coverageCandidates.length !== 1) continue;
    const truth = truthCandidates[0];
    const evidence = coverageCandidates[0];
    matches.push({ truth, coverage: evidence, kind: 'exact', score: 1 });
    remainingTruths.delete(truth.key);
    remainingCoverage.delete(evidence.key);
  }

  const candidates = [...remainingTruths.values()].flatMap((truth) =>
    [...remainingCoverage.values()].flatMap((evidence) => {
      const score = jaccard(truth, evidence);
      return score >= 0.6 && sharesApplicableId(truth, evidence)
        ? [{ truth, coverage: evidence, score }]
        : [];
    }),
  );
  const bestForTruth = new Map<string, (typeof candidates)[number] | null>();
  const bestForCoverage = new Map<string, (typeof candidates)[number] | null>();
  for (const truth of remainingTruths.values()) {
    bestForTruth.set(
      truth.key,
      soleCandidate(candidates.filter((candidate) => candidate.truth.key === truth.key)),
    );
  }
  for (const evidence of remainingCoverage.values()) {
    bestForCoverage.set(
      evidence.key,
      soleCandidate(candidates.filter((candidate) => candidate.coverage.key === evidence.key)),
    );
  }

  for (const candidate of candidates) {
    if (bestForTruth.get(candidate.truth.key) !== candidate) continue;
    if (bestForCoverage.get(candidate.coverage.key) !== candidate) continue;
    matches.push({ ...candidate, kind: 'inferred' });
    remainingTruths.delete(candidate.truth.key);
    remainingCoverage.delete(candidate.coverage.key);
  }

  matches.sort(
    (left, right) =>
      (left.kind === right.kind ? 0 : left.kind === 'exact' ? -1 : 1) ||
      left.truth.key.localeCompare(right.truth.key) ||
      left.coverage.key.localeCompare(right.coverage.key),
  );
  return {
    matches,
    unmatchedTruths: [...remainingTruths.values()].sort(byKey),
    unmatchedCoverage: [...remainingCoverage.values()].sort(byKey),
  };
}
