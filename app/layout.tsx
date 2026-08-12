import type { Metadata } from "next";
import "./globals.css";
import "./claude-design.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gli-ai-property-demo.kenwac74.chatgpt.site"),
  title: "GLI | AI Verified Assets",
  description:
    "AI 탐색과 전문가 검토를 결합해 글로벌 자산과 투자 기회를 발견하고 검증하는 플랫폼입니다.",
  openGraph: {
    title: "GLI | AI Verified Assets",
    description: "더 넓게 발견하고, 더 깊게 검증하는 글로벌 투자 플랫폼.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GLI AI Verified Assets" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GLI | AI Verified Assets",
    description: "더 넓게 발견하고, 더 깊게 검증하는 글로벌 투자 플랫폼.",
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
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
