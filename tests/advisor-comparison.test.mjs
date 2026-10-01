import assert from "node:assert/strict";
import test from "node:test";
import { comparisonInputHash, comparisonScenarios } from "../scripts/compare-advisors.mjs";

test("advisor comparisons freeze evidence and never substitute other cities", () => {
  const first = comparisonScenarios();
  assert.deepEqual(first, comparisonScenarios());
  assert.equal(first[0].preparedSearch.matches.length, 2);
  assert.equal(first[1].preparedSearch.matches.length, 0);
  assert.equal(first[2].preparedSearch.matches.length, 0);
  assert.equal(first[2].preparedSearch.criteria.city, "Sihanoukville");
});

test("comparison hashes exclude model choice but include prompt and facts", () => {
  const base = { model: "one/model", messages: [{ content: "fixed evidence" }], reasoning: { effort: "medium" } };
  assert.equal(comparisonInputHash(base), comparisonInputHash({ ...base, model: "two/model" }));
  assert.notEqual(comparisonInputHash(base), comparisonInputHash({ ...base, messages: [] }));
});
