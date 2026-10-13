"use client";

// GLI-SPEC: GS-001 GS-006 GS-015 GS-016 GS-018 GS-020 GS-023 GS-024.
// See docs/implementation/CURRENT-STATE.md before wiring remaining demo actions.
// Preserve approved visuals; local paid/favorite state is not backend authority.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ConsultationPanel, type ConsultationHandle } from "./consultation-panel";
import { CONSULTATION_REASON_ICONS } from "../generated/claude-consultation-icons";
import { candidateConverted, candidatePrice, displayResult, localizeDemoResult, localizeDemoTurn, trustGrade, type Candidate, type RuntimeTurn, type SearchPayload } from "../../lib/consultation-view";
import { boundConversation } from "../../lib/conversation-context";
import { candidateLocation } from "../../lib/location-display";
import { bedroomLabel } from "../../lib/asset-basic-info";
import { RESULT_SORT_KEY, resultSortMode, sortResultItems } from "../../lib/result-sort";
import { RESULT_VIEW_KEY, resultViewMode, resultFilterPath, matchesResultFilters, countryCode } from "../../lib/result-controls";
import { favoriteCandidate, readFavorites, writeFavorite } from "../../lib/favorite-client";
import { EXPLORE_RETURN_KEY, EXPLORE_STATE_MAX_AGE_MS, rememberExploreResult } from "../../lib/explore-session";
import { BackToResultsButton } from "../assets/[id]/back-to-results-button";
import { AccessPreviewDialog } from "./access-preview-dialog";
import { PaymentPreviewDialog } from "./payment-preview-dialog";
import type { PaymentPreviewMethod } from "../../lib/payment-preview";
import { ACCESS_PREVIEW_NAMES, accessPreviewTier } from "../../lib/access-preview";
import { useUiLocale } from "./ui-locale-provider";
import { translateUiText } from "../../lib/ui-language";
import {
  CLAUDE_ARTICLE_VIEWS,
  CLAUDE_ASSET_IDS,
  CLAUDE_CHECKOUT_VIEWS,
  CLAUDE_DETAIL_VIEWS,
  CLAUDE_FOOTER_HTML,
  CLAUDE_HEADER_HTML,
  CLAUDE_PAPER_VIEWS,
  CLAUDE_PLAN_VIEWS,
  CLAUDE_SOON_VIEWS,
  CLAUDE_VIEWS,
} from "../generated/claude-static";

type ViewName = keyof typeof CLAUDE_VIEWS;
type BillingCycle = keyof typeof CLAUDE_PLAN_VIEWS;
type PlanId = keyof typeof CLAUDE_CHECKOUT_VIEWS;
type SearchStage = "idle" | "understanding" | "searching" | "reviewing" | "composing" | "complete" | "error";

const NEWS_IDS = [
  "gli-news-iqi-vietnam-mou-2025-12-12",
  "47935be4-bc05-4fe0-9cdd-2f1d8b1cb19c",
  "08ac41f7-15ae-42ab-a275-6afbfb70b8da",
  "gli-news-deemples-mou-2025-12-03",
  "ec77ba82-7abb-44cc-9328-486e1bac695d",
  "ef83059e-5748-4e2c-bf6b-ec8a791e8d68",
  "0547d99f-b44b-4303-add7-6a095c943292",
  "gli-news-global-expansion-2025-10-15",
  "33d997d3-5984-4554-b3be-5fd9ddf41b00",
] as const;

const SEARCH_KEY = "gli:claude-search";
const TURNS_KEY = "gli:claude-turns";
// Keep the approved HTML's live DOM (including focus, selection and IME) across
// shell state updates. Only a different view fragment should replace its nodes.
const ApprovedHtml = memo(function ApprovedHtml({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

const resultCandidateIds = (result: SearchPayload | null) =>
  result?.matches.map((match) => match.id) ?? [];

function describeResultUpdate(previous: SearchPayload | null, next: SearchPayload) {
  if (!previous || next.matches.length === 0) return undefined;
  const previousIds = resultCandidateIds(previous);
  const nextIds = resultCandidateIds(next);
  const unchanged = previousIds.length === nextIds.length
    && previousIds.every((id, index) => id === nextIds[index]);
  if (unchanged) return undefined;
  return previousIds.length === nextIds.length
    ? "조건을 반영해 탐색 결과를 업데이트했습니다."
    : `조건을 반영해 탐색 결과를 업데이트했습니다. 현재 확인 가능한 후보는 ${nextIds.length}건입니다.`;
}

export function ClaudeDesignShell({
  view,
  assetId,
  articleId,
  initialCycle = "monthly",
  initialPlan = "investor",
  initialPaid = false,
  soonSection = "contact",
}: {
  view: ViewName;
  assetId?: string;
  articleId?: string;
  initialCycle?: BillingCycle;
  initialPlan?: PlanId;
  initialPaid?: boolean;
  soonSection?: keyof typeof CLAUDE_SOON_VIEWS;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState(0);
  const [pendingPreview, setPendingPreview] = useState<number | null>(null);
  const [gallery, setGallery] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [doc, setDoc] = useState<keyof typeof CLAUDE_PAPER_VIEWS>("intro");
  const [paid] = useState(initialPaid);
  const [paymentPreviewOpen, setPaymentPreviewOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentPreviewMethod | null>(null);
  const [, setNewsCategory] = useState("전체보기");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchStage, setSearchStage] = useState<SearchStage>("idle");
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [runtimeTurns, setRuntimeTurns] = useState<RuntimeTurn[]>([]);
  const { locale } = useUiLocale();
  const localizedTurns = useMemo(() => runtimeTurns.map(turn => localizeDemoTurn(turn, locale)), [runtimeTurns, locale]);
  const [followupValue, setFollowupValue] = useState("");
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupError, setFollowupError] = useState(false);
  const autoSearchRef = useRef<string | null>(null);
  const consultationRef = useRef<ConsultationHandle>(null);
  const [consultationTarget, setConsultationTarget] = useState<HTMLElement | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Candidate | null>(null);
  const scrollSearchResultsRef = useRef(false);
  const searchStartedAtRef = useRef(0);
  const searchRunRef = useRef(0);
  const searchTimersRef = useRef<number[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);
  const exchangeRateRef = useRef<SearchPayload["rate"]>(undefined);
  const favoriteIdsRef = useRef(new Set<string>());
  const favoriteSavingRef = useRef(new Set<string>());
  const favoriteRefreshRef = useRef(0);

  useEffect(() => {
    const nav = rootRef.current?.querySelector("nav");
    if (!nav) return;
    const close = (except?: HTMLDetailsElement) => {
      nav.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => {
        if (menu !== except && !menu.contains(except ?? null)) menu.open = false;
      });
    };
    const toggle = (event: Event) => {
      const menu = event.target;
      if (menu instanceof HTMLDetailsElement && menu.open) close(menu);
    };
    const outside = (event: PointerEvent) => { if (!nav.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    nav.addEventListener("toggle", toggle, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      nav.removeEventListener("toggle", toggle, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (view === "home" && runtimeTurns.length) {
      window.sessionStorage.setItem(TURNS_KEY, JSON.stringify(runtimeTurns));
    }
  }, [view, runtimeTurns]);

  useEffect(() => {
    if (view !== "home") return;
    let canceled = false;
    // Restore FX for saved results without re-running a paid consultation.
    void fetch("/api/exchange-rates").then(async response => response.ok ? response.json() : null).then(snapshot => {
      if (canceled || !snapshot || snapshot.stale || !Number.isFinite(snapshot.rates?.KRW) || snapshot.rates.KRW <= 0) return;
      const rate = { krwPerUsd: snapshot.rates.KRW, asOf: snapshot.updatedAt, rates: snapshot.rates };
      exchangeRateRef.current = rate;
      setRuntimeTurns(turns => turns.map(turn => turn.result ? { ...turn, result: { ...turn.result, rate } } : turn));
      const stored = window.sessionStorage.getItem(SEARCH_KEY);
      if (stored) applySearchResult(JSON.parse(stored) as SearchPayload);
    }).catch(() => { /* Keep original prices when FX is unavailable. */ });
    return () => { canceled = true; };
    // The restore reads refs only; shell keystrokes must not re-fetch FX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    const abort = () => searchAbortRef.current?.abort();
    window.addEventListener("pagehide", abort);
    return () => {
      abort();
      window.removeEventListener("pagehide", abort);
      searchTimersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, [view]);

  const viewHtml = useMemo(() => {
    if (view === "detail") {
      const id = assetId && assetId in CLAUDE_DETAIL_VIEWS
        ? (assetId as keyof typeof CLAUDE_DETAIL_VIEWS)
        : CLAUDE_ASSET_IDS[0];
      return CLAUDE_DETAIL_VIEWS[id][String(tier) as "0" | "1" | "2" | "3" | "4"];
    }
    if (view === "article") {
      const index = Math.max(0, NEWS_IDS.indexOf(articleId as (typeof NEWS_IDS)[number]));
      return CLAUDE_ARTICLE_VIEWS[String(index) as keyof typeof CLAUDE_ARTICLE_VIEWS];
    }
    if (view === "paper") return CLAUDE_PAPER_VIEWS[doc];
    if (view === "plan") return CLAUDE_PLAN_VIEWS[cycle];
    if (view === "co") {
      return CLAUDE_CHECKOUT_VIEWS[initialPlan][cycle][paid ? "paid" : "pending"];
    }
    if (view === "soon") return CLAUDE_SOON_VIEWS[soonSection];
    return CLAUDE_VIEWS[view];
  }, [articleId, assetId, cycle, doc, initialPlan, paid, soonSection, tier, view]);

  useLayoutEffect(() => {
    const panel = view === "home" ? rootRef.current?.querySelector<HTMLElement>("[data-view='home'] main .panel") : null;
    if (panel) {
      panel.replaceChildren();
      panel.dataset.consult = "true";
      panel.parentElement?.classList.add("consult-sec");
    }
    setConsultationTarget(panel ?? null);
  }, [view, viewHtml]);

  useEffect(() => {
    if (view !== "detail") return;
    const root = rootRef.current;
    const slides = root?.querySelectorAll<HTMLElement>(".gal-img") ?? [];
    const thumbs = root?.querySelectorAll<HTMLElement>(".thumbs button") ?? [];
    const normalized = slides.length ? ((gallery % slides.length) + slides.length) % slides.length : 0;
    slides.forEach((slide) => {
      for (let index = 0; index < 12; index += 1) slide.classList.remove(`g${index}`);
      slide.classList.add(`g${normalized}`);
    });
    thumbs.forEach((thumb, index) => thumb.classList.toggle("on", index === normalized));
  }, [gallery, tier, view, viewHtml]);

  useEffect(() => {
    if(view!=="co")return;
    const button=rootRef.current?.querySelector<HTMLElement>("[data-action='activate']");
    if(button)button.textContent=locale==="en" ? (paymentMethod?"Change payment method":"Choose payment method")
      : paymentMethod?`${paymentMethod} · 결제 수단 변경`:"결제 수단 선택";
  },[view,viewHtml,locale,paymentMethod]);

  function navigate(path: string) {
    searchAbortRef.current?.abort();
    rootRef.current?.querySelectorAll<HTMLDetailsElement>("nav details[open]").forEach(menu => { menu.open = false; });
    if (path.startsWith("/explore")) {
      setLocationSearch(new URL(path, window.location.href).search);
    }
    router.push(path);
  }

  function navigateExploreFilter(param?: string, value?: string) {
    searchAbortRef.current?.abort();
    const path = resultFilterPath(view === "home" ? window.location.search : "", param, value);
    // A filter only changes local state on the explore screen. From other
    // screens it must navigate, not merely change the address bar.
    if (view !== "home") { navigate(path); return; }
    rootRef.current?.querySelectorAll<HTMLDetailsElement>("nav details[open]").forEach(menu => { menu.open = false; });
    window.history.pushState({}, "", path);
    setLocationSearch(new URL(path, window.location.href).search);
  }

  useEffect(() => {
    const syncLocationSearch = () => {
      searchAbortRef.current?.abort();
      setLocationSearch(window.location.search);
    };
    syncLocationSearch();
    window.addEventListener("popstate", syncLocationSearch);
    return () => window.removeEventListener("popstate", syncLocationSearch);
  }, []);

  const searchIsActive = ["understanding", "searching", "reviewing", "composing"].includes(searchStage);
  const searchBusy = searchIsActive || followupLoading;

  useEffect(() => {
    if (!searchIsActive) return;
    const interval = window.setInterval(() => {
      setSearchElapsed(Math.floor((Date.now() - searchStartedAtRef.current) / 1_000));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [searchIsActive]);

  useEffect(() => {
    if (view !== "home") return;
    const root = rootRef.current;
    if (!root) return;

    const hasConsultation = runtimeTurns.some(turn => turn.result);
    const queryInput = root.querySelector<HTMLTextAreaElement>("#q");
    if (queryInput) queryInput.placeholder = hasConsultation
      ? "새로운 질문을 입력하세요"
      : "예: 베트남 호치민에서 1억 5천만 원 정도로 임대수입을 기대할 만한 아파트를 찾아줘";
    const hint = root.querySelector<HTMLElement>(".composer-hint");
    if (hint) hint.textContent = hasConsultation
      ? "여기서 다시 탐색하면 이전 상담은 초기화됩니다. 이어서 질문하려면 아래 상담창을 이용하세요."
      : "조건을 정리하지 않아도 됩니다. 문장으로 쓰시면 GLI AI가 예산·지역·목적·기간을 검색 조건으로 분해합니다.";
    const example = root.querySelector<HTMLElement>("[data-action='pickPrompt']");
    if (example) {
      example.textContent = "베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘";
      example.dataset.q = example.textContent;
    }

    const stageIndex: Record<SearchStage, number> = {
      idle: -1,
      understanding: 0,
      searching: 1,
      reviewing: 2,
      composing: 3,
      complete: 4,
      error: -1,
    };
    const current = stageIndex[searchStage];
    const steps = root.querySelectorAll<HTMLElement>(".pipe .pipe-step");
    steps.forEach((step, index) => {
      step.classList.remove("is-active", "is-done", "is-error");
      if (searchStage === "error" && index === 0) step.classList.add("is-error");
      else if (current > index) step.classList.add("is-done");
      else if (current === index) step.classList.add("is-active");
      const number = step.querySelector<HTMLElement>(".pipe-n");
      if (number) number.textContent = current > index ? "✓" : String(index + 1);
    });

    const labels: Record<SearchStage, string> = {
      idle: "질문을 입력하면 탐색 단계가 표시됩니다",
      understanding: "질문에서 국가·도시·예산·목적을 정리하고 있습니다",
      searching: "외부 출처와 GLI 보유 자산을 탐색하고 있습니다",
      reviewing: searchElapsed >= 15
        ? "외부 출처의 최신 매물과 후보 근거를 계속 확인하고 있습니다"
        : "후보의 조건과 자료 근거를 비교하고 있습니다",
      composing: "확인된 후보를 답변과 자산 카드로 정리하고 있습니다",
      complete: `${searchResultCount}건의 후보 탐색을 완료했습니다`,
      error: "탐색을 완료하지 못했습니다. 다시 시도해 주세요",
    };
    const elapsed = searchIsActive ? ` · ${searchElapsed}초` : "";
    const pipe = root.querySelector<HTMLElement>(".pipe");
    let note = pipe?.querySelector<HTMLElement>(".pipe-note") ?? null;
    if (pipe && !note) {
      note = document.createElement("span");
      note.className = "pipe-note";
      pipe.append(note);
    }
    if (note) note.textContent = `${labels[searchStage]}${elapsed}`;

    const mobile = pipe?.querySelector<HTMLElement>(".pipe-mob");
    if (mobile) {
      mobile.classList.toggle("is-error", searchStage === "error");
      mobile.replaceChildren();
      const count = document.createElement("span");
      count.className = "cnt";
      count.textContent = searchStage === "complete" ? "완료" : current >= 0 ? `${Math.min(current + 1, 4)}/4` : "";
      mobile.append(count, labels[searchStage]);
    }

    const button = root.querySelector<HTMLButtonElement>("[data-action='runSearch']");
    if (button) {
      button.disabled = searchBusy;
      button.classList.toggle("is-searching", searchIsActive);
      button.setAttribute("aria-busy", String(searchBusy));
      const textNode = Array.from(button.childNodes).findLast((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = searchIsActive ? "탐색 중" : hasConsultation || searchStage === "complete" ? "다시 탐색" : "탐색";
    }

    const results = root.querySelector<HTMLElement>("[data-results]");
    const grid = results?.querySelector<HTMLElement>(".grid3");
    let loading = results?.querySelector<HTMLElement>("[data-search-loading]") ?? null;
    if (searchIsActive && results && grid && !loading) {
      loading = document.createElement("div");
      loading.className = "search-loading";
      loading.dataset.searchLoading = "true";
      loading.setAttribute("aria-label", "자산 후보를 불러오는 중");
      loading.innerHTML = Array.from({ length: 3 }, () => `
        <div class="search-skeleton" aria-hidden="true">
          <span class="search-skeleton-photo"></span>
          <span class="search-skeleton-line wide"></span>
          <span class="search-skeleton-line"></span>
          <span class="search-skeleton-line short"></span>
        </div>`).join("");
      grid.before(loading);
    }
    if (grid) {
      grid.hidden = searchIsActive;
      grid.setAttribute("aria-busy", String(searchIsActive));
    }
    if (!searchIsActive) loading?.remove();

  }, [searchBusy, searchElapsed, searchIsActive, searchResultCount, searchStage, view, viewHtml, runtimeTurns]);

  function clearSearchTimers() {
    searchTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    searchTimersRef.current = [];
  }

  function scheduleSearchStage(stage: SearchStage, delay: number, runId: number) {
    const timer = window.setTimeout(() => {
      if (searchRunRef.current === runId) setSearchStage(stage);
    }, delay);
    searchTimersRef.current.push(timer);
  }

  function applySearchResult(result: SearchPayload, scrollToResults = false) {
    result = localizeDemoResult(result, locale);
    if (exchangeRateRef.current) result = { ...result, rate: exchangeRateRef.current };
    const root = rootRef.current;
    if (!root) return;
    const idSet = new Set(result.matches.map((match) => match.id));
    root.querySelectorAll("[data-search-dynamic='true']").forEach((card) => card.remove());
    const cards = root.querySelectorAll<HTMLElement>("[data-results] article.card[data-i]");
    cards.forEach((card) => {
      delete card.dataset.searchBound;
      const index = Number(card.dataset.i);
      const id = CLAUDE_ASSET_IDS[index];
      const show = Boolean(id && idSet.has(id));
      card.hidden = !show;
    });
    const grid = root.querySelector<HTMLElement>("[data-results] .grid3");
    for (const match of result.matches) {
      if (!grid) continue;
      const existing = Array.from(cards).find(card => CLAUDE_ASSET_IDS[Number(card.dataset.i)] === match.id);
      // Preserve approved card markup while making visual ordinals match the API.
      if (existing) grid.append(existing);
      else {
        grid.append(createSearchCard(match));
      }
      const card = existing ?? grid.lastElementChild as HTMLElement;
      card.id = `asset-${match.id}`;
      card.dataset.id = match.id;
      card.dataset.searchBound = "true";
      card.dataset.sortDefault = String(result.matches.indexOf(match));
      card.dataset.sourcePublishedAt = match.sourcePublishedAt ?? "";
      card.dataset.resultCountry = countryCode(match.country);
      card.dataset.resultTransaction = match.transaction;
      card.dataset.resultCategory = ["condo", "house", "villa"].includes(match.propertyType ?? "") ? "주거용" : "";
      card.dataset.resultRecommended = "true";
      const label = card.querySelector("h4");
      if (label) label.textContent = match.title;
      const price = card.querySelector(".cprice");
      if (price) price.textContent = candidatePrice(match);
      const converted = card.querySelector(".cprice + span");
      if (converted) converted.textContent = candidateConverted(match, result.rate, locale);
      const headLabel = card.querySelector(".cnums small");
      if (headLabel) headLabel.textContent = match.priceLabel ?? (match.transaction === "rent" ? "월 임대료" : "매매가");
      const grade = card.querySelector(".ctrust b");
      if (grade) grade.textContent = trustGrade(match.trustScore);
      const location = card.querySelector(".loc");
      if (location) {
        Array.from(location.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
        location.append(candidateLocation(match, locale));
      }
      const photo = card.querySelector<HTMLElement>(".photo-img");
      if (photo) { photo.style.backgroundImage = `url(${JSON.stringify(match.image)})`; photo.setAttribute("aria-label", match.title); }
      const rank = document.createElement("span");
      rank.className = "tag rec";
      rank.dataset.resultRank = "true";
      rank.textContent = `추천 ${result.matches.indexOf(match) + 1}위`;
      const tags = card.querySelector(".tagstack");
      if (tags) {
        const txn = document.createElement("span"); txn.className = "tag"; txn.textContent = match.transaction === "rent" ? "임대" : "매매";
        tags.replaceChildren(rank);
        if (match.originLabel || match.sourceName) {
          const origin = document.createElement("span"); origin.className = "tag verified"; origin.textContent = match.originLabel ?? match.sourceName ?? ""; tags.append(origin);
        }
        tags.append(txn);
      }
      card.querySelector(".reason")?.remove();
      const reason = document.createElement("button");
      reason.type = "button";
      reason.className = "reason";
      reason.dataset.action = "askAsset";
      reason.dataset.id = match.id;
      reason.innerHTML = CONSULTATION_REASON_ICONS.join("");
      const reasonText = document.createElement("span");
      reasonText.style.flex = "1";
      reasonText.textContent = match.matchReasons?.join(" · ") || `Trust ${trustGrade(match.trustScore)} 등급 자산`;
      reason.insertBefore(reasonText, reason.lastChild);
      const spec = card.querySelector(".cspec");
      if (spec) spec.textContent = `${match.areaSqm ? `${match.areaSqm}㎡` : "면적 미확인"} · ${bedroomLabel(match.bedrooms)} · ${match.bathrooms === null ? "욕실 미확인" : `${match.bathrooms}Bath`}`;
      if (spec) spec.before(reason);
      else card.querySelector(".cbody")?.append(reason);
    }
    applyResultSort();
    applyResultControls();
    applyFavoriteState();
    const resultSection = root.querySelector<HTMLElement>("[data-results]");
    const title = resultSection?.querySelector("h2");
    if (title) title.textContent = "AI 탐색 결과";
    if (scrollToResults) {
      window.setTimeout(() => resultSection?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  function applyResultSort() {
    const root = rootRef.current;
    const grid = root?.querySelector<HTMLElement>("[data-results] .grid3");
    if (!grid) return;
    const mode = resultSortMode(window.sessionStorage.getItem(RESULT_SORT_KEY));
    const select = root?.querySelector<HTMLSelectElement>("[data-action-change='pickSort']");
    if (select) select.value = mode;
    const items = Array.from(grid.querySelectorAll<HTMLElement>("article.card")).map((card, index) => {
      card.dataset.sortDefault ??= String(index);
      return { card, index: Number(card.dataset.sortDefault),
        grade: card.querySelector(".ctrust b")?.textContent ?? "",
        sourcePublishedAt: card.dataset.sourcePublishedAt };
    });
    sortResultItems(items, mode).forEach(({ card }) => grid.append(card));
  }

  function applyResultControls() {
    const root = rootRef.current;
    if (!root || view !== "home") return;
    const params = new URLSearchParams(window.location.search);
    const mode = resultViewMode(window.sessionStorage.getItem(RESULT_VIEW_KEY));
    root.querySelector("[data-results] .grid3")?.classList.toggle("list", mode === "list");
    for (const action of ["setGrid", "setList"]) {
      root.querySelectorAll<HTMLElement>(`[data-action='${action}']`).forEach(button => {
        const selected = action === (mode === "list" ? "setList" : "setGrid");
        button.classList.toggle("on", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    }
    const country = params.get("country") ?? params.get("cc") ?? "ALL";
    for (const [action, value] of [["pickCountry", country], ["pickTxn", params.get("txn") ?? "ALL"], ["pickCat", params.get("cat") ?? "ALL"]]) {
      root.querySelectorAll<HTMLElement>(`[data-action='${action}']`).forEach(button => {
        const selected = button.dataset.v === value;
        button.classList.toggle("on", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    }
    const hasSearch = Boolean(window.sessionStorage.getItem(SEARCH_KEY));
    let visible = 0;
    const categoryCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-results] article.card").forEach(card => {
      const body = card.querySelector<HTMLElement>(".cbody");
      if (body) {
        body.style.minWidth = "0";
        body.style.flex = "1";
        body.style.overflowWrap = "anywhere";
      }
      const index = Number(card.dataset.i);
      const sourceCountry = index < 8 || index === 16 || index === 18 ? "KH" : index < 10 ? "VN"
        : index < 12 || index === 17 ? "PH" : "MY";
      const metadata = card.dataset.searchBound === "true"
        ? { country: card.dataset.resultCountry ?? "", transaction: card.dataset.resultTransaction,
          category: card.dataset.resultCategory, recommended: card.dataset.resultRecommended === "true" }
        : { country: sourceCountry, transaction: index < 4 ? "rent" : index < 8 ? "sale" : undefined,
          category: index < 8 ? "주거용" : "프로젝트", recommended: Boolean(card.querySelector(".tag.rec")) };
      const inResults = !hasSearch || card.dataset.searchBound === "true";
      if (inResults) {
        countryCounts.set(metadata.country, (countryCounts.get(metadata.country) ?? 0) + 1);
        if (metadata.category) categoryCounts.set(metadata.category, (categoryCounts.get(metadata.category) ?? 0) + 1);
      }
      card.hidden = !inResults || !matchesResultFilters(metadata, params);
      if (!card.hidden) visible++;
    });
    const count = root.querySelector<HTMLElement>("[data-results] h2 + .sub");
    if (count) { count.dataset.userContent="true"; count.textContent = locale === "en" ? `${visible} candidates` : `${visible}건의 후보`; }
    let empty=root.querySelector<HTMLElement>('[data-result-empty]');
    if(visible===0) {
      if(!empty){empty=document.createElement('p');empty.dataset.resultEmpty='true';empty.dataset.userContent='true';empty.className='min';empty.setAttribute('role','status');root.querySelector('[data-results] .grid3')?.before(empty);}
      empty.textContent=locale==='en'?'No candidates match the current filters.':'현재 조건에 맞는 후보가 없습니다.';
    } else empty?.remove();
    root.querySelectorAll<HTMLElement>(".cats [data-action='pickCat']").forEach(button => {
      const label = button.querySelector(".n");
      const count = categoryCounts.get(button.dataset.v ?? "") ?? 0;
      if (label) { (label as HTMLElement).dataset.userContent="true"; label.textContent = locale === "en" ? `${count} items` : `${count}건`; }
    });
    root.querySelectorAll<HTMLElement>(".frail [data-action='pickCountry']").forEach(button => {
      const label = button.querySelector(".fnum");
      if (label) label.textContent = String(button.dataset.v === "ALL"
        ? [...countryCounts.values()].reduce((total, n) => total + n, 0)
        : countryCounts.get(button.dataset.v ?? "") ?? 0);
    });
  }

  useEffect(() => {
    if (view !== "home") return;
    applyResultSort();
    applyResultControls();
    const root = rootRef.current;
    // Approved HTML uses native selects, so delegate their native change event.
    const change = (event: Event) => {
      const select = (event.target as HTMLElement).closest<HTMLSelectElement>("[data-action-change='pickSort']");
      if (!select) return;
      window.sessionStorage.setItem(RESULT_SORT_KEY, resultSortMode(select.value));
      applyResultSort();
    };
    root?.addEventListener("change", change);
    return () => root?.removeEventListener("change", change);
  }, [view, viewHtml, locale, locationSearch]);

  function createSearchCard(match: SearchPayload["matches"][number]) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.action = "openDetail";
    card.dataset.id = match.id;
    card.dataset.searchDynamic = "true";
    card.dataset.searchBound = "true";

    const photo = document.createElement("div");
    photo.className = "photo";
    const tags = document.createElement("div");
    tags.className = "tagstack";
    if (match.originLabel || match.sourceName) {
      const origin = document.createElement("span");
      origin.className = "tag verified";
      origin.textContent = match.originLabel ?? match.sourceName ?? "";
      tags.append(origin);
    }
    const transaction = document.createElement("span");
    transaction.className = "tag";
    transaction.textContent = match.transaction === "rent" ? "임대" : "매매";
    tags.append(transaction);
    const image = document.createElement("div");
    image.className = "photo-img";
    image.setAttribute("role", "img");
    image.setAttribute("aria-label", match.title);
    image.style.backgroundImage = `url("${match.image.replaceAll('"', "%22")}")`;
    photo.append(tags, image);
    const template = rootRef.current?.querySelector<HTMLElement>("[data-action='toggleFav']")
      ?? new DOMParser().parseFromString(CLAUDE_VIEWS.home, "text/html").querySelector<HTMLElement>("[data-action='toggleFav']");
    if (template) {
      const heart = template.cloneNode(true) as HTMLElement;
      heart.dataset.id = match.favoriteRefId ?? match.id;
      heart.classList.remove("on");
      photo.append(heart);
    }

    const body = document.createElement("div");
    body.className = "cbody";
    const heading = document.createElement("div");
    const location = document.createElement("p");
    location.className = "loc";
    location.textContent = candidateLocation(match, locale);
    const title = document.createElement("h4");
    title.style.fontSize = "19px";
    title.style.letterSpacing = "-.01em";
    title.textContent = match.title;
    heading.append(location, title);

    const numbers = document.createElement("div");
    numbers.className = "cnums";
    const priceWrap = document.createElement("div");
    priceWrap.style.minWidth = "0";
    const priceLabel = document.createElement("small");
    priceLabel.style.cssText = "display:block;font-size:13px;color:var(--ink-2)";
    priceLabel.textContent = match.priceLabel ?? (match.transaction === "rent" ? "월 임대료" : "매매가");
    const price = document.createElement("strong");
    price.className = "cprice";
    price.textContent = candidatePrice(match);
    const converted = document.createElement("span");
    converted.style.cssText = "font-size:14px;color:var(--ink-2);overflow-wrap:anywhere";
    converted.textContent = candidateConverted(match, exchangeRateRef.current, locale);
    priceWrap.append(priceLabel, price, converted);
    const trust = document.createElement("div");
    trust.className = "ctrust";
    trust.append("Trust 등급 ");
    const trustNumber = document.createElement("b");
    trustNumber.textContent = trustGrade(match.trustScore);
    trust.append(trustNumber);
    numbers.append(priceWrap, trust);

    if (match.matchReasons?.[0]) {
      const reason = document.createElement("p");
      reason.className = "reason";
      reason.textContent = match.matchReasons[0];
      body.append(heading, numbers, reason);
    } else {
      body.append(heading, numbers);
    }
    const spec = document.createElement("p");
    spec.className = "cspec";
    spec.textContent = `${match.areaSqm ? `${match.areaSqm}㎡` : "면적 미확인"} · ${bedroomLabel(match.bedrooms)} · ${match.bathrooms === null ? "욕실 미확인" : `${match.bathrooms}Bath`}${match.retainedStatus ? ` · ${match.retainedStatus}` : ""}`;
    body.append(spec);
    card.append(photo, body);
    return card;
  }

  function favoriteId(element: HTMLElement) {
    const card = element.closest<HTMLElement>("article.card");
    if (view === "detail" && element.dataset.action === "toggleDetailFav" && assetId) return `fixture:${assetId}`;
    if (card?.dataset.i !== undefined && card.dataset.searchBound !== "true") return `fixture:${CLAUDE_ASSET_IDS[Number(card.dataset.i)]}`;
    return element.dataset.id ?? card?.dataset.id
      ?? (card?.dataset.i !== undefined ? CLAUDE_ASSET_IDS[Number(card.dataset.i)] : undefined)
      ?? (view === "detail" ? assetId : undefined);
  }

  function applyFavoriteState() {
    rootRef.current?.querySelectorAll<HTMLElement>("[data-action='toggleFav'], [data-action='toggleDetailFav']").forEach(button => {
      const id = favoriteId(button);
      const saved = Boolean(id && favoriteIdsRef.current.has(id));
      button.classList.toggle("on", saved);
      button.setAttribute("aria-pressed", String(saved));
    });
  }

  function favoriteMessage(message: string) {
    const root = rootRef.current;
    if (!message) { root?.querySelector("[data-favorite-status]")?.remove(); return; }
    const main = root?.querySelector("main");
    if (!main) return;
    let status = root?.querySelector<HTMLElement>("[data-favorite-status]");
    if (!status) {
      status = document.createElement("p");
      status.dataset.favoriteStatus = "true";
      status.className = "min";
      status.setAttribute("role", "status");
      main.prepend(status);
    }
    status.textContent = message;
    if (message) status.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function refreshFavorites(isCurrent = () => true) {
    const version = ++favoriteRefreshRef.current;
    const current = () => isCurrent() && version === favoriteRefreshRef.current;
    const emptyHeading = rootRef.current?.querySelector<HTMLElement>("[data-view='fav'] h3");
    if (emptyHeading) emptyHeading.textContent = locale === "en" ? "Loading saved assets" : "관심자산을 불러오는 중입니다";
    try {
      const response = await readFavorites();
      if (!current()) return;
      const memberLink=rootRef.current?.querySelector<HTMLElement>('.nav-login');
      if(memberLink && (response.ok || response.status===401)) {
        memberLink.dataset.userContent='true';
        const label=response.ok?'MY GLI':locale==='en'?'Sign in':'로그인';
        const text=Array.from(memberLink.childNodes).find(node=>node.nodeType===Node.TEXT_NODE);
        if(text)text.textContent=label;
        memberLink.setAttribute('aria-label',label);
      }
      if (!response.ok) {
        favoriteIdsRef.current = new Set();
        applyFavoriteState();
        if (view === "fav") {
          if (emptyHeading) emptyHeading.textContent = response.status === 401
            ? (locale === "en" ? "Sign in required" : "로그인이 필요합니다")
            : (locale === "en" ? "Unable to load saved assets" : "관심자산을 불러오지 못했습니다");
          favoriteMessage(response.status === 401
            ? (locale === "en" ? "Sign in to view your saved assets." : "로그인 후 관심자산을 확인할 수 있습니다.")
            : (locale === "en" ? "Unable to load saved assets." : "관심자산을 불러오지 못했습니다."));
          if (response.status === 401) {
            const button = rootRef.current?.querySelector<HTMLElement>("[data-view='fav'] [data-action='goHome']");
            if (button) { button.dataset.action = "signInFavorites"; button.textContent = locale === "en" ? "Sign in" : "로그인"; }
          }
        }
        return;
      }
      const favorites = response.favorites ?? [];
      if (emptyHeading) emptyHeading.textContent = locale === "en" ? "No saved assets yet" : "아직 저장한 자산이 없습니다";
      favoriteIdsRef.current = new Set(favorites.flatMap(row => row.referenceIds ?? [row.referenceId ?? row.publicId]));
      if (view === "fav") {
        const main = rootRef.current?.querySelector<HTMLElement>("[data-view='fav'] main");
        if (!main) return;
        main.querySelector("[data-favorite-grid]")?.remove();
        const empty = main.querySelector<HTMLElement>("div");
        if (empty) empty.hidden = favorites.length > 0;
        if (favorites.length) {
          const grid = document.createElement("div");
          grid.className = "grid3";
          grid.dataset.favoriteGrid = "true";
          for (const row of favorites) {
            const card = createSearchCard(localizeDemoResult({ answer: "", clarification: null, matches: [favoriteCandidate(row)] }, locale).matches[0]);
            if (row.detailOrigin === "fixture") delete card.dataset.searchBound;
            grid.append(card);
          }
          main.append(grid);
        }
      }
      applyFavoriteState();
      favoriteMessage("");
    } catch {
      if (current() && emptyHeading) emptyHeading.textContent = locale === "en" ? "Unable to load saved assets" : "관심자산을 불러오지 못했습니다";
      if (current() && view === "fav") favoriteMessage(locale === "en" ? "Unable to load saved assets." : "관심자산을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    if (view !== "home" && view !== "detail" && view !== "fav") return;
    let active = true;
    void refreshFavorites(() => active);
    return () => { active = false; };
  }, [view, assetId, viewHtml, locale]);

  async function toggleFavorite(element: HTMLElement) {
    const id = favoriteId(element);
    if (!id || favoriteSavingRef.current.has(id)) return;
    favoriteSavingRef.current.add(id);
    element.setAttribute("aria-busy", "true");
    try {
      const response = await writeFavorite(id, !favoriteIdsRef.current.has(id));
      if (response.status === 401 && response.signInPath) { navigate(response.signInPath); return; }
      if (!response.ok) throw new Error(response.error);
      await refreshFavorites();
    } catch {
      favoriteMessage(locale === "en" ? "Unable to update saved assets. Please try again." : "관심자산을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      favoriteSavingRef.current.delete(id);
      element.removeAttribute("aria-busy");
    }
  }

  useLayoutEffect(() => {
    if (view !== "home") return;
    if (searchIsActive) return;
    const stored = window.sessionStorage.getItem(SEARCH_KEY);
    if (!stored) return;
    try {
      const result = localizeDemoResult(JSON.parse(stored) as SearchPayload, locale);
      applySearchResult(result, scrollSearchResultsRef.current);
      scrollSearchResultsRef.current = false;
      if (runtimeTurns.length === 0) {
        const savedTurns = window.sessionStorage.getItem(TURNS_KEY);
        const restoredTurns = savedTurns ? JSON.parse(savedTurns) as RuntimeTurn[] : null;
        // Restore after hydration; do not overwrite a question sent in between.
        const restore = window.setTimeout(() => setRuntimeTurns(turns => turns.length ? turns : restoredTurns?.length ? restoredTurns : [
          { id: "restored-answer", role: "GLI AI", result,
            text: [result.answer, result.clarification].filter(Boolean).join("\n") },
        ]), 0);
        return () => window.clearTimeout(restore);
      }
    } catch {
      window.sessionStorage.removeItem(SEARCH_KEY);
    }
    // Restore candidates when the view or conversation changes, not per keystroke.
  }, [view, viewHtml, searchIsActive, runtimeTurns, locale]);

  useEffect(() => {
    if (view !== "home") return;
    if (window.sessionStorage.getItem(TURNS_KEY) && !runtimeTurns.length) return;
    const raw = window.sessionStorage.getItem(EXPLORE_RETURN_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (Date.now() - state.createdAt < EXPLORE_STATE_MAX_AGE_MS && Number.isFinite(state.scrollY)) {
        // Apply after the router's own scroll-to-top, and after restored cards.
        const restore = window.setTimeout(() => {
          window.scrollTo({ top: state.scrollY, behavior: "instant" });
          window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
        }, 100);
        return () => window.clearTimeout(restore);
      }
    } catch { /* Invalid return state must not break exploration. */ }
    window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
  }, [view, runtimeTurns]);

  useEffect(() => {
    if (view !== "home") return;
    const params = new URLSearchParams(locationSearch || window.location.search);
    const query = params.get("q")?.trim();
    // Returning to a query URL restores its snapshot, never charges for the
    // same automatic query a second time.
    if (query && window.sessionStorage.getItem(EXPLORE_RETURN_KEY) && window.sessionStorage.getItem(SEARCH_KEY)) {
      autoSearchRef.current = query;
    }
    // Defer the first request so React's development cleanup cannot cancel an
    // already-marked auto-search and then suppress its next setup.
    const autoSearchTimer = query && autoSearchRef.current !== query ? window.setTimeout(() => {
      autoSearchRef.current = query;
      void runSearch(query);
    }, 0) : null;

    applyResultControls();
    return () => { if (autoSearchTimer !== null) window.clearTimeout(autoSearchTimer); };
  }, [locationSearch, view, viewHtml]);

  async function runSearch(query?: string, mode: "initial" | "followup" = "initial") {
    const textarea = rootRef.current?.querySelector<HTMLTextAreaElement>("#q");
    const value = (query ?? (mode === "followup" ? followupValue : textarea?.value) ?? "").trim();
    if (!value || searchBusy || searchAbortRef.current) return;
    const controller = new AbortController();
    searchAbortRef.current = controller;
    consultationRef.current?.arm(mode === "followup");
    const runId = ++searchRunRef.current;
    if (mode === "initial") {
      window.sessionStorage.removeItem(SEARCH_KEY);
      window.sessionStorage.removeItem(TURNS_KEY);
      window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
      window.sessionStorage.removeItem(RESULT_VIEW_KEY);
      window.sessionStorage.removeItem(RESULT_SORT_KEY);
      window.history.replaceState({}, "", "/explore");
      setLocationSearch("");
      setRuntimeTurns([]);
      setFollowupValue("");
      setFollowupError(false);
      setSelectedAsset(null);
      clearSearchTimers();
      searchStartedAtRef.current = Date.now();
      setSearchElapsed(0);
      setSearchResultCount(0);
      setSearchStage("understanding");
      scheduleSearchStage("searching", 700, runId);
      scheduleSearchStage("reviewing", 6_000, runId);
      if (textarea) textarea.value = "";
    } else {
      setFollowupError(false);
      setFollowupLoading(true);
    }
    setRuntimeTurns((turns) => [
      ...turns,
      { id: `${runId}-query`, role: "나", text: value, onAsset: mode === "followup" ? selectedAsset?.title : undefined },
    ]);
    try {
      const previous = mode === "followup" ? window.sessionStorage.getItem(SEARCH_KEY) : null;
      let previousResult: SearchPayload | null = null;
      if (previous) {
        try {
          previousResult = localizeDemoResult(JSON.parse(previous) as SearchPayload, locale);
        } catch {
          window.sessionStorage.removeItem(SEARCH_KEY);
        }
      }
      const context = previousResult?.criteria;
      const conversation = mode === "initial" ? [] : boundConversation(localizedTurns.map((turn) => ({
        role: turn.role === "나" ? "user" : "assistant",
        text: turn.text,
      })));
      const response = await fetch("/api/search", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: value, locale, context, conversation, previousAssetIds: resultCandidateIds(previousResult), selectedAssetIds: mode === "followup" && selectedAsset ? [selectedAsset.id] : [] }),
      });
      if (!response.ok) throw new Error("search_failed");
      const result = localizeDemoResult(displayResult((await response.json()) as SearchPayload, previousResult), locale);
      if (searchRunRef.current !== runId) return;
      if (mode === "initial") {
        clearSearchTimers();
        setSearchStage("composing");
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      controller.signal.throwIfAborted();
      consultationRef.current?.arriving();
      window.sessionStorage.setItem(SEARCH_KEY, JSON.stringify(result));
      scrollSearchResultsRef.current = false;
      setRuntimeTurns((turns) => [
        ...turns,
        {
          id: `${runId}-answer`,
          role: "GLI AI",
          result,
          text: [result.answer, result.clarification].filter(Boolean).join("\n"),
          resultUpdate: mode === "followup"
            ? describeResultUpdate(previousResult, result)
            : undefined,
        },
      ]);
      setSearchResultCount(result.matches.length);
      if (mode === "initial") {
        setSearchStage("complete");
      } else {
        setFollowupValue("");
        setSelectedAsset(null);
      }
    } catch {
      if (searchRunRef.current !== runId) return;
      if (controller.signal.aborted) {
        clearSearchTimers();
        setSearchStage("idle");
        setRuntimeTurns(turns => turns.filter(turn => turn.id !== `${runId}-query`));
        return;
      }
      if (mode === "followup") {
        setFollowupError(true);
        setRuntimeTurns((turns) => turns.filter((turn) => turn.id !== `${runId}-query`));
      } else {
        clearSearchTimers();
        setSearchStage("error");
        setRuntimeTurns((turns) => [
          ...turns,
          { id: `${runId}-error`, role: "GLI AI", text: "검색을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        ]);
      }
    } finally {
      if (searchAbortRef.current === controller) searchAbortRef.current = null;
      if (mode === "followup") {
        setFollowupLoading(false);
      }
    }
  }

  function handleAction(element: HTMLElement) {
    const action = element.dataset.action;
    const value = element.dataset.v;
    switch (action) {
      case "askAsset": {
        consultationRef.current?.cancel();
        const stored = window.sessionStorage.getItem(SEARCH_KEY);
        if (!stored) break;
        const result = localizeDemoResult(JSON.parse(stored) as SearchPayload, locale);
        const candidate = result.matches.find(asset => asset.id === element.dataset.id);
        if (!candidate) break;
        setSelectedAsset(candidate);
        rootRef.current?.querySelectorAll<HTMLElement>("[data-results] .card").forEach(card => card.classList.toggle("picked", card.dataset.id === candidate.id));
        const field = rootRef.current?.querySelector<HTMLTextAreaElement>("[data-followup-input]");
        field?.scrollIntoView({ block: "center", behavior: "smooth" });
        if (!window.matchMedia("(pointer: coarse)").matches) field?.focus({ preventScroll: true });
        break;
      }
      case "goLand": navigate("/"); break;
      case "goAbout": navigate("/about"); break;
      case "goHome": navigate("/explore"); break;
      case "goCountry": navigateExploreFilter("country", value ?? "ALL"); break;
      case "goTxn": navigateExploreFilter("txn", value ?? "ALL"); break;
      case "goCat": navigateExploreFilter("cat", value ?? "ALL"); break;
      case "goTrust": navigate("/explore#trust-standard"); break;
      case "goPlan": navigate("/membership"); break;
      case "goFav": navigate("/favorites"); break;
      case "signInFavorites": navigate("/my?return_to=%2Ffavorites"); break;
      case "goNews": navigate("/news"); break;
      case "goPaper": navigate("/whitepaper"); break;
      case "goSoonPartners": navigate("/coming-soon?section=partners"); break;
      case "goSoonNotice": navigate("/coming-soon?section=notice"); break;
      case "goSoonAbout": navigate("/about"); break;
      case "goSoonNews": navigate("/news"); break;
      case "goSoonPaper": navigate("/whitepaper"); break;
      case "goSoonMembership": navigate("/membership"); break;
      case "goSoonContact": navigate("/coming-soon?section=contact"); break;
      case "goSoonGuide": navigate("/coming-soon?section=guide"); break;
      case "goSoonMy": navigate("/my"); break;
      case "goSoonConsult": navigate(view==="detail" && assetId?`/my?consult=${encodeURIComponent(`fixture:${assetId}`)}`:"/my?inquiry=1"); break;
      case "goSoonCommunity": navigate("/coming-soon?section=community"); break;
      case "goSoonGame": navigate("/coming-soon?section=game"); break;
      case "goSoonLang": navigate("/coming-soon?section=lang"); break;
      case "startExplore": {
        const input = rootRef.current?.querySelector<HTMLInputElement>("[data-action-change='onHook']");
        const query = input?.value.trim();
        navigate(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
        break;
      }
      case "openDetail": {
        const id = element.dataset.id ?? CLAUDE_ASSET_IDS[Number(element.dataset.i)];
        if (id) {
          if (view === "home") rememberExploreResult(id);
          navigate(`/assets/${id}${element.dataset.searchBound === "true" ? "?origin=search" : ""}`);
        }
        break;
      }
      case "openNews": {
        const id = NEWS_IDS[Number(element.dataset.i)];
        if (id) navigate(`/news/${id}`);
        break;
      }
      case "pickTier": {
        const target = Number(element.dataset.i);
        if (Number.isInteger(target) && target >= 0 && target < 5) {
          if (target === 0 || target === tier) setTier(target);
          else setPendingPreview(target);
        }
        break;
      }
      case "galPrev": setGallery((current) => current - 1); break;
      case "galNext": setGallery((current) => current + 1); break;
      case "galPick": setGallery(Number(element.dataset.i)); break;
      case "pickCycle": setCycle(value === "yearly" ? "yearly" : "monthly"); break;
      case "choosePlan": navigate(`/membership/checkout?plan=${value ?? "investor"}&cycle=${cycle}`); break;
      case "pickDoc": setDoc((value ?? "intro") as keyof typeof CLAUDE_PAPER_VIEWS); break;
      case "pickNewsCat": {
        const category = value ?? "전체보기";
        setNewsCategory(category);
        rootRef.current?.querySelectorAll<HTMLElement>("[data-action='pickNewsCat']").forEach((button) => {
          button.classList.toggle("on", button.dataset.v === category);
        });
        rootRef.current?.querySelectorAll<HTMLElement>("[data-action='openNews']").forEach((card) => {
          const index = Number(card.dataset.i);
          const categories = ["보도자료", "보도자료", "보도자료", "보도자료", "보도자료", "인사이트"];
          card.hidden = category !== "전체보기" && categories[index] !== category;
        });
        break;
      }
      case "activate": setPaymentPreviewOpen(true); break;
      case "runSearch": void runSearch(); break;
      case "runFollowUp": void runSearch(followupValue, "followup"); break;
      case "pickPrompt": void runSearch(translateUiText(element.dataset.q ?? "", locale)); break;
      case "viewChangedResults": {
        const results = rootRef.current?.querySelector<HTMLElement>("[data-results]");
        const heading = results?.querySelector<HTMLElement>("h2");
        if (!results || !heading) break;
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        results.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "resetSearch": {
        window.sessionStorage.removeItem(SEARCH_KEY);
        window.sessionStorage.removeItem(TURNS_KEY);
        window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
        window.sessionStorage.removeItem(RESULT_VIEW_KEY);
        window.sessionStorage.removeItem(RESULT_SORT_KEY);
        window.location.assign("/explore");
        break;
      }
      case "setGrid":
      case "setList":
        window.sessionStorage.setItem(RESULT_VIEW_KEY, action === "setList" ? "list" : "grid");
        applyResultControls();
        break;
      case "pickCountry":
        navigateExploreFilter("country", value ?? "ALL"); break;
      case "pickTxn": navigateExploreFilter("txn", value ?? "ALL"); break;
      case "pickCat": navigateExploreFilter("cat", value ?? "ALL"); break;
      case "resetCat": navigateExploreFilter(); break;
      case "pickPipeState": {
        rootRef.current?.querySelectorAll<HTMLElement>("[data-action='pickPipeState']").forEach((button) => {
          button.classList.toggle("on", button.dataset.v === value);
        });
        break;
      }
      case "setUnlocked":
      case "setPurpose": {
        const group = element.parentElement;
        group?.querySelectorAll<HTMLElement>(`[data-action='${action}']`).forEach((button) => {
          button.className = button === element ? "btn btn-p" : "btn btn-o";
        });
        break;
      }
      case "toggleFavOnly": navigate("/favorites"); break;
      case "openBuy": {
        const target = accessPreviewTier(element.dataset.t ?? "basic");
        if (target !== null) setPendingPreview(target);
        break;
      }
      case "closeBuy": setPendingPreview(null); break;
      case "confirmBuy":
        if (pendingPreview !== null) setTier(pendingPreview);
        setPendingPreview(null);
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-consult]")) return;
        const element = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
        if (!element) return;
        event.preventDefault();
        if (element.dataset.action === "toggleFav" || element.dataset.action === "toggleDetailFav") {
          event.stopPropagation();
          void toggleFavorite(element);
          return;
        }
        handleAction(element);
      }}
      onInput={(event) => {
        if ((event.target as HTMLElement).closest("[data-consult]")) return;
        const input = (event.target as HTMLElement).closest<HTMLTextAreaElement>("[data-followup-input]");
        if (!input) return;
        setFollowupValue(input.value);
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
      }}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-consult]")) return;
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        const target = event.target as HTMLElement;
        const followupElement = target.closest<HTMLTextAreaElement>("[data-followup-input]");
        const queryElement = target.closest<HTMLElement>("[data-action-keydown='onQueryKey']");
        const hookElement = target.closest<HTMLInputElement>("[data-action-keydown='onHookKey']");
        if (followupElement && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void runSearch(followupElement.value, "followup");
        } else if (queryElement && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void runSearch();
        } else if (hookElement && event.key === "Enter") {
          event.preventDefault();
          const query = hookElement.value.trim();
          navigate(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
        }
      }}
    >
      <ApprovedHtml html={CLAUDE_HEADER_HTML} />
      {view === "detail" && assetId && <div className="wrap"><BackToResultsButton assetId={assetId} /></div>}
      <ApprovedHtml html={viewHtml} />
      <ApprovedHtml html={CLAUDE_FOOTER_HTML} />
      {view === "co" && paymentPreviewOpen && <PaymentPreviewDialog initialMethod={paymentMethod}
        onClose={()=>setPaymentPreviewOpen(false)} onSelect={method=>{setPaymentMethod(method);setPaymentPreviewOpen(false);}} />}
      {view === "detail" && pendingPreview !== null && <AccessPreviewDialog
        tier={ACCESS_PREVIEW_NAMES[pendingPreview]} title={rootRef.current?.querySelector("h1 + p")?.textContent ?? assetId ?? ""}
        onClose={()=>setPendingPreview(null)} onConfirm={()=>{setTier(pendingPreview);setPendingPreview(null);}} />}
      {consultationTarget && createPortal(<ConsultationPanel ref={consultationRef}
        turns={localizedTurns} busy={searchBusy} loading={followupLoading} error={followupError}
        progressText="투자 조건에 맞는 매물·최신 외부 자료·환율을 조회하고, 확인된 근거로 후보와 답변을 비교·정리 중입니다"
        value={followupValue} onValue={setFollowupValue} onSend={() => void runSearch(followupValue, "followup")}
        selected={selectedAsset} onClearPick={() => setSelectedAsset(null)}
        onResults={() => rootRef.current?.querySelector("[data-results]")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onAsset={id => { document.getElementById(`asset-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
        onConsult={() => navigate(selectedAsset?`/my?consult=${encodeURIComponent(selectedAsset.id)}`:"/my?inquiry=1")} />, consultationTarget)}
    </div>
  );
}
