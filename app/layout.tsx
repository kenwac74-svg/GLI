import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gli-ai-property-demo.kenwac74.chatgpt.site"),
  title: "GLI | AI Verified Assets",
  description:
    "해외 투자 자산과 GLI 직접 발굴 프로젝트를 AI로 탐색하고 검증 정보를 확인하는 글로벌 플랫폼입니다.",
  openGraph: {
    title: "GLI | AI Verified Assets",
    description: "국가와 자산의 경계를 넘어, 검증된 투자 기회를 탐색하세요.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GLI AI Verified Assets" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GLI | AI Verified Assets",
    description: "국가와 자산의 경계를 넘어, 검증된 투자 기회를 탐색하세요.",
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
