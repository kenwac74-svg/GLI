import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sortResultItems } from "../lib/result-sort.ts";

const items = [
  { id: "a", index: 0, grade: "B", sourcePublishedAt: "2026-01-01" },
  { id: "b", index: 1, grade: "A", sourcePublishedAt: "2026-03-01" },
  { id: "c", index: 2, grade: "A", sourcePublishedAt: "invalid" },
  { id: "d", index: 3, grade: "", sourcePublishedAt: null, updatedAt: "2027-01-01" },
];
test("grade sorting is stable and unknown grades come last", () => {
  assert.deepEqual(sortResultItems(items, "trust").map(x => x.id), ["b", "c", "a", "d"]);
  assert.equal(items[0].id, "a");
});
test("new sorting uses source publication only, never observed/updated timestamps", () => {
  assert.deepEqual(sortResultItems(items, "new").map(x => x.id), ["b", "a", "c", "d"]);
});
test("default restores original order and invalid sort falls back to default", () => {
  const reordered = sortResultItems(items, "trust");
  assert.deepEqual(sortResultItems(reordered, "rec").map(x => x.id), ["a", "b", "c", "d"]);
  assert.deepEqual(sortResultItems(reordered, "bogus").map(x => x.id), ["a", "b", "c", "d"]);
});
test("approved HTML native sort change is delegated and source date retained", () => {
  const shell = readFileSync(new URL("../app/components/claude-design-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /root\?\.addEventListener\("change", change\)/);
  assert.match(shell, /root\?\.removeEventListener\("change", change\)/);
  assert.match(shell, /sessionStorage.setItem\(RESULT_SORT_KEY, resultSortMode\(select.value\)\)/);
  assert.match(shell, /card.dataset.sourcePublishedAt = match.sourcePublishedAt \?\? ""/);
});
