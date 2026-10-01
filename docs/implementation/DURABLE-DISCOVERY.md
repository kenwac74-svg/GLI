# D1 영속 후보 저장 (P50 / GS-004)

## 현재 구현

GPT Sites의 기존 `DB` 바인딩을 사용한다. `drizzle/0018_discovered_assets.sql`은 기존 검증 listings와 별개로 발견 후보를 저장한다. `DiscoveryRepository` 계약의 D1 adapter를 구현했으며 AWS에서는 이 계약을 유지하고 SQL adapter를 이식한다.

- `POST /api/search`: 기존 승인된 collector 결과를 번역 전에 저장하고, 요청 국가의 저장 후보를 현재 결과 뒤에 병합한다. 현 수집 실패는 기존 coverage에 남으며 저장 재고를 현재 수집 성공으로 세지 않는다. `discovery.storage`는 mode/savedCount, collectedCount는 이번 collector 결과 수다.
- 기존 제한 진단 `GET /api/discovery/vietnam`도 승인 gate 통과 후 동일 저장 경로를 사용한다. 별도 유료 AI 호출은 없다.
- 상세와 후속 후보 참조 `getAsset`은 D1을 먼저 조회한다. 기존 Map은 보조 경로다.
- 출처 URL+거래 유형으로 갱신하며 최초 public ID/firstSeen을 유지한다. 서로 다른 출처 게시물은 합치지 않는다. 오래된 캐시가 새 관측값을 덮어쓰지 않는다.
- 원통화 금액/출처/관측 시각을 보존한다. 원문 게시일 미상은 빈 값이며 관측일로 대체하지 않는다. 관측 시각은 AI에도 전달한다. 데이터 보존은 매물이 아직 거래 가능하다는 증명이 아니다.
- 클라이언트가 임의 쓰기를 요청하는 공개 endpoint는 없다. 입력 전체 검증 후 atomic batch로 저장하며 VERIFIED/GLI Direct 승격과 임의 비공개 필드 저장을 거부한다.

`DISCOVERY_STORAGE=d1`은 명시 활성화, `disabled`는 비활성화다. 설정 미지정이면 LOCAL development 및 demo 단계에서 활성화하며 production은 비활성화한다. 활성 상태에서 DB/테이블이 없거나 쓰기가 실패하면 저장됐다고 속이지 않고 오류를 반환한다. 현재 UI 디자인은 변경하지 않는다.

## 적용 및 검증 경계

신규 환경은 기존 `npm run db:local`로 전체 migration을 적용한다. 이번 로컬은 이전 테이블이 존재하지만 초기 migration 기록이 없어 전체 적용이 실패했다. 삭제/초기화 없이 0018만 로컬 실행했다. 공개 사이트에는 Sites 배포의 migration 경로를 통해 적용해야 하며 이번 작업에서 원격 DB를 변경하지 않았다.

로컬 진단에서 실제 VN 40건 저장과 별도 D1 조회를 확인했다. SQLite 파일을 닫고 다시 열어 다른 repository에서 상세를 복원하는 시험, 갱신/거래 유형 분리/관측시각/잘못된 입력 차단 시험을 추가했다. Wrangler proxy 직접 연결 검증은 sandbox registry 경로 실패 및 권한 허용 후 대기 종료로 미완료다. 대신 앱 runtime 저장과 별도 Wrangler 조회를 검증했다. 공개 다중 인스턴스/상용 부하 검증은 아니다.

## 남은 작업과 운영

- 공개 배포 승인 후 실제 D1 migration/설정/저장·상세 복원 점검. 키를 브라우저나 Git에 넣지 않는다.
- 전체 원문 body/R2 immutable snapshot 및 버전 이력, 원문 종료/삭제 상태 확인과 보존기간 정책은 후속이다. 현재 저장은 정규화 공개 후보의 최신 payload이며 원문 전체 백업이 아니다.
- 검색 재고 조회는 국가별 조건으로 최신 최대100건. 재고 확대 때 pagination/조건별 DB 조회와 순위 계약을 보완한다. 큐·정기 수집·수집 job 상태는 아직 없다.
- D1 영속 저장은 자동 백업/무제한 보존 보장이 아니다. 내보내기·복원 훈련과 계정/리소스 삭제 보호를 운영 전에 확정한다.
- 기존 관리자 CSV/JSON import는 별도 승인 source/실제 ADMIN 계정/R2/감사 경로를 사용하며 데모 계정 반입은 계속 차단한다. 임의 SQL 업로드나 전체 DB 덮어쓰기는 제공하지 않는다.
- 수동 입력 UI는 이번에 제작하지 않는다. 관리자 지정, 입력→미리보기→저장→검수/게시 API와 감사 이력을 기존 admin에 연결하는 다음 단위다. Claude 승인 디자인 기준을 따른다.
