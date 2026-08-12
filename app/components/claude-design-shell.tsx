"use client";

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
  "47935be4-bc05-4fe0-9cdd-2f1d8b1cb19c",
  "08ac41f7-15ae-42ab-a275-6afbfb70b8da",
  "ec77ba82-7abb-44cc-9328-486e1bac695d",
  "ef83059e-5748-4e2c-bf6b-ec8a791e8d68",
  "0547d99f-b44b-4303-add7-6a095c943292",
  "33d997d3-5984-4554-b3be-5fd9ddf41b00",
] as const;

const SEARCH_KEY = "gli:claude-search";

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
    router.push(path);
  }

  function addTurn(role: "나" | "GLI AI", text: string) {
    const panel = rootRef.current?.querySelector<HTMLElement>("[data-view='home'] main .panel");
    if (!panel) return;
    const note = panel.querySelector(".min");
    const turn = document.createElement("div");
    turn.className = "turn";
    turn.style.marginTop = "0";
    const who = document.createElement("span");
    who.className = "turn-who";
    who.textContent = role;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    if (role === "나") paragraph.style.color = "var(--ink)";
    turn.append(who, paragraph);
    panel.insertBefore(turn, note);
  }

  function applySearchResult(result: SearchPayload) {
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
    window.setTimeout(() => resultSection?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
    trust.append("Trust ");
    const trustNumber = document.createElement("b");
    trustNumber.textContent = String(match.trustScore);
    const grade = document.createElement("span");
    grade.textContent = match.trustScore >= 80 ? "A" : match.trustScore >= 65 ? "B" : "C";
    trust.append(trustNumber, grade);
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
    const stored = window.sessionStorage.getItem(SEARCH_KEY);
    if (!stored) return;
    try {
      applySearchResult(JSON.parse(stored) as SearchPayload);
    } catch {
      window.sessionStorage.removeItem(SEARCH_KEY);
    }
    // The source HTML is regenerated as one immutable view fragment.
    // Reapply the stored backend result whenever that fragment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewHtml]);

  async function runSearch(query?: string) {
    const textarea = rootRef.current?.querySelector<HTMLTextAreaElement>("#q");
    const value = (query ?? textarea?.value ?? "").trim();
    if (!value) return;
    addTurn("나", value);
    if (textarea) textarea.value = "";
    try {
      const previous = window.sessionStorage.getItem(SEARCH_KEY);
      const context = previous ? (JSON.parse(previous) as SearchPayload).criteria : undefined;
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: value, context }),
      });
      if (!response.ok) throw new Error("search_failed");
      const result = (await response.json()) as SearchPayload;
      window.sessionStorage.setItem(SEARCH_KEY, JSON.stringify(result));
      addTurn("GLI AI", [result.answer, result.clarification].filter(Boolean).join("\n"));
      applySearchResult(result);
    } catch {
      addTurn("GLI AI", "검색을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function handleAction(element: HTMLElement) {
    const action = element.dataset.action;
    const value = element.dataset.v;
    switch (action) {
      case "goLand": navigate("/"); break;
      case "goAbout": navigate("/about"); break;
      case "goHome": navigate("/explore"); break;
      case "goCountry": navigate(`/explore?country=${encodeURIComponent(value ?? "ALL")}`); break;
      case "goTxn": navigate(`/explore?txn=${encodeURIComponent(value ?? "ALL")}`); break;
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
      case "pickPrompt": void runSearch(element.dataset.q); break;
      case "resetSearch": {
        window.sessionStorage.removeItem(SEARCH_KEY);
        window.location.reload();
        break;
      }
      case "setGrid": rootRef.current?.querySelector("[data-results] .grid3")?.classList.remove("list"); break;
      case "setList": rootRef.current?.querySelector("[data-results] .grid3")?.classList.add("list"); break;
      case "pickCountry":
      case "pickTxn": navigate(`/explore?filter=${encodeURIComponent(value ?? "ALL")}`); break;
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
      onKeyDown={(event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>("[data-action-keydown='onQueryKey']");
        if (element && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void runSearch();
        }
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: CLAUDE_HEADER_HTML }} />
      <div dangerouslySetInnerHTML={{ __html: viewHtml }} />
      <div dangerouslySetInnerHTML={{ __html: CLAUDE_FOOTER_HTML }} />
    </div>
  );
}
