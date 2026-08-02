import type { Metadata } from "next";
import { BookOpenCheck, Handshake, Hammer } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "준비 중 | GLI",
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const partners = section === "partners";
  const Icon = partners ? Handshake : BookOpenCheck;
  const title = partners ? "파트너스" : "가이드 & FAQ";
  const description = partners
    ? "GLI의 글로벌 파트너 네트워크와 협력 프로그램을 정리하고 있습니다."
    : "자산 탐색, 멤버십, GLI Cash 이용 방법을 더 쉽게 확인할 수 있도록 준비하고 있습니다.";

  return (
    <>
      <SiteHeader />
      <main className="coming-soon-page">
        <section>
          <div className="coming-soon-icon">
            <Icon size={34} />
          </div>
          <p>GLI INFORMATION CENTER</p>
          <h1>{title}</h1>
          <span>{description}</span>
          <div className="construction-state">
            <Hammer size={17} /> 페이지 준비 중
          </div>
          <Link href="/">자산 탐색으로 돌아가기</Link>
        </section>
      </main>
    </>
  );
}
