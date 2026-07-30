export const SOURCE_APPROVAL_STATUSES = ["PENDING","AUTHORIZATION_REQUIRED","APPROVED","SUSPENDED","EXPIRED"] as const;
export type SourceApprovalStatus = (typeof SOURCE_APPROVAL_STATUSES)[number];
export type SourcePolicy = { sourceSlug:string; approvalStatus:SourceApprovalStatus; permittedFields:readonly string[]; approvalExpiresAt:string|null; robotsAllowed?:boolean };
export type SourceConnector<T> = { sourceSlug:string; requestedFields:readonly string[]; collect:()=>Promise<T> };
export type SourcePolicyDenialReason = "SOURCE_MISMATCH"|"NOT_APPROVED"|"APPROVAL_EXPIRED"|"FIELD_NOT_PERMITTED";

export class SourcePolicyError extends Error {
  readonly sourceSlug:string; readonly reason:SourcePolicyDenialReason;
  constructor(sourceSlug:string,reason:SourcePolicyDenialReason,detail?:string){ super(`Collection blocked for source "${sourceSlug}": ${reason}${detail?` (${detail})`:""}`); this.name="SourcePolicyError"; this.sourceSlug=sourceSlug; this.reason=reason; }
}
function validSlug(value:string){if(!value||value.trim()!==value)throw new TypeError("sourceSlug must be a non-empty, trimmed string")}
function validFields(fields:readonly string[],name:string){if(!Array.isArray(fields))throw new TypeError(`${name} must be an array`);const seen=new Set<string>();for(const field of fields){if(typeof field!=="string"||!field||field.trim()!==field)throw new TypeError(`${name} must contain trimmed strings`);if(seen.has(field))throw new TypeError(`${name} must not contain duplicate fields`);seen.add(field)}}
export function assertSourceCollectionAllowed(connector:Pick<SourceConnector<unknown>,"sourceSlug"|"requestedFields">,policy:SourcePolicy,now=new Date()):void{
  validSlug(connector.sourceSlug);validSlug(policy.sourceSlug);validFields(connector.requestedFields,"requestedFields");validFields(policy.permittedFields,"permittedFields");
  if(connector.sourceSlug!==policy.sourceSlug)throw new SourcePolicyError(connector.sourceSlug,"SOURCE_MISMATCH",`policy belongs to ${policy.sourceSlug}`);
  // robots.txt is a technical signal, never legal authorization.
  if(policy.approvalStatus!=="APPROVED")throw new SourcePolicyError(connector.sourceSlug,"NOT_APPROVED",policy.approvalStatus);
  if(policy.approvalExpiresAt!==null){const expiry=Date.parse(policy.approvalExpiresAt);if(!Number.isFinite(expiry))throw new TypeError("approvalExpiresAt must be a valid date-time or null");if(expiry<=now.getTime())throw new SourcePolicyError(connector.sourceSlug,"APPROVAL_EXPIRED",policy.approvalExpiresAt)}
  const allowed=new Set(policy.permittedFields);const denied=connector.requestedFields.find((field)=>!allowed.has(field));if(denied)throw new SourcePolicyError(connector.sourceSlug,"FIELD_NOT_PERMITTED",denied);
}
export async function runApprovedSourceConnector<T>(connector:SourceConnector<T>,policy:SourcePolicy,now=new Date()):Promise<T>{assertSourceCollectionAllowed(connector,policy,now);return connector.collect()}
