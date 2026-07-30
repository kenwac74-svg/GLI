import { Bell, CalendarClock, FileText, Heart, LogIn } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { chatGPTSignInPath } from "../chatgpt-auth";

export default function MyGliPage() {
  return <><SiteHeader /><main className="my-page">
    <div className="my-head"><div><p className="section-kicker">MY GLI</p><h1>나의 투자 탐색</h1><p>관심 자산, 리포트와 상담 상태를 한곳에서 관리합니다.</p></div><Link className="login-cta" href={chatGPTSignInPath("/my")}><LogIn size={18} /> ChatGPT로 로그인</Link></div>
    <div className="my-summary"><div><Heart size={21} /><strong>0</strong><span>관심 자산</span></div><div><FileText size={21} /><strong>0</strong><span>보유 리포트</span></div><div><CalendarClock size={21} /><strong>0</strong><span>예정 상담</span></div><div><Bell size={21} /><strong>0</strong><span>새 알림</span></div></div>
    <section className="my-empty"><Heart size={28} /><h2>아직 저장한 자산이 없습니다</h2><p>AI 탐색에서 관심 자산을 추가하면 비교와 변경 알림을 받을 수 있습니다.</p><Link href="/">자산 탐색 시작</Link></section>
  </main></>;
}
