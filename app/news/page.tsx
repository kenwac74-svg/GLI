import type { Metadata } from "next";
import { ClaudeDesignShell } from "../components/claude-design-shell";

export const metadata: Metadata = {
  title: "뉴스 | GLI",
  description: "GLI의 최신 소식과 시장 인사이트를 확인하세요.",
};

export default function NewsPage() {
  return <ClaudeDesignShell view="news" />;
}
