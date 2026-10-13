import { NextRequest,NextResponse } from 'next/server';
import { safeReturnPath } from '../../../auth';
import { AUTH_PREVIEW_COOKIE,AUTH_PREVIEW_DEVELOPER,authPreviewIdentity,authPreviewProvider,localAuthPreviewAllowed } from '../../../../lib/auth-preview';

// Local UI rehearsal only: no OAuth tokens, Google identity or admin permission.
export async function POST(request:Request) {
  const url=new URL(request.url);
  const provider=authPreviewProvider(url.searchParams.get('provider'));
  if(!localAuthPreviewAllowed(url.host) || request.headers.get('origin')!==url.origin || !provider) {
    return NextResponse.json({error:'Local login preview unavailable'},{status:403,headers:{'cache-control':'no-store'}});
  }
  const response=NextResponse.redirect(new URL(safeReturnPath(url.searchParams.get('return_to')??'/my'),url),303);
  const previous=new NextRequest(request.url,{headers:request.headers}).cookies.get(AUTH_PREVIEW_COOKIE)?.value;
  // Separate developer tooling from each browser's staff rehearsal identity.
  const session=provider==='chatgpt'?AUTH_PREVIEW_DEVELOPER
    :previous?.startsWith('local-staff-') && authPreviewIdentity(previous)?previous:`local-staff-${crypto.randomUUID()}`;
  response.headers.set('cache-control','no-store');
  response.cookies.set(AUTH_PREVIEW_COOKIE,session,{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:60*60*2});
  return response;
}
