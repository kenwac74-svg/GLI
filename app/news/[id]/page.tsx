import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaudeDesignShell } from "../../components/claude-design-shell";
import { findNewsItem, newsItems } from "../../../lib/news";

export function generateStaticParams() {
  return newsItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = findNewsItem(id);
  return item
    ? { title: `${item.title} | GLI`, description: item.summary }
    : { title: "뉴스 | GLI" };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findNewsItem(id)) notFound();
  return <ClaudeDesignShell view="article" articleId={id} />;
}
