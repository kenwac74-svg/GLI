import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { NewsClient } from "./news-client";

export const metadata: Metadata = {
  title: "뉴스 | GLI",
  description: "GLI의 최신 소식과 시장 인사이트를 확인하세요.",
};

export default function NewsPage() {
  return (
    <>
      <SiteHeader />
      <main className="information-page">
        <header className="information-hero">
          <p>INSIGHT CENTER</p>
          <h1>GLI NEWSROOM</h1>
          <span>
            GLI의 최신 소식과 시장 리포트, 파트너십 업데이트를 확인하세요.
            <br />
            실물 자산과 새로운 투자 기회가 만나는 현장의 이야기를 전해드립니다.
          </span>
        </header>
        <NewsClient />
      </main>
    </>
  );
}
