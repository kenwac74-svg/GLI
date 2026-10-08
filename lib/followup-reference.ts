// "그중 첫 번째 후보" 같은 후속 질문의 서수 참조를 직전 결과 목록의 자산 ID로 해석한다.
const ORDINAL_WORDS: ReadonlyArray<{ pattern: RegExp; index: number }> = [
  { pattern: /첫\s*(?:번째|째)|first/i, index: 0 },
  { pattern: /두\s*(?:번째|째)|second/i, index: 1 },
  { pattern: /세\s*(?:번째|째)|third/i, index: 2 },
  { pattern: /네\s*(?:번째|째)|fourth/i, index: 3 },
  { pattern: /다섯\s*(?:번째|째)|fifth/i, index: 4 },
];

// Resolves an ordinal reference against the list the user was just shown.
// Returns null when the query names no ordinal or the ordinal is out of range,
// so callers fall back to normal criteria-based search instead of guessing.
export function resolveFollowupReference(
  query: string,
  previousAssetIds: readonly string[],
): string | null {
  if (previousAssetIds.length === 0) return null;
  const text = query.toLowerCase();
  if (/마지막|last/.test(text)) {
    return previousAssetIds[previousAssetIds.length - 1] ?? null;
  }
  const numbered = text.match(/(\d{1,2})\s*(?:번째|번\s*(?:후보|매물|자산))/);
  if (numbered) {
    return previousAssetIds[Number(numbered[1]) - 1] ?? null;
  }
  const word = ORDINAL_WORDS.find(({ pattern }) => pattern.test(text));
  return word ? (previousAssetIds[word.index] ?? null) : null;
}
