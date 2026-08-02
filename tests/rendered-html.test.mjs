import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the GLI application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GLI \| AI Verified Assets<\/title>/i);
  assert.match(html, /국가와 자산의 경계를 넘어,/);
  assert.match(html, /검증된 투자 기회를 탐색하세요/);
  assert.match(html, /후보와 자료 신뢰도,/);
  assert.match(html, /다음 확인 단계를 한 번에 정리합니다/);
  assert.match(html, /GLI AI INVESTMENT ADVISOR/);
  assert.match(html, /AI가 탐색하고, 전문가가 직접 검증합니다/);
  assert.match(html, /AI와 사람의 상호보완/);
  assert.doesNotMatch(html, /점수보다 근거를 먼저 봅니다/);
  assert.match(html, /\/brand\/gli-logo\.png/);
  assert.doesNotMatch(html, /gli-ai-prototype\.html|<iframe/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("returns grounded Cambodia results from the search API", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-api`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "월 500달러 이하 2베드 강 전망 임대 콘도" }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.criteria.country, "Cambodia");
  assert.equal(result.criteria.transaction, "rent");
  assert.equal(result.criteria.bedrooms, 2);
  assert.equal(result.dataMode, "approved-fixture");
  assert.equal(result.advisor.mode, "rules");
  assert.equal(result.advisor.model, null);
  assert.ok(result.matches.length >= 1);
  assert.equal(result.matches[0].id, "GLI-KH-004");
  assert.deepEqual(
    result.citations.map((citation) => citation.assetId),
    result.matches.map((asset) => asset.id),
  );

  const followUpResponse = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "예산은 650달러로 넓혀줘",
        context: result.criteria,
      }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(followUpResponse.status, 200);
  const followUp = await followUpResponse.json();
  assert.equal(followUp.criteria.transaction, "rent");
  assert.equal(followUp.criteria.bedrooms, 2);
  assert.equal(followUp.criteria.wantsRiver, true);
  assert.equal(followUp.criteria.maxPriceUsd, 650);

  const invalidContextResponse = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "계속 찾아줘",
        context: { ...result.criteria, country: "Thailand" },
      }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(invalidContextResponse.status, 400);
  assert.equal(
    (await invalidContextResponse.json()).error.code,
    "INVALID_SEARCH_CONTEXT",
  );
});

test("keeps Vietnam advisor results inside Vietnam", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-vietnam-api`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "베트남에서 매물을 찾아줘" }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {}, },
  );

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.criteria.country, "Vietnam");
  assert.ok(result.matches.length >= 1);
  assert.ok(result.matches.every((asset) => asset.country === "Vietnam"));
  assert.ok(result.citations.every((citation) =>
    result.matches.some((asset) => asset.id === citation.assetId),
  ));
});

test("renders the five-level asset access demo without blockchain purchase language", async () => {
  const response = await render("/assets/GLI-KH-004");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /FREE/);
  assert.match(html, /BASIC/);
  assert.match(html, /STANDARD/);
  assert.match(html, /PREMIUM/);
  assert.match(html, /BUSINESS/);
  assert.match(html, /GLI Cash/);
  assert.match(html, /상위 등급|모든 하위 등급/);
  assert.match(html, /표시 정보는 검토 단계/);
  assert.doesNotMatch(html, />DEMO<|데모 화면|데모 이용|데모 예시/);
  assert.doesNotMatch(html, /Confirm Staking|Staking Amount|Connect Wallet|GLIB/i);
});

test("distinguishes reference fixtures from attributed market data and renders the shared action bar", async () => {
  const response = await render("/assets/GLI-KH-104");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /REFERENCE DATA/);
  assert.doesNotMatch(html, /MARKET DATA/);
  assert.match(html, /detail-action-bar/);
  assert.match(html, /detail-favorite-action/);
});

test("uses a direct asset-card label for opening detailed information", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /상세 정보 확인/);
  assert.doesNotMatch(html, /검증 요약 보기/);
});

test("renders global country controls and the four investment asset categories", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /전체 국가/);
  assert.match(html, /캄보디아/);
  assert.match(html, /베트남/);
  assert.match(html, /필리핀/);
  assert.match(html, /말레이시아/);
  assert.match(html, /주거용/);
  assert.match(html, /상업용/);
  assert.match(html, /레저/);
  assert.match(html, /프로젝트/);
  assert.match(html, /GLI 직접 발굴 사업 기회/);
});

test("publishes partner assets at their stated document reference point", async () => {
  const response = await render("/assets/GLI-PT-MY-510");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Pavilion Square/);
  assert.match(html, /GLI 검증/);
  assert.doesNotMatch(html, /자료 기준|등록 근거|자료 작성 시점/);
  assert.doesNotMatch(html, /Pavilion Square 프로젝트 브리프·GLI 게시 승인/);
  assert.doesNotMatch(html, /관리자 전용|공개 보류/);
});

test("lists document-dated partner opportunities across the requested categories", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Orchard Grand at Sycamore/);
  assert.match(html, /RLC Philippines Residential Portfolio/);
  assert.match(html, /Golden Crown Residence/);
  assert.match(html, /GLI 검증/);
  assert.doesNotMatch(html, /자료 기준 ·|자료 작성 시점|문서 시점 포트폴리오/);

  const projectResponse = await render("/assets/GLI-PJ-VN-504");
  const projectHtml = await projectResponse.text();
  assert.match(projectHtml, /Thu Thiem Lots 4-26 &amp; 3-14 Development/);
  assert.match(projectHtml, /프로젝트/);
  assert.doesNotMatch(projectHtml, /2023년 사업계획 기준|자료 기준|등록 근거/);
});

test("renders the Golden Crown compact range and official multi-image gallery", async () => {
  const response = await render("/assets/GLI-PT-MY-509");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /RM 1,352K~3,174K/);
  assert.match(html, /aria-label="8번 사진 보기"/);
  assert.match(html, /golden-crown\/facade\.jpg/);
  assert.match(html, /golden-crown\/pool\.jpg/);
  assert.match(html, /공개 웹 자료/);
  assert.doesNotMatch(html, /사진 출처/);
  assert.match(html, /gsklproperty\.com\/portfolio\/golden-crown-residence/);
  assert.match(html, /detail-review-grid/);
  assert.match(html, /detail-action-grid/);
});

test("renders category-specific facts for a GLI curated project", async () => {
  const response = await render("/assets/GLI-PJ-KH-401");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /GLI 추천/);
  assert.match(html, /프로젝트/);
  assert.match(html, /사업 참여/);
  assert.match(html, /예상 일정/);
  assert.doesNotMatch(html, />침실</);
  assert.doesNotMatch(html, />욕실</);
});

test("renders the information center navigation and GLI whitepaper link", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /안내센터/);
  assert.match(html, /href="\/notices"/);
  assert.match(html, /href="\/news"/);
  assert.match(html, /가이드 &amp; FAQ/);
  assert.match(html, /파트너스/);
  assert.match(html, /href="\/whitepaper\/gli-whitepaper\.html"/);
  assert.match(html, /GLI 백서/);
});

test("renders the GLI newsroom content and filters", async () => {
  const response = await render("/news");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /GLI NEWSROOM/);
  assert.match(html, /전체보기/);
  assert.match(html, /보도자료/);
  assert.match(html, /Seafood Club/);
  assert.match(html, /RLC/);
  assert.match(html, /href="\/news\/33d997d3-5984-4554-b3be-5fd9ddf41b00"/);
});

test("renders a linked insight article in the GLI detail layout", async () => {
  const response = await render(
    "/news/33d997d3-5984-4554-b3be-5fd9ddf41b00",
  );
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /인사이트/);
  assert.match(html, /베트남/);
  assert.match(html, /기사 원문 보기/);
  assert.match(html, /https:\/\/www\.facebook\.com/);
});

test("renders the notice-board sample and guide construction page", async () => {
  const noticeResponse = await render("/notices");
  assert.equal(noticeResponse.status, 200);
  const noticeHtml = await noticeResponse.text();
  assert.match(noticeHtml, /주요 공지/);
  assert.match(noticeHtml, /서비스 이용약관 개정 사전 안내/);

  const guideResponse = await render("/coming-soon?section=guide");
  assert.equal(guideResponse.status, 200);
  const guideHtml = await guideResponse.text();
  assert.match(guideHtml, /가이드 &amp; FAQ/);
  assert.match(guideHtml, /페이지 준비 중/);
});
