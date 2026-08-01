"use client";

import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { useMemo, useState } from "react";

type NewsCategory = "전체보기" | "공지사항" | "보도자료" | "인사이트" | "이벤트";

const categories: NewsCategory[] = [
  "전체보기",
  "공지사항",
  "보도자료",
  "인사이트",
  "이벤트",
];

const newsItems = [
  {
    category: "보도자료",
    date: "2025. 12. 12.",
    image:
      "https://cliimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=5&simg=20251112173648019599aeda6993417521136223.jpg&nmt=7",
    title:
      "RWA 디지털자산화 플랫폼 GLI, 투자 컨설팅 전문기업 'DealFlow'와 전략적 MOU 맺어",
    summary:
      "DealFlow의 동남아 M&A 전문성과 GLI의 RWA 기술을 결합해 자산 소싱 파이프라인을 구축하고, 베트남 리조트·부동산 대상 RWA 파일럿 프로젝트를 공동 추진합니다.",
  },
  {
    category: "보도자료",
    date: "2025. 12. 11.",
    image:
      "https://cgeimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=3&simg=20251211163743054829aeda6993417521136223.jpg&nmt=30",
    title: "GLI Gateway, 태국 레저 대표 브랜드 Seafood Club과 MOU 체결",
    summary:
      "싱가포르 기반 Web3 기술기업 GLI Gateway Holdings는 태국의 대표 호스피탈리티 기업 Seafoodclub Co. Ltd.와 전략적 업무협약을 체결했습니다.",
  },
  {
    category: "보도자료",
    date: "2025. 11. 26.",
    image:
      "https://kinhdoanhvathitruong.net/app/webroot/uploads/files/2025/t11-2025/GLI_Vietnam.jpg",
    title:
      "GLI 베트남과 ERA 베트남, Web3 기반 실물 자산 생태계 구축 협력 양해각서 체결",
    summary:
      "기술과 시장 네트워크를 결합해 새로운 Web3 부동산 모델을 실현하고 글로벌 RWA 생태계를 확장하는 전략적 파트너십입니다.",
  },
  {
    category: "보도자료",
    date: "2025. 11. 20.",
    image:
      "https://cgeimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=3&simg=20251120125706044839aeda6993417521136223.jpg&nmt=23",
    title:
      "싱가포르 GLI, 필리핀 RLC와 PropTech MOU 체결… 동남아 자산 연결 생태계 확장",
    summary:
      "GLI Gateway Holdings가 필리핀 부동산 개발사 RLC 레지던스와 실물 자산 연결성 강화를 위한 전략적 업무협약을 체결했습니다.",
  },
  {
    category: "보도자료",
    date: "2025. 11. 06.",
    image:
      "https://baodoanhnhanonline.net/app/webroot/uploads/files/2025/t11-2025/DealFlow.jpg",
    title:
      "Nền tảng số hóa tài sản thực GLI ký kết MOU chiến lược với DealFlow",
    summary:
      "DealFlow의 동남아 M&A 전문성과 GLI의 RWA 기술을 결합해 프리미엄 자산 공급망을 구축하는 파트너십 소식입니다.",
  },
  {
    category: "인사이트",
    date: "2025. 08. 28.",
    image: "https://veyond.asia/wp-content/uploads/2020/09/01-11.jpg",
    title: "GLI: 베트남 부동산 및 고급 리조트 투자에 새로운 선두주자",
    summary:
      "GLI가 베트남 부동산과 고급 리조트 시장에 제시하는 투자 솔루션과 글로벌 실물 자산 생태계 확장 방향을 소개합니다.",
  },
] as const;

export function NewsClient() {
  const [category, setCategory] = useState<NewsCategory>("전체보기");
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("ko-KR");
    return newsItems.filter((item) => {
      const categoryMatches = category === "전체보기" || item.category === category;
      const queryMatches =
        !clean || `${item.title} ${item.summary}`.toLocaleLowerCase("ko-KR").includes(clean);
      return categoryMatches && queryMatches;
    });
  }, [category, query]);

  return (
    <>
      <div className="news-toolbar">
        <div className="news-categories" aria-label="뉴스 분류">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "is-active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="news-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="검색어를 입력하세요"
          />
        </label>
      </div>

      {visibleItems.length ? (
        <div className="news-grid">
          {visibleItems.map((item) => (
            <article className="news-card" key={item.title}>
              <div className="news-card-image">
                <img src={item.image} alt="" />
              </div>
              <div className="news-card-body">
                <span className="news-category">{item.category}</span>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <div className="news-card-meta">
                  <span>
                    <CalendarDays size={15} /> {item.date}
                  </span>
                  <span>
                    Read More <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="information-empty">검색 결과가 없습니다.</div>
      )}
    </>
  );
}
