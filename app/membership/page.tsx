import { LockKeyhole } from "lucide-react";
import { SiteHeader } from "../components/site-header";
import { MembershipPlansClient } from "./membership-plans-client";

export const dynamic = "force-dynamic";

export default function MembershipPage() {
  return (
    <>
      <SiteHeader />
      <main className="membership-page">
        <div className="membership-head">
          <p className="section-kicker">GLI MEMBERSHIP</p>
          <h1>플랫폼 전체 탐색을 위한 멤버십</h1>
          <p>
            멤버십은 플랫폼 전체의 탐색과 정보 열람 범위에 적용됩니다. GLI Cash로
            구매하는 자산별 이용권 및 향후 코인 서비스와는 별개의 정책입니다.
          </p>
        </div>
        <MembershipPlansClient />
        <p className="membership-upgrade-note">
          Explorer에서 Investor로 변경하면 월 기준 차액은 $1.00(1,500원)입니다.
          상위 멤버십은 해당 자산 정보 등급과 모든 하위 등급을 포함합니다.
        </p>
        <div className="payment-note">
          <LockKeyhole size={20} />
          <div>
            <strong>결제 과정 미리보기</strong>
            <p>
              플랜 선택, 결제 확인, 멤버십 활성화까지의 화면 흐름을 확인할 수 있습니다.
              카드 정보는 받지 않으며 실제 금액도 청구되지 않습니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
