import assert from "node:assert/strict";
import test from "node:test";

import { calculateTrustScore } from "../lib/trust.ts";

const completeInput = {
  completeness: {
    availableItems: 10,
    expectedItems: 10,
    criticalMissing: [],
  },
  freshness: {
    ageDays: 5,
    targetFreshnessDays: 30,
  },
  crossSource: {
    matchingFields: 8,
    comparedFields: 8,
    independentSources: 3,
    conflictingFields: [],
  },
  review: {
    status: "EXPERT_REVIEWED",
  },
};

test("returns a deterministic 0-100 evidence score with reasons", () => {
  const first = calculateTrustScore(completeInput);
  const second = calculateTrustScore(structuredClone(completeInput));

  assert.deepEqual(first, second);
  assert.equal(first.score, 100);
  assert.equal(first.status, "EVIDENCE_SUBSTANTIAL");
  assert.equal(first.reasons.length, 4);
  assert.match(first.reasons[0], /10\/10/);
  assert.match(first.reasons[2], /독립 출처 3개/);
});

test("does not present the score as an investment or safety guarantee", () => {
  const result = calculateTrustScore(completeInput);
  const warningText = result.warnings.join(" ");

  assert.match(warningText, /수익률/);
  assert.match(warningText, /투자 적합성/);
  assert.match(warningText, /거래 안전성을 보장하지 않습니다/);
});

test("caps an unreviewed record below 50 even when other evidence is complete", () => {
  const result = calculateTrustScore({
    ...completeInput,
    review: { status: "UNREVIEWED" },
  });

  assert.equal(result.score, 49);
  assert.equal(result.status, "EVIDENCE_INSUFFICIENT");
  assert.ok(result.warnings.some((warning) => warning.includes("사람의 검토")));
});

test("reports stale material, missing critical items, and source conflicts", () => {
  const result = calculateTrustScore({
    completeness: {
      availableItems: 7,
      expectedItems: 10,
      criticalMissing: ["소유권 확인서"],
    },
    freshness: {
      ageDays: 121,
      targetFreshnessDays: 30,
    },
    crossSource: {
      matchingFields: 4,
      comparedFields: 6,
      independentSources: 2,
      conflictingFields: ["가격", "면적"],
    },
    review: {
      status: "ANALYST_REVIEWED",
    },
  });

  assert.ok(result.score >= 0 && result.score <= 59);
  assert.equal(result.status, "EVIDENCE_LIMITED");
  assert.ok(result.warnings.some((warning) => warning.includes("필수 자료 누락")));
  assert.ok(result.warnings.some((warning) => warning.includes("가격, 면적")));
  assert.ok(result.warnings.some((warning) => warning.includes("4배")));
});

test("rejects inconsistent or out-of-range counts", () => {
  assert.throws(
    () =>
      calculateTrustScore({
        ...completeInput,
        completeness: {
          availableItems: 11,
          expectedItems: 10,
        },
      }),
    /cannot exceed/,
  );

  assert.throws(
    () =>
      calculateTrustScore({
        ...completeInput,
        crossSource: {
          matchingFields: 3,
          comparedFields: 2,
          independentSources: 2,
        },
      }),
    /cannot exceed/,
  );
});
