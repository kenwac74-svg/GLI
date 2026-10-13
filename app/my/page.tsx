import { Heart,LogIn,LogOut,ShieldCheck,UserRoundCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { localAuthPreviewAllowed } from '../../lib/auth-preview';
import { localizeDemoAsset } from '../../lib/demo-asset-localization';
import { uiLocale,UI_LOCALE_COOKIE } from '../../lib/ui-language';
import { demoSignInPath,getCurrentUser,isDemoAuthEnabled,signInPath,signOutPath } from "../auth";
import { SiteHeader } from "../components/site-header";
import { getAsset } from "../../lib/assets-data";
import { ensureMemberContext } from "../../lib/member-data";
import { getUserDashboard } from "../../db/user-workflows";
import { createD1AssetFavoritesRepository,publicFavorite } from "../../db/asset-favorites-repository";
import { trustGrade } from "../../lib/consultation-view";
import { ConsultationForm,RemoveFavoriteButton } from "./my-actions";
export const dynamic="force-dynamic";

// GS-020/016: member overview and receipt-only inquiry; no service dashboard.
export default async function MyGliPage({searchParams}:{searchParams:Promise<{consult?:string;inquiry?:string;return_to?:string}>}) {
  const query=await searchParams,user=await getCurrentUser();
  const target=query.consult?`/my?consult=${encodeURIComponent(query.consult)}`:query.inquiry?"/my?inquiry=1":"/my";
  const returnTo=query.return_to?.startsWith("/")&&!query.return_to.startsWith("//")?query.return_to:target;
  const localPreview=localAuthPreviewAllowed((await headers()).get('host')??'');
  const previewPath=(provider:string)=>`/api/auth/preview?provider=${provider}&return_to=${encodeURIComponent(returnTo)}`;
  if(!user)return <><SiteHeader/><main className="my-page">
    <div className="my-head"><div><p className="section-kicker">MY GLI</p><h1>나의 투자 탐색</h1><p>회원 정보, 멤버십과 관심 자산</p></div></div>
    <section className="member-login"><UserRoundCheck size={34}/><h2>로그인 후 투자 탐색을 이어가세요</h2>
      <div className="member-login-actions">{localPreview?<>
        <form method="post" action={previewPath('google')}><button className="login-cta" type="submit"><LogIn size={18}/> Google로 로그인</button></form>
        <form method="post" action={previewPath('chatgpt')}><button className="login-cta" type="submit"><LogIn size={18}/> ChatGPT로 로그인</button></form>
      </>:<Link className="login-cta" href={signInPath(returnTo)}><LogIn size={18}/> ChatGPT로 로그인</Link>}
        {isDemoAuthEnabled()&&<form method="post" action={demoSignInPath(returnTo)}><button className="demo-login" type="submit">데모 계정으로 체험</button></form>}
      </div>
      {localPreview&&<p>GPT는 개발 테스트, Google은 직원 로그인 체험용입니다.</p>}
    </section></main></>;
  const context=await ensureMemberContext(user);
  const locale=uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  const dashboard=await getUserDashboard(context.database,context.workflowUser.id,{memberOverviewOnly:true});
  const refs=await createD1AssetFavoritesRepository(context.database).list(context.workflowUser.id);
  const favorites=refs.map(ref=>({...publicFavorite(ref),title:locale==='ko'?localizeDemoAsset(ref.asset).title:ref.asset.title}));
  const selectedAsset=query.consult ? (await getAsset(query.consult)).asset
    ?? refs.find(ref=>ref.publicId===query.consult || ref.asset.id===query.consult)?.asset : null;
  const plans:Record<string,string>={explore:"Explorer",investor:"Investor",private:"Private"};
  const tiers=["FREE","BASIC","STANDARD","PREMIUM","BUSINESS"];
  return <><SiteHeader/><main className="my-page">
    <div className="my-head"><div><p className="section-kicker">MY GLI</p>
      <h1>{dashboard.user.displayName ?? "GLI 회원"}님의 투자 탐색</h1><p>{dashboard.user.email}</p>
    </div><Link className="profile-link" href={signOutPath("/my")}><LogOut size={18}/> 로그아웃</Link></div>
    <section className="membership-status"><div>
      <span>MEMBERSHIP</span><strong>{dashboard.activeMembership?plans[dashboard.activeMembership.planId] ?? dashboard.activeMembership.planId:"Free"}</strong>
      <p>열람 범위: {tiers[dashboard.membershipAccess.includedAssetTierLevel-1]}</p>
    </div><div>{dashboard.activeMembership&&<p>이용 기한: {new Date(dashboard.activeMembership.periodEnd).toLocaleDateString("ko-KR")}</p>}
      <Link className="membership-manage-link" href="/membership">멤버십 보기</Link></div></section>
    <section className="membership-access-overview"><div className="membership-access-head"><div><span>MEMBERSHIP ACCESS</span><h2>이용 현황</h2></div></div>
      <div className="membership-access-grid"><div><Heart size={19}/><span>관심 자산</span><strong>{favorites.length} / {dashboard.membershipAccess.favoriteLimit===null?"무제한":dashboard.membershipAccess.favoriteLimit}</strong></div>
        <div><ShieldCheck size={19}/><span>Trust Report</span><strong>{dashboard.membershipAccess.fullTrustReport?"전체 리포트":"기본 요약"}</strong></div>
      </div></section>
    <section className="saved-assets"><div className="workflow-section-head"><div><span>WATCHLIST</span><h2>관심 자산</h2></div><Link href="/explore">자산 더 찾기</Link></div>
      {!favorites.length?<div className="my-empty compact"><Heart size={26}/><h3>아직 저장한 자산이 없습니다</h3><Link href="/explore">자산 탐색 시작</Link></div>
      :<div className="saved-asset-list">{favorites.map(asset=><article className="saved-asset" key={asset.referenceId}>
        <Link href={`/assets/${encodeURIComponent(asset.publicId)}${asset.detailOrigin==="search"?"?origin=search":""}`}>
          <div className="saved-asset-image">{asset.imageUrl?<Image src={asset.imageUrl} alt="" fill sizes="112px" unoptimized/>:<span>GLI</span>}</div>
          <div><small>{asset.district ?? asset.city}, {asset.country}</small><h3>{asset.title}</h3>
            {asset.priceLabel&&<small>{asset.priceLabel}</small>}<p>
            {asset.priceMinor>0?new Intl.NumberFormat("en-US",{style:"currency",currency:asset.currency,maximumFractionDigits:0}).format(asset.priceMinor/100):"가격 미기재"}
            {asset.priceMinor>0&&asset.maxPriceMinor&&asset.maxPriceMinor>asset.priceMinor?`~${new Intl.NumberFormat("en-US",{style:"currency",currency:asset.currency,maximumFractionDigits:0}).format(asset.maxPriceMinor/100)}`:""}
            {asset.priceMinor>0&&asset.transactionType==="rent"?"/월":""}<span>Trust {trustGrade(asset.trustScore)}</span></p>
            {asset.transactionState==="completed"?<small>거래 완료 · 보관된 정보</small>:asset.sourceState==="removed"?<small>원문 삭제 · 보관된 정보</small>:asset.retained?<small>보관된 정보</small>:null}
          </div>
        </Link><RemoveFavoriteButton assetId={asset.referenceId ?? asset.publicId}/>
      </article>)}</div>}
    </section>
    {query.consult && !selectedAsset?<p role="alert">관련 자산을 확인할 수 없습니다. <Link href="/my?inquiry=1">일반 문의하기</Link></p>
      :(query.inquiry || query.consult)&&<ConsultationForm assetId={query.consult} assetTitle={selectedAsset?(locale==='ko'?localizeDemoAsset(selectedAsset).title:selectedAsset.title):undefined}
        memberName={dashboard.user.displayName ?? "GLI 회원"} memberEmail={dashboard.user.email}/>}
  </main></>;
}
