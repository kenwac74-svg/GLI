import { Check, CreditCard, LockKeyhole } from "lucide-react";
import { SiteHeader } from "../components/site-header";

const plans = [
  { name: "Explore", price: "29,000", description: "해외 부동산 탐색을 시작하는 개인", features: ["AI 검색 확장", "관심 자산 20개", "기본 Trust 요약", "월간 알림"] },
  { name: "Investor", price: "59,000", description: "여러 자산을 비교하는 적극적 투자자", features: ["무제한 AI 검색", "자산 비교", "전체 Trust Report", "우선 상담 접수"], featured: true },
  { name: "Private", price: "99,000", description: "GLI Direct와 현지 실행을 함께 검토", features: ["Investor 전체 기능", "GLI Direct 브리핑", "전문가 상담", "현장 프로그램 우선 예약"] },
];

export default function MembershipPage() {
  return <><SiteHeader /><main className="membership-page">
    <div className="membership-head"><p className="section-kicker">GLI CASH MEMBERSHIP</p><h1>플랫폼 전체 탐색을 위한 멤버십</h1><p>현금 멤버십은 모든 일반 매물과 GLI Direct 탐색에 적용됩니다. 코인 보상이나 자산별 스테이킹과는 별개의 서비스입니다.</p></div>
    <div className="plan-grid">{plans.map((plan) => <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
      {plan.featured && <span className="recommended">추천</span>}<h2>{plan.name}</h2><p>{plan.description}</p><div className="plan-price"><strong>{plan.price}원</strong><span>/ 월</span></div>
      <ul>{plan.features.map((feature) => <li key={feature}><Check size={17} /> {feature}</li>)}</ul><button type="button"><CreditCard size={18} /> 멤버십 시작</button>
    </article>)}</div>
    <div className="payment-note"><LockKeyhole size={20} /><div><strong>결제 연동 준비 중</strong><p>실제 카드 결제는 공급자 계약과 환불 정책 승인 후 활성화됩니다.</p></div></div>
  </main></>;
}
