import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "../../auth";
import { SiteHeader } from "../../components/site-header";
import { ensureMemberContext } from "../../../lib/member-data.ts";
import { listManualAssets } from "../../../db/manual-assets.ts";
import { ManualAssetForm } from "./manual-form";
import "./manual.css";

export const dynamic = "force-dynamic";
export default async function ManualPage() {
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") redirect("/admin");
  const drafts = await listManualAssets(context.database, context.workflowUser.id);
  return <><SiteHeader /><main className="admin-page manual-draft-page">
    <Link className="page-back-link" href="/admin"><ArrowLeft size={16} /> 운영센터</Link>
    <header className="admin-head"><div><p className="section-kicker">GLI OPERATIONS</p><h1>매물 수동 입력</h1></div></header>
    {user?.authProvider === "demo" && <p role="status">데모 계정은 조회 전용입니다. 저장하려면 실제 관리자 계정으로 로그인하세요.</p>}
    <section className="ops-workbench"><h2>새 매물</h2><ManualAssetForm readOnly={user?.authProvider === "demo"} /></section>
    <section className="ops-workbench"><h2>최근 입력</h2>
      {!drafts.length ? <p>입력한 매물이 없습니다.</p> : <ul className="manual-draft-list">{drafts.map(draft => <li key={draft.id}>
        <strong>{draft.payload.title}</strong><span>{draft.payload.country} · {draft.payload.city}</span>
        <span>{(draft.payload.priceMinor / 100).toLocaleString("ko-KR")} {draft.payload.currency}{draft.payload.transaction === "rent" ? " / 월" : ""}</span>
        <span>검수 대기 · {new Date(draft.createdAt).toISOString()}</span>
      </li>)}</ul>}
    </section>
  </main></>;
}
