import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ExternalLink, Newspaper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { findNewsItem, newsItems } from "../../../lib/news";

export function generateStaticParams() {
  return newsItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = findNewsItem(id);
  return item
    ? { title: `${item.title} | GLI`, description: item.summary }
    : { title: "뉴스 | GLI" };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = findNewsItem(id);
  if (!item) notFound();

  const related = newsItems
    .filter((candidate) => candidate.id !== item.id)
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="news-detail-page">
        <Link className="news-back-link" href="/news">
          <ArrowLeft size={18} /> 뉴스 목록
        </Link>

        <article className="news-detail-article">
          <header>
            <span className="news-category">{item.category}</span>
            <h1>{item.title}</h1>
            <time dateTime={item.dateTime}>
              <CalendarDays size={17} /> {item.date}
            </time>
          </header>

          <div className="news-detail-image">
            <img src={item.image} alt={item.title} />
          </div>

          <div className="news-detail-content">
            {item.lead ? <p className="news-lead">{item.lead}</p> : null}
            {item.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <a
            className="news-source-link"
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            기사 원문 보기 <ExternalLink size={17} />
          </a>
        </article>

        <section className="related-news" aria-labelledby="related-news-title">
          <div>
            <Newspaper size={20} />
            <h2 id="related-news-title">다른 뉴스</h2>
          </div>
          <div className="related-news-grid">
            {related.map((relatedItem) => (
              <Link href={`/news/${relatedItem.id}`} key={relatedItem.id}>
                <span>{relatedItem.category}</span>
                <strong>{relatedItem.title}</strong>
                <time dateTime={relatedItem.dateTime}>{relatedItem.date}</time>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
