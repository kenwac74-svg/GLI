import { LogOut, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, signOutPath } from "../auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand-link" href="/" aria-label="GLI 홈">
          <span className="brand-mark">GLI</span>
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
          </nav>
        </details>
      </div>
    </header>
  );
}
