import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { LICENSED_JSON_REQUESTED_FIELDS } from "../ingestion/licensed-json-feed.ts";
import { env as cloudflareEnv } from "./support/cloudflare-workers-shim.mjs";
import { createD1DiscoveryRepository } from "../db/discovery-repository.ts";
import { assets as approvedAssets } from "../lib/assets.ts";

const APP_ORIGIN = "http://localhost";
const MEMBER_EMAIL = "member.e2e@gli.example";
const ADMIN_EMAIL = "admin.e2e@gli.example";

test('public build rejects local mock login and synthetic identity cookies',async t=>{
  const worker=await loadWorker();const {database,sqlite}=await createDatabase();t.after(()=>sqlite.close());
  const local={LOCAL_AUTH_PREVIEW_ENABLED:'true'};
  const staffCookie='gli_local_member_preview=local-staff-12345678-1234-4123-8123-123456789abc';
  const google=await dispatch(worker,database,'/api/auth/preview?provider=google',
    {method:'POST',headers:{origin:APP_ORIGIN},runtimeEnv:{...local,DEPLOYMENT_STAGE:'demo'}});
  assert.equal(google.status,403);assert.equal(google.headers.get('set-cookie'),null);
  const blocked=await dispatch(worker,database,'/api/auth/preview?provider=google',
    {method:'POST',headers:{origin:APP_ORIGIN},runtimeEnv:{...local,DEPLOYMENT_STAGE:'production'}});
  assert.equal(blocked.status,403);assert.equal(blocked.headers.get('set-cookie'),null);
  const cross=await dispatch(worker,database,'/api/auth/preview?provider=google',
    {method:'POST',headers:{origin:'https://other.test'},runtimeEnv:local});
  assert.equal(cross.status,403);
  const publicCookie=await dispatch(worker,database,'/api/me',{headers:{cookie:staffCookie},runtimeEnv:{...local,DEPLOYMENT_STAGE:'demo'}});
  assert.equal(publicCookie.status,401);
});

class SQLiteD1Statement {
  constructor(sqlite, sql) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.bindings = [];
  }

  bind(...values) {
    this.bindings = values;
    return this;
  }

  async first() {
    return this.sqlite.prepare(this.sql).get(...this.bindings) ?? null;
  }

  async all() {
    return {
      results: this.sqlite.prepare(this.sql).all(...this.bindings),
      success: true,
    };
  }

  async run() {
    if (/\bRETURNING\b/i.test(this.sql)) {
      const results=this.sqlite.prepare(this.sql).all(...this.bindings);
      return {success:true,results,meta:{changes:results.length}};
    }
    const result = this.sqlite.prepare(this.sql).run(...this.bindings);
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    return new SQLiteD1Statement(this.sqlite, sql);
  }

  async batch(statements) {
    const prior=this.queue ?? Promise.resolve();
    let release;
    this.queue=new Promise(resolve=>{release=resolve;});
    await prior;
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    } finally {release();}
  }
}

async function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const file of migrationFiles) {
    const sql = await readFile(new URL(file, migrationDirectory), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      sqlite.exec(statement);
    }
  }

  return { database: new SQLiteD1(sqlite), sqlite };
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("deployment-workflows", `${process.pid}`);
  return (await import(workerUrl.href)).default;
}

test("built search accepts long prior answers without spending in rules mode", async t => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();
  t.after(() => sqlite.close());
  const upstream = t.mock.method(globalThis, "fetch", async url => {
    assert.equal(String(url), "https://open.er-api.com/v6/latest/USD");
    return Response.json({result:"success",rates:{USD:1,KRW:1380},time_last_update_unix:Math.floor(Date.now()/1000)});
  });
  const response = await dispatch(worker, database, "/api/search", {
    method: "POST", body: { query: "베트남 물건 찾아줘", conversation: [{ role: "assistant", text: "이전 상담 내용 ".repeat(400) }] },
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.criteria.country, "Vietnam");
  assert.deepEqual(result.operationalAccess, { limited: false, unavailable: false });
  assert.equal(upstream.mock.calls.filter(call => String(call.arguments[0]) !== "https://open.er-api.com/v6/latest/USD").length, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM ai_operation_requests").get().n, 0);
});

test("built search meters failed Gemini discovery and blocks dispatch at global cap", async t => {
  const { database, sqlite } = await createDatabase();
  t.after(() => sqlite.close());
  const configuration = {
    LLM_PROVIDER: "disabled", GEMINI_API_KEY: "offline-test-only", GEMINI_ADVISOR: "disabled",
    GEMINI_DISCOVERY: "enabled", GEMINI_TRANSLATION: "disabled", LIVE_CAMBODIA_DISCOVERY: "disabled",
  };
  const original = Object.fromEntries(Object.keys(configuration).map(key => [key, process.env[key]]));
  Object.assign(process.env, configuration);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const upstream = t.mock.method(globalThis, "fetch", async url => {
    if (String(url) === "https://open.er-api.com/v6/latest/USD") {
      return Response.json({ result: "success", rates: { USD: 1, KRW: 1380 },
        time_last_update_unix: Math.floor(Date.now() / 1000), time_next_update_unix: Math.floor(Date.now() / 1000) + 86400 });
    }
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\//);
    return Response.json({ usageMetadata: { promptTokenCount: 12, totalTokenCount: 12 } }, { status: 503 });
  });
  // Install interception before vinext captures fetch on worker initialization.
  const worker = await loadWorker();
  const paidCalls = () => upstream.mock.calls.filter(call => String(call.arguments[0]).startsWith("https://generativelanguage.googleapis.com/")).length;
  const request = query => dispatch(worker, database, "/api/search", { method: "POST", runtimeEnv: configuration, body: { query } });
  const first = await request("프놈펜에서 17달러 이하 콘도 매매");
  assert.equal(first.status, 200);
  assert.equal(paidCalls(), 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM ai_operation_requests").get().n, 1);
  assert.equal(sqlite.prepare("SELECT input_tokens FROM ai_provider_calls").get().input_tokens, 12);
  await request("프놈펜에서 17달러 이하 콘도 매매");
  assert.equal(paidCalls(), 1, "failure cooldown avoids a second attempt");
  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const insert = sqlite.prepare("INSERT INTO ai_operation_requests VALUES (?, ?, ?, ?)");
  for (let i = 1; i < 300; i++) insert.run(`filled-${i}`, day, `other-${i}`, Date.now());
  const limited = await request("프놈펜에서 19달러 이하 콘도 매매");
  assert.equal(limited.status, 200);
  assert.equal((await limited.json()).operationalAccess.limited, true);
  assert.equal(paidCalls(), 1, "no paid dispatch after cap");
});

function authHeaders(email) {
  return {
    "oai-authenticated-user-email": email,
    "oai-authenticated-user-full-name": encodeURIComponent(
      email === ADMIN_EMAIL ? "GLI E2E Admin" : "GLI E2E Member",
    ),
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };
}

async function dispatch(worker, database, pathname, options = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.set(
    "accept",
    options.accept ?? (pathname.startsWith("/api/") ? "application/json" : "text/html"),
  );
  if (options.email) {
    for (const [name, value] of Object.entries(authHeaders(options.email))) {
      headers.set(name, value);
    }
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    headers.set("origin", APP_ORIGIN);
  }
  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  const runtimeEnv = {
    DB: database,
    DATA_MODE: "d1",
    DEPLOYMENT_STAGE: "demo",
    DEMO_AUTH_ENABLED: "true",
    DEMO_ADMIN_ENABLED: "false",
    LLM_PROVIDER: "disabled",
    ...options.runtimeEnv,
  };
  Object.assign(cloudflareEnv, runtimeEnv);

  return worker.fetch(
    new Request(`${APP_ORIGIN}${pathname}`, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      ...runtimeEnv,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("built retention APIs preserve external favorites and expose price history only",async t=>{
  t.mock.method(globalThis,"fetch",async()=>{throw new Error("unexpected_network");});
  const worker=await loadWorker();
  const {database,sqlite}=await createDatabase();
  t.after(()=>sqlite.close());
  const asset={...approvedAssets[0],id:"GLI-VN-RETAIN-TEST",country:"Vietnam",countryCode:"VN",sourceName:"Test Portal",
    sourceUrl:"https://example.com/unit/44",trustStatus:"PRELIMINARY",isGliDirect:false};
  const collector=createD1DiscoveryRepository(database);
  await collector.save([asset],"2026-10-01T00:00:00Z");
  await collector.save([{...asset,price:asset.price+100,summary:"Changed original description"}],"2026-10-02T00:00:00Z");
  const price=await dispatch(worker,database,`/api/assets/${asset.id}/price-history`);
  assert.equal(price.status,200);
  const history=await price.json();
  assert.deepEqual(history.entries.map(x=>x.price),[asset.price,asset.price+100]);
  assert.ok(!JSON.stringify(history).includes("Changed original description"));
  assert.ok(!JSON.stringify(history).includes("payload_json"));
  const saved=await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL,method:"POST",body:{assetId:asset.id,userId:"forged"},requestId:"retained.save"});
  assert.equal(saved.status,201);
  assert.equal((await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL})).status,200);
  assert.deepEqual((await (await dispatch(worker,database,"/api/favorites",{email:"other@example.com"})).json()).favorites,[]);
  const fixture="fixture:GLI-KH-004";
  assert.equal((await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL,method:"POST",body:{assetId:fixture}})).status,201);
  const list=await (await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL})).json();
  assert.equal(list.favorites.length,2);
  assert.equal(list.favorites.find(x=>x.referenceId===fixture).detailOrigin,"fixture");
  assert.equal((await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL,method:"DELETE",body:{assetId:asset.id}})).status,200);
  assert.ok(sqlite.prepare("SELECT public_id FROM discovered_assets WHERE public_id=?").get(asset.id));
  assert.equal((await dispatch(worker,database,"/api/favorites",{email:MEMBER_EMAIL,method:"POST",body:{assetId:"GLI-KH-004"}})).status,201);
  sqlite.exec("UPDATE listings SET status='ARCHIVED' WHERE public_id='GLI-KH-004'");
  assert.equal((await dispatch(worker,database,"/api/favorites",{email:"unauthorized@example.com",method:"POST",body:{assetId:"GLI-KH-004"}})).status,400);
  assert.equal((await dispatch(worker,database,"/api/assets/GLI-KH-004/price-history",{email:"unauthorized@example.com"})).status,404);
  assert.equal((await dispatch(worker,database,"/api/assets/GLI-KH-004/price-history",{email:MEMBER_EMAIL})).status,200);
});

test("built member inquiries are authenticated, idempotent and separate from consultation operations",async t=>{
  t.mock.method(globalThis,"fetch",async()=>{throw new Error("unexpected_network");});
  const worker=await loadWorker();const {database,sqlite}=await createDatabase();t.after(()=>sqlite.close());
  const body={submissionKey:"inquiry-e2e-0000000000001",requestText:"Please confirm the property records",contact:"optional contact",assetId:"fixture:GLI-KH-004",userId:"forged",email:"forged@example.com"};
  assert.equal((await dispatch(worker,database,"/api/inquiries",{method:"POST",body})).status,401);
  const first=await dispatch(worker,database,"/api/inquiries",{method:"POST",email:MEMBER_EMAIL,body});
  assert.equal(first.status,201);const receipt=await first.json();assert.match(receipt.receiptNumber,/^GLI-/);
  const again=await dispatch(worker,database,"/api/inquiries",{method:"POST",email:MEMBER_EMAIL,body});
  assert.equal(again.status,200);assert.equal((await again.json()).receiptNumber,receipt.receiptNumber);
  assert.equal(sqlite.prepare("SELECT member_email FROM member_inquiries").get().member_email,MEMBER_EMAIL);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM consultations").get().n,0);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM member_inquiries").get().n,1);
  const page=await dispatch(worker,database,"/my?consult=fixture%3AGLI-KH-004",{email:MEMBER_EMAIL});
  assert.equal(page.status,200);const html=await page.text();
  assert.match(html,/문의 내용/);assert.match(html,/연락처/);assert.match(html,/readonly/);
  assert.doesNotMatch(html,/희망 일시|상담 진행|새로운 상담 소식/);
  assert.equal((await dispatch(worker,database,"/api/inquiries",{method:"POST",email:MEMBER_EMAIL,body:{...body,requestText:""}})).status,400);
  assert.equal((await dispatch(worker,database,"/api/inquiries",{method:"POST",email:MEMBER_EMAIL,body:{...body,assetId:"UNKNOWN-ASSET"}})).status,400);
});

test("built worker completes the member discovery and cash membership journey", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const anonymous = await dispatch(worker, database, "/api/me");
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("cache-control") ?? "", /no-store/);

    const initialDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: MEMBER_EMAIL },
    );
    assert.equal(initialDashboardResponse.status, 200);
    const initialDashboard = await initialDashboardResponse.json();
    assert.equal(initialDashboard.user.email, MEMBER_EMAIL);
    assert.deepEqual(initialDashboard.favorites, []);
    assert.deepEqual(initialDashboard.consultations, []);
    assert.equal(initialDashboard.activeMembership, null);
    assert.equal(initialDashboard.membershipAccess.planId, null);
    assert.equal(initialDashboard.membershipAccess.favoriteLimit, null);
    assert.equal(initialDashboard.membershipAccess.aiMonthlyLimit, 0);
    assert.equal(
      initialDashboard.membershipAccess.consultationPriority,
      "STANDARD",
    );

    const freeSearchResponse = await dispatch(
      worker,
      database,
      "/api/search",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        body: { query: "프놈펜에 임대수익용 콘도를 찾아줘" },
      },
    );
    assert.equal(freeSearchResponse.status, 200);
    const freeSearch = await freeSearchResponse.json();
    assert.equal(freeSearch.membershipAccess.authenticated, true);
    assert.equal(freeSearch.membershipAccess.planId, null);
    assert.equal(freeSearch.membershipAccess.monthlyLimit, 0);
    assert.equal(freeSearch.membershipAccess.deliveredMode, "rules");

    const lockedReportResponse = await dispatch(
      worker,
      database,
      "/api/assets/GLI-KH-004/trust-report",
      { email: MEMBER_EMAIL },
    );
    assert.equal(lockedReportResponse.status, 403);
    assert.equal(
      (await lockedReportResponse.json()).code,
      "MEMBERSHIP_REQUIRED",
    );

    const favoriteResponse = await dispatch(
      worker,
      database,
      "/api/favorites",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.favorite",
        body: { assetId: "GLI-KH-004" },
      },
    );
    assert.equal(favoriteResponse.status, 201);
    assert.deepEqual(await favoriteResponse.json(), {
      created: true,
      listingPublicId: "GLI-KH-004",
    });

    const favoriteList = await dispatch(worker, database, "/api/favorites", { email: MEMBER_EMAIL });
    assert.equal(favoriteList.status, 200);
    assert.match(favoriteList.headers.get("cache-control") ?? "", /no-store/);
    assert.equal((await favoriteList.json()).favorites[0].publicId, "GLI-KH-004");
    const otherFavorites = await dispatch(worker, database, "/api/favorites", { email: "other.favorite@gli.example" });
    assert.deepEqual((await otherFavorites.json()).favorites, []);
    assert.equal((await dispatch(worker, database, "/api/favorites")).status, 401);

    const duplicateFavoriteResponse = await dispatch(
      worker,
      database,
      "/api/favorites",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.favorite.repeat",
        body: { assetId: "GLI-KH-004" },
      },
    );
    assert.equal(duplicateFavoriteResponse.status, 200);
    assert.equal((await duplicateFavoriteResponse.json()).created, false);

    const consultationResponse = await dispatch(
      worker,
      database,
      "/api/consultations",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.consultation",
        body: {
          assetId: "GLI-KH-004",
          requestText:
            "Please verify rental demand, management fees, and title documents.",
        },
      },
    );
    assert.equal(consultationResponse.status, 201);
    const consultation = await consultationResponse.json();
    assert.equal(consultation.listingPublicId, "GLI-KH-004");
    assert.equal(consultation.status, "RECEIVED");
    assert.equal(consultation.priority, "STANDARD");

    const memberMessageResponse = await dispatch(
      worker,
      database,
      `/api/consultations/${consultation.id}/messages`,
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.consultation.member-message",
        body: {
          message: "Please also confirm the latest management fee.",
        },
      },
    );
    assert.equal(memberMessageResponse.status, 201);
    assert.equal(
      (await memberMessageResponse.json()).result.eventType,
      "MEMBER_MESSAGE",
    );

    const adminDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: ADMIN_EMAIL },
    );
    assert.equal(adminDashboardResponse.status, 200);
    sqlite
      .prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?")
      .run(ADMIN_EMAIL);

    const operatorMessageResponse = await dispatch(
      worker,
      database,
      `/api/admin/consultations/${consultation.id}/messages`,
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.consultation.operator-message",
        body: {
          message: "We are checking the invoice with the local partner.",
        },
      },
    );
    assert.equal(operatorMessageResponse.status, 201);
    assert.equal(
      (await operatorMessageResponse.json()).result.eventType,
      "OPERATOR_MESSAGE",
    );

    const consultationPageResponse = await dispatch(
      worker,
      database,
      `/my/consultations/${consultation.id}`,
      { email: MEMBER_EMAIL },
    );
    assert.equal(consultationPageResponse.status, 200);
    const consultationPageHtml = await consultationPageResponse.text();
    assert.match(consultationPageHtml, /latest management fee/);
    assert.match(consultationPageHtml, /local partner/);

    const notificationDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: MEMBER_EMAIL },
    );
    assert.equal(notificationDashboardResponse.status, 200);
    const notificationDashboard =
      await notificationDashboardResponse.json();
    assert.equal(notificationDashboard.unreadNotificationCount, 1);
    assert.equal(notificationDashboard.notifications.length, 1);
    assert.equal(
      notificationDashboard.notifications[0].kind,
      "CONSULTATION_REPLY",
    );

    const readNotificationResponse = await dispatch(
      worker,
      database,
      `/api/notifications/${notificationDashboard.notifications[0].id}/read`,
      {
        method: "PATCH",
        email: MEMBER_EMAIL,
        requestId: "e2e.notification.read",
        body: {},
      },
    );
    assert.equal(readNotificationResponse.status, 200);
    assert.ok((await readNotificationResponse.json()).result.readAt > 0);

    const checkoutResponse = await dispatch(
      worker,
      database,
      "/api/memberships/checkout",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.checkout",
        body: { planId: "investor" },
      },
    );
    assert.equal(checkoutResponse.status, 201);
    const checkoutPayload = await checkoutResponse.json();
    assert.equal(checkoutPayload.checkout.planId, "investor");
    assert.equal(checkoutPayload.checkout.status, "PENDING");
    assert.equal(checkoutPayload.checkout.provider, "DEMO_CASH");
    assert.match(
      checkoutPayload.checkoutUrl,
      /^\/membership\/checkout\?id=chk_/,
    );

    const confirmResponse = await dispatch(
      worker,
      database,
      "/api/memberships/checkout/confirm",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.checkout.confirm",
        body: { checkoutId: checkoutPayload.checkout.id },
      },
    );
    assert.equal(confirmResponse.status, 200);
    const confirmation = await confirmResponse.json();
    assert.equal(confirmation.charged, false);
    assert.equal(confirmation.checkout.status, "COMPLETED");
    assert.equal(confirmation.membership.planId, "investor");
    assert.equal(confirmation.membership.status, "ACTIVE");

    const investorSearchResponse = await dispatch(
      worker,
      database,
      "/api/search",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        body: { query: "BKK1 투자 후보를 다시 비교해줘" },
      },
    );
    assert.equal(investorSearchResponse.status, 200);
    const investorSearch = await investorSearchResponse.json();
    assert.equal(investorSearch.membershipAccess.planId, "investor");
    assert.equal(investorSearch.membershipAccess.monthlyLimit, 150);
    assert.equal(investorSearch.membershipAccess.deliveredMode, "rules");
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM membership_usage_counters WHERE user_id = ?",
        )
        .get(initialDashboard.user.id).count,
      0,
    );

    const reportResponse = await dispatch(
      worker,
      database,
      "/api/assets/GLI-KH-004/trust-report",
      { email: MEMBER_EMAIL },
    );
    assert.equal(reportResponse.status, 200);
    assert.match(reportResponse.headers.get("cache-control") ?? "", /no-store/);
    const reportAccess = await reportResponse.json();
    assert.equal(reportAccess.granted, true);
    assert.equal(reportAccess.membershipPlanId, "investor");
    assert.equal(reportAccess.report.listingPublicId, "GLI-KH-004");
    assert.equal(reportAccess.report.ruleVersion, "trust-v0.1-fixture");
    assert.equal(reportAccess.report.sourceCount, 1);
    assert.equal(reportAccess.report.humanApproved, false);
    assert.equal(reportAccess.report.evidence.length, 6);

    const reportPageResponse = await dispatch(
      worker,
      database,
      "/assets/GLI-KH-004/trust-report",
      { email: MEMBER_EMAIL },
    );
    assert.equal(reportPageResponse.status, 200);
    const reportPageHtml = await reportPageResponse.text();
    assert.match(reportPageHtml, /GLI FULL TRUST REPORT/);
    assert.match(reportPageHtml, /trust-v0\.1-fixture/);
    assert.match(reportPageHtml, /PDF로 저장/);

    const finalDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: MEMBER_EMAIL },
    );
    assert.equal(finalDashboardResponse.status, 200);
    const finalDashboard = await finalDashboardResponse.json();
    assert.equal(finalDashboard.favorites.length, 1);
    assert.equal(finalDashboard.favorites[0].publicId, "GLI-KH-004");
    assert.equal(finalDashboard.consultations.length, 1);
    assert.equal(finalDashboard.consultations[0].status, "RECEIVED");
    assert.equal(finalDashboard.activeMembership.planId, "investor");
    assert.equal(finalDashboard.membershipAccess.planId, "investor");
    assert.equal(finalDashboard.membershipAccess.favoriteLimit, null);
    assert.equal(finalDashboard.membershipAccess.aiMonthlyLimit, 150);
    assert.equal(
      finalDashboard.membershipAccess.consultationPriority,
      "PRIORITY",
    );
    assert.equal(finalDashboard.membershipAccess.fullTrustReport, true);
    assert.equal(finalDashboard.notifications.length, 1);
    assert.equal(finalDashboard.unreadNotificationCount, 0);

    const myPageResponse = await dispatch(worker, database, "/my", {
      email: MEMBER_EMAIL,
    });
    assert.equal(myPageResponse.status, 200);
    const myPageHtml = await myPageResponse.text();
    assert.match(myPageHtml, /MEMBERSHIP ACCESS/);
    assert.match(myPageHtml, /무제한/);
    assert.match(myPageHtml, /열람 범위/);
    assert.match(myPageHtml, /STANDARD/);
    assert.doesNotMatch(myPageHtml, /상담 진행|새로운 상담 소식/);
    assert.match(myPageHtml, /GLI-KH-004/);
    assert.match(myPageHtml, /Investor/);

    const auditActions = sqlite
      .prepare(
        `SELECT action
         FROM audit_logs
         WHERE request_id LIKE 'e2e.%'
         ORDER BY id ASC`,
      )
      .all()
      .map((row) => row.action);
    assert.deepEqual(auditActions, [
      "FAVORITE_ADDED",
      "CONSULTATION_CREATED",
      "CONSULTATION_MESSAGE_ADDED",
      "CONSULTATION_MESSAGE_ADDED",
      "MEMBER_NOTIFICATION_READ",
      "CASH_CHECKOUT_CREATED",
      "DEMO_CASH_MEMBERSHIP_ACTIVATED",
      "CASH_CHECKOUT_COMPLETED",
    ]);
  } finally {
    sqlite.close();
  }
});

test("built worker keeps the full Trust Report outside the Explore plan", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const dashboardResponse = await dispatch(worker, database, "/api/me", {
      email: MEMBER_EMAIL,
    });
    assert.equal(dashboardResponse.status, 200);
    const dashboard = await dashboardResponse.json();
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO memberships (
           id, user_id, plan_id, provider,
           provider_customer_id, provider_subscription_id,
           status, period_start, period_end, created_at, updated_at
         ) VALUES (?, ?, 'explore', 'PAYMENT_TEST', NULL, NULL, 'ACTIVE', ?, ?, ?, ?)`,
      )
      .run(
        "mem_explore_e2e",
        dashboard.user.id,
        now,
        now + 30 * 24 * 60 * 60 * 1000,
        now,
        now,
      );

    const reportResponse = await dispatch(
      worker,
      database,
      "/api/assets/GLI-KH-004/trust-report",
      { email: MEMBER_EMAIL },
    );
    assert.equal(reportResponse.status, 403);
    const denial = await reportResponse.json();
    assert.equal(denial.code, "PLAN_UPGRADE_REQUIRED");
    assert.equal(denial.membershipPlanId, "explore");

    const reportPageResponse = await dispatch(
      worker,
      database,
      "/assets/GLI-KH-004/trust-report",
      { email: MEMBER_EMAIL },
    );
    assert.equal(reportPageResponse.status, 200);
    const reportPageHtml = await reportPageResponse.text();
    assert.match(reportPageHtml, /Investor/);
    assert.doesNotMatch(reportPageHtml, /trust-v0\.1-fixture/);
  } finally {
    sqlite.close();
  }
});

test("built worker disables no-charge billing outside the demo environment", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const response = await dispatch(
      worker,
      database,
      "/api/memberships/checkout",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        body: { planId: "investor" },
        runtimeEnv: {
          DEPLOYMENT_STAGE: "production",
          DEMO_AUTH_ENABLED: "false",
        },
      },
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "DEMO_BILLING_DISABLED");
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS count FROM cash_checkout_sessions")
        .get().count,
      0,
    );

    const directActivation = await dispatch(
      worker,
      database,
      "/api/memberships/demo",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        body: { planId: "investor" },
        runtimeEnv: {
          DEPLOYMENT_STAGE: "production",
          DEMO_AUTH_ENABLED: "false",
        },
      },
    );
    assert.equal(directActivation.status, 503);
    assert.equal(
      (await directActivation.json()).code,
      "DEMO_BILLING_DISABLED",
    );
    assert.equal(
      sqlite.prepare("SELECT count(*) AS count FROM memberships").get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test("built worker enforces admin boundaries and records release evidence", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const memberExport = await dispatch(
      worker,
      database,
      "/api/admin/audit/export",
      { email: ADMIN_EMAIL },
    );
    assert.equal(memberExport.status, 403);
    assert.equal((await memberExport.json()).code, "ADMIN_REQUIRED");

    sqlite
      .prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?")
      .run(ADMIN_EMAIL);

    const now = Date.now();
    const backupResponse = await dispatch(
      worker,
      database,
      "/api/admin/readiness/backups",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.backup",
        body: {
          environment: "STAGING",
          storageProvider: "R2",
          objectKey: "backups/e2e/staging.sqlite",
          manifestSha256: "a".repeat(64),
          capturedAt: now - 60_000,
          restoreTestedAt: now - 30_000,
          restoreResult: "SUCCEEDED",
          notes: "Automated deployment workflow verification.",
        },
      },
    );
    assert.equal(backupResponse.status, 200);
    const backup = (await backupResponse.json()).result;
    assert.equal(backup.environment, "STAGING");
    assert.equal(backup.restoreResult, "SUCCEEDED");
    assert.equal(backup.recordCounts.listings, 8);

    const aiEvaluationResponse = await dispatch(
      worker,
      database,
      "/api/admin/readiness/ai-evaluation",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.ai-evaluation",
        body: { mode: "rules" },
      },
    );
    assert.equal(aiEvaluationResponse.status, 200);
    const aiEvaluationPayload = await aiEvaluationResponse.json();
    assert.equal(aiEvaluationPayload.persisted, true);
    assert.equal(aiEvaluationPayload.result.status, "SUCCEEDED");
    assert.equal(aiEvaluationPayload.result.passedCount, 5);
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS count FROM ai_evaluation_runs")
        .get().count,
      1,
    );

    const auditExport = await dispatch(
      worker,
      database,
      "/api/admin/audit/export?category=OPERATIONS",
      { email: ADMIN_EMAIL },
    );
    assert.equal(auditExport.status, 200);
    assert.match(
      auditExport.headers.get("content-disposition") ?? "",
      /^attachment; filename="gli-audit-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    assert.match(auditExport.headers.get("content-type") ?? "", /^text\/csv/);
    const csv = await auditExport.text();
    assert.match(csv, /BACKUP_EVIDENCE_RECORDED/);
    assert.doesNotMatch(csv, /authorization|api.?key|private.?key/i);

    const readinessPage = await dispatch(
      worker,
      database,
      "/admin/readiness",
      { email: ADMIN_EMAIL },
    );
    assert.equal(readinessPage.status, 200);
    const readinessHtml = await readinessPage.text();
    assert.match(readinessHtml, /PILOT READINESS/);
    assert.match(readinessHtml, /AUTOMATED EVIDENCE/);
    assert.match(readinessHtml, /AI QUALITY EVIDENCE/);
    assert.match(readinessHtml, /BACKUP &amp; RESTORE/);

    const evidenceAudit = sqlite
      .prepare(
        `SELECT action, request_id AS requestId
         FROM audit_logs
         WHERE action = 'BACKUP_EVIDENCE_RECORDED'`,
      )
      .get();
    assert.equal(evidenceAudit.action, "BACKUP_EVIDENCE_RECORDED");
    assert.equal(evidenceAudit.requestId, "e2e.backup");
    const aiEvidenceAudit = sqlite
      .prepare(
        `SELECT action, request_id AS requestId
         FROM audit_logs
         WHERE action = 'AI_EVALUATION_RECORDED'`,
      )
      .get();
    assert.equal(aiEvidenceAudit.action, "AI_EVALUATION_RECORDED");
    assert.equal(aiEvidenceAudit.requestId, "e2e.ai-evaluation");
  } finally {
    sqlite.close();
  }
});

test("built worker imports an authorized partner file into the review queue", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();
  const rawWrites = [];

  try {
    const dashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: ADMIN_EMAIL },
    );
    assert.equal(dashboardResponse.status, 200);
    const adminUserId = (await dashboardResponse.json()).user.id;
    sqlite
      .prepare("UPDATE users SET role = 'ADMIN' WHERE id = ?")
      .run(adminUserId);

    const now = Date.now();
    sqlite
      .prepare(`
        UPDATE sources
        SET approval_status = 'APPROVED',
            permitted_fields_json = ?,
            connector_kind = 'LICENSED_JSON_V1',
            connector_config_json = ?,
            allowed_hosts_json = ?,
            max_records_per_run = 25,
            approval_reference = 'E2E licensed partner agreement',
            approved_by_user_id = ?,
            policy_reviewed_at = ?,
            approved_at = ?,
            approval_expires_at = ?,
            updated_at = ?
        WHERE slug = 'realestate-kh'
      `)
      .run(
        JSON.stringify(LICENSED_JSON_REQUESTED_FIELDS),
        JSON.stringify({
          feedUrl: "https://feeds.partner.example/v1/listings",
          authorizationSecretName: null,
        }),
        JSON.stringify(["feeds.partner.example"]),
        adminUserId,
        now,
        now,
        now + 86_400_000,
        now,
      );

    const feed = {
      schemaVersion: "gli.partner-listings.v1",
      sourceSlug: "realestate-kh",
      generatedAt: new Date(now).toISOString(),
      listings: [
        {
          externalId: "partner-e2e-301",
          country: "Cambodia",
          city: "Phnom Penh",
          district: "BKK1",
          transaction: "rent",
          propertyType: "condo",
          price: 720,
          currency: "USD",
          areaSqm: 58,
          bedrooms: 1,
          bathrooms: 1,
          imageUrl:
            "https://feeds.partner.example/images/partner-e2e-301.jpg",
          title: "Licensed BKK1 partner residence",
          summary:
            "Structured partner material awaiting GLI verification and publication.",
          sourceUrl:
            "https://feeds.partner.example/listings/partner-e2e-301",
          observedAt: new Date(now).toISOString(),
        },
      ],
    };
    const importResponse = await dispatch(
      worker,
      database,
      "/api/admin/ingestion/import",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.partner-import",
        body: {
          sourceSlug: "realestate-kh",
          feedText: JSON.stringify(feed),
        },
        runtimeEnv: {
          FILES: {
            async put(...args) {
              rawWrites.push(args);
            },
          },
        },
      },
    );
    assert.equal(importResponse.status, 200);
    const result = (await importResponse.json()).result;
    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.acceptedCount, 1);
    assert.equal(result.rejectedCount, 0);
    assert.equal(rawWrites.length, 1);
    assert.equal(
      rawWrites[0][2].customMetadata.collectionMode,
      "manual-upload",
    );

    const csvRecord = {
      ...feed.listings[0],
      externalId: "partner-e2e-302",
      price: 810,
      areaSqm: 61,
      title: "Licensed CSV Tonle Bassac residence",
      sourceUrl:
        "https://feeds.partner.example/listings/partner-e2e-302",
    };
    const csvText = [
      LICENSED_JSON_REQUESTED_FIELDS.join(","),
      LICENSED_JSON_REQUESTED_FIELDS.map((field) =>
        String(csvRecord[field] ?? ""),
      ).join(","),
    ].join("\r\n");
    const csvImportResponse = await dispatch(
      worker,
      database,
      "/api/admin/ingestion/import",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.partner-csv-import",
        body: {
          sourceSlug: "realestate-kh",
          feedFormat: "csv",
          feedText: csvText,
        },
        runtimeEnv: {
          FILES: {
            async put(...args) {
              rawWrites.push(args);
            },
          },
        },
      },
    );
    assert.equal(csvImportResponse.status, 200);
    const csvResult = (await csvImportResponse.json()).result;
    assert.equal(csvResult.acceptedCount, 1);
    assert.equal(csvResult.rejectedCount, 0);
    assert.match(rawWrites[1][0], /\.csv$/);
    assert.equal(rawWrites[1][2].customMetadata.feedFormat, "csv");

    const privateCsvText = csvText
      .replace("partner-e2e-302", "partner-e2e-303")
      .replace("price,810", "price,820")
      .replace(
        "Structured partner material awaiting GLI verification and publication.",
        "Call +855 12 345 678 for private contact details.",
      );
    const privateImportResponse = await dispatch(
      worker,
      database,
      "/api/admin/ingestion/import",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.partner-csv-private-rejection",
        body: {
          sourceSlug: "realestate-kh",
          feedFormat: "csv",
          feedText: privateCsvText,
        },
        runtimeEnv: {
          FILES: {
            async put(...args) {
              rawWrites.push(args);
            },
          },
        },
      },
    );
    assert.equal(privateImportResponse.status, 200);
    const privateResult = (await privateImportResponse.json()).result;
    assert.equal(privateResult.acceptedCount, 0);
    assert.equal(privateResult.rejectedCount, 1);

    const importedListing = sqlite
      .prepare(`
        SELECT title, status
        FROM listings
        WHERE title = 'Licensed BKK1 partner residence'
      `)
      .get();
    assert.equal(importedListing.status, "REVIEW_PENDING");
    assert.equal(
      sqlite
        .prepare(`
          SELECT count(*) AS count
          FROM raw_snapshots
          WHERE ingestion_run_id = ?
        `)
        .get(result.runId).count,
      1,
    );

    const importedIdentity = sqlite
      .prepare(
        `SELECT public_id AS publicId
         FROM listings
         WHERE title = 'Licensed BKK1 partner residence'`,
      )
      .get();
    const incompleteReview = await dispatch(
      worker,
      database,
      "/api/admin/listings/review",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        body: {
          publicId: importedIdentity.publicId,
          action: "PUBLISH",
          evidence: {
            sourceRightsConfirmed: true,
            factsCrossChecked: false,
            publicCopyReviewed: true,
            limitationsRecorded: true,
            note:
              "The price still needs to be checked against the licensed source material.",
          },
        },
      },
    );
    assert.equal(incompleteReview.status, 400);

    const reviewPage = await dispatch(
      worker,
      database,
      `/admin/listings/${importedIdentity.publicId}`,
      { email: ADMIN_EMAIL },
    );
    assert.equal(reviewPage.status, 200);
    const reviewHtml = await reviewPage.text();
    assert.match(reviewHtml, /LISTING DUE DILIGENCE/);
    assert.match(reviewHtml, /DECISION LEDGER/);
    assert.match(reviewHtml, /검토 체크리스트/);

    const completedReview = await dispatch(
      worker,
      database,
      "/api/admin/listings/review",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.listing-review",
        body: {
          publicId: importedIdentity.publicId,
          action: "PUBLISH",
          evidence: {
            sourceRightsConfirmed: true,
            factsCrossChecked: true,
            publicCopyReviewed: true,
            limitationsRecorded: true,
            note:
              "Licensed source rights and normalized public facts were checked; title verification remains a stated next action.",
          },
        },
      },
    );
    assert.equal(completedReview.status, 200);
    assert.equal((await completedReview.json()).result.status, "ACTIVE");
    assert.equal(
      sqlite
        .prepare(
          `SELECT count(*) AS count
           FROM listing_review_decisions
           WHERE listing_id = (
             SELECT id FROM listings WHERE public_id = ?
           )`,
        )
        .get(importedIdentity.publicId).count,
      1,
    );

    sqlite
      .prepare(
        "UPDATE sources SET approval_status = 'SUSPENDED' WHERE slug = 'realestate-kh'",
      )
      .run();
    const blockedResponse = await dispatch(
      worker,
      database,
      "/api/admin/ingestion/import",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        body: {
          sourceSlug: "realestate-kh",
          feedText: JSON.stringify(feed),
        },
        runtimeEnv: {
          FILES: { async put() {} },
        },
      },
    );
    assert.equal(blockedResponse.status, 409);
    assert.equal((await blockedResponse.json()).code, "NOT_APPROVED");
    assert.equal(rawWrites.length, 3);
  } finally {
    sqlite.close();
  }
});
