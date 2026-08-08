import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <img src="/brand/gli-logo.png" alt="GLI" width={72} height={34} />
          <p>
            AI 탐색과 전문가 검토를 결합해 글로벌 투자 기회를 더 선명하게
            이해할 수 있도록 돕습니다.
          </p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/explore">자산 탐색</Link>
          <Link href="/membership">멤버십</Link>
          <Link href="/my">관심자산</Link>
        </div>
        <div>
          <strong>GLI</strong>
          <Link href="/#about">GLI 소개</Link>
          <Link href="/news">뉴스</Link>
          <a href="/whitepaper/gli-whitepaper.html">GLI 백서</a>
        </div>
        <div>
          <strong>Support</strong>
          <Link href="/notices">공지</Link>
          <Link href="/coming-soon?section=guide">가이드 &amp; FAQ</Link>
          <Link href="/coming-soon?section=contact">고객문의</Link>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© 2026 GLI Gateway Holdings Pte. Ltd.</span>
        <span>Global Lifestyle Investment</span>
      </div>
    </footer>
  );
}
