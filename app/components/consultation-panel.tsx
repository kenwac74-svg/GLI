"use client";

// GLI-052-R: JSX/event adaptation of the received Claude consultation template.
// No fixture responder, provider SDK, local ranking or QA controls belong here.
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, ChevronDown, MapPin, MessageCircle, X } from "lucide-react";
import { answerParagraphs, candidateConverted, candidatePrice, conditionChips, summaryOf, trustGrade,
  type Candidate, type RuntimeTurn } from "../../lib/consultation-view";

export type ConsultationHandle = { arm: (followup: boolean) => void; arriving: () => void; cancel: () => void };
type Follow = { kind: "hero" | "follow"; start: number; y: number; top: number; acc: number; frozen: boolean };
type Props = {
  turns: RuntimeTurn[]; busy: boolean; loading: boolean; error: boolean;
  value: string; selected: Candidate | null;
  onValue: (value: string) => void; onSend: () => void; onClearPick: () => void;
  onResults: () => void; onAsset: (id: string) => void; onConsult: () => void;
};

export const ConsultationPanel = forwardRef<ConsultationHandle, Props>(function ConsultationPanel(p, ref) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newAnswer, setNewAnswer] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const follow = useRef<Follow | null>(null);
  const lastAnswer = useRef<string | null>(null);
  const programY = useRef<number | null>(null);
  const completed = p.turns.some(turn => turn.id.endsWith("-answer"));
  const cut = Math.max(0, p.turns.length - 2);

  function rebase() {
    const f = follow.current;
    if (f && !f.frozen) { f.y = window.scrollY; f.top = composer.current?.getBoundingClientRect().top ?? 0; }
  }
  function check() {
    const f = follow.current;
    if (!f || f.frozen) return;
    if (programY.current !== null && Math.abs(scrollY - programY.current) < 2) { rebase(); return; }
    const y = window.scrollY;
    const top = composer.current?.getBoundingClientRect().top ?? 0;
    if (f.kind === "hero") { if (Math.abs(y - f.start) > 48) follow.current = null; }
    else {
      const dy = y - f.y;
      if (Math.abs(dy + top - f.top) < 12) f.acc += dy;
      if (Math.abs(f.acc) > 48) follow.current = null;
    }
    f.y = y; f.top = top;
  }
  function jump(element: HTMLElement | null) {
    follow.current = null;
    if (!element) return;
    programY.current = Math.max(0, Math.round(element.getBoundingClientRect().top + scrollY - 88));
    window.scrollTo({ top: programY.current, behavior: "instant" });
    setNewAnswer(false);
  }
  function latestAnswer() {
    return Array.from(container.current?.parentElement?.querySelectorAll<HTMLElement>("[data-turn='ai']") ?? []).at(-1) ?? null;
  }

  useImperativeHandle(ref, () => ({
    arm(isFollowup) {
      const rect = composer.current?.getBoundingClientRect();
      const enabled = !isFollowup || Boolean(rect && rect.top < innerHeight && rect.bottom > 0);
      follow.current = enabled ? { kind: isFollowup ? "follow" : "hero", start: scrollY, y: scrollY, top: rect?.top ?? 0, acc: 0, frozen: false } : null;
      programY.current = null;
      setNewAnswer(false);
    },
    arriving() { check(); if (follow.current) follow.current.frozen = true; },
    cancel() { follow.current = null; },
  }));

  useEffect(() => {
    const onScroll = () => {
      check();
      const r = latestAnswer()?.getBoundingClientRect();
      if (r && r.top >= 56 && r.top <= innerHeight - 96) setNewAnswer(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const answer = p.turns.findLast(turn => turn.id.endsWith("-answer"));
    if (answer && answer.id !== lastAnswer.current) {
      lastAnswer.current = answer.id;
      const el = latestAnswer();
      const rect = el?.getBoundingClientRect();
      const shouldFollow = Boolean(follow.current);
      follow.current = null;
      if (rect && !(rect.top >= 56 && rect.top <= innerHeight - 96)) {
        if (shouldFollow) jump(el);
        else setNewAnswer(true);
      }
    } else rebase();
  }, [p.turns, p.busy, historyOpen]);

  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = "auto"; input.current.style.height = `${Math.min(input.current.scrollHeight, 168)}px`; }
  }, [p.value]);

  function cites(turn: RuntimeTurn) {
    if (!turn.result) return null;
    const s = summaryOf(turn.result);
    if (!s.citations.length && !s.pending) return null;
    const chips = <>{s.citations.map((c, i) => c.url
      ? <a key={i} className="cite" href={c.url} title={turn.result?.matches.find(a => a.id === c.assetId)?.title} target="_blank" rel="noopener noreferrer">{[s.citations.some(other => other.assetId !== c.assetId) ? `${c.rank}위` : "", c.label || c.sourceName, c.sourceName !== c.label ? c.sourceName : ""].filter(Boolean).join(" · ")}<ArrowUpRight size={13} strokeWidth={2} /></a>
      : <span key={i} className="cite cite-flat">{c.label || c.sourceName}</span>)}
      {s.pending > 0 && <span className="cite cite-flat">원문 자료 조사 예정 {s.pending}건</span>}</>;
    return <><div className="cites cites-full"><span className="cites-l">출처</span>{chips}</div>
      <details className="cites-m"><summary>{[s.citations.length ? `출처 ${s.citations.length}건` : "", s.pending ? `원문 자료 조사 예정 ${s.pending}건` : ""].filter(Boolean).join(" · ")}</summary><div className="cites">{chips}</div></details></>;
  }

  return <>
    <div ref={container} style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 52, height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r)", background: "var(--green-100)", color: "var(--green-700)" }}><MessageCircle size={24} strokeWidth={1.7} /></div>
      <div><div className="kicker" style={{ color: "var(--green)" }}>GLI AI Investment Advisor</div><h2 style={{ fontSize: 26 }}>조건을 이어서 상담하세요</h2></div>
    </div>
    {cut > 0 && <button type="button" className="hist-tog" aria-expanded={historyOpen} onClick={() => { follow.current = null; setHistoryOpen(!historyOpen); }}><ChevronDown size={18} />{historyOpen ? "이전 대화 접기" : `이전 대화 ${cut}개 보기`}</button>}
    {p.turns.length === 0 && <div className="turn" data-turn="ai"><span className="turn-who">GLI AI</span><div className="turn-body"><p>찾으시는 목적과 예산을 편하게 말씀해 주세요. 조건을 정리해 검토할 후보와 확인할 위험을 함께 보여드립니다.</p></div></div>}
    {p.turns.map((turn, index) => {
      const ai = turn.role === "GLI AI";
      const s = turn.result ? summaryOf(turn.result) : null;
      const chips = conditionChips(turn.result?.criteria);
      return <div key={turn.id} className="turn" data-runtime-turn={turn.id} data-turn={ai ? "ai" : "me"} hidden={!historyOpen && index < cut} style={{ marginTop: 0, display: !historyOpen && index < cut ? "none" : undefined }}>
        <span className="turn-who" style={{ color: ai ? "var(--green-700)" : "var(--ink-2)" }}>{ai ? "GLI AI" : "고객"}</span>
        <div><div className="turn-body">{answerParagraphs(turn.text).map((paragraph, i) => <p key={i} style={ai ? { color: "var(--ink-2)", whiteSpace: "pre-wrap" } : { fontWeight: 600 }}>{paragraph}</p>)}</div>
          {cites(turn)}
          {turn.onAsset && <p className="on-asset"><MapPin size={15} />{turn.onAsset} 기준</p>}
          {chips.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11 }}>{chips.map(chip => <span className="aitag" key={chip}>{chip}</span>)}</div>}
          {s && s.leads.length > 0 && <div className="leads">
            <div className="leads-h"><b>{s.mode === "review" ? "검토한 후보" : `추천 순위 TOP ${s.leads.length}`}</b><span>{s.mode === "search" ? `조건에 맞는 후보 ${s.count}건` : ""}</span></div>
            {s.leads.map(({ asset, rank }) => <div className="lead" key={asset.id} data-summary-id={asset.id}>
              <div className="lead-t"><a href={`#asset-${asset.id}`} onClick={e => { e.preventDefault(); follow.current = null; p.onAsset(asset.id); }}><span className="lead-rk">{rank}위</span>{asset.title}</a><p>{asset.matchReasons?.join(" · ")}</p></div>
              <div className="lead-n"><small>{asset.priceLabel ?? (asset.transaction === "rent" ? "월 임대료" : "매매가")}</small><b>{candidatePrice(asset)}</b><span>{candidateConverted(asset, turn.result?.rate)}</span><span className="lead-g">Trust {trustGrade(asset.trustScore)}</span></div>
              <button type="button" className="lead-thumb" onClick={() => { follow.current = null; p.onAsset(asset.id); }} aria-label={`${asset.title} 목록에서 보기`}><i style={{ backgroundImage: `url(${JSON.stringify(asset.image)})` }} /></button>
            </div>)}
            {s.mode === "search" && <button type="button" className="lead-more" onClick={() => { follow.current = null; p.onResults(); }}>전체 결과 {s.count}건 보기<ChevronDown size={17} /></button>}
          </div>}
          {turn.resultUpdate && <p className="turn-note" data-result-update><span>{turn.resultUpdate}</span><button type="button" onClick={() => { follow.current = null; p.onResults(); }}>갱신된 후보 보기</button></p>}
          {s && s.missing > 0 && <p className="turn-miss" role="status">선택한 자산 · 지금 자료를 불러올 수 없습니다. 후보 목록은 그대로입니다.</p>}
        </div>
      </div>;
    })}
    {p.busy && <div className="turn" style={{ marginTop: 0 }}><span className="turn-who">GLI AI</span><p className="dots" style={{ color: "var(--ink-2)" }}><span /><span /><span />{p.loading ? "GLI AI가 답변을 정리하고 있습니다" : "조건을 이해하고 후보를 찾고 있습니다"}</p></div>}
    <form ref={composer} className={`fw${p.loading ? " is-loading" : ""}${p.error ? " is-error" : ""}`} data-followup-composer hidden={!completed} style={{ display: !completed ? "none" : undefined }} aria-busy={p.loading} onSubmit={e => { e.preventDefault(); if (!p.busy && p.value.trim()) p.onSend(); }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><label className="fw-label" htmlFor="fq">후속 질문</label>
        {p.selected && <span className="pickchip">{p.selected.title} 기준<button type="button" aria-label="선택한 자산 해제" onClick={p.onClearPick}><i><X size={14} strokeWidth={2.4} /></i></button></span>}
      </div>
      <div className="fw-row"><textarea ref={input} id="fq" rows={1} data-followup-input aria-label="후속 질문" placeholder="이어서 궁금한 점을 물어보세요" value={p.value} disabled={p.busy} onChange={e => p.onValue(e.target.value)} onKeyDown={e => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!p.busy && p.value.trim()) p.onSend(); }
      }} /><button type="submit" className="btn btn-p fw-send" data-action="runFollowUp" aria-label="후속 질문 보내기" disabled={p.busy || !p.value.trim()}>{p.error ? "다시 보내기" : "보내기"}</button></div>
      <p className="fw-status" data-followup-status role="status" aria-live="polite">{p.loading ? "GLI AI가 답변을 정리하고 있습니다" : p.error ? "답변을 불러오지 못했습니다. 다시 보내 주세요." : ""}</p>
    </form>
    {completed && <p className="fw-alt">현지 확인이 필요한 질문은 GLI 담당자가 직접 답합니다<button type="button" onClick={p.onConsult}>전문가 상담 신청</button></p>}
    {newAnswer && <button type="button" className="newans" onClick={() => jump(latestAnswer())}><ArrowDown size={16} />새 답변 보기</button>}
  </>;
});
