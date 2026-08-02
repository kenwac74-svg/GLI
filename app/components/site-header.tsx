import { ChevronDown, LogOut, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { DEMO_ADMIN_EMAIL, getCurrentUser, signOutPath } from "../auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand-link" href="/" aria-label="GLI 홈">
          <img
            className="brand-logo"
            src="/brand/gli-logo.png"
            alt="GLI"
            width={65}
            height={30}
          />
          <span className="brand-copy">
            <strong>Global Lifestyle Investment</strong>
            <small>AI Verified Assets</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <Link href="/">
            <Search size={16} /> 자산 탐색
          </Link>
          <Link href="/membership">멤버십</Link>
          <Link href="/my">MY GLI</Link>
          <details className="center-menu">
            <summary>
              안내센터 <ChevronDown size={15} />
            </summary>
            <div className="center-menu-panel">
              <Link href="/notices">공지</Link>
              <Link href="/coming-soon?section=guide">가이드 &amp; FAQ</Link>
              <Link href="/news">뉴스</Link>
              <Link href="/coming-soon?section=partners">파트너스</Link>
              <a href="/whitepaper/gli-whitepaper.html">GLI 백서</a>
            </div>
          </details>
          {user?.email === DEMO_ADMIN_EMAIL ? (
            <Link href="/admin">운영</Link>
          ) : null}
        </nav>
        {user ? (
          <Link
            className="account-button"
            href={signOutPath("/")}
            title={`${user.displayName} 로그아웃`}
          >
            <LogOut size={17} />
            <span>로그아웃</span>
          </Link>
        ) : (
          <Link className="account-button" href="/my">
            <UserRound size={17} />
            <span>로그인</span>
          </Link>
        )}
        <details className="mobile-menu">
          <summary aria-label="메뉴 열기">
            <Menu size={21} />
          </summary>
          <nav aria-label="모바일 메뉴">
            <Link href="/">자산 탐색</Link>
            <Link href="/membership">멤버십</Link>
            <Link href="/my">MY GLI</Link>
            <span className="mobile-menu-label">안내센터</span>
            <Link href="/notices">공지</Link>
            <Link href="/coming-soon?section=guide">가이드 &amp; FAQ</Link>
            <Link href="/news">뉴스</Link>
            <Link href="/coming-soon?section=partners">파트너스</Link>
            <a href="/whitepaper/gli-whitepaper.html">GLI 백서</a>
            {user?.email === DEMO_ADMIN_EMAIL ? (
              <Link href="/admin">운영</Link>
            ) : null}
          </nav>
        </details>
      </div>
    </header>
  );
}
