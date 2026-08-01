"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import {
  MEMBERSHIP_PLANS,
  getMembershipOffer,
  type BillingCycle,
} from "../../lib/membership-plans";
import { MembershipAction } from "./membership-action";

export function MembershipPlansClient() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <>
      <div className="billing-cycle-control" role="group" aria-label="결제 주기">
        <button
          type="button"
          className={billingCycle === "monthly" ? "is-active" : ""}
          onClick={() => setBillingCycle("monthly")}
        >
          월간
        </button>
        <button
          type="button"
          className={billingCycle === "yearly" ? "is-active" : ""}
          onClick={() => setBillingCycle("yearly")}
        >
          연간 할인
        </button>
      </div>

      <div className="plan-grid">
        {MEMBERSHIP_PLANS.map((plan) => {
          const offer = getMembershipOffer(plan.id, billingCycle);
          return (
            <article
              className={`plan-card ${plan.featured ? "featured" : ""}`}
              key={plan.id}
            >
              {plan.featured ? <span className="recommended">추천</span> : null}
              <div className="plan-card-heading">
                <h2>{plan.name}</h2>
                <span>{plan.includedAssetTierLabel}</span>
              </div>
              <p>{plan.description}</p>
              <div className="plan-price">
                <strong>{offer.amountKrw.toLocaleString("ko-KR")}원</strong>
                <span>/ {billingCycle === "monthly" ? "월" : "년"}</span>
                <small>${offer.amountUsd.toFixed(offer.amountUsd % 1 ? 2 : 0)}</small>
              </div>
              {billingCycle === "yearly" ? (
                <p className="annual-saving">
                  연간권 {offer.discountPercent}% 할인 적용
                </p>
              ) : null}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={17} /> {feature}
                  </li>
                ))}
              </ul>
              <MembershipAction planId={plan.id} billingCycle={billingCycle} />
            </article>
          );
        })}
      </div>
    </>
  );
}
