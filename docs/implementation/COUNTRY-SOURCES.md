# 국가별 데이터와 출처

국가 카드, 파트너 자산, 지원 통화, 도시 이름 파서가 있다고 크롤러가 연결된 것은 아니다. 아래는 저장소 코드에서 확인한 상태이며 외부 사이트를 이번에 호출하지 않았다.

| 국가 | 보유 데이터/코드 | 외부 자동 수집 | 다음 일 |
|---|---|---|---|
| 캄보디아 | 샘플, source snapshot, live connector, Gemini scout | 조건부 연결; 실제 성공률/운영 설정 미검증 | GS-002~004: 범위·저장·동기화 |
| 베트남 | 파트너 문서 기반 Sycamore, Ixora, Thu Thiem, Con Dao 등 | 미연결 | GS-005: 출처 선정/필드 매핑/수집면 구축 |
| 필리핀 | RLC/Mantawi 파트너 자료 | 미연결 | GS-005/029: 프로젝트와 개별 재고 구분 |
| 말레이시아 | Armani Hallson, Golden Crown, Pavilion, CloutHaus, TS2 관련 파트너 자료 | 미연결 | GS-005/029: 문서/사진/출처 채널 연결 |
| 태국·인도네시아·싱가포르·중국·기타 | 디자인 예시/통화 지원과 실제 자산 데이터 범위는 별개 | 연결된 국가별 collector를 확인하지 못함 | 필요 국가부터 승인된 source를 등록; 구현했다고 표시하지 않음 |

## 캄보디아 연결 구조

| 출처 | 코드의 접근 방식 | 제한/미확인 | 실개발 연결점 |
|---|---|---|---|
| CAM Realty | WordPress `wp/v2/property`, 도시 search; Gemini direct URL allowlist | 페이지당 30, 기본 수용 20; 누락 필드 탈락 가능; 오늘 응답 미확인 | `ingestion/wordpress-property-feed.ts`, `lib/cambodia-live-discovery.ts` |
| Cambodia Property Asia | WordPress property API, `/en/` 원문 경로 제한; Gemini allowlist | 동일한 보편 parser 사용이 출처 고유 구조를 다 반영하는지 미검증 | 같은 connector를 source별 mapping으로 보완 |
| Khmer24 | reference HTML connector, 기본 rentals 경로, 도시 q; Gemini allowlist | 매매 검색면·도시별 결과·페이지 확장 미완; source refusal 가능 | `ingestion/khmer24-reference-feed.ts` |

전문 출처 2개 후 Khmer24라는 순서는 일부 구현됐다. 충분한 초기 결과가 있으면 사용자 '더 탐색' 동작 이후 광범위 수집한다는 최종 흐름은 GS-006이다.

다른 조사 사이트(IPS, Realestate.com.kh, FazWaz)가 [기존 출처 등록부](../source-policy-register.md)에 있어도 현재 합의한 3개 자동 수집 출처에 추가된 것은 아니다. 소셜/커뮤니티는 직원 수동 조사 영역이다.

## 출처 등록 시 남길 항목

`country`, `slug`, `displayName`, `baseUrl`, `allowedHosts`, `connectorKind`, 지원 도시/거래유형/자산분류, 필드 매핑, 원문 ID 규칙, 검색/상세 endpoint, 날짜 필드 의미, 제한/페이지 수, 이미지 사용 범위, 운영 승인 상태, 마지막 성공/실패와 증거 위치를 저장한다. 키 값이 아닌 secret 참조 이름만 기록한다.

## 새 국가 완료 조건

1. 국가/도시/통화/매매·임대 유형과 출처별 필드 대응을 정의한다.
2. 미제공 필드는 null+상태, 원문 날짜는 별도 보존한다.
3. 서로 다른 게시물은 유지하고 동일 원문 ID만 갱신한다.
4. 최초 검색 결과 저장 → 다른 인스턴스에서 상세 → 재검색 원문 확인을 시험한다.
5. 연결 실패와 현재 조건 일치 0건을 구별하고 다른 국가를 임의 추천하지 않는다.
6. 실행 환경·시각·source run ID·수용/탈락 사유를 내부 증거로 기록한다.

파트너의 PDF/PPT/HWP는 외부 포털 crawler가 아니다. 향후 파일 업로드 후 프로젝트/호실/분양가 범위와 근거를 정리하는 별도 관리 흐름으로 이관한다.
