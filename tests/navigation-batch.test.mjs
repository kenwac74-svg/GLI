import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rememberExploreResult, EXPLORE_RETURN_KEY } from "../lib/explore-session.ts";

test("top submission starts fresh while followup retains consultation context", () => {
  const shell = readFileSync(new URL("../app/components/claude-design-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /const previous = mode === "followup" \? window.sessionStorage.getItem\(SEARCH_KEY\) : null/);
  assert.match(shell, /const conversation = mode === "initial" \? \[\] : boundConversation/);
  assert.match(shell, /setRuntimeTurns\(\[\]\)/);
  assert.match(shell, /window.history.replaceState\(\{\}, "", "\/explore"\)/);
  assert.match(shell, /새로운 질문을 입력하세요/);
  assert.match(shell, /예: 베트남 호치민에서/);
});

test("detail checkpoint stores criteria URL and scroll for return without re-search", () => {
  const old = globalThis.window;
  const saved = new Map();
  globalThis.window = { location: { pathname: "/explore", search: "?country=VN" }, scrollY: 812,
    sessionStorage: { setItem: (key, value) => saved.set(key, value) } };
  try {
    rememberExploreResult("external-vn");
    const state = JSON.parse(saved.get(EXPLORE_RETURN_KEY));
    assert.equal(state.href, "/explore?country=VN");
    assert.equal(state.scrollY, 812);
    assert.equal(state.assetId, "external-vn");
  } finally { globalThis.window = old; }
});

test("shell filters navigate across screens and all details expose the return control", () => {
  const shell = readFileSync(new URL("../app/components/claude-design-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /if \(view !== "home"\) \{ navigate\(path\); return; \}/);
  assert.match(shell, /nav\.addEventListener\("toggle", toggle, true\)/);
  assert.match(shell, /rememberExploreResult\(id\)/);
  assert.match(shell, /<BackToResultsButton assetId=\{assetId\}/);
  assert.match(shell, /restoredTurns\?\.length/);
  assert.match(shell, /origin=search/);
  const detail = readFileSync(new URL("../app/assets/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(detail, /origin !== "search"/);
  const access = readFileSync(new URL("../app/assets/[id]/asset-access-demo.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(access, /GLI TRUST SCORE|VERIFICATION PROGRESS/);
  assert.match(access, /trustGrade\(trustScore\)/);
});
