import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <img src="/brand/gli-logo.png" alt="GLI" width={72} height={34} />
          <strong>Global Lifestyle Investment</strong>
          <p>
            해외 투자 자산과 GLI 직접 발굴 프로젝트를 AI로 탐색하고 검증
            정보를 확인하는 플랫폼입니다.
          </p>
        </div>
        <div>
          <strong>탐색</strong>
          <Link href="/explore">자산 탐색</Link>
          <Link href="/membership">멤버십</Link>
        </div>
        <div>
          <strong>문의와 안내</strong>
          <Link href="/#about">GLI 소개</Link>
          <Link href="/coming-soon?section=contact">고객문의</Link>
          <Link href="/notices">공지</Link>
          <Link href="/coming-soon?section=guide">가이드 &amp; FAQ</Link>
          <Link href="/news">뉴스</Link>
          <a href="/whitepaper/gli-whitepaper.html">GLI 백서</a>
        </div>
        <div>
          <strong>내 계정</strong>
          <Link href="/my">MY GLI</Link>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>
          © 2026 GLI Gateway Holdings Pte. Ltd. 본 서비스는 GLI 싱가포르
          본사가 운영하며, 플랫폼과 검증 기술은 ㈜솔리드넥스가 개발·공급하고
          관련 특허를 보유합니다.
        </span>
        <span>개인정보처리방침 · 이용약관</span>
      </div>
    </footer>
  );
}
