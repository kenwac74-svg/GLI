import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
