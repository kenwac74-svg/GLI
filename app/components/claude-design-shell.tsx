"use client";

// GLI-SPEC: GS-001 GS-006 GS-015 GS-016 GS-018 GS-020 GS-023 GS-024.
// See docs/implementation/CURRENT-STATE.md before wiring remaining demo actions.
// Preserve approved visuals; local paid/favorite state is not backend authority.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
type RuntimeTurn = {
  id: string;
  role: "나" | "GLI AI";
  text: string;
  resultUpdate?: string;
};

type SearchPayload = {
  answer: string;
  clarification: string | null;
  criteria?: unknown;
  matches: Array<{
    id: string;
    title: string;
    country: string;
    city: string;
    district: string;
    transaction: "sale" | "rent";
    price: number;
    maxPrice?: number;
    currency: string;
    areaSqm: number;
    bedrooms: number;
    bathrooms: number;
    image: string;
    trustScore: number;
    originLabel?: string;
    sourceName?: string;
    matchReasons?: string[];
  }>;
};

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

const trustGrade = (score: number) => score >= 90
  ? "S"
  : score >= 85
    ? "A+"
    : score >= 80
      ? "A"
      : score >= 75
        ? "B+"
        : score >= 70
          ? "B"
          : score >= 65
            ? "C+"
            : score >= 60
              ? "C"
              : "D";

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
  const [gallery, setGallery] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [doc, setDoc] = useState<keyof typeof CLAUDE_PAPER_VIEWS>("intro");
  const [paid, setPaid] = useState(initialPaid);
  const [, setNewsCategory] = useState("전체보기");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchStage, setSearchStage] = useState<SearchStage>("idle");
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [runtimeTurns, setRuntimeTurns] = useState<RuntimeTurn[]>([]);
  const [followupValue, setFollowupValue] = useState("");
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupError, setFollowupError] = useState(false);
  const autoSearchRef = useRef<string | null>(null);
  const followupTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollSearchResultsRef = useRef(false);
  const searchStartedAtRef = useRef(0);
  const searchRunRef = useRef(0);
  const searchTimersRef = useRef<number[]>([]);

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

  function navigate(path: string) {
    if (path.startsWith("/explore")) {
      setLocationSearch(new URL(path, window.location.href).search);
    }
    router.push(path);
  }

  function navigateExploreFilter(param?: string, value?: string) {
    const path = param && value
      ? `/explore?${param}=${encodeURIComponent(value)}`
      : "/explore";
    window.history.pushState({}, "", path);
    setLocationSearch(new URL(path, window.location.href).search);
  }

  useEffect(() => {
    const syncLocationSearch = () => setLocationSearch(window.location.search);
    syncLocationSearch();
    window.addEventListener("popstate", syncLocationSearch);
    return () => window.removeEventListener("popstate", syncLocationSearch);
  }, []);

  const searchIsActive = ["understanding", "searching", "reviewing", "composing"].includes(searchStage);
  const searchBusy = searchIsActive || followupLoading;
  const hasCompletedAnswer = runtimeTurns.some(
    (turn) => turn.role === "GLI AI" && turn.id.endsWith("-answer"),
  );

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
      if (textNode) textNode.textContent = searchIsActive ? "탐색 중" : searchStage === "complete" ? "다시 탐색" : "탐색";
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

    const panel = root.querySelector<HTMLElement>("[data-view='home'] main .panel");
    if (panel) {
      panel.querySelectorAll("[data-runtime-turn]").forEach((turn) => turn.remove());
      const anchor = panel.querySelector(".min");
      runtimeTurns.forEach((runtimeTurn) => {
        const turn = document.createElement("div");
        turn.className = "turn";
        turn.dataset.runtimeTurn = runtimeTurn.id;
        turn.style.marginTop = "0";
        const who = document.createElement("span");
        who.className = "turn-who";
        who.textContent = runtimeTurn.role;
        const paragraph = document.createElement("p");
        paragraph.textContent = runtimeTurn.text;
        if (runtimeTurn.role === "나") paragraph.style.color = "var(--ink)";
        if (runtimeTurn.resultUpdate) {
          const content = document.createElement("div");
          const note = document.createElement("p");
          note.className = "turn-note";
          note.dataset.resultUpdate = "true";
          const message = document.createElement("span");
          message.textContent = runtimeTurn.resultUpdate;
          const link = document.createElement("button");
          link.type = "button";
          link.dataset.action = "viewChangedResults";
          link.textContent = "변경된 탐색 결과 보기";
          note.append(message, link);
          content.append(paragraph, note);
          turn.append(who, content);
        } else {
          turn.append(who, paragraph);
        }
        panel.insertBefore(turn, anchor);
      });
    }

    const followup = root.querySelector<HTMLFormElement>("[data-followup-composer]");
    const followupInput = followup?.querySelector<HTMLTextAreaElement>("[data-followup-input]");
    const followupButton = followup?.querySelector<HTMLButtonElement>("[data-action='runFollowUp']");
    const followupStatus = followup?.querySelector<HTMLElement>("[data-followup-status]");
    followupTextareaRef.current = followupInput ?? null;
    if (followup && followupInput && followupButton && followupStatus) {
      followup.hidden = !hasCompletedAnswer;
      followup.classList.toggle("is-loading", followupLoading);
      followup.classList.toggle("is-error", followupError);
      followup.setAttribute("aria-busy", String(followupLoading));
      followupInput.disabled = followupLoading;
      followupInput.value = followupValue;
      followupButton.disabled = followupLoading || !followupValue.trim();
      followupButton.textContent = followupError ? "다시 보내기" : "보내기";
      followupStatus.replaceChildren();
      if (followupLoading) {
        const dots = document.createElement("span");
        dots.className = "fw-dots";
        dots.setAttribute("aria-hidden", "true");
        dots.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
        followupStatus.append(dots, "GLI AI가 답변을 정리하고 있습니다");
      } else if (followupError) {
        followupStatus.textContent = "답변을 불러오지 못했습니다. 다시 보내 주세요.";
      }
    }
  }, [followupError, followupLoading, followupValue, hasCompletedAnswer, runtimeTurns, searchBusy, searchElapsed, searchIsActive, searchResultCount, searchStage, view, viewHtml]);

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
    const root = rootRef.current;
    if (!root) return;
    const idSet = new Set(result.matches.map((match) => match.id));
    root.querySelectorAll("[data-search-dynamic='true']").forEach((card) => card.remove());
    const cards = root.querySelectorAll<HTMLElement>("[data-results] article.card[data-i]");
    let visible = 0;
    cards.forEach((card) => {
      const index = Number(card.dataset.i);
      const id = CLAUDE_ASSET_IDS[index];
      const show = Boolean(id && idSet.has(id));
      card.hidden = !show;
      if (show) visible += 1;
    });
    const grid = root.querySelector<HTMLElement>("[data-results] .grid3");
    for (const match of result.matches) {
      if ((CLAUDE_ASSET_IDS as readonly string[]).includes(match.id) || !grid) continue;
      grid.append(createSearchCard(match));
      visible += 1;
    }
    const resultSection = root.querySelector<HTMLElement>("[data-results]");
    const title = resultSection?.querySelector("h2");
    const count = resultSection?.querySelector("h2 + .sub");
    if (title) title.textContent = "AI 탐색 결과";
    if (count) {
      count.textContent = visible === result.matches.length
        ? `${visible}건의 후보`
        : `${result.matches.length}건의 후보 · 현재 화면 ${visible}건`;
    }
    if (scrollToResults) {
      window.setTimeout(() => resultSection?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  function createSearchCard(match: SearchPayload["matches"][number]) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.action = "openDetail";
    card.dataset.id = match.id;
    card.dataset.searchDynamic = "true";

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

    const body = document.createElement("div");
    body.className = "cbody";
    const heading = document.createElement("div");
    const location = document.createElement("p");
    location.className = "loc";
    location.textContent = `${match.district}, ${match.city}, ${match.country}`;
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
    priceLabel.textContent = match.transaction === "rent" ? "월 임대료" : "매매가";
    const price = document.createElement("strong");
    price.className = "cprice";
    price.textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: match.currency,
      maximumFractionDigits: 0,
    }).format(match.price);
    const converted = document.createElement("span");
    converted.style.cssText = "font-size:14px;color:var(--ink-2);overflow-wrap:anywhere";
    converted.textContent = match.currency === "USD"
      ? `약 ${Math.round(match.price * 1380).toLocaleString("ko-KR")}원${match.transaction === "rent" ? "/월" : ""}`
      : "환산 가격 확인 중";
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
    spec.textContent = `${match.areaSqm || "조사 예정"}㎡ · ${match.bedrooms ? `${match.bedrooms}BR` : "Studio"} · ${match.bathrooms || "조사 예정"}Bath`;
    body.append(spec);
    card.append(photo, body);
    return card;
  }

  useEffect(() => {
    if (view !== "home") return;
    if (searchIsActive) return;
    const stored = window.sessionStorage.getItem(SEARCH_KEY);
    if (!stored) return;
    try {
      applySearchResult(
        JSON.parse(stored) as SearchPayload,
        scrollSearchResultsRef.current,
      );
      scrollSearchResultsRef.current = false;
    } catch {
      window.sessionStorage.removeItem(SEARCH_KEY);
    }
    // The source HTML is regenerated as one immutable view fragment.
    // Reapply the stored backend result whenever that fragment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchIsActive, searchStage, view, viewHtml]);

  useEffect(() => {
    if (view !== "home") return;
    const params = new URLSearchParams(locationSearch || window.location.search);
    const query = params.get("q")?.trim();
    if (query && autoSearchRef.current !== query) {
      autoSearchRef.current = query;
      void runSearch(query);
    }

    const country = params.get("country") ?? params.get("cc");
    const category = params.get("cat");
    const transaction = params.get("txn");
    const countryIndexes: Record<string, number[]> = {
      KH: [0, 1, 2, 3, 4, 5, 6, 7, 16, 18],
      VN: [8, 9],
      PH: [10, 11, 17],
      MY: [12, 13, 14, 15, 19],
    };
    const categoryIndexes: Record<string, number[]> = {
      "주거용": Array.from({ length: 16 }, (_, index) => index),
      "상업용": [],
      "레저": [],
      "프로젝트": [16, 17, 18, 19],
    };
    const transactionIndexes: Record<string, number[]> = {
      "임대": [0, 1, 2, 3],
      "매매": Array.from({ length: 16 }, (_, index) => index + 4),
    };
    const allowedByCountry = country && country !== "ALL" ? new Set(countryIndexes[country] ?? []) : null;
    const allowedByCategory = category && category !== "ALL" ? new Set(categoryIndexes[category] ?? []) : null;
    const allowedByTransaction = transaction && transaction in transactionIndexes
      ? new Set(transactionIndexes[transaction])
      : null;
    rootRef.current?.querySelectorAll<HTMLElement>("[data-results] article.card[data-i]").forEach((card) => {
      const index = Number(card.dataset.i);
      const countryMatch = !allowedByCountry || allowedByCountry.has(index);
      const categoryMatch = !allowedByCategory || allowedByCategory.has(index);
      const transactionMatch = transaction === "REC"
        ? card.textContent?.includes("GLI 추천") ?? false
        : !allowedByTransaction || allowedByTransaction.has(index);
      card.hidden = !(countryMatch && categoryMatch && transactionMatch);
    });
  }, [locationSearch, view, viewHtml]);

  async function runSearch(query?: string, mode: "initial" | "followup" = "initial") {
    const textarea = rootRef.current?.querySelector<HTMLTextAreaElement>("#q");
    const value = (query ?? (mode === "followup" ? followupValue : textarea?.value) ?? "").trim();
    if (!value || searchBusy) return;
    const runId = ++searchRunRef.current;
    if (mode === "initial") {
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
      { id: `${runId}-query`, role: "나", text: value },
    ]);
    try {
      const previous = window.sessionStorage.getItem(SEARCH_KEY);
      let previousResult: SearchPayload | null = null;
      if (previous) {
        try {
          previousResult = JSON.parse(previous) as SearchPayload;
        } catch {
          window.sessionStorage.removeItem(SEARCH_KEY);
        }
      }
      const context = previousResult?.criteria;
      const conversation = runtimeTurns.slice(-8).map((turn) => ({
        role: turn.role === "나" ? "user" : "assistant",
        text: turn.text,
      }));
      const previousAssetIds = previousResult?.matches.slice(0, 20).map((asset) => asset.id) ?? [];
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: value, context, conversation, previousAssetIds }),
      });
      if (!response.ok) throw new Error("search_failed");
      const result = (await response.json()) as SearchPayload;
      if (searchRunRef.current !== runId) return;
      if (mode === "initial") {
        clearSearchTimers();
        setSearchStage("composing");
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      window.sessionStorage.setItem(SEARCH_KEY, JSON.stringify(result));
      scrollSearchResultsRef.current = mode === "initial";
      setRuntimeTurns((turns) => [
        ...turns,
        {
          id: `${runId}-answer`,
          role: "GLI AI",
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
        window.setTimeout(() => {
          const field = followupTextareaRef.current;
          if (field) field.style.height = "auto";
        }, 0);
      }
    } catch {
      if (searchRunRef.current !== runId) return;
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
      if (mode === "followup") {
        setFollowupLoading(false);
        window.setTimeout(() => {
          const composer = followupTextareaRef.current?.closest<HTMLElement>("[data-followup-composer]");
          if (!composer) return;
          const rect = composer.getBoundingClientRect();
          const overflow = rect.bottom - window.innerHeight + 24;
          if (overflow <= 4) return;
          const distance = Math.min(overflow, Math.max(rect.top - 24, 0));
          window.scrollTo({ top: window.scrollY + distance, behavior: "auto" });
        }, 50);
      }
    }
  }

  function handleAction(element: HTMLElement) {
    const action = element.dataset.action;
    const value = element.dataset.v;
    switch (action) {
      case "goLand": navigate("/"); break;
      case "goAbout": navigate("/about"); break;
      case "goHome": navigate("/explore"); break;
      case "goCountry": navigateExploreFilter("country", value ?? "ALL"); break;
      case "goTxn": navigateExploreFilter("txn", value ?? "ALL"); break;
      case "goCat": navigateExploreFilter("cat", value ?? "ALL"); break;
      case "goTrust": navigate("/explore#trust-standard"); break;
      case "goPlan": navigate("/membership"); break;
      case "goFav": navigate("/favorites"); break;
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
      case "goSoonMy": navigate("/coming-soon?section=my"); break;
      case "goSoonConsult": navigate("/coming-soon?section=consult"); break;
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
        if (id) navigate(`/assets/${id}`);
        break;
      }
      case "openNews": {
        const id = NEWS_IDS[Number(element.dataset.i)];
        if (id) navigate(`/news/${id}`);
        break;
      }
      case "pickTier": setTier(Math.min(4, Math.max(0, Number(element.dataset.i)))); break;
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
      case "activate": setPaid(true); break;
      case "runSearch": void runSearch(); break;
      case "runFollowUp": void runSearch(followupValue, "followup"); break;
      case "pickPrompt": void runSearch(element.dataset.q); break;
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
        window.location.reload();
        break;
      }
      case "setGrid": rootRef.current?.querySelector("[data-results] .grid3")?.classList.remove("list"); break;
      case "setList": rootRef.current?.querySelector("[data-results] .grid3")?.classList.add("list"); break;
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
      case "openBuy":
      case "closeBuy":
      case "confirmBuy": break;
    }
  }

  return (
    <div
      ref={rootRef}
      onClick={(event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
        if (!element) return;
        event.preventDefault();
        if (element.dataset.action === "toggleFav" || element.dataset.action === "toggleDetailFav") {
          event.stopPropagation();
          element.classList.toggle("on");
          return;
        }
        handleAction(element);
      }}
      onInput={(event) => {
        const input = (event.target as HTMLElement).closest<HTMLTextAreaElement>("[data-followup-input]");
        if (!input) return;
        setFollowupValue(input.value);
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
      }}
      onKeyDown={(event) => {
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
      <div dangerouslySetInnerHTML={{ __html: CLAUDE_HEADER_HTML }} />
      <div dangerouslySetInnerHTML={{ __html: viewHtml }} />
      <div dangerouslySetInnerHTML={{ __html: CLAUDE_FOOTER_HTML }} />
    </div>
  );
}
