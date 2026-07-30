import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gli-ai-property-demo.kenwac74.chatgpt.site"),
  title: "GLI | AI Verified Assets",
  description:
    "동남아 부동산을 대화형 AI로 탐색하고 Trust Score와 검증 요약을 확인하는 GLI 플랫폼입니다.",
  openGraph: {
    title: "GLI | AI Verified Assets",
    description: "캄보디아 부동산, 질문부터 시작하세요.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GLI AI Verified Assets" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GLI | AI Verified Assets",
    description: "캄보디아 부동산, 질문부터 시작하세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
