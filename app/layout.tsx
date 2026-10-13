import type { Metadata } from "next";
import { cookies } from "next/headers";
import { UiLocaleProvider } from "./components/ui-locale-provider";
import { uiLocale, UI_LOCALE_COOKIE } from "../lib/ui-language";
import "./globals.css";
import "./claude-design.css";
import "./generated/claude-consultation.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gli-ai-property-demo.kenwac74.chatgpt.site"),
  title: "GLI | AI Verified Assets",
  description:
    "AI 탐색과 전문가 검토를 결합해 글로벌 자산과 투자 기회를 발견하고 검증하는 플랫폼입니다.",
  openGraph: {
    title: "GLI | AI Verified Assets",
    description: "더 넓게 발견하고, 더 깊게 검증하는 글로벌 투자 플랫폼.",
    images: [{ url: "/og-global-20261002.png", width: 1731, height: 909, alt: "GLI 글로벌 투자 자산" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GLI | AI Verified Assets",
    description: "더 넓게 발견하고, 더 깊게 검증하는 글로벌 투자 플랫폼.",
    images: ["/og-global-20261002.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  return (
    <html lang={locale}>
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
      <body><UiLocaleProvider initialLocale={locale}>{children}</UiLocaleProvider></body>
    </html>
  );
}
