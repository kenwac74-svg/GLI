import { ArrowLeft, DatabaseZap, ExternalLink, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSourceManagementDetail } from "../../../../db/operations";
import { ensureMemberContext } from "../../../../lib/member-data";
import { getCurrentUser } from "../../../auth";
import { SiteHeader } from "../../../components/site-header";
import { PartnerFeedImportForm } from "./partner-feed-import-form";
import { SourceConfigForm } from "./source-config-form";

export const dynamic = "force-dynamic";

export default async function SourceConfigurationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") {
    return (
      <>
        <SiteHeader />
        <main className="admin-page">
          <section className="admin-access">
            <LockKeyhole size={28} />
            <p className="section-kicker">SOURCE OPERATIONS</p>
            <h1>운영자 권한이 필요합니다</h1>
            <p>데이터 소스 승인은 운영 관리자만 검토할 수 있습니다.</p>
            <div>
              <Link href="/admin">운영센터로 돌아가기</Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  let source;
  try {
    source = await getSourceManagementDetail(
      context.database,
      slug,
      context.workflowUser.id,
    );
  } catch {
    notFound();
  }

  const demoReadOnly = context.authUser.authProvider === "demo";
  return (
    <>
      <SiteHeader />
      <main className="admin-page source-config-page">
        <Link className="source-config-back" href="/admin">
          <ArrowLeft size={16} />
          운영센터
        </Link>
        <div className="admin-head">
          <div>
            <p className="section-kicker">SOURCE ONBOARDING</p>
            <h1>{source.nameInternal}</h1>
            <p>
              서면 이용 승인과 기술 연결 범위를 함께 기록한 뒤에만 수집을
              활성화합니다.
            </p>
          </div>
          <span
            className={`source-status status-${source.approvalStatus.toLowerCase()}`}
          >
            {source.approvalStatus}
          </span>
        </div>

        {demoReadOnly ? (
          <div className="source-demo-notice">
            공개 데모에서는 입력 검토만 시뮬레이션하며 실제 승인 상태와 연결
            설정은 변경하지 않습니다.
          </div>
        ) : null}

        <div className="source-config-layout">
          <section className="ops-workbench source-config-summary">
            <div className="ops-section-head">
              <div>
                <p className="section-kicker">SOURCE RECORD</p>
                <h2>등록 정보</h2>
              </div>
              <DatabaseZap size={22} />
            </div>
            <dl>
              <div>
                <dt>국가</dt>
                <dd>{source.country}</dd>
              </div>
              <div>
                <dt>커넥터</dt>
                <dd>{source.connectorKind}</dd>
              </div>
              <div>
                <dt>허용 호스트</dt>
                <dd>{source.allowedHosts.join(", ") || "미설정"}</dd>
              </div>
              <div>
                <dt>표준 필드</dt>
                <dd>{source.permittedFields.length}개</dd>
              </div>
              <div>
                <dt>정책 검토</dt>
                <dd>{formatDate(source.policyReviewedAt)}</dd>
              </div>
              <div>
                <dt>승인 만료</dt>
                <dd>{formatDate(source.approvalExpiresAt)}</dd>
              </div>
            </dl>
            <a href={source.baseUrl} target="_blank" rel="noreferrer">
              원본 사이트 확인
              <ExternalLink size={15} />
            </a>
          </section>

          <section className="ops-workbench">
            <div className="ops-section-head">
              <div>
                <p className="section-kicker">APPROVAL & CONNECTION</p>
                <h2>승인형 피드 설정</h2>
              </div>
            </div>
            <SourceConfigForm source={source} demoReadOnly={demoReadOnly} />
          </section>
        </div>

        <section className="ops-workbench source-import-panel">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">AUTHORIZED DATA IMPORT</p>
              <h2>파트너 제공 자료 반입</h2>
            </div>
            <DatabaseZap size={22} />
          </div>
          <p>
            승인된 소스가 제공한 JSON 또는 CSV 파일을 원본 보관한 뒤
            정규화, 중복 확인과 개인정보 차단을 거쳐 검토 대기 자산으로
            반입합니다.
          </p>
          <PartnerFeedImportForm
            sourceSlug={source.slug}
            enabled={
              source.approvalStatus === "APPROVED" &&
              source.connectorKind === "LICENSED_JSON_V1" &&
              Boolean(source.feedUrl)
            }
            demoReadOnly={demoReadOnly}
          />
        </section>
      </main>
    </>
  );
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "미설정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
