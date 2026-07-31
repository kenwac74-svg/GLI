import { CreditCard, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "../../auth";
import { SiteHeader } from "../../components/site-header";
import { getCashCheckout } from "../../../db/membership-billing";
import { ensureMemberContext } from "../../../lib/member-data";
import { getMembershipPlan } from "../../../lib/membership-plans";
import { CheckoutAction } from "./checkout-action";

export const dynamic = "force-dynamic";

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="checkout-page">
          <section className="checkout-empty">
            <LockKeyhole size={28} />
            <h1>로그인이 필요합니다</h1>
            <p>멤버십 페이지에서 로그인한 뒤 플랜을 다시 선택해 주세요.</p>
            <Link href="/membership">멤버십으로 돌아가기</Link>
          </section>
        </main>
      </>
    );
  }

  const context = await ensureMemberContext(user);
  const checkout = id
    ? await getCashCheckout(context.database, id, context.workflowUser.id)
    : null;

  if (!checkout) {
    return (
      <>
        <SiteHeader />
        <main className="checkout-page">
          <section className="checkout-empty">
            <CreditCard size={28} />
            <h1>결제 세션을 찾을 수 없습니다</h1>
            <p>플랜을 다시 선택하면 새 결제 세션이 생성됩니다.</p>
            <Link href="/membership">플랜 다시 선택</Link>
          </section>
        </main>
      </>
    );
  }

  const plan = getMembershipPlan(checkout.planId);
  const isComplete = checkout.status === "COMPLETED";
  const isUsable = checkout.status === "PENDING";

  return (
    <>
      <SiteHeader />
      <main className="checkout-page">
        <div className="checkout-head">
          <p className="section-kicker">CASH MEMBERSHIP CHECKOUT</p>
          <h1>멤버십 결제 확인</h1>
          <p>선택한 플랜과 이용 금액을 확인하세요.</p>
        </div>
        <section className="checkout-shell">
          <div className="checkout-summary">
            <span>선택 플랜</span>
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
          <div className="checkout-payment">
            <div>
              <span>월 이용 금액</span>
              <strong>{plan.price.toLocaleString("ko-KR")}원</strong>
            </div>
            <dl>
              <div>
                <dt>결제 방식</dt>
                <dd>현금 멤버십 테스트</dd>
              </div>
              <div>
                <dt>이용 기간</dt>
                <dd>활성화일로부터 30일</dd>
              </div>
              <div>
                <dt>자동 갱신</dt>
                <dd>테스트 환경에서는 사용 안 함</dd>
              </div>
            </dl>
            {isComplete ? (
              <div className="checkout-complete compact">
                <strong>이미 활성화된 결제입니다</strong>
                <Link href="/my">MY GLI에서 확인</Link>
              </div>
            ) : isUsable ? (
              <CheckoutAction checkoutId={checkout.id} />
            ) : (
              <div className="checkout-expired">
                <strong>결제 세션이 만료되었습니다</strong>
                <Link href="/membership">플랜 다시 선택</Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
