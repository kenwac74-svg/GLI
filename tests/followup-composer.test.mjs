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

test("connects the approved GLI-048 follow-up composer contract", () => {
  assert.match(shell, /data-followup-composer/);
  assert.match(shell, /data-followup-input/);
  assert.match(source, /data-action="runFollowUp"/);
  assert.match(shell, /data-followup-status/);
  assert.match(shell, /GLI AI가 답변을 정리하고 있습니다/);
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
  assert.match(shell, /변경된 탐색 결과 보기/);
  assert.match(shell, /link\.dataset\.action = "viewChangedResults"/);
  assert.match(shell, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /\.turn-note button\{min-height:44px/);
});

test("keeps follow-up QA state controls out of the public React surface", () => {
  assert.doesNotMatch(shell, /fw-loading|fw-error|pickFwState|fdemo/);
  assert.match(generator, /\.statedemo\{display:none!important\}/);
});
