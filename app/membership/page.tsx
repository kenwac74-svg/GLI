import { Check, LockKeyhole } from "lucide-react";
import { SiteHeader } from "../components/site-header";
import { MEMBERSHIP_PLANS } from "../../lib/membership-plans";
import { MembershipAction } from "./membership-action";

export const dynamic = "force-dynamic";

export default function MembershipPage() {
  return (
    <>
      <SiteHeader />
      <main className="membership-page">
        <div className="membership-head">
          <p className="section-kicker">GLI CASH MEMBERSHIP</p>
          <h1>플랫폼 전체 탐색을 위한 멤버십</h1>
          <p>
            현금 멤버십은 모든 일반 매물과 GLI Direct 탐색에 적용됩니다. 코인 보상이나
            자산별 스테이킹과는 별개의 서비스입니다.
          </p>
        </div>
        <div className="plan-grid">
          {MEMBERSHIP_PLANS.map((plan) => (
            <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="recommended">추천</span>}
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="plan-price">
                <strong>{plan.price.toLocaleString("ko-KR")}원</strong>
                <span>/ 월</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={17} /> {feature}
                  </li>
                ))}
              </ul>
              <MembershipAction planId={plan.id} />
            </article>
          ))}
        </div>
        <div className="payment-note">
          <LockKeyhole size={20} />
          <div>
            <strong>가족 테스트 결제 환경입니다</strong>
            <p>
              플랜 선택, 결제 확인, 멤버십 활성화까지 전체 흐름을 테스트할 수 있습니다.
              카드 정보는 받지 않으며 실제 금액도 청구되지 않습니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
