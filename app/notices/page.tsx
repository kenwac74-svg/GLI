import type { Metadata } from "next";
import { CalendarDays, Megaphone, Pin } from "lucide-react";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "공지 | GLI",
  description: "GLI 서비스의 주요 공지와 운영 안내입니다.",
};

const notices = [
  {
    type: "중요",
    title: "GLI 서비스 이용약관 개정 사전 안내",
    summary: "서비스 범위 확대에 따른 이용약관 개정 예정 사항을 안내드립니다.",
    date: "2026. 07. 28.",
    pinned: true,
  },
  {
    type: "안내",
    title: "AI 자산 탐색 기능 업데이트 안내",
    summary: "국가와 자산 범주를 함께 탐색할 수 있도록 검색 경험이 개선됩니다.",
    date: "2026. 07. 24.",
    pinned: true,
  },
  {
    type: "안내",
    title: "GLI Cash 이용 정책 사전 안내",
    summary: "GLI 서비스와 상품에 사용할 수 있는 선불 이용권 정책을 준비하고 있습니다.",
    date: "2026. 07. 18.",
    pinned: false,
  },
  {
    type: "점검",
    title: "서비스 정기 점검 예정 안내",
    summary: "보다 안정적인 서비스 제공을 위한 시스템 점검이 예정되어 있습니다.",
    date: "2026. 07. 10.",
    pinned: false,
  },
];

export default function NoticesPage() {
  return (
    <>
      <SiteHeader />
      <main className="information-page notices-page">
        <header className="information-hero compact">
          <p>NOTICE CENTER</p>
          <h1>공지</h1>
          <span>GLI 서비스의 주요 변경 사항과 운영 안내를 확인하세요.</span>
        </header>

        <div className="notice-summary">
          <Megaphone size={20} />
          <div>
            <strong>주요 공지</strong>
            <span>중요한 서비스 안내를 우선 확인할 수 있습니다.</span>
          </div>
        </div>

        <section className="notice-list" aria-label="공지 목록">
          <div className="notice-list-head">
            <span>구분</span>
            <span>제목</span>
            <span>등록일</span>
          </div>
          {notices.map((notice) => (
            <article key={notice.title}>
              <span className={`notice-type ${notice.pinned ? "is-important" : ""}`}>
                {notice.pinned ? <Pin size={13} /> : null}
                {notice.type}
              </span>
              <div>
                <h2>{notice.title}</h2>
                <p>{notice.summary}</p>
              </div>
              <time>
                <CalendarDays size={15} /> {notice.date}
              </time>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
