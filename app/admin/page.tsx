import { AlertTriangle, Database, FileCheck2, RefreshCw, Shield } from "lucide-react";
import { SiteHeader } from "../components/site-header";

export default function AdminPage() {
  return <><SiteHeader /><main className="admin-page">
    <div className="admin-head"><div><p className="section-kicker">GLI OPERATIONS</p><h1>검증 운영센터</h1><p>데이터 소스, 수집 실행과 Trust 검토 상태를 관리합니다.</p></div><span className="environment-badge">STAGING</span></div>
    <div className="ops-grid">
      <section><Database size={22} /><span>승인된 데이터 소스</span><strong>0</strong><small>서면 승인 전 자동 수집 잠금</small></section>
      <section><RefreshCw size={22} /><span>최근 수집 실행</span><strong>-</strong><small>승인된 connector 없음</small></section>
      <section><FileCheck2 size={22} /><span>검토 대기 자산</span><strong>8</strong><small>fixture 기반 예비 평가</small></section>
      <section><Shield size={22} /><span>발행된 Trust Report</span><strong>0</strong><small>사람 승인 전 발행 불가</small></section>
    </div>
    <div className="ops-alert"><AlertTriangle size={21} /><div><strong>프로덕션 수집이 잠겨 있습니다</strong><p>소스별 이용 허가, 허용 필드와 이미지 정책을 승인한 뒤 connector를 활성화하세요.</p></div></div>
  </main></>;
}
