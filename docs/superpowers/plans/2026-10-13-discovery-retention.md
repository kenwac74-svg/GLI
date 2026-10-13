# Discovery Retention Implementation Plan

## Execution status (2026-10-13)

- [x] Task1: additive schema/repository/SQLite migration checks.
- [x] Task2: content preservation, atomic versions and collection save/error integration.
- [x] Task3: conservative evidence grouping and changed-unit invalidation.
- [x] Task4: native/external/fixture account API and existing UI/detail references.
- [x] Task5: public price projection, full340 tests/build, independent review4 fixes, specifications/history.
- [ ] Actual authenticated browser and public-host QA; legacy firstSeen reference metadata check.

The original implementation checklist below records the plan, not additional pending authorization. Detailed verification boundaries: DISCOVERY-RETENTION-EXECUTION.md / HIST-20261013-009. No new price-history design, paid collection, commit/push or deployment.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the recommended native execution after user approval; use superpowers:subagent-driven-development only if the user selects that method. Track each step with checkboxes.

**Goal:** 기존 수집 경로의 매물 영속 보관·변경 이력과 계정별 관심자산 참조를 LOCAL D1에서 완성한다.

**Architecture:** 기존 DiscoveryRepository와 API 계약을 유지하고 안정 public ID 참조/내용 버전/관심 관계를 repository 안에서 확장한다. 기존 listings/favorites/discovered_assets와 공개 상세 주소는 보존한다. 수집 사실·조회 실패·고객 표시를 분리한다.

**Tech Stack:** 기존 TypeScript, Next/vinext, D1/SQLite, Drizzle, node:test. 새 의존성 없음.

**Spec:** `docs/implementation/DISCOVERY-RETENTION-DESIGN.md` (사용자 설계 승인: 2026-10-13).

## Global Constraints

- 2번만 실행한다. MY/문의 폼/가격 그래프/AI 품질/새 수집원/사진 파일 다운로드는 이번 구현에 섞지 않는다.
- 공개 DB/설정/권한/배포/커밋/푸시는 하지 않는다. 기존 미커밋 변경과 승인 디자인은 보존한다.
- 모든 실제 확보 대상은 최종 Top5와 무관하게 저장한다. 저장 실패를 영속화 성공으로 숨기지 않는다.
- 원문 삭제/거래 완료 후 마지막 정보를 보관한다. 403/timeout은 삭제/거래 완료 근거가 아니다.
- 고객은 최신 정보와 가격 이력만 조회한다. 전체 버전/수집 오류/병합 증거는 관리용이다.
- 동일성이 확실할 때만 출처를 묶고 모든 원래 ID/출처를 유지한다. 같은 건물/유사 면적은 충분한 증거가 아니다.

## Review Focus

1. 오래된 응답/동시 갱신이 최신 값을 되돌리거나 버전과 최신본을 불일치시키지 않는가 (Task 2).
2. 얇은 응답/누락/환율·번역 변경이 원문 변경으로 기록되거나 기존 정보를 지우지 않는가 (Task 2).
3. 같은 건물의 다른 호실/거래 유형이 병합되고 기존 즐겨찾기 ID가 끊기지 않는가 (Task 3).
4. 로그인 계정 간 관심 기록이나 관리용 전체 이력이 고객 API로 누출되지 않는가 (Task 4~5).
5. 마이그레이션/재시작/정식 listing 게시 중단 뒤에도 원래 자료와 관심 기록이 남는가 (Task 1, 4~5).

## Files / Contracts

- 기존 수정: `db/schema.ts`, `db/discovery-repository.ts`, `lib/discovery-storage.ts`, `lib/assets-data.ts`, `app/api/search/route.ts`, `app/api/favorites/route.ts`, `lib/favorite-client.ts`.
- 신규: `db/asset-reference-repository.ts`, `db/asset-favorites-repository.ts`, `lib/asset-content.ts`, `lib/asset-identity.ts`, `app/api/assets/[id]/price-history/route.ts`.
- 마이그레이션: `drizzle/0020_asset_retention.sql` (현재 최신 SQL 0019 기준; 실행 시 번호 충돌 재확인). 기존 메타/journal 등록 관례와 migration 검사 스크립트를 확인해 적용한다. 기존 0012~0019의 journal 상태를 이유 없이 일괄 수정하지 않는다.
- 시험: 신규 `tests/asset-retention.test.mjs`, `tests/asset-identity.test.mjs`; 기존 `tests/discovery-storage.test.mjs`, `tests/favorite-client.test.mjs`, `tests/deployment-workflows.test.mjs`.
- `AssetReference`는 `{ publicId: string, kind: "listing" | "discovery" | "fixture", asset: Asset, firstSeenAt: string, checkedAt: string, sourceState: "present" | "removed" | "check_failed", transactionState: "unknown" | "available" | "completed", identityGroup: string | null }`로 정의한다.
- `AssetReferenceRepository`: `upsertSnapshot(asset: Asset, observedAt: string, kind: AssetReference["kind"]): Promise<{ asset: Asset, changed: boolean, versionId: string | null }>`, `get(publicId: string): Promise<AssetReference | null>`, `priceHistory(publicId: string): Promise<PriceHistoryEntry[]>`, `linkConfirmedDuplicates(assetIds: string[], evidence: IdentityEvidence): Promise<{ groupId: string }>`.
- `AssetFavoritesRepository`: `list(userId: string): Promise<AssetReference[]>`, `add(userId: string, publicId: string): Promise<{ created: boolean, listingPublicId: string }>`, `remove(userId: string, publicId: string): Promise<{ removed: boolean, listingPublicId: string }>`. userId는 서버 인증에서만 받는다. API 어댑터는 기존 favorite DTO로 공개 필드를 투영한다.
- `IdentityEvidence`: `{ kind: "exact_unit_identifier", issuer: string, propertyId: string, unitId: string, basisUrls: string[] }`. 값이 없거나 출처가 뒷받침하지 않으면 묶지 않는다. 외부 AI 추정 점수만으로 이 근거를 생성하지 않는다.
- `PriceHistoryEntry`: `{ sourceUrl: string, currency: string, transaction: "sale" | "rent", price: number, maxPrice?: number, observedAt: string, sourceUpdatedAt?: string }`. 공개 응답은 `{ assetId: string, entries: PriceHistoryEntry[] }`. 다른 출처/통화/거래를 혼합한 상승률을 만들지 않는다.

## Task 1: Stable reference and additive migration

- [ ] SQLite 시험에 정식 listing/외부/승인 샘플 참조 및 기존 favorites 이전의 실패 시험을 먼저 추가한다.
- [ ] `asset_references`(public ID/종류/현재 snapshot/hash/최초 확보·확인 시각/출처 상태/거래 상태/그룹 근거), `asset_versions`(버전 ID/자산 ID/내용 hash/관측 시각/snapshot/변경 필드), `asset_favorite_refs`(계정 ID/자산 ID/저장 시각·유일성)를 추가한다.
- [ ] 출처 상태 present/removed/check_failed와 거래 상태 unknown/available/completed를 별도로 저장한다. available/completed는 확보된 명시적 근거가 있을 때만 설정한다.
- [ ] 기존 favorites→listing public ID 관계를 새 참조로 이관하고 원래 행/테이블을 유지한다. 정식 listing/샘플은 서버가 확보한 신뢰 경로의 snapshot만 저장한다. 클라이언트 제출 payload는 수용하지 않는다.
- [ ] 기존 자료로 과거 버전을 만들어내지 않는다. 최초 baseline과 이후 관측 변경부터 기록한다. 임시 SQLite 파일 재연결/중복 migration/실패 롤백 시험과 `npm.cmd run db:validate`를 통과시킨다.

## Task 2: Change-aware collection persistence

- [ ] 신규/동일/가격 변경/A→B→A/필드 누락/오래된 응답/동시 갱신/부분 실패 시험을 먼저 작성하고 실패를 확인한다.
- [ ] `lib/asset-content.ts`에서 기존 풍부한 정보와 incoming 공개 필드를 안전하게 합친 뒤 의미 있는 내용 SHA-256을 계산한다. 확인 시각/실행별 FX/표시 번역은 비교에서 제외한다.
- [ ] `.upsertSnapshot`의 최신본/버전 기록을 원자적으로 처리한다. 동일 연속 hash는 확인 시각만 갱신하고 A→B→A는 별도 변경으로 남긴다. 늦게 도착한 오래된 자료는 최신 변경처럼 반영하지 않는다.
- [ ] 기존 DiscoveryRepository.save를 이 저장 경계와 연결하되 source URL+거래 유일성/기존 public ID를 유지한다. 기존 중복 없이 수집 성공 결과를 저장하는 search API 경로는 재사용한다.
- [ ] 최종 Top5 밖 후보 저장, 승인된 배치 상한 내 분할 저장, 부분 실패의 정확한 저장 상태, 재시작 이후 재조회 시험을 통과시킨다. 수집/AI 호출은 모두 시험 자료로 대체한다.

## Task 3: Conservative grouping without identity loss

- [ ] 서로 다른 호실/동일 제목/유사 면적/근거 없음/다른 거래 유형/확실한 호실 ID/그룹 후 기존 ID 조회 시험을 추가한다.
- [ ] `lib/asset-identity.ts`에서 명시적 exact_unit_identifier 근거를 검증한다. 출처 내 URL 중복과 출처 간 물리 매물 동일성을 구분한다.
- [ ] 그룹은 관계로 저장하고 원본 ID/출처별 snapshot/가격/이력을 삭제·덮어쓰지 않는다. 근거가 없으면 독립 레코드로 둔다. 기존 collector에 정확한 호실 근거가 없다면 실제 자동 병합 수가 0이어도 정상이다.
- [ ] 기존 상세/관심 참조를 복원하는 get 계약과 시험을 통과시킨다. 새 관리자 병합 UI나 외부 AI 판정은 추가하지 않는다.

## Task 4: Unified account favorites

- [ ] 정식/외부/샘플 저장·해제, 중복 요청, 다른 계정 격리, 삭제/거래 완료 정보 보존, 그룹 전후 ID의 조회·해제 시험을 작성한다.
- [ ] 새 repository를 인증된 `/api/favorites` GET/POST/DELETE에 연결한다. 기존 응답 계약/Origin/JSON 검사/한도/감사 이력을 유지한다. 그룹 중복은 표시에서 정리하되 그룹 해제 동작은 해당 계정 관계만 해제한다.
- [ ] 관심 해제는 수집 자료/버전/타 계정 관계를 삭제하지 않는다. 조회는 ACTIVE listings만으로 제한하지 않아 보관 기록도 복원할 수 있게 한다.
- [ ] `lib/assets-data.ts`의 기존 상세 ID 복원과 연결한다. 공급사/DB 내부 종류는 고객에게 노출하지 않고 현재 공개 제원·통화·원문 날짜를 유지한다.
- [ ] 기존 하트/목록/상세 디자인 그대로 저장→재조회→상세→복귀→해제를 검증한다. 실제 로그인 환경이 없으면 그 검수만 미완료로 분리한다.

## Task 5: Public price projection and delivery verification

- [ ] 공개 API 시험으로 최신/가격 이력만 반환되고 내부 snapshot/변경 설명/병합 증거/다른 계정 정보가 제외되는 것을 고정한다.
- [ ] `/api/assets/[id]/price-history`를 추가하고 기존 공개 자산 정책에 맞는 정보만 반환한다. 인증된 favorites와 별개로 현재 공개 범위를 임의로 넓히지 않는다. 관리용 전체 이력의 신규 공개 endpoint는 만들지 않는다.
- [ ] 기존 화면에 새 이력 패널/그래프는 넣지 않는다. Claude용 가격 이력 데이터 계약과 표시 경계를 문서로 인계한다.
- [ ] 관련 node:test → 타입/lint/migration 검사 → 변경 묶음 로컬 빌드 → built-worker SQLite 시험 순으로 검증한다. 공개 배포/실제 유료 호출은 하지 않는다.
- [ ] DB-UI-WORKFLOWS/DURABLE-DISCOVERY/API-CONTRACTS/registry/CURRENT_STATE/HISTORY에 구현·미완료·검증 증거를 갱신한다. 실제 호스팅 DB/원문 정확도/실계정 브라우저 여부는 각각 구분한다.

## Verification commands / stop conditions

관련 시험은 `node --test tests/asset-retention.test.mjs tests/asset-identity.test.mjs tests/discovery-storage.test.mjs tests/favorite-client.test.mjs`를 사용한다. Built worker 시험은 기존 `node --import ./tests/support/register-cloudflare-loader.mjs --test tests/deployment-workflows.test.mjs`에서 해당 여정만 먼저 실행한다. 타입·빌드는 기존 npm scripts, 명세는 `npm.cmd run spec:check`를 재사용한다.

마이그레이션 충돌/기존 관심 기록 손실/계정 격리 실패/동시성 불일치가 발견되면 다음 task로 가지 않고 그 원인을 좁힌다. 같은 접근 약2회 실패 시 전제·환경·문제 정의를 재검토한다. 테스트 성공을 공개 환경 완료로 보고하지 않는다.

## Self-review and approval

확정 spec의 보관/버전/중복/소유권/고객 공개/AWS 경계를 Task 1~5에 대응했다. 우려5종을 각 task 시험에 배정했다. 현재 collector의 호실 근거 부재와 공개 DB 상태는 미확인으로 남긴다.

실행 권고: 이 채팅에서 직접 순차 구현하고 끝에 독립 검수1회. Task별 새 구현/검수 에이전트보다 컨텍스트 비용을 줄이고 공유 저장 계약을 일관되게 유지한다. 사용자가 계획과 실행 방식을 승인하기 전 제품 코드/DB를 변경하지 않는다. 단계별 커밋은 사용자 지시 전 수행하지 않는다.
