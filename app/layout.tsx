import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLI | AI Verified Assets",
  description:
    "동남아 부동산을 대화형 AI로 탐색하고 Trust Score와 검증 요약을 확인하는 GLI 플랫폼입니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
