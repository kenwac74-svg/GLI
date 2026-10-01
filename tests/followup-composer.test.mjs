import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shell = fs.readFileSync(
  new URL("../app/components/claude-design-shell.tsx", import.meta.url),
  "utf8",
);
const generator = fs.readFileSync(
  new URL("../scripts/render-claude-handoff.mjs", import.meta.url),
  "utf8",
);
const source = fs.readFileSync(
  new URL("../design-handoff/source/gli-demo.dc.html", import.meta.url),
  "utf8",
);
const panel = fs.readFileSync(new URL("../app/components/consultation-panel.tsx", import.meta.url), "utf8");

test("connects the approved GLI-048 follow-up composer contract", () => {
  assert.match(panel, /data-followup-composer/);
  assert.match(shell, /data-followup-input/);
  assert.match(source, /data-action="runFollowUp"/);
  assert.match(panel, /data-followup-status/);
  assert.match(panel, /GLI AI가 답변을 정리하고 있습니다/);
  assert.match(shell, /mode: "initial" \| "followup"/);
  assert.match(shell, /context, conversation/);
  assert.match(source, /<form class="fw" data-followup-composer/);
});

test("keeps the approved responsive and accessibility styling in generated CSS", () => {
  assert.match(generator, /\.fw-row textarea\{[^}]*font-size:17px/);
  assert.match(generator, /@media\(max-width:560px\)/);
  assert.match(generator, /\.fw-send\{width:100%;min-height:52px\}/);
  assert.match(generator, /prefers-reduced-motion:reduce/);
});

test("shows an approved result-update notice only when follow-up candidates change", () => {
  assert.match(shell, /describeResultUpdate/);
  assert.match(shell, /현재 확인 가능한 후보는 \$\{nextIds\.length\}건입니다/);
  assert.match(panel, /갱신된 후보 보기/);
  assert.match(panel, /data-result-update/);
  assert.match(shell, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /\.turn-note button\{min-height:44px/);
});

test("keeps follow-up QA state controls out of the public React surface", () => {
  assert.doesNotMatch(shell, /fw-loading|fw-error|pickFwState|fdemo/);
  assert.match(generator, /\.statedemo\{display:none!important\}/);
});

test("preserves backend candidates and their order while a follow-up input rerenders", () => {
  assert.match(shell, /previousAssetIds: resultCandidateIds\(previousResult\)/);
  assert.match(shell, /if \(existing\) grid\.append\(existing\)/);
  assert.match(shell, /useLayoutEffect\(\(\) => \{\s*if \(view !== "home"\) return;[\s\S]*?applySearchResult[\s\S]*?\[view, viewHtml, searchIsActive, runtimeTurns\]/);
});

test("keeps the live composer DOM stable and does not send on IME confirmation", () => {
  assert.match(shell, /const ApprovedHtml = memo\(/);
  assert.match(shell, /<ApprovedHtml html=\{viewHtml\}/);
  assert.match(panel, /value=\{p.value\}/);
  assert.match(panel, /e.nativeEvent.isComposing \|\| e.keyCode === 229/);
  assert.match(shell, /createPortal\(<ConsultationPanel/);
  assert.doesNotMatch(shell, /\[data-runtime-turn\]"\)\.forEach\(\(turn\) => turn.remove\(\)\)/);
});

test("final consultation CSS is extracted verbatim without replacing frozen page styles", () => {
  const handoff = fs.readFileSync(new URL("../design-handoff/source/gli-052-consultation.dc.html", import.meta.url), "utf8");
  const start = handoff.indexOf("  /* 상담 흐름 (GLI-052)");
  const end = handoff.indexOf("  /* 후속 질문 컴포저", start);
  const css = fs.readFileSync(new URL("../app/generated/claude-consultation.css", import.meta.url), "utf8");
  assert.equal(css, "/* Generated verbatim from GLI-052 final consultation styles. */\n" + handoff.slice(start, end));
  assert.doesNotMatch(panel, /fallbackRespond|window\.claude|runQA|rank\(/);
});
