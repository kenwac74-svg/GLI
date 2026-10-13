import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resultFilterPath, matchesResultFilters, countryCode, resultViewMode } from "../lib/result-controls.ts";

test("filter changes preserve the other filters without repeating a query", () => {
  assert.equal(resultFilterPath("?country=VN&txn=매매&q=old", "cat", "주거용"), "/explore?country=VN&txn=%EB%A7%A4%EB%A7%A4&cat=%EC%A3%BC%EA%B1%B0%EC%9A%A9");
  assert.equal(resultFilterPath("?country=VN&txn=매매&cat=주거용", "country", "ALL"), "/explore?txn=%EB%A7%A4%EB%A7%A4&cat=%EC%A3%BC%EA%B1%B0%EC%9A%A9");
  assert.equal(resultFilterPath("?country=VN&cat=주거용", "cat", "ALL"), "/explore?country=VN");
  assert.equal(resultFilterPath("?country=VN&cat=주거용", "cat", "주거용"), "/explore?country=VN");
  assert.equal(resultFilterPath("?cc=KH&txn=임대", "country", "ALL"), "/explore?txn=%EC%9E%84%EB%8C%80");
});
test("all filters combine on acquired metadata and unknown categories do not match", () => {
  const filters = new URLSearchParams("country=VN&txn=매매&cat=주거용");
  assert.equal(matchesResultFilters({country:"VN", transaction:"sale", category:"주거용"}, filters), true);
  assert.equal(matchesResultFilters({country:"KH", transaction:"sale", category:"주거용"}, filters), false);
  assert.equal(matchesResultFilters({country:"VN", transaction:"rent", category:"주거용"}, filters), false);
  assert.equal(matchesResultFilters({country:"VN", transaction:"sale"}, filters), false);
  assert.equal(matchesResultFilters({country:"VN", recommended:true}, new URLSearchParams("txn=REC")), true);
  assert.equal(matchesResultFilters({country:"VN"}, new URLSearchParams("txn=REC")), false);
});
test("country labels and view preference normalize without inventing geography", () => {
  assert.equal(countryCode("베트남"), "VN");
  assert.equal(countryCode("Philippines"), "PH");
  assert.equal(countryCode("other"), "");
  assert.equal(resultViewMode("list"), "list");
  assert.equal(resultViewMode("invalid"), "grid");
});

test("list content can shrink inside the approved horizontal card", () => {
  const shell = readFileSync(new URL("../app/components/claude-design-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /body.style.minWidth = "0"/);
  assert.match(shell, /body.style.flex = "1"/);
});
