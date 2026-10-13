# 수집 보관 구현 진행 기록

2026-10-13: 사용자 계획/직접 순차 구현 승인. 기준은 승인 설계와 docs/superpowers/plans/2026-10-13-discovery-retention.md이다. 현재 Work Local/미커밋 변경을 보존하며 커밋/푸시/공개 변경은 하지 않는다.

- [x] Task 1: 안정 참조/추가 마이그레이션 (격리 SQLite; 실제 LOCAL 적용/기존 계정 이전은 Task4~5에서 검수)
- [x] Task 2: 내용 비교/원자적 최신본·버전 (동시 응답/원문일/부분 실패 및 통합 API 최종시험은Task5)
- [x] Task 3: 근거 기반 출처 묶음 (식별 근거 없으면 별개 유지; 저장 ID 보존 시험 통과)
- [x] Task 4: 계정별 통합 관심자산 (SQLite/통합 API; 실제 회원 브라우저는 별도)
- [x] Task 5: 가격 투영/최종 검증/독립 리뷰 (실제 로그인 브라우저/공개 검수는 미완료)

Final gate: 최종340개 테스트와 로컬 빌드 통과. 가격 DTO/디자인 경계는 API-CONTRACTS에 기록한다. 전체 원문/이미지 객체/백업 및 legacy firstSeen 메타데이터 추가 점검은 남았다. 커밋/푸시/배포/유료 API 없음.

Ruling: 별도 worktree를 만들지 않고 현재 사용자 기준 작업 트리에서 수행한다 — 기존 승인 변경이 다수 미커밋 상태이며 복제/이탈하면 기준본과 불일치한다 — 최종 리뷰는 이번 파일과 영향 범위로 제한한다.

Ruling: 원자성 단위는 매물별 최신본+버전+기존 discovery mirror이며 수집은20개씩 제한 병렬 실행한다 — 150개를 직렬 SQL로 처리하는 지연을 피하고 부분 실패에서 이미 저장한 자료를 유지한다 — API는 부분 실패/실제 성공 수를 구분해야 한다.

Task1/2 gate: 신규 SQLite/변경·되돌림·동일·얇은 갱신·롤백 및 기존 discovery 회귀10개 통과. 버전은 DB trigger로 최신본과 같은 transaction에 생성한다. 원문 수정 날짜/FX 기준 변화만으로 버전을 만들지 않는다.

Ruling: fixture 참조는 `fixture:` 내부 namespace로 구분하고 고객 상세는 원래 asset ID/기존 origin을 유지한다 — 승인 HTML과 정식 DB에 일부 동일 ID가 있지만 서로 다른 snapshot이 있어 잘못된 정보 혼합을 막는다 — API/클라이언트는 referenceId와 표시 publicId를 구분해야 한다.

Ruling: 기존 관심 관계는 회원 조회 때 idempotent lazy 이관하고 기존 행은 유지한다 — SQL에서 풍부한 Asset snapshot을 억지 생성하지 않으며 게시 중단 원본도 서버 조회할 수 있다 — 기존 테이블의 실제 사용자 해제는 함께 처리해 이관 후 재등장하지 않게 한다.

Ruling: 고객 가격 API는 최근500개 관측 버전 안의 원문 가격 변동으로 제한하고 windowVersionLimit을 명시한다 — 전체 관리 버전을 공개하거나 무제한 DB 조회하지 않는다 — 오래된 가격 전수 UI가 필요하면 후속 pagination 계약이 필요하다. DB 원본 이력은 삭제하지 않는다.

Independent review: P1 비공개 native 신규 등록, P2 동시 legacy 재이관으로 해제 부활, P2 부분 detailFacts 손실, P2 호실 식별 변경 후 잘못된 그룹 유지. 각각 실패 시험을 재현하고 같은 수정 패스로 서비스/저장소 공개 검사, INSERT 시점 기존 관계 검사, 제원/사진/자료 키별 병합, 그룹 근거 재검증/CAS 및 비공개 감사 기록을 적용했다. 관련17개 통과.

Ruling: native baseline 관측 시각은 실제 DB를 확인한 현재 시각으로 기록한다 — native updated_at으로 과거 관측 이력을 만들어내지 않는다 — 원문/DB 수정 시각은 payload에 별도로 보존한다. 기존 discovery는 이미 기록된 실제 수집 시각을 기준으로 baseline을 복구한다.

LOCAL migration: 기본 db:local은 기존 테이블은 있지만 적용 이력 없는 DB에서0000을 재적용하려다 실패했다. 새 테이블 없음/기존9 listings+56 discovered+1 favorite를 확인하고 SQL0020만 명시적 --local 실행했다. 적용 후 원래 개수9/56/1 유지 및 새3개 테이블 확인. 공개 DB는 변경하지 않았다.
