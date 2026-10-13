# 기능 상태와 다음 개발 작업

기준: 2026-09-23. registry.json에서 생성. 수동 수정하지 않는다.

코드 구현과 실제 서비스 검증은 별개다. 모든 live 상태는 현재 미검증이다.

| ID | 기능 | 상태 | 결정 | 다음 작업 |
|---|---|---|---|---|
| GS-001 | 승인 디자인과 React 통합 | partial | approved | HIST-20261002-012: 메뉴 상호 배타/라우팅, 상세 복귀/세션 복원, C1 검색 canonical 상세 경로와 작업 안내를 구현했다. 실제 단계별 서버 이벤트, 실기기 키보드/Safari 및 전체 상세 데이터 전수 대조는 남아 있다. 시각 변경은 Claude 승인 필요. 옵션 미제공 시 조건 확대 예시 버튼은 만들지 않는다. |
| GS-002 | 캄보디아 3개 출처 연결 | partial | approved | 출처별 실제 수집 실행 기록과 파싱 누락을 점검하고 국가/거래유형별 수집면을 보완한다. |
| GS-003 | 도시·거래유형·페이지 수집 범위 | partial | approved | source별 지원 필터/페이지/거래유형 표를 만들고 제한된 페이지 확장을 연결한다. |
| GS-004 | 검색 후보 영구 저장과 재확인 | partial | approved | HIST-20261003-002: 추가 공개 제원/분류/가격 설명/사진/원문 날짜 보존 및 얇은 목록 갱신의 상세 손실 방지를 로컬 보완했다. FREE-BASIC-INFORMATION.md의 저장/미확인 계약을 따른다. 공개 DB/PH 표본·원문 대조·세부 자료 최신성/백업/큐는 후속이다. |
| GS-005 | 캄보디아 외 국가 출처 확대 | partial | approved | 영속 저장과 국가/도시/예산 재고 범위를 보완하고 실제 임대계약/순수익 근거를 별도 수집한다. Homedy 매핑, Batdongsan 정상 접근/승인 feed 및 상용 협의는 별도다. 보조자료는 고도화까지 보류. |
| GS-006 | 단계별 탐색과 상태 표시 | partial | approved | GLI-052 승인 후 이번 검색 범위의 일치 수와 반환 수를 분리하고 답변/완료/목록을 동일 계약에 연결한다. 기존 검색 job API/서버 진행 이벤트 계획은 유지하며 이번 작업 승인만으로 확대하지 않는다. |
| GS-007 | 동일 원문 재수집과 포털 간 유사 매물 | partial | approved | 원문 ID 중심으로 식별하고 URL 정규화에서 의미 있는 경로/쿼리를 보존한다. |
| GS-008 | 출처별 누락 필드와 GLI 폼 | partial | approved | 필수 식별 필드와 보완 가능 필드를 분리하고 출처별 매핑 및 데이터 타입을 이관한다. |
| GS-009 | 원문 시점과 신선도 | partial | approved | 원문 날짜 미확인 fallback을 nullable로 전환하고 배지 기준과 재확인을 연결한다. |
| GS-010 | 자연어 조건 이해와 대화 복원 | partial | approved | 영속 후보/장기 의미 기억, 선택 대상 UI와 정적 카드/상세 C1, 증빙 필터 및 다국가 실제 커버리지를 보완한다. 초기/후속 입력창 reset UX 재설계와 Claude 시각안은 별도 승인이다. |
| GS-011 | GLI AI 역할 배정 | partial | approved | 선택적 재조회/비교/수익 계산 도구, 장기 대화 평가를 이어간다. 공개 체험 보호 및 UI 검토 뒤 별도 승인으로 배포한다. 현재 로컬 모델 설정만 변경했다. |
| GS-012 | AI와 수집 비용 통제 | partial | approved | 공개 DB migration/배포 승인 후 실제 계량 smoke, 영속 guest 신원·단기 rate limit·금액 상한·분산 중복 실행 제어·운영 대시보드/원장 보존을 구현한다. 300회는 300달러 한도가 아니다. |
| GS-013 | 원통화·환산 범위·언어 | partial | approved | 국가별 실제 상담/환율 누락 회귀와23시간 캐시 최신성을 검토하고 언어 설정을 실제 상태와 연결한다. 독립 legacy search 호출은 관측 snapshot 없는 demo 경계로 유지한다. |
| GS-014 | Trust 공개 등급과 사람 검증 | partial | approved | 등급 산정/검토 버전을 통합하고 실제 모델 경로와 등급 근거의 검증 증거를 만든다. |
| GS-015 | 상세 정보·출처·자료 권한 | partial | approved | HIST-20261003-002: 외부 기본 상세의 미확인 침실/원문 날짜/수집 시각, 번역 부재와 무료 고정 지표를 보완했다. FREE-BASIC-INFORMATION.md의 미완료 원문/국가별 목록→상세 검수를 수행하고 관심 매물 상세 보강을 별도 승인 후 연결한다. 기존 요금/공개 범위는 유지한다. |
| GS-016 | 관심 자산 계정 동기화 | partial | approved | 실제 계정 브라우저/다른 기기 및 공개 QA. MY는 순서6, 가격 이력 디자인은 Claude 별도 인계. DB-UI-WORKFLOWS.md 참고. |
| GS-017 | 멤버십 가격·포함 권한 계산 | implemented | approved | 가격 정책을 유지하며 실제 결제 어댑터와 화면 연결 시 회귀 검증한다. |
| GS-018 | 실결제·GLI Cash·자산 열람권 | demo | approved | 사용자 지시로 선택 창까지만 종료. 실제 PG/환불/상품 정책 및 adapter/원장은 후속 별도 승인. 큰 UI 개편 시 Claude에 목업 변경 역인계. |
| GS-019 | 관심 등록 후 직원 조사 큐 | planned | approved | research task/필드 증거 테이블과 관심 이벤트 연결을 추가한다. |
| GS-020 | 실사용자 인증과 공개 MY GLI | partial | approved | 실제 OAuth/세션 만료/휴대폰/공개 검수. AWS identity adapter/회원 ID 이관은 후속이다. QA-INTEGRATED-20261013.md 참고. |
| GS-021 | 관리자 도구 통합 | partial | approved | 샘플 수령·최신 상태를 확인하고 ADMIN.md의 모듈별 API를 연결한다. |
| GS-022 | 상담과 알림 운영 | partial | approved | 승인된 상담 UI 연결, 담당자/SLA 결정과 발송 채널 운영을 연결한다. |
| GS-023 | 뉴스와 기사 CMS 전환 | demo | approved | news 저장소/미디어 업로드/공개 조회 adapter를 추가하고 두 정적 표현을 통합한다. |
| GS-024 | 백서·공지·준비중 메뉴 | demo | approved | ROUTES.md의 공개 메뉴 목적지를 확인하며 내용·담당자·공개 범위를 확정한다. |
| GS-025 | Google Cloud 테스트 후 AWS 상용 이식 | planned | approved | 현재 환경의 QA 안정화와 이식 경계를 정리한 뒤 Google Cloud 테스트 범위·구성·수용 기준을 승인받는다. 충분한 테스트 후 AWS 환경 이관·재검수 및 별도 출시 승인을 진행한다. |
| GS-026 | 운영·스케줄·복원 | partial | approved | 배포 환경 scheduler/worker/알림/backup을 연결하고 실제 시험 증거를 기록한다. |
| GS-027 | 원문 증거와 내부 운영 데이터 | partial | approved | public collector provenance와 관리자 evidence를 연결하고 필드 공개 정책을 적용한다. |
| GS-028 | 데모 승인 가정과 실서비스 게시 절차 | partial | approved | production에서 모든 수집 진입점을 정책/검토 경로로 통합하고 실행 증거를 남긴다. |
| GS-029 | 파트너 자산·사진·프로젝트 자료 | demo | approved | 원 자료별 프로젝트 매핑·사진 교체·공개 범위를 기록하고 관리툴로 이관한다. |
| GS-030 | 추후 상품과 수동 조사 영역 | deferred | approved | 출시 범위가 확정될 때 개별 기능 카드를 추가한다. |
| GS-031 | 실행형 개발기획서 유지 | implemented | approved | 모든 후속 개발에서 관련 명세/registry/결정/증거를 갱신하고 HISTORY에 변경 전후·검증·남은 일·배포 상태를 추가한다. |
| GS-032 | 실서비스 수용시험과 검증 이관 | partial | approved | ACCEPTANCE.md와 GLI-052 T1~T12의 실사용 문장/다중 턴/자산 ID 정합성 회귀를 승인 후 구현한다. 기존 테스트 통과를 상담 품질 합격으로 대체하지 않는다. |
| GS-033 | 외부 매물 한국어 번역과 원문 보존 | partial | approved | 언어별 SSR/SEO/공유 이미지, 문서 전문 및 임의 원문 영어화, 유료 실응답/실기기 전수 검수는 후속. 기존 명칭 보호·운영자 교정·R2 정리·서버 간 중복 잠금·공개 체험 금액 상한은 별도 범위. ENGLISH-SUPPORT.md를 따른다. |

## 구현 순서

1. GS-002/003/007/008/009/010/013: 출처 범위·식별·누락 필드·날짜·조건·환율 계약 정리.
2. GS-004/006/012: 영구 저장, 재확인, 작업 큐와 비용 제어.
3. GS-020/016/019/021/022: 독립 인증과 회원·직원 운영 여정 연결.
4. GS-017/018/023: 결제·Cash·권한·관리자 CMS 연결.
5. GS-025/026/032: 선택된 AWS 환경 이식, 복원, 출시 검증.
6. GS-005/029: 국가별 데이터 확대. GS-030은 별도 후속 기획.

병행 가능한 작업은 registry.dependencies를 확인한다. 위 순서는 개발 제안이며 실제 일정/예산의 확정이 아니다.

[상세 상태·근거·완료 조건](registry.json) · [현재 동작](CURRENT-STATE.md) · [결정 이력](DECISIONS.md)
