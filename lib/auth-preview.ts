export const AUTH_PREVIEW_COOKIE='gli_local_member_preview';
export const AUTH_PREVIEW_DEVELOPER='local-developer-v1';
export function authPreviewIdentity(value:unknown):{displayName:string;email:string;fullName:string}|null {
  if(value===AUTH_PREVIEW_DEVELOPER)return {displayName:'GLI 개발 테스트',email:'developer-preview@gli.local',fullName:'GLI 개발 테스트'};
  if(typeof value==='string' && /^local-staff-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return {displayName:'GLI 체험 회원',email:`staff-${value.slice(12).toLowerCase()}@gli.local`,fullName:'GLI 체험 회원'};
  }
  return null;
}

export function localAuthPreviewAllowed(host:string,env:Record<string,string|undefined>=process.env):boolean {
  if(env.LOCAL_AUTH_PREVIEW_ENABLED!=='true' || env.DEPLOYMENT_STAGE!=='development')return false;
  if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host))return false;
  return true;
}
export function authPreviewProvider(value:unknown):'google'|'chatgpt'|null {
  return value==='google'||value==='chatgpt'?value:null;
}
