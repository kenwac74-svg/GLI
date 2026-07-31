import {
  Bell,
  CalendarClock,
  FileText,
  Heart,
  LogIn,
  UserRoundCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  demoSignInPath,
  getCurrentUser,
  isDemoAuthEnabled,
  signInPath,
  signOutPath,
} from "../auth";
import { SiteHeader } from "../components/site-header";
import { getAsset } from "../../lib/assets-data";
import { loadMemberDashboard } from "../../lib/member-data";
import { ConsultationForm, RemoveFavoriteButton } from "./my-actions";

export const dynamic = "force-dynamic";

const planNames: Record<string, string> = {
  explore: "Explore",
  investor: "Investor",
  private: "Private",
};

export default async function MyGliPage({
  searchParams,
}: {
  searchParams: Promise<{ consult?: string; return_to?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const returnTo =
    query.return_to?.startsWith("/") && !query.return_to.startsWith("//")
      ? query.return_to
      : "/my";

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="my-page">
          <div className="my-head">
            <div>
              <p className="section-kicker">MY GLI</p>
              <h1>나의 투자 탐색</h1>
              <p>관심 자산, 리포트와 상담 상태를 한곳에서 관리합니다.</p>
            </div>
          </div>
          <section className="member-login">
            <UserRoundCheck size={34} />
            <h2>로그인 후 투자 탐색을 이어가세요</h2>
            <p>
              저장한 자산과 상담 신청, 현금 멤버십 상태가 계정에 연결됩니다.
            </p>
            <div className="member-login-actions">
              <Link className="login-cta" href={signInPath(returnTo)}>
                <LogIn size={18} /> ChatGPT로 로그인
              </Link>
              {isDemoAuthEnabled() && (
                <form method="post" action={demoSignInPath(returnTo)}>
                  <button className="demo-login" type="submit">
                    가족용 데모 계정으로 체험
                  </button>
                </form>
              )}
            </div>
            {isDemoAuthEnabled() && (
              <small>
                데모 계정은 가족 시연용 공용 계정이며 실제 결제와 개인정보를
                처리하지 않습니다.
              </small>
            )}
          </section>
        </main>
      </>
    );
  }

  const dashboard = await loadMemberDashboard(user);
  const selectedAsset = query.consult
    ? (await getAsset(query.consult)).asset
    : null;
  const upcomingConsultations = dashboard.consultations.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  );

  return (
    <>
      <SiteHeader />
      <main className="my-page">
        <div className="my-head">
          <div>
            <p className="section-kicker">MY GLI</p>
            <h1>{dashboard.user.displayName ?? "GLI 회원"}님의 투자 탐색</h1>
            <p>관심 자산, 리포트와 상담 상태를 한곳에서 관리합니다.</p>
          </div>
          <Link className="profile-link" href={signOutPath("/my")}>
            {user.authProvider === "demo" ? "가족 공용 데모" : dashboard.user.email}
          </Link>
        </div>

        {dashboard.activeMembership && (
          <section className="membership-status">
            <div>
              <span>ACTIVE CASH MEMBERSHIP</span>
              <strong>
                {planNames[dashboard.activeMembership.planId] ??
                  dashboard.activeMembership.planId}
              </strong>
              <p>
                {dashboard.activeMembership.provider === "DEMO_CASH"
                  ? "청구 없는 데모 멤버십"
                  : "플랫폼 전역 현금 멤버십"}
              </p>
            </div>
            <div>
              <small>이용 기한</small>
              <b>
                {new Date(
                  dashboard.activeMembership.periodEnd,
                ).toLocaleDateString("ko-KR")}
              </b>
            </div>
          </section>
        )}

        <div className="my-summary">
          <div>
            <Heart size={21} />
            <strong>{dashboard.favorites.length}</strong>
            <span>관심 자산</span>
          </div>
          <div>
            <FileText size={21} />
            <strong>{dashboard.favorites.length}</strong>
            <span>Trust 요약</span>
          </div>
          <div>
            <CalendarClock size={21} />
            <strong>{upcomingConsultations.length}</strong>
            <span>진행 상담</span>
          </div>
          <div>
            <Bell size={21} />
            <strong>0</strong>
            <span>새 알림</span>
          </div>
        </div>

        <div className="my-workspace">
          <section className="saved-assets">
            <div className="workflow-section-head">
              <div>
                <span>WATCHLIST</span>
                <h2>관심 자산</h2>
              </div>
              <Link href="/">자산 더 찾기</Link>
            </div>
            {dashboard.favorites.length === 0 ? (
              <div className="my-empty compact">
                <Heart size={26} />
                <h3>아직 저장한 자산이 없습니다</h3>
                <p>자산 상세에서 관심 자산을 추가해 비교를 시작하세요.</p>
                <Link href="/">자산 탐색 시작</Link>
              </div>
            ) : (
              <div className="saved-asset-list">
                {dashboard.favorites.map((asset) => (
                  <article className="saved-asset" key={asset.publicId}>
                    <Link href={`/assets/${asset.publicId}`}>
                      <div className="saved-asset-image">
                        {asset.imageUrl ? (
                          <Image
                            src={asset.imageUrl}
                            alt=""
                            fill
                            sizes="112px"
                            unoptimized
                          />
                        ) : (
                          <span>GLI</span>
                        )}
                      </div>
                      <div>
                        <small>
                          {asset.district ?? asset.city}, {asset.country}
                        </small>
                        <h3>{asset.title}</h3>
                        <p>
                          {(asset.priceMinor / 100).toLocaleString("en-US", {
                            style: "currency",
                            currency: asset.currency,
                            maximumFractionDigits: 0,
                          })}
                          <span>Trust {asset.trustScore}</span>
                        </p>
                      </div>
                    </Link>
                    <RemoveFavoriteButton assetId={asset.publicId} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="consultation-history">
            <div className="workflow-section-head">
              <div>
                <span>REQUESTS</span>
                <h2>상담 진행</h2>
              </div>
            </div>
            {dashboard.consultations.length === 0 ? (
              <p className="empty-copy">접수된 상담이 없습니다.</p>
            ) : (
              <div className="consultation-list">
                {dashboard.consultations.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.listingTitle ?? "일반 투자 상담"}</strong>
                      <p>{item.requestText}</p>
                    </div>
                    <span>{consultationStatus(item.status)}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <ConsultationForm
          assetId={selectedAsset?.id}
          assetTitle={selectedAsset?.title}
        />
      </main>
    </>
  );
}

function consultationStatus(status: string): string {
  if (status === "RECEIVED") return "접수";
  if (status === "CONTACTED") return "담당자 연락 중";
  if (status === "SCHEDULED") return "일정 확정";
  if (status === "COMPLETED") return "완료";
  if (status === "CANCELLED") return "취소";
  return status;
}
