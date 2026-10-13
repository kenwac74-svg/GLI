"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { translateUiText, UI_LOCALE_COOKIE, type UiLocale } from "../../lib/ui-language";
import { fixturePosted, fixtureReference } from "../../lib/fixture-display";
import { referenceExchangeRates } from "../../lib/reference-exchange-rates";
import type { ExchangeRateSnapshot } from "../../lib/currency";

const LocaleContext = createContext<{ locale: UiLocale; setLocale: (locale: UiLocale) => void }>({ locale: "ko", setLocale: () => {} });
export function useUiLocale() { return useContext(LocaleContext); }

export function UiLocaleProvider({ initialLocale, children }: { initialLocale: UiLocale; children: React.ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const pathname = usePathname();
  const router = useRouter();
  function setLocale(next: UiLocale) {
    document.cookie = `${UI_LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    updateLocale(next);
    // Re-read cached server-localized asset fields; never start a new search.
    router.refresh();
  }
  useEffect(() => {
    const effectiveLocale = pathname?.startsWith("/admin") ? "ko" : locale;
    document.documentElement.lang = effectiveLocale;
    const texts = new WeakMap<Text, { original: string; projected: string }>();
    const attributes = new WeakMap<Element, Map<string, { original: string; projected: string }>>();
    let snapshot:ExchangeRateSnapshot|null=null;
    let loaded=false,active=true;
    const project = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node as Text;
        if (text.parentElement?.closest("script,style,textarea,[data-user-content],input,[data-fixture-price],[data-fixture-posted],[data-fixture-fx]")) continue;
        const previous = texts.get(text);
        const original = previous && text.data === previous.projected ? previous.original : text.data;
        const projected = translateUiText(original, effectiveLocale);
        texts.set(text, { original, projected });
        if (text.data !== projected) text.data = projected;
      }
      document.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach(element => {
        const saved = attributes.get(element) ?? new Map();
        attributes.set(element, saved);
        for (const name of ["placeholder", "aria-label", "title", "alt"]) {
          const current = element.getAttribute(name);
          if (current === null) continue;
          const previous = saved.get(name);
          const original = previous && current === previous.projected ? previous.original : current;
          const projected = translateUiText(original, effectiveLocale);
          saved.set(name, { original, projected });
          if (current !== projected) element.setAttribute(name, projected);
        }
      });
      document.querySelectorAll<HTMLElement>("[data-action='goSoonLang'],[data-locale-switch]").forEach(element => {
        const label = effectiveLocale === "ko" ? "English" : "한국어";
        if (element.getAttribute("title") !== label) element.setAttribute("title", label);
      });
      document.querySelectorAll<HTMLElement>('[data-fixture-posted]').forEach(element=>{
        const label=fixturePosted(element.dataset.fixturePosted!,effectiveLocale);
        if(element.textContent!==label)element.textContent=label;
      });
      document.querySelectorAll<HTMLElement>('[data-fixture-fx]').forEach(element=>{
        const price=element.closest('[data-view="detail"]')?.querySelector<HTMLElement>('[data-fixture-price]')?.dataset.fixturePrice;
        element.hidden=!snapshot || !price || !/^(USD|\$|RM|₱)\s*[\d,.]/.test(price);
        if(snapshot && !element.hidden) {
          const text=`${effectiveLocale==='ko'?'참고 환율':'Reference FX'} · ${new Date(snapshot.updatedAt).toLocaleString(effectiveLocale==='ko'?'ko-KR':'en-US',{timeZone:'Asia/Seoul'})}${effectiveLocale==='en'?' KST':''}`;
          if(element.textContent!==text)element.textContent=text;
        }
      });
      document.querySelectorAll<HTMLElement>('[data-fixture-price]').forEach(element=>{
        const price=element.dataset.fixturePrice!;
        // Unsupported/absent source prices retain their original information state.
        if(!/^(USD|\$|RM|₱)\s*[\d,.]/.test(price))return;
        const label=snapshot?fixtureReference(price,element.dataset.fixturePeriod??'',effectiveLocale,snapshot.rates):null;
        const text=label ?? (effectiveLocale==='en'?(loaded?'Conversion unavailable · original price shown':'Loading reference exchange rate'):(loaded?'원화 환산 미확인 · 원문 가격 표시':'참고 환율 조회 중'));
        if(element.firstChild?.textContent!==text || element.firstChild?.nodeType!==Node.TEXT_NODE)element.replaceChildren(document.createTextNode(text));
        if(text && snapshot) {
          const basis=`${effectiveLocale==='ko'?'참고 환율':'Reference FX'} · ${new Date(snapshot.updatedAt).toLocaleString(effectiveLocale==='ko'?'ko-KR':'en-US',{timeZone:'Asia/Seoul'})}${effectiveLocale==='en'?' KST':''}`;
          let note=element.querySelector('small');
          if(!note){note=document.createElement('small');note.style.cssText='display:block;font-size:11px;line-height:1.5';element.append(note);}
          if(note.textContent!==basis)note.textContent=basis;
        }
      });
    };
    // The Claude source is frozen HTML; project text in place without changing
    // element hierarchy, CSS, links, prices, form values or handlers.
    project();
    const observer = new MutationObserver(() => { observer.disconnect(); project(); observe(); });
    const observe = () => observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title", "alt"] });
    observe();
    if(document.querySelector('[data-fixture-price]')) void referenceExchangeRates().then(result=>{
      if(!active)return;
      snapshot=result;loaded=true;observer.disconnect();project();observe();
    });
    return () => {
      active=false;
      observer.disconnect();
      // Restore the original text before changing locale, not an inverse dictionary.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if ((node as Text).parentElement?.closest('[data-user-content]')) continue;
        const saved = texts.get(node as Text);
        if (saved && (node as Text).data === saved.projected) (node as Text).data = saved.original;
      }
      document.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach(element => {
        for (const [name, saved] of attributes.get(element) ?? []) if (element.getAttribute(name) === saved.projected) element.setAttribute(name, saved.original);
      });
    };
  }, [locale, pathname]);
  useEffect(() => {
    const switchLocale = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest("[data-action='goSoonLang'],[data-locale-switch]");
      if (!element) return;
      if (window.location.pathname.startsWith("/admin")) return;
      event.preventDefault(); event.stopPropagation();
      setLocale(locale === "ko" ? "en" : "ko");
    };
    document.addEventListener("click", switchLocale, true);
    return () => document.removeEventListener("click", switchLocale, true);
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}
