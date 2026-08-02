"use client";

import { ArrowRight, CalendarDays, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { newsItems, type NewsCategory } from "../../lib/news";

type NewsFilter = "전체보기" | NewsCategory;

const categories: NewsFilter[] = [
  "전체보기",
  "공지사항",
  "보도자료",
  "인사이트",
  "이벤트",
];

export function NewsClient() {
  const [category, setCategory] = useState<NewsFilter>("전체보기");
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
            <article className="news-card" key={item.id}>
              <Link className="news-card-image" href={`/news/${item.id}`}>
                <img src={item.image} alt="" />
              </Link>
              <div className="news-card-body">
                <span className="news-category">{item.category}</span>
                <h2>
                  <Link href={`/news/${item.id}`}>{item.title}</Link>
                </h2>
                <p>{item.summary}</p>
                <div className="news-card-meta">
                  <span>
                    <CalendarDays size={15} /> {item.date}
                  </span>
                  <Link href={`/news/${item.id}`}>
                    Read More <ArrowRight size={15} />
                  </Link>
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
