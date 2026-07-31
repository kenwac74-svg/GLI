import assert from "node:assert/strict";
import test from "node:test";
import { calculateTrustScore } from "../lib/trust.ts";

const completeInput = {
  completeness: { availableItems: 10, expectedItems: 10, criticalMissing: [] },
  freshness: { ageDays: 5, targetFreshnessDays: 30 },
  crossSource: { matchingFields: 8, comparedFields: 8, independentSources: 3, conflictingFields: [] },
  review: { status: "EXPERT_REVIEWED" },
};

test("returns a deterministic evidence score", () => {
  const first = calculateTrustScore(completeInput);
  assert.deepEqual(first, calculateTrustScore(structuredClone(completeInput)));
  assert.equal(first.score, 100);
  assert.equal(first.status, "EVIDENCE_SUBSTANTIAL");
});

test("never presents an investment or safety guarantee", () => {
  const warnings = calculateTrustScore(completeInput).warnings.join(" ");
  assert.match(warnings, /수익률/);
  assert.match(warnings, /투자 적합성/);
  assert.match(warnings, /거래 안전성을 보장하지 않습니다/);
});

test("caps an unreviewed record below 50", () => {
  const result = calculateTrustScore({ ...completeInput, review: { status: "UNREVIEWED" } });
  assert.equal(result.score, 49);
  assert.equal(result.status, "EVIDENCE_INSUFFICIENT");
});

test("reports stale, missing, and conflicting evidence", () => {
  const result = calculateTrustScore({
    completeness: { availableItems: 7, expectedItems: 10, criticalMissing: ["소유권 확인서"] },
    freshness: { ageDays: 121, targetFreshnessDays: 30 },
    crossSource: { matchingFields: 4, comparedFields: 6, independentSources: 2, conflictingFields: ["가격", "면적"] },
    review: { status: "ANALYST_REVIEWED" },
  });
  assert.ok(result.score >= 0 && result.score <= 59);
  assert.ok(result.warnings.some((warning) => warning.includes("필수 자료 누락")));
  assert.ok(result.warnings.some((warning) => warning.includes("가격, 면적")));
});

test("rejects inconsistent counts", () => {
  assert.throws(() => calculateTrustScore({ ...completeInput, completeness: { availableItems: 11, expectedItems: 10 } }), /cannot exceed/);
});
