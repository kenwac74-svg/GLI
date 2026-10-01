# 개발 변경 이력

## HIST-20261002-005

- P54 / GS-012: 사용자 공개 AI 상담 로그인 제한 해제 승인으로 명시적 demo+guest flag일 때 비로그인 상담 eligibility만 추가했다. 실제 관리자 인증/회원 이용권/운영 전체300회·비로그인 공용100회/일/공급자 호출 감사·단계 제한은 유지한다. 비로그인 개별100회로 오해하지 않도록 정책/API를 명시했다.
- 파일: advisor-runtime helper/search route/worker Env/회귀시험/DECISIONS/API-CONTRACTS/상태·이력. 공개 디자인/DB schema 변경 없음. 최종 검증과 배포·실제 비로그인 상담 증거는 완료 후 추가한다.

## HIST-20261002-004

- P53 / GS-004/025: 사용자 향후 원문/이미지/상담 기록 저장 가능성 및 이미지 사전 확보·재수집 해시 비교 최신화 요청을 DURABLE-DISCOVERY와 repository TODO에 기록했다. 공급자 중립 R2/S3 객체 저장, 바이트 SHA-256/버전/관측 시각, 조건부 조회, 동일 객체 재사용/변경 후 안전한 참조 갱신/실패 시 기존 유지, 백그라운드 수집과 보존·대화 접근 정책을 후속으로 명시한다.
- 현재 동작은 정규화 매물+이미지 URL 저장으로 유지. 제품/API/DB schema/디자인/환경 설정 변경 없음. 유료 API/빌드/커밋/푸시/공개 배포 없음. 명세 및 diff 검증만 수행한다.

## HIST-20261002-003

- 사용자 공개 상담 모델 활성화 및 VN/PH 검색 검수 지시. 기존 LOCAL 선택과 일치하게 Sites LLM_PROVIDER=openrouter/OPENROUTER_MODEL=openai/gpt-6-astra와 전용 키(secret)를 설정했다. 나머지 설정은 유지하고 키를 Git/문서/브라우저에 기록하지 않는다. 환경 revision7, 기존66버전 재배포 `appgdep_6abe7e5f41448191bd23fe5f7577da6f` succeeded. 제품 코드/디자인 변경 없음.
- 공개 glibiz.net/explore 비로그인 실제 UI 질문2회 검수: VN 호치민 매매16후보(프로젝트2+외부14), VND18.57B/원화970,798,010원 표시; PH 마닐라 월PHP70000 이하 임대1후보(PHP49800/월,1,075,948원/월). Dot 출처/후속 입력/가격 환산/일부 한국어 번역 확인. 숫자는 시험 당시 API 환산값으로 고정 시세가 아니다. 해당 조건에 걸린 수이지 전체 시장 재고가 아니다.
- 호출 감사에서 Gemini translation HTTP200 기록을 확인했다. 비로그인 상담은 기존 access/aiMonthlyLimit 게이트로 provider=disabled가 되어 규칙형 답변이다. 서버 모델 설정 활성과 실제 상담 모델 성공을 혼동하지 않는다. 정상 /my → ChatGPT 로그인 화면까지 열었으며 사용자 로그인 후 실제 advisor/intent 호출 검증은 대기. 인증 우회/무료 이용권 변경/관리자 권한 변경 없음.
- 발견한 후속: 일부 지명 미번역, 가격 미기재 프로젝트의 상위 후보 노출, 유사 제목·면적 후보 반복. 동일 호실 확정이나 중복 자동 삭제는 하지 않았다. 이번 활성화에 임의 수정하지 않는다. 검수 화면 work/public-ph-qa-20261002.jpg는 로컬 제외 파일이며 키/대화 원문 전체를 Git에 저장하지 않는다.

## HIST-20261002-002

- P52 / GS-021: 사용자 현재까지 작업 공개 배포 지시 및 임시 관리자 정책을 ADMIN/DECISIONS에 기록했다. 데모 종료 후 정식 관리자 개발은 별도 후속이며 현재 권한/공개 게시 경계를 약화하지 않는다.
- 배포 준비에서 root 실행 로그와 tsbuildinfo를 Git 제외하여 소스 패키지 혼입을 방지한다. 사용자 파일을 삭제하지 않는다. 제품/API/디자인 변경 없음. 기존 278시험/typecheck/lint/migration/build 통과 증거를 유지하며 최종 명세 검증/패키징 및 공개 배포 결과는 아래에 추가한다.
- 최종 검증:278/278, lint 오류0/기존 경고10, typecheck/migration/build 통과; 명세33기능/49route/보호 시각원본4개 동일. 원격 선행 이력을 fast-forward 통합하고 보관한 로컬 작업을 복원했다. 충돌 파일은 승인된 로컬 최신본, 원격 뉴스/공지 변경은 유지. Git 줄바꿈으로 달라진 보호 파일은 기존 SHA-256과 일치하는 원래 바이트로 복구했다. 로컬 원문/키/로그 삭제 없음.
- Sites 소스 커밋 `7d2847516db38581281728206e97b2a07f2ea29b` push 확인 및 패키지 생성. Windows npm/bash/tar 경로와 단기 인증 만료는 배포 프로세스 환경만 조정했으며 프로젝트 설정/제품 코드를 변경하지 않았다. 저장 버전66 `appgprj_6a631d1b30488191aadc2864f6625b3b~appgver_043e55d370c48191aa9e50be7a88f9c0`, 공개 배포 `appgdep_6abe7aabea048191a6859c946ce76cb8` succeeded. URL https://gli-ai-property-demo.kenwac74.chatgpt.site ; 기존 공개 도메인 glibiz.net 유지.
- 독립 공개 DB overview에서 ai_operation_requests/ai_provider_calls/discovered_assets/manual_asset_drafts 생성 확인. 실제 수집 저장/관리자 로그인·초안 저장의 공개 종단 시험은 미수행. 해당 실제 계정은 공개 DB MEMBER/ACTIVE로 확인되어 LOCAL ADMIN 권한이 자동 이관되지 않음을 명시한다. 공개 LLM_PROVIDER=disabled이며 기존 키/모델/환경값을 바꾸지 않았다. 모든 AI 활성/관리자 사용 완료로 주장하지 않는다. 유료 AI 추가 호출 없음. 이 배포 결과 기록은 배포 후 로컬 문서 변경이며 버전66 안의 기록은 배포 준비 상태다.

## HIST-20261002-001

- P51 / GS-021: 사용자가 제공한 실제 계정에 LOCAL D1 ADMIN/ACTIVE를 사전 지정했다. 기존 이메일 정규화/SHA-256 stable user ID 규칙을 사용하고 독립 SELECT로 권한을 확인했다. LOCAL_ADMIN_PROVISIONED 감사 기록을 추가했다. 계정 이메일은 Git 문서에 남기지 않는다.
- 권한 등록은 로그인 완료가 아니다. localhost에는 GPT Sites의 인증 gateway가 없으므로 실제 브라우저 로그인/관리자 저장 종단 검수는 아직 미완료다. 인증 header 위조나 새 로컬 인증 우회는 추가하지 않았다. 공개 DB 권한/키/인증 코드/제품 API 계약/커밋/푸시/배포 변경 없음; registry 완료 상태를 올리지 않는다.

## HIST-20261001-012

- P51 / GS-021. 사용자 관리자 전용 승인으로 /admin/manual 입력 폼/최근20건 목록, 운영센터 진입 링크, POST /api/admin/manual-assets를 추가했다. 기존 관리자 스타일을 재사용하고 공개 Claude 화면/원본 시안을 변경하지 않았다. 초안은 D1 manual_asset_drafts의 REVIEW_PENDING으로만 저장, 공개 listings/discovery/Trust를 수정하지 않는다. 초안 편집·검수·게시 연결은 후속이다.
- 기존 API ACTIVE ADMIN/Origin/JSON 검증과 별도 DB 권한 재검증, 데모 쓰기403, 입력16KB 상한, normalize 검사/연락처 차단, 요청키 중복 방지, draft+audit atomic batch 적용. 미제공 침실/욕실/출처는 null, 내부 normalization URL은 실제 출처로 저장하지 않는다. 기존 normalize는 면적 양수를 요구하여 최초2시험 실패를 확인하고 면적을 필수 입력으로 일치시켰다. 수정 후 신규4/전체278시험 통과.
- 최종 npm run check:278/278, typecheck/migration/build 통과, lint 오류0/기존 경고10. spec refresh:33기능/49route/4보호 baseline 불변, scoped diff 정상. 0019만 기존 로컬 D1에 적용. 실제 비로그인 manual페이지307/admin, API401 확인. 실제 관리자 계정 시각/저장 종단 검수는 계정 확인 대기이며 완료로 주장하지 않는다.
- 파일: admin/manual page/form/scopedCSS, admin entry link, admin/manual-assets route, db/manual-assets/schema, 0019/migration validator, 신규4시험, ADMIN/DECISIONS/API/PRODUCT-DATA/registry/생성 상태·route/현재상태/이력. 사용자에게 관리자 로그인 이메일 요청. 키/인증 설정/실제 계정 권한/유료 AI/커밋/푸시/공개 배포 변경 없음.

## HIST-20261001-011

- P50 / GS-004/006/021/025. 사용자 GPT Sites 반영구 DB 환경 지시로 discovery repository 계약/D1 adapter와 0018 migration/schema를 추가했다. 검색과 VN 제한 진단 collector 결과를 번역 전 저장하고 상세/후속 참조를 D1 우선 복원한다. URL+거래 유형으로 갱신하며 최초 ID/firstSeen 유지, 오래된 캐시의 새 값 덮어쓰기 방지, 관측 시각/원통화 보존, 저장 재고와 이번 collectedCount 분리. 새로운 공개 쓰기 endpoint/검증 승격은 없다.
- 관리자 반입은 기존 실제 ADMIN/승인 source CSV·JSON 경로를 재사용할 수 있음을 확인했다. 데모 반입 차단/인증을 약화하지 않았다. 수동 입력 UI/임의 SQL 실행/전체 DB 덮어쓰기는 구현하지 않았다. 디자인 변경 없음, AWS repository 경계 유지.
- 관련12시험 및 최종 npm run check:274/274, typecheck/migration/build 통과, lint 오류0/기존 경고10. spec refresh/check 33기능/47route/4보호 시각 baseline 불변. scoped diff 정상. 실제 앱 VN 진단 HTTP200 40건 D1 저장, 별도 Wrangler read에서40건/VND/원가격 확인, 상세 HTTP200. 파일 DB 닫기/재연결 복원은 자동시험으로 검증했으며 공개 다중 인스턴스 시험은 아니다. 유료 AI 추가 호출 없음.
- 기존 로컬 migration ledger 불일치로 초기 테이블 재생성 실패: 삭제/초기화/같은 명령 반복 대신 신규0018만 로컬 적용. Wrangler proxy는 sandbox registry 경로 실패, 경로 env 수정도 효과 없어 전제 재검토 후 권한 허용 시도했으나 대기 종료, 검증 완료로 기록하지 않는다. 대신 실제 앱 runtime 저장/별도 CLI 읽기로 대조했다.
- 파일: db/discovery-repository/schema, lib/discovery-storage/assets-data/multi-country-discovery/ai-search, search/VN route, 0018, migration validator, 신규 저장시험, DURABLE-DISCOVERY 및 정책/API/openapi/registry/관리툴/상태/이력. 미완료: 공개 배포/원격 migration, 원문 R2 버전/종료 재확인/백업 복원/큐/pagination, 관리자 수동 입력 UI. 키/공개 설정/커밋/푸시/공개 배포 변경 없음. 공개 데모 적용 여부를 사용자에게 별도로 질문했다.

## HIST-20261001-010

- 사용자 D1 우선/AWS 최종 이전 방향을 P49로 기록했다. 기존 repository/RawObjectStore 재사용, 업무 로직과 provider adapter 분리, 영속 수집·멱등 갱신·큐 이식 계약·데이터 이관 검수 원칙을 AWS-MIGRATION에 추가했다. SQLite/PostgreSQL 이식 비용과 설정/실제 저장 완료의 차이를 명시했다.
- 정책/이전 계획/CURRENT_STATE 문서만 갱신. 기존 Google Cloud 단계 및 향후 Firebase의 구체 구성은 별도 확정하며 현재 환경 변경으로 추정하지 않는다. 런타임/API 계약 변화가 없어 feature registry는 변경하지 않는다. 제품 소스·DB·키·설정·디자인·유료 API·빌드·커밋·푸시·배포 변경 없음.

## HIST-20261001-009

- P48 / GS-005/006/010/013. 사용자 "네 제안을 수용한다"로 첫 국가 미지정은 연결3국, 후속은 이전 범위 유지/명시 변경 우선 승인. optional countries 계약을 legacy country와 호환하고 국가별 allSettled 병렬 수집/실패 분리, 다국가 통합 최대5 후보와 실제 범위 chip/상담 근거를 연결했다. 알려진 구역은 KH, 명시 침실 제한 해제 지원. 기존 디자인 파일/DOM/CSS는 수정하지 않았다.
- 예산 schema/rules에 PHP/VND를 추가하고 공개 상담은 같은 관측 FX snapshot으로 KRW/PHP/VND 예산과 원통화 후보를 비교한다. 필요한 FX 실패는 예산 제한을 누락하지 않고 조회 한계를 반환. 기존23h cache 및 독립 legacy demo 함수는 남는다. 같은 원문 URL의 매매/임대가 합칠 때 사라지지 않도록 transaction을 병합 키에 포함했다. 이전PH0의 단일 원인으로 확정하지 않는다.
- 신규8시험/관련29시험/회귀270시험·typecheck·범위 lint·빌드 통과. 첫 회귀3실패는 국가 생략 구역명까지 다국가로 해석한 전제로 확인, 구역 국가 추론을 보완하고24 관련시험 및 전체270 재검증했다. 빌드는 기존 chunk-size/route-classification 안내가 있다. spec refresh/check 및4개 보호 시각 baseline 불변 검증.
- 실제 로컬: PH PHP70000/2베드 임대 후보5(Bloom23000/Brio28000/Malate49800/AmiSa40000/Avida45000), 원화/출처/한 개 후속 질문 확인. 국가 미지정 USD1500/2베드 reset도 KH/VN/PH scope와 후보5 확인. 이번5는 전부KH: 국가별 할당 없는 기존 순위/동점 수집순서의 영향이며 VN/PH 시장 부재로 설명하지 않았다. 단순 범위 동작과 최적 비교 품질은 구분한다. 새 실제2응답 외 개발 중 한 제출은 HMR/재로딩으로 최종응답 검증 불가; 비용0으로 추정하지 않는다.
- 한계: 일부 PH 지명 영문, 수집순서 동점 편향/summary TOP3, 전국 커버리지/수입 증빙/영속 저장 및초기 reset UI 설계는 남는다. 파일: search/intent/consultation-search/view/ai-search, multi-country-discovery, search route, 신규시험과 계약/정책/registry/state/이력. 원본 시안/키/설정/모델/수집 출처/공개 배포/커밋/푸시 변경 없음. 증거 work/qa/ph-scope-fixed-20261001.png, multi-scope-fixed-20261001.png.
- 최종 npm run check 통과:270/270, lint 오류0/기존 경고10, typecheck/migration/build 정상. 문서/registry refresh/check와 scoped diff 정상,4개 보호 시각 baseline 불변. 개발 중 중단된 요청의 과금 여부는 미측정이다.

## HIST-20261001-008

- 사용자 요청으로 로컬 실제 상담 3건 시험: 호치민 USD1500/2베드 임대, 필리핀 PHP70000/2베드 임대 후속 질문, KH/VN/PH KRW2억 매수 비교. VN은 후보5·한국어 지명/제목·원화·USD 참고 환산 확인. PH는 후보0으로 종단 정상 판정 보류. 다국가 비교는 Vietnam 단일 검색으로 축소되어 실패했다.
- GS-005/006/010/013/033 QA 보고서에 증거/한계 기록. 단일 country 계약·한 국가 수집 분기와 deterministic PHP 예산 추출 미지원 확인. PH 후보0 원인은 아직 확정하지 않는다. 초기 입력창도 기존 2베드 조건을 유지했다. 제품/API/data 계약 변화 없음으로 registry 변경 없이 QA 보고서와 root CURRENT_STATE만 갱신.
- 최초 hydration 실패 후 기존 개발 명령으로 로컬 서버 재실행. 실제 POST200 36.8/29.5/15.0초; 공급자별 토큰·비용 미측정. 코드/디자인/키/설정/빌드/커밋/푸시/공개 배포 변경 없음. spec:check 및 scoped diff 검증.

## HIST-20261001-007

- 사용자가 SNS 정보 출처 검토를 개발이 아닌 기획회의로 별도 기록하고 필요하면 채팅 분기하도록 지시했다. docs/planning/SNS-SOURCE-MEETING-20261001.md에 직접 수집/자동 캡처/수동 표본/협력자 제출 시나리오와 미확정 사항을 분리해 기록했다. 어떤 수집 방식도 승인·구현으로 바꾸지 않는다.
- 최신 미니 대화에서 자동 입력 거절 직후 동일 내용 질문에 상세 답변이 나온 것을 확인했다. 사용자는 수동 입력이라고 설명했으며 자동 입력 경로 차이 가설은 미확정이다. 미니의 위험0/비용수십배 단정은 채택하지 않는다. 기획 문서는 제품/API/data 계약 영향이 없어 registry/운영 정책/제품 코드/키/설정/유료 API/빌드/배포는 변경하지 않는다.
- 기존 대화를 같은 디렉터리의 기획 채팅 `01a0f625-d0dc-7e81-ade1-09052a747e16`로 분기했다. 문서 한 개만 읽고 범위 확인 후 대기하도록 인계했으며 해당 채팅에는 파일 수정/개발/외부 메시지/유료 시험/배포 금지를 명시했다. 별도 checkout이나 Git 브랜치 생성은 없다. spec:check와 scoped diff check 통과, 커밋/푸시 없음.

## HIST-20261001-006

- GS-005 관련 제안 검토만 수행. 사용자 지시로 기존 미니/Gemini GLI 대화를 확인하고 SNS 자료 확보를 논의하는 질문을 두 번 보냈다. 모두 일반적인 능력 밖이라는 답변으로 완료되어 실질 조율/합의는 없으며 원인을 단정하지 않는다. 추가 반복·모델 변경·새 창·차단 우회 없음.
- 독립 검토: Telegram/LINE 공식 메시지 수신 문서를 확인했다. 동의한 중개사 폼/CSV → 자발적 Telegram 봇 제출 → 허용된 채널의 새 글 순서와 ID/hash 중복 차단·변경분만 AI 처리·검수/만료 구조를 제안했다. SNS 전체 크롤링이나 임대계약/순수익 증거 확보를 완료한 것으로 보지 않는다. Meta 공식 페이지는429로 검증 보류, Zalo 미검증.
- SNS-DISCOVERY-REVIEW-20261001.md와 root CURRENT_STATE 갱신, 화면 증거 work/qa/mini-sns-review-20261001.jpg. 제품/API/data 계약 영향 없음으로 registry/수집 정책은 변경하지 않는다. 연결 구현/키/설정/유료 GLI API/빌드/커밋/푸시/배포 없음. 실제 협력 중개사와 사용 SNS/공유 권한 확인이 다음 단계다.
- 검증: spec:check(33 features/47 routes/4 unchanged visual baselines)와 scoped diff check 통과. 저장된 스크린샷에서 두 번째 질문 및 일반적인 거절 응답을 직접 확인했다. 실제 SNS 서비스 연결 시험은 하지 않았다.

## HIST-20261001-005

- 사용자 '미니=제미니, 로드=클로드' 웹 협업 별칭과 위임 스킬 등록 지시. `skills/gli-web-delegation/SKILL.md`를 저장소 원본으로 관리하고 개인 Codex skills에 설치한다. 작업별 최소 컨텍스트, 기존 GLI 창 선택, 중복 전송 금지, 비밀정보 제외, 사용량/로그인 실패 보고 및 독립 검수/승인 경계를 명시했다.
- 우측 in-app 탭에 Gemini app과 Claude Design 페이지가 존재함을 inventory로 확인했다. 로그인/작업 실행/답변 수령을 시험하지 않았고 이번에는 작업을 보내지 않았다. API·내부 Codex subagent와 웹 협업을 구분한다. 개인 skills 폴더 생성의 일반 접근 거부 후 승인된 별도 권한으로 생성했다.
- AGENTS 스킬 참조, root CURRENT_STATE 및 이력 갱신. 제품/API/data 계약 영향 없음으로 registry를 변경하지 않는다. 스킬 validation/spec check와 설치본 동등성을 확인한다. 제품 빌드/유료 API/커밋/푸시/공개 배포 없음. 설치본의 현재 세션 자동 선택 여부는 재로딩 전 확정하지 않는다.
- 검증: Python quick_validate는 기본 python/PyYAML 부재로 실행 불가. 기존 js-yaml로 YAML·필수 키·name/description 제한·TODO 부재를 검증했고 원본/설치본 SHA256 동일, spec check(33 features/47 routes/4 unchanged baselines) 및 scoped diff 통과. 의존성 신규 설치 없이 마감했다.

## HIST-20261001-004

- GS-005/006/010/033, P47. 사용자 '우선 되는 것만 연결' 승인으로 파트너 자료만 있던 필리핀에 Dot Property Philippines 제한 매매/임대 수집을 연결했다. Lamudi/Rentpad의 도구 HTTP403을 봇 차단으로 확정하거나 우회하지 않으며 보조 출처는 건드리지 않았다.
- 기존 Vietnam parse5 카드 parser를 국가 인자(default VN)로 재사용하고 PH host/path/PHP/도시 매핑을 추가했다. 동일 URL의 Sale or Rent 광고는 URL+거래유형으로 분리해 매매 가격이 월세를 덮어쓰지 않는다. 기본 VN 계약/ID/2MB 제한은 유지하고 PH만3MB 제한. 기존 demo/robots/redirect/timeout/FX 게이트 재사용, 수집 자체 AI 호출0회.
- PH collector: 첫 매매20+임대20, 성공10분/실패1분 및 in-flight 공유, Map120. /api/search Philippines 조건과 getAsset에 연결하고 필터 후 기존 metered 번역/상담 경로만 사용한다. 원가격/날짜/Trust 보존, 한국어 독립 지명 표시 추가. 원문 게시일·완공·임대계약·소유권·순수익을 만들지 않는다.
- 파일: lib/philippines-discovery.ts, Vietnam parser, assets-data/location-display, search route, Philippines tests, COUNTRY-SOURCES/API-CONTRACTS/DECISIONS/registry/PM/운영 문서/이력. 별도 endpoint/키/설정/디자인 변경 없음. 약관 제한과 사용자 데모 승인/상용 라이선스의 차이를 기록했다.
- 검증: 실제 일반 서버 GET robots/매매/임대200,40건·캐시·동일 실행 상세 조회·PHP23,000→약496,924원/월 확인. 초기 진단의 parse5 circular JSON 출력 실패는 필요한 필드만 추출하도록 수정했고 테스트 import 오류는 실제 location module을 지정해 정정했다. 관련17시험, 전체 check262시험/build/typecheck/lint 통과(기존 경고10). spec refresh/check 및 scoped diff로 마감.
- 한계: 신규 유료 번역/상담·브라우저 전체 여정 미검증, 서버 재시작/다른 인스턴스 상세 복구 및 D1/R2 영속 저장·전체 도시/예산 커버리지·상용 허가 미완료. P46 환율23시간 캐시와 기존 P41 보류 작업은 별도다. 커밋/푸시/공개 배포 없음.

## HIST-20261001-003

- GS-013/006, P46. 사용자 '원화 환율을 알려달라는 질문이 있으나 환율 API를 통해 항상 실시간 계산' 지시에 자동 조회 책임을 명시했다. 이전 전달 보완은 환율이 없을 때 사용자에게 물어보는 경우까지 금지하지 못했다.
- 공통 상담 원칙21과 OpenRouter currencyRule에 환율 입력/선택 요구를 항상 금지한다. API 실패/통화 누락이면 원 가격과 짧은 일시 환산 불가 설명만 제공한다. 제공된 기준일/환산값을 사용하며 캐시를 초단위 시장 실시간으로 부르지 않는다.
- 현 기술 확인: lib/exchange-rates.ts는 23시간 캐시. 이를 진정한 실시간으로 완료 처리하지 않았고 공급자/주기/설정/키는 변경하지 않는다. 조회 주기 개선은 GS-013 next에 남겼다. 기존 화면 응답을 재작성하거나 추가 유료 테스트를 하지 않았다.
- 파일: ai-search와 관련 시험, DECISIONS/PRODUCT-DATA/registry/CURRENT_STATE/HISTORY. 모의 시험은 정상·demo·통화 누락 모두 사용자에게 환율을 요구하지 않는 지시를 확인했다. 관련21시험 및 전체 check257시험/build/typecheck/lint 통과(기존 경고10). spec refresh/check 및 scoped diff로 마감. 디자인/커밋/푸시/공개 배포 없음.

## HIST-20261001-002

- GS-013/033/006/010. 사용자 테스트 지시에 기존 localhost:8776/explore 후속 입력으로 '베트남 호치민에서 월 1,500달러 이하의 2베드룸 콘도 임대 매물을 다시 찾아줘. 월세는 원화로도 알려줘.'를 1회 전송했다. 이후 추가 상담 요청은 보내지 않았다.
- 실제 결과: 후보5건/출처5건/요약TOP3와 전체5건 목록 일치. Feliz En Vista 27M VND→1,409,375원, Vinhomes Golden River 28M→1,461,574원·30M 두 호실→1,565,973원, Lumiere Riverside 37M→1,931,366원. 제목/위치/조건 칩은 알려진 지역명 한국어, 브랜드 원문 유지. 동일 단지의 세 게시물은 69/68.2/71.9㎡로 구분되며 같은 호실 여부를 이번 시험에서 검증하지 않았다.
- 실패: 새 AI 본문은 USD 예산 충족/환산값을 설명했으나 '원화 환율이 없다'며 사용자에게 환율을 질문했다. 본문/추천 이유에는 District 1/2, An Phu도 남았다. 카드 기능 정상과 상담 전체 정상은 구분한다. 화면 응답만으로 번역 공급자별 유료 호출 성공을 증명하지 않는다.
- 원인/보완: runOpenRouterAdvisor의 user 입력에 exchangeRate가 없었다. 관측 날짜+rates가 있는 경우만 전달하고 후보별 결정적 priceKrwReference 및 한국어 locationLabel을 추가했다. 기존 고정 demo 환율은 근거로 보내지 않는다. 원통화/원가격·등급·후보 식별·명칭은 그대로, 원화는 참고 호가 환산이며 비용 포함·수입 증거가 아니다.
- 변경: lib/ai-search.ts, tests/ai-search.test.mjs, API-CONTRACTS/PRODUCT-DATA/registry/현재상태/이력. 관련21시험·전체 check257시험/build/typecheck/lint 통과(기존 경고10). 수정 후 실제 유료 답변은 재실행하지 않았으므로 미검증이다. 화면 증거 work/qa/vietnam-live-fx-test-20261001.jpg는 보완 전 실응답의 후보 표시다.
- clip 캡처 실패 후 범위/화면 크기를 확인하고 일반 viewport 캡처로 수령했다(첫 실패 원인은 미확정). spec refresh/check와 CRLF 허용 scoped diff로 마감. 디자인/키/설정/소스 승인/공개 배포/커밋/푸시는 변경 없음. 사용자 지시 전까지 다음 질문을 제출하지 않는다.

## HIST-20261001-001

- GS-013/033/010, P08/P34/P40. 사용자 번역/원화 실패 지시에 따라 해당 기능만 재개했다. Claude 원본/CSS/문구/폰트/DOM/반응형 규칙은 변경하지 않는다.
- 원인: 실제 카드/TOP3 환산 helper는 USD만 허용했고 검색 rate는 demo KRW/USD뿐이었다. 번역은 한글 포함 필드 전체 제외·지명 원문 표시·프로젝트와 지역을 함께 보존하는 프롬프트가 겹쳤다. 환율 API 자체는 로컬 GET200 확인.
- 변경: 공유 FX snapshot을 검색 응답/상담에 전달, VND 등 지원 통화/가격 범위 환산을 기존 span에 연결. 저장 결과는 무료 FX GET으로 갱신하고 상세의 임시 FX 실패가 이후 방문을 막지 않는다. 상담 근거에 priceUsdReference 전달. 원 가격/정규화 위치/후보 순서는 보존.
- 번역: 알려진 독립 지명은 무비용 표시 투영, 문장부호로 분리된 제목 지명도 처리. 따옴표/붙여쓰기/구분 없는 복합명칭 보존. 혼합 문장 제외 해제 및 quoted-name 토큰 보호를 v2에 적용하고 호환 v1 캐시 재사용. 신규 유료 번역은 기존 metered 검색만 허용.
- 파일: location-display/consultation-view/asset-localization/search/ai-search, search route, Claude shell/PriceDisplay/외부 상세, 관련 시험, PRODUCT-DATA/API-CONTRACTS/registry/PM/현재상태/이력. 사전 밖 지명은 추측하지 않으며 기존 AI 설명/추천 이유 전체를 재생성하지 않는다.
- 검증: 관련29시험, 전체 check256시험/build/typecheck/lint 통과. ref-only FX effect의 추가 lint warning은 의도 주석과 제한된 억제로 정리(기존 경고 별도). localhost:8776/explore 저장 결과 새로고침 후 카드/TOP3에서 호치민/군/동 및 27M VND→1,409,375원, 28M→1,461,574원, 37M→1,931,366원 월 환산 확인. snapshot 2026-09-30T00:02:31Z, USD/VND25933.056088·USD/KRW1353.681844. 증거 work/qa/vietnam-fx-localization-20261001.jpg. 추가 유료 AI 호출 없이 검수.
- 한계: 유료 공급자 새 번역 실응답, 미등록 지명/브랜드 경계, 기존 AI 본문/추천 이유의 영어 잔존, KRW 예산 해석 demo1380, 구형 상세/C1/복귀/진행 안내는 별도 남음. spec refresh/check와 scoped diff로 마감. 키/설정/수집 승인/커밋/푸시/공개 배포 없음.

## HIST-20260930-008

- GS-005/006/010, P45. 사용자 '다른 질문, 평범한 걸로' 지시에 따라 같은 대화의 후속 입력창으로 '베트남 호치민에서 월 1,500달러 이하의 2베드룸 콘도 임대 매물을 찾아줘.'를 1회 제출했다. 추가 질문은 제출하지 않았다.
- 화면 답변/목록은 Feliz En Vista(월27,000,000 VND/85㎡), Vinhomes Golden River(28,000,000 VND/69㎡), Lumiere Riverside(37,000,000 VND/76.8㎡) 3건으로 일치. 모두 호치민/임대/2베드이며 출처3건·TOP3·후속 질문 입력창을 표시했다. 모델은 가격/공간/위치를 비교하고 관리비 포함 예산인지 질문했다. 확정 공실/가구/입주일을 만들지 않았다.
- 읽기 전용 cached discovery는 40건 유지. 같은 문장을 대화 맥락 없이 기존 deterministic search에 적용하면 USD1500/Ho Chi Minh City/rent/condo/2bed/residence로 해석하고 상위5개를 반환한다(전체 일치 건수는 별도 세지 않음). 화면 최종3개와 서버 검색층 상위5개는 구분한다.
- UX 관찰: 최초 수익 질문보다 후보를 먼저 제시하는 흐름은 개선. 그러나 확인된 FX 예산 필터를 사용한 후보인데 상담은 달러 예산 충족을 반복 미확인으로 표현하고 동화 가격만 설명했다. 지명 영어 잔존, Top5 목표 대비 최종3개 표시도 남는다. 공급자별 payload/실제 호출 수·비용은 이번에 추적하지 않아 원인을 단정하지 않는다.
- 증거: work/qa/vietnam-rent-test-20260930.jpg. 상태/검수 기록만 갱신; 제품 코드/API 계약/정책/키/설정/UI/빌드/커밋/푸시/배포 변경 없음. spec:check 및 문서 diff 확인.

## HIST-20260930-007

- GS-005/006/010, P45. 사용자 요청으로 기존 localhost:8776/explore 탭에 '베트남에서 월 300만원 정도 버는 부동산이 필요해.'를 1회 제출했다. 기존 캄보디아 대화가 있는 상태에서 국가 전환 상담 시험이며 독립 신규 세션 시험은 아니다. 후속 질문은 사용자 지시 전까지 제출하지 않는다.
- 화면 답변: 베트남 매매 후보는 있으나 목표 월수입을 확인할 임대계약/운영비 근거가 없다고 설명하고 총투자 예산을 질문. 완료 표기와 자산 목록은 0건, 추천 요약 없음. 캄보디아로 임의 변경하거나 확정 월수입을 만들지 않았지만 후보를 먼저 보여주는 상담 UX 개선은 이 시험에서 확인되지 않았다.
- 읽기 전용 GET /api/discovery/vietnam은 HTTP200/cached:true, 매매20/임대20 유지, checkedAt=2026-09-30T14:28:24Z. 수집 재고 존재와 수익 목표 충족 근거 부재를 구분해야 한다. 상담의 0건 원인이 후보 로딩/의도·필터/화면 중 어느 단계인지는 응답 원자료/실행 추적을 확보하지 않아 미확정이다. 답변에 언급된 다낭/운영형 후보를 신규 Dot 수집 증거로 삼지 않는다.
- 증거: work/qa/vietnam-advisor-test-20260930.jpg (상담 답변과 후속 입력창). 내부 모델별 호출 성공/실제 호출 수·비용은 별도 확인하지 않았고 UI의 GLI AI 표기를 공급자 성공 증거로 해석하지 않는다.
- 문서/상태만 갱신; 제품/API 계약/정책/설정/키/UI/빌드/커밋/푸시/배포 변경 없음. 기존 정책에 대한 UX 관찰이며 신규 동작 승인은 아니다. spec:check 및 문서 diff 검증으로 마감한다.

## HIST-20260930-006

- GS-005/P45. 사용자 '데모니까 허용해. 데이터를 통해 AI 최적화 목적'에 따라 Dot 데모 재사용 보류를 해제하고 실제 공개 매매/임대 카드 매핑 검수 후 검색/상담 후보와 Map 상세에 연결했다. 이는 학습/반출/상용 허가가 아니며 P44 보조자료 보류는 유지한다.
- 일반 공개 요청으로 매매20/임대20 확인. 카드의 VND 가격/거래유형·위치·침실/욕실·면적·첫 사진/원문 URL만 채택한다. contact form/agent/전체 설명/개인 연락처는 제외. 원문 작성일을 수집시각으로 만들지 않으며 확인 없는 순수익·법률 상태/확정 검증은 표시하지 않는다.
- 최초 두 목록만 조회, 최대40개, cache/inflight 공유, 상세 Map120 제한. robots wildcard와 GLI-specific 규칙 확인; redirect/차단 우회 없음. Homedy timeout으로 필드 매핑 보류, Bat403/ERA/IQI/미디어/지도 보류. 상용 gate/설정/키/캄보디아/디자인 원본은 변경 없음.
- 파일: Vietnam discovery/route, search route+filter, assets/data, currency, shared exchange-rates+기존환율route, tests 및 국가별/API/정책/registry/운영 명세. 공유 환율로 VND를 USD 예산과 비교하며 환율 미확인 시 예산 일치 제외; 원문 VND는 유지한다.
- 검증: 전체 check 251시험/build/typecheck/lint 통과(기존 경고10). LOCAL localhost:8776 API200(2026-09-30T14:28:24Z) 40건과 실제 ExchangeRate-API 기준일 확인. 공유 환율의 edge 미지원 redirect:error 문제를 manual+상태검증으로 정정하고 회귀시험 추가. spec refresh/check와 scoped diff 확인. 유료 AI 검증 호출·커밋·푸시·공개 배포 없음.
- 미완료: 전체 도시/가격대 커버리지, 원문 날짜, 실제 임대계약/순수익 근거, D1/R2 영속 저장/다른 인스턴스 상세 재확인, 상용 소스 협의. 기존 번역 경로 재사용과 실제 유료 번역/상담 검증은 구별한다.

## HIST-20260930-005

- GS-005/P44. 사용자 '1차 검수 통과한 것만 추가, 보조자료는 고도화 때 사용, 현재 스킵' 승인에 따라 이전 ERA 프로젝트 자동 조회 → 보조자료 보류/검수 전 source selection으로 변경했다. 이전 답변의 1차 검수는 우선 조사 후보였지 완료 판정이 아니었다.
- Dot Property/Homedy robots/homepage 일반 서버 GET HTTP200 및 개별 가격/면적 확인. Dot Property 운영 약관의 제3자 제공 제한, Homedy 재사용 허가/필드 매핑 미확정으로 통과를 선언하지 않았다. Homedy 운영 규정의 직접 조회는 12초 timeout, 공개 웹 문서는 열람 가능했다. 접근 가능성과 재사용 허가는 별개이며 위법 확정 판정이 아니다.
- 파일: `lib/vietnam-discovery.ts`에 출처별 검수 게이트, route 주석, `tests/vietnam-discovery.test.mjs`, 관련 API/국가별 명세·등록부·결정/상태/이력. ERA parser는 보존하며 IQI 신규 연결 없음. 차단된 Batdongsan 재조회와 미검수 두 후보의 자동 호출도 없다. 새 활성 매물 소스 0개.
- 검증: 관련 7시험 통과. 로컬 API 200(2026-09-30T14:03:39Z) projects=[] 및 네 출처 disabled 사유 확인. 전체 check 243시험/build/typecheck/lint(기존 경고10) 통과. 이후 P45로 Dot demo 보류 해제. 빈 참조 응답은 베트남 전체 매물 부재를 뜻하지 않는다.
- 미완료: 허용된 개별 매물 제공 채널/재사용 범위, source별 날짜·통화·거래유형 매핑, 검색/상담 연결과 영속 저장. 기존 캄보디아·파트너 카드·UI·설정/키는 변경하지 않았다. 유료 AI·커밋·푸시·공개 배포 없음.

## HIST-20260930-004

- GS-005, P43. 사용자 ERA Vietnam 지정 및 Batdongsan 데모 연결/상용 협의 후 연결 결정에 따라 베트남 데모 참조 수집을 재개했다. 제안만 있던 베트남 외부 출처 → 별도 프로젝트 참조 조회 endpoint, 실제 차단 상태와 상용 게이트를 추가했다.
- `lib/vietnam-discovery.ts`, `app/api/discovery/vietnam/route.ts`, `tests/vietnam-discovery.test.mjs`. ERA 공개 JSON만 파싱하고 소스 JavaScript는 실행하지 않는다. 작성자/이메일 제외, 원문 ID/URL/게시·수정·수집 시각 분리, 개발사/소유권/진행은 게시자 주장으로 기록한다. 호실 가격·월세·순수입은 null이며 프로젝트 전체 면적과 호실을 혼동하지 않는다.
- robots/HTTP 차단 시 중단, 2MB/12초/최대20 프로젝트, 실행 공유와 캐시를 적용했다. commercial/default production은 비활성, LOCAL development 또는 기존 명시적 demo-auto-approval에서만 운영 가능. Cloudflare development binding은 loopback 요청에서만 로컬로 인정한다. 유료 AI·키·환경 설정·캄보디아·디자인·상담/검색 결과는 변경하지 않았다.
- 실제 외부 검증: 2026-09-30T13:37:22Z ERA 프로젝트12 수집, Batdongsan robots HTTP403 차단. 증거 `work/qa/vietnam-discovery-20260930.json`(생성 자료, 개인정보 없음). 13:42:51Z 로컬 API 200에서도 ERA12/Batdongsan blocked를 확인했다. 신규 모의 시험7, 전체 `npm run check` 243개 시험·빌드·타입 검사 통과(기존 린트 경고10). 문서 refresh/check 및 해당 파일 diff 검수로 마감한다.
- 남은 것: Batdongsan 정상 응답/허용 feed와 필드 매핑, ERA 개별 호실 재고/가격·임대 자료, 한국어 번역, 현재 검색/상담 연결, 영속 저장·주기 수집. GS-005는 partial이며 베트남 추천 완료가 아니다. 커밋·푸시·공개 배포 없음.

## HIST-20260930-003

- 근거: 사용자 Jev/System One AI를 GLI 상담에 도입해 모호한 질문의 선택, 응답 속도 및 UX를 개선하라는 지시. 관련 GS-010/011/012, P18/P36/P38/P42.
- 변경 전 → 후: 모든 OpenRouter 상담의 Astra 의도 해석 선행 → 명시 지역/자산 탐색이 있으나 매입·임차가 미확정인 첫 질문에 한해 Jev 1회 판정. 확실할 때만 한 질문으로 확인하며 후보 수집·Astra 호출 생략; 나머지는 기존 경로. 요청별 유료 단계 원장에 `decision` 추가, 상한 9→10. 공급사/점수는 공개하지 않고 기존 `clarify` 응답 계약 유지. UI 소스·디자인, 키·배포 설정, 가격/수익률 판단은 변경하지 않음.
- 파일: `lib/jev-routing.ts`, `lib/consultation-intent.ts`, `lib/consultation-search.ts`, `lib/ai-operation.ts`, `app/api/search/route.ts`, 관련 테스트 및 운영 문서. `GLI_JEV_ROUTING=disabled`로 이 분기만 비활성화 가능.
- 검증: `npm run check` 통과(빌드 포함 236개 시험, 기존 린트 경고 10건), `npm run spec:check` 통과. 금액/거주 등 명확한 단서의 Jev 호출 제외 보강 후 관련 21개 시험 재통과. GLI OpenRouter 키로 합성 질문 1회 실제 Jev 호출 시 `clarify=true`, 약 605ms 관측. 로컬 `/api/search`에서 같은 유형 질문은 `clarify`·후보 0건·요청 이해 단계만 반환. 단일 표본이므로 전체 상담 속도/정확도 개선으로 일반화하지 않음.
- 미완료: 실제 질문 라벨과 지연/비용 A/B 표본, 판단 임계값 교정, 보안/고객 UX 검증, 후보 의미 매칭 확대는 별도 단계. 현재 GPT 사이트 로컬 변경이며 공개 배포·커밋·푸시는 수행하지 않음.

## HIST-20260930-002

- 근거: 사용자 GLI AI 개발 운영체계 핸드오프 및 정정. 현재는 GPT 사이트이며 Firebase DEV/TEST 이전은 향후 계획이다.
- 변경 전 → 후: 루트 AGENTS의 장황한 초기 운영 블록을 핵심 작업 규칙으로 축약하고, 확인된 안정 정보는 루트 AI_CONTEXT, 현재 단위 상태는 루트 CURRENT_STATE로 분리했다. 기존 중요 지침과 과거 이력은 보존했다.
- 확인: `package.json`의 실제 개발/검증 명령, `.openai/hosting.json`의 GPT Sites D1/R2 설정, CI의 main 대상, 로컬 Git 브랜치/원격을 확인했다. Firebase 설정 파일과 배포 명령은 저장소에서 확인되지 않아 작성하지 않았다.
- 범위: 문서만 변경. 제품/API/데이터 계약, 디자인, 키, 서비스 설정, Firebase/GPT Sites/Production 배포 변경 없음. 커밋·푸시는 다른 사용자 변경이 다수 섞인 작업 트리이므로 별도 안전 검토 후 판단한다.
- 검증: `npm run spec:check` 및 관련 문서 차이 검사. 런타임 빌드·유료 API 호출 없음.

## HIST-20260930-001

- 근거: 사용자가 제공한 GLI Development Rules를 새 작업에서도 유지할 최상위 작업 규칙으로 저장 요청.
- 변경 전 → 후: 대화에만 적용하던 규칙 → 공개 사이트 저장소 루트 `AGENTS.md` 상단에 GLI 전용 범위, 최소 탐색/변경, 단계적 검증, 환경 경계, 실패·로그 처리, 모델 선택, 명세·이력 갱신, 종료 원칙을 기록. 기존 지침과 사용자의 미완료 변경은 보존.
- 범위: 작업 절차 문서만 변경. 제품 동작/API/데이터 계약·디자인·키·환경 설정은 변경하지 않음. Firebase DEV/TEST는 실제 대상과 설정 확인 전 배포하지 않으며 기존 Cloudflare/GCP/AWS 계획을 자동 변경하지 않음.
- 검증: 문서 차이와 명세 검사. Git 커밋·푸시·배포 없음.

## HIST-20260923-013

- 근거: 사용자가 지정한 GPT 사이트 서버리스 목업 → Google Cloud 테스트 서버 → AWS 상용 서버 순서. 관련 P37, GS-025/031.
- 변경 전 → 후: AWS 직접 이식 후보 계획 및 Google Cloud 가능성 논의 → 3단계 개발·검증·출시 순서를 확정 정책으로 기록. 현재는 1단계이며 환경별 기술 구성·비용·이전 실행·공개 배포는 별도 승인으로 구분했다.
- 파일: DECISIONS, CURRENT-STATE, AWS-MIGRATION, registry의 GS-025, 자동 생성 FEATURE-STATUS, HISTORY. 기존 AWS 후보 기술 조합을 승인된 구성으로 승격하지 않았다.
- 검증: spec:refresh/spec:check 및 문서 scoped diff 검사. 제품/API/데이터의 현재 동작 변경 없음. 코드 빌드·유료 API·클라우드 생성·키/설정 변경은 수행하지 않았다.
- 후속: 현재 환경의 QA 안정화/명세 정비 후 Google Cloud 테스트 범위·수용 기준을 확정한다. 단계별 문서·검증 증거를 누적하고 AWS 출시 전 환경 이관/운영 검수를 별도로 한다. Claude 디자인 권한 및 Fable 제외 유지.
- 커밋·배포: 로컬 계획/명세 기록만. Git 커밋·푸시·공개 배포 없음.

## HIST-20260923-012

- 작업일 / 작성자: 2026-09-23 / Codex 및 독립 웹 QA 보조 에이전트 1명. 근거: 사용자 요청의 서버 빌드 구조, 토큰 낭비, 정책·주석·역사 기반 기획서 생성 가능성 검수. 관련 GS-001/004/010/011/012/025/031/032/033, GLI-052.
- 변경 전 → 후: 개별 UI 인계 검수 → 현재 앱과 최종 디자인 ZIP의 차이를 포함한 3축 기술 검수 보고 `WEB-QA-ARCHITECTURE-20260923.md`를 추가하고 implementation/README에서 연결했다.
- 검증: 키와 .env 없이 별도 work 사본을 만들고 기존 node_modules를 재사용. `npm run check`에서 lint 오류 0/경고 5, DB migration 검사, vinext 서버·클라이언트 빌드, 207/207 시험 통과. 별도 tsc는 import 설정/Cloudflare 타입/실제 계약 오류 등으로 실패했다. 사본의 원본 HTML·생성 CSS/TS 해시는 원본과 동일. 보조 QA의 모의 시험과 실제 API 미호출을 구분해 기록했다.
- 발견: Gemini 탐색/번역의 유료 호출이 상담 한도와 분리됨, 고객 횟수 반환과 실제 비용 원장 미분리, 외부 공개 후보 Map 영속화 미완, 타입 검사 게이트 없음, 동시 중복/요청 취소 미흡, 긴 답변의 후속 1200자 계약 충돌, 시안/실제 API adapter 및 최신 인계 색인 보완 필요. 해당 경계 중 기존 계획 항목을 새 회귀로 오해하지 않도록 명시했다.
- 명세 영향 없음: 제품 동작/API/데이터 계약·사업 정책은 변경하지 않은 검수다. 새 문구/디자인/상한 수치 또는 AWS 이식 방식은 승인하지 않았다. 문서 spec:check 및 scoped diff 검사를 수행한다.
- 남은 일: 보고서의 Q1~Q8 수정과 통합/정책 승인. 실제 서버 배포/부하/실기기/유료 모델/AWS 검증은 하지 않았다. Fable 제외 유지.
- 커밋·배포: 제품 원본·설정·키 변경 없음. 검수 사본과 문서만 작성. Git 커밋·푸시·공개 배포 없음. 빌드는 격리된 검수 사본에서만 실행했다.

## HIST-20260923-011

- 근거: 사용자 "계속해" 후 최종 ZIP 첨부/"받아". 관련 GLI-052, P28/P35/P36. 제작 완료 보고와 수령·독립 검수를 구별한다.
- 변경 전 → 후: 최종 다운로드 카드의 로컬 전달 미확인 → 사용자 지정 Google Drive 파일을 읽어 `work/GLI-052-final-20260923-190807.zip`에 보관하고 별도 `work/review-20260923-final`에 안전한 경로 검사 후 압축 해제. ZIP 153,049바이트, SHA-256 `31e4d157592f9e5787533336f5cf99f7f6473efd360a2bac5c63e4296145c241`. HTML 2개, fixture JS, 문서 5개, S1 시험 이미지 총 9개 수령. support.js/이미지는 소형 패키지에서 제외된 구성이다.
- 직접 코드 대조: 보완 HTML SHA-256 `f8fd894d9ed2e57cab636a3e106744bcd72b262fa4f1479a62d9d3f3ca9f60c9`. 이전 8784용 스냅샷 대비 88행 추가/25행 삭제는 S1/QA 로직이며 HTML 템플릿·CSS가 있는 실행 스크립트 이전 구간은 완전히 동일하다. 위치 기반 해제, 응답 직전 재확인, rAF 의존 제거 및 QA 지연 응답 훅 존재 확인. 실제 손 조작에 대한 합격 판정은 아님.
- 온라인 QA: Claude 최종 QA 화면에서 search/long 시나리오 각각 320/360/390/412/768/1440px 일괄 검사를 직접 실행. 제공 QA 도구 출력에서 가로 넘침 없음, 요약/목록 순번 일치(search 3/3, long 1/1), 자동 초점 없음. 문단 보존 5사례 통과. review에서 선택 후보만 설명하고 기존 4건 순서 유지, empty에서 조건 밖 후보 자동 노출 없음 확인. 이는 fixture 및 납품 QA 측정이며 실제 GLI API/실기기 검수가 아니다.
- 잔여 사항: search 320px 답변→입력창 982px, 768/1440px 출처 터치 영역 4개가 44px 미만. CSS zoom 200%는 텍스트 확대 검증이 아님. review 조건 칩은 이전 답변에 남고 최신 답변에는 없으며 이전 이력 기본 접기로 화면에서 사라진다. 후보 교체 안내는 여전히 건수 차이만 감지한다. 최종 로컬 실행/실제 스크롤바·키보드·터치/Safari/API 연결 시험 및 미승인 문구·출처 접기 결정은 남김.
- 파일/검증: 이력과 GLI-052 검수 보고만 갱신. 압축 항목·해시·parse5 HTML 구조·이전 스냅샷 diff 검사, `npm run spec:check`와 문서 scoped diff 검사. 제품 동작/API/데이터 계약 변화 없음. 8784 이전 스냅샷과 8776 실제 AI 앱은 교체하지 않음.
- 커밋·배포: GLI 유료 API 호출/제품 소스·설정·키 변경/빌드/커밋/푸시/공개 배포 없음. Fable 제외 유지. heartbeat는 완료 보고 때 중지한 상태를 유지한다. HIST-20260923-010의 수령 불가 상태는 이번 수령 기록으로 해소됨.

## HIST-20260923-010

- 근거: 사용자 진행 상황 보고 요청. 기존 Claude Design 탭의 최종 완료 응답을 직접 읽었다.
- 제작자 보고: S1 위치 기반 해제, 응답 직전 재확인과 rAF 의존 제거 완료. 390px 모의 시험 T1~T9 모두 통과. 보완 HTML/QA와 STATE-EVENTS·CHANGES·TEST-RESULTS·HANDOFF 정정, `docs/qa-s1-follow-result.jpg`가 포함된 최종 인계 ZIP 갱신을 보고했다. 시각 디자인/문구는 바꾸지 않았다고 명시했다.
- 증거 경계: 실제 사람의 스크롤바/키보드/터치 관성, Safari, 실기기 키보드, 실제 API는 제작자도 미검수. 이 시험은 scrollTo/scrollBy 모의이며 Codex 독립 검수 통과가 아니다. 누적 48px 해제 기준/렌더 이동 구분의 타당성은 최종 소스 수령 후 확인해야 한다.
- 수령: `Download GLI-052-R 인계 패키지 (S1 정정 반영)` 카드를 한 번 눌렀으나 Downloads의 최신 GLI ZIP은 여전히 오후 3:02 이전 스냅샷이었다. 최종 로컬 수령 미확인. 기존 8784 화면을 갱신하거나 8776 실제 앱에 통합하지 않았다.
- 후속: 완료 보고 및 수령 조치 필요 상태를 알리고 heartbeat `gli`를 PAUSED로 변경. 사용자가 최종 패키지를 첨부하면 원본 대조/독립 검수와 미승인 문구·출처 접기·시각안 승인 절차를 이어간다. Fable 제외 유지.
- 파일/검증: HISTORY와 GLI-052 검수 보고에 상태 추가. 제품/API/데이터 계약 변화 없음. 문서 spec:check 및 관련 diff 검사 수행. GLI 유료 API 호출/제품 빌드/커밋/푸시/공개 배포 없음.

## HIST-20260923-009

- 근거: 사용자 승인 재개 예약 및 18:41 KST heartbeat. 기존 Claude Design 프로젝트의 일시 중단 상태와 Resume 버튼을 확인하고 한 번 눌렀다.
- 직접 확인: 일시 중단/Resume 표시가 사라지고 실행 중 상태로 전환. 마지막 승인 S1 재검수·문서 정정·패키지 갱신만 이어가며 새 요청/모델 변경/결제는 하지 않았다. 실제 완료 또는 최종 원본 수령을 뜻하지 않는다.
- 후속: 기존 heartbeat `gli`를 ACTIVE 10분 확인 간격으로 변경. 중복 재개/단순 진행 알림 금지, 완료 또는 사용자 조치 필요 시 보고 후 일시 중지 규칙 유지.
- 영향/검증: 이력만 추가. 제품/API/데이터/설정/키/디자인 소스 변화 없음. 문서 spec:check 및 관련 diff 검사 수행. GLI API 호출/빌드/커밋/푸시/공개 배포 없음. Fable 제외(P36), 8784 이전 스냅샷/8776 실제 AI 앱 구분 유지.

## HIST-20260923-008

- 근거: 사용자 "클로드는 오후 6시 40분 이후 사용량이 초기화 된다. 그 이후에 다시 작업 시작해".
- 조치: 기존 heartbeat `gli`를 ACTIVE로 전환하고 오늘 18:41(Asia/Seoul)에 기존 Claude Design 작업을 재개하도록 예약. 한도 초기화 시각 이전 실행 금지, 이미 진행/완료 시 중복 실행 금지, 마지막 승인 S1 검수·문서·패키지 갱신만 이어가도록 지정했다.
- 후속 규칙: 재개 후 진행 중이면 10분 확인으로 전환하고 단순 진행 알림은 생략. 완료 또는 사용자 조치 필요 시 결과를 보고하고 자동 확인을 일시 중지. Fable 제외와 새 시각안/문구/통합/배포 승인 경계 유지.
- 영향/검증: 예약 갱신 응답 ACTIVE 확인 및 이력만 추가. 실제 작업 재개/한도 초기화/최종 인계 완료를 뜻하지 않는다. 제품/API/데이터 변경 없음. `npm run spec:check`와 이력 diff 검사 수행; 빌드/GLI API 호출/커밋/푸시/공개 배포 없음.

## HIST-20260923-007

- 근거: `gli` heartbeat의 최종 Claude 인계 확인. 사용자 요청 범위는 완료/실패/조치 필요 변화 보고이며 추가 디자인 지시나 제품 수정이 아니다.
- 직접 확인: 기존 Claude Design 프로젝트가 `Paused — you've hit your limit.` 상태. 화면은 오늘 오후 6:40 한도 초기화와 Resume 버튼을 표시한다. S1 위치 기반 해제 재검수(T1~T8)는 진행 중, STATE-EVENTS/TEST-RESULTS/CHANGES 정정 및 export 패키지 갱신은 미완료로 남았다.
- 판단: 제작자 기존 완료 보고 이후 요청한 마지막 보완이 끝난 것이 아니다. 수정 코드의 독립 검수와 최종 ZIP 수령은 미확인이며 8784의 이전 스냅샷을 최종본으로 바꾸지 않는다. 업그레이드/추가 결제/모델 변경/재개 버튼 조작은 하지 않았다.
- 후속: 의미 있는 실패를 보고하고 종료하라는 heartbeat 지시에 따라 자동 확인 `gli`를 PAUSED로 변경했다. 한도 초기화 이후 작업 재개와 갱신 패키지 인계가 필요하다. Fable 제외(P36)는 유지한다.
- 파일/검증: HISTORY와 GLI-052-REVIEW-20260923의 상태 기록만 추가. 제품/API/데이터 계약 변화 없음. `npm run spec:check`와 관련 `git diff --check`로 문서 검증. 빌드/GLI 유료 API 호출/커밋/푸시/공개 배포 없음.

## HIST-20260923-006

- 근거: 사용자 "클로드와 작업을 마무리하면 보고해, 페이블은 일단 뺀다". 관련 GLI-052, GS-010/011/031/032/033, P28/P35/P36.
- 정책: P36으로 Fable 상담 참여와 추가 유료 비교를 보류. Astra 주 상담/Gemini 탐색 보조·번역 유지. Fable 자동 단계는 원래 미구현이므로 런타임/키/설정/비교 코드 삭제 없이 결정과 현재 상태를 기록. 과거 시험 이력은 보존. Claude Design 역할은 별개로 유지.
- 디자인 인계: Claude가 최대 3건 요약/M2/상태별 예제/QA 및 5개 인계 문서 완료를 보고. 미승인 문구·출처 접기·고정 조건 확대는 제품 적용에서 제외. conditions의 검증 상태 매핑, 근거 있는 reasons만 연결, options 계약 보류를 전달하고 회신 확인.
- 수령 제한: Project HTML export 2회와 소형 패키지 다운로드 카드 1회에서 로컬 ZIP 전달 미확인. 최종 문서를 읽거나 최신 원본을 독립 검수한 것으로 기록하지 않음. 8784는 이전 제작 중 스냅샷이며 실제 AI는 8776의 별도 앱이다.
- 잔여 보완: 스크롤바 드래그 시 따라가기 취소 누락이 보고돼 승인된 S1 범위 내 이벤트 처리·응답 직전 하단 재확인만 Claude에 보완 요청. 새 디자인·문구 추가는 요청하지 않음.
- 후속 확인: 마지막 보완이 진행 중인 상태에서 이 작업의 heartbeat `gli`(GLI 클로드 인계 확인)를 10분 간격으로 등록. 변화 없는 진행 상태에는 알림하지 않고 완료/실패/사용자 조치 필요 시 보고한 후 종료하도록 지정. 최종 보완/패키지 수령은 아직 완료 처리하지 않는다.
- 로컬 변경: DECISIONS/CURRENT-STATE/상담 아키텍처/GLI-052 작업지시서/0923 검수 보고/HISTORY. 제품/API/데이터 계약 및 시각 소스 변경 없음. GLI 유료 API 추가 호출 없음.
- 검증: 문서 spec:check에서 33개 기능/46개 경로/시각 기준 4개 무변경 확인. 관련 diff 공백 검사 통과. 문서 전용 작업으로 제품 빌드/실 API 시험 미실행.
- 배포: 커밋·푸시·공개 배포 없음. 최종 파일 수령, 사용자 시각안/문구 승인, Codex 선별 통합과 실제 API·실기기 검수는 별도다.

## HIST-20260923-005

- 근거: 사용자 "GPT 로그인 상태야? 모든 AI가 동작해야 한다". GLI 로컬 서버와 실제 AI 호출 상태 점검 요청으로 처리.
- 복구: 기존 localhost:8776은 화면 캐시만 남고 POST 연결 거부. .env.local을 로드하는 vinext dev를 loopback 127.0.0.1:8776에서 재기동하고 우측 탭을 실제 주소로 연결. 제품 소스/키값/모델 설정은 변경하지 않음.
- 인증 경계: API의 authenticated=false, runtimeAvailable=true, deepSearchEligible=true, deliveredMode=ai 확인. ChatGPT 웹 로그인과 무관하며 기존 GLI_LOCAL_AI_PREVIEW opt-in으로 로컬 비로그인 테스트 허용. 공개 인증/이용권을 해제한 것이 아님.
- GPT: 설정된 OpenRouter Astra로 시하누크빌 1억원 매입/월세 목적 API 실조회 및 브라우저 검색 모두 응답 성공. 도시/거래 목적 유지, 목록과 답변 후보 3건. 실제 API 반환은 advisor.mode=ai. 해당 호실의 임대수입/완공 증빙까지 검증됐다는 의미는 아님.
- Gemini: 제한 도메인 탐색 실호출 HTTP 200, 해당 임대 질문은 status=empty/groundedQueryCount=0이므로 검색 자료 확보 성공으로 기록하지 않음. 별도 번역 smoke에서 실제 외부 매물 3건을 1회 호출로 번역, 동일 원문 재사용 및 ID/가격/출처 보존 assertions 통과(949 reported tokens).
- Claude: Fable 5.1 합성 GLI 상담 1회 실호출 성공, 모델/공급사 확인, reported cost $0.0844. 현재 자동 상담 경로에 Claude 검토 단계가 연결된 것은 아니며 3개 모델 동시 협업 완료로 표현하지 않음.
- 수집 경계: API 시험 CAM Realty 15건 실수집, CPA/Khmer24 snapshot. 별도 번역 smoke는 CAM Realty 15건/CPA 20건 실수집, Khmer24는 robots 정책으로 snapshot. 소스별 실시간 가용성을 일괄 보장하지 않음.
- 검증: advisor-runtime 테스트 2건 통과(명시 제공자/로컬 한정 보호), 실제 브라우저 상담 완료. 추가 유료 호출 총비용은 산출하지 않았으며 Fable 단일 비용만 기록. 공개 배포/커밋/푸시 없음. 새 Claude 보완 시안과 실제 AI 앱의 통합은 아직 별도 작업.

## HIST-20260923-004

- 근거: 사용자 "테스트 해볼 수 있는 빌드를 띄워줘. 푸시 커밋 전이라도 상관 없어".
- 실행: Claude Design의 중단된 QA 검수를 Retry로 재개. Project HTML archive를 브라우저에서 다운로드하고 보완 HTML/QA/fixture/support/public 이미지만 work/claude-052-preview-20260923에 추출. 제작 중 스냅샷이며 최종 납품 완료로 간주하지 않음.
- 테스트 주소: http://127.0.0.1:8784/preview.html (일반 시안), http://127.0.0.1:8784/ (모바일/상태별 QA). 원본 파일 수정 없이 전용 loopback 정적 서버(work/serve-claude-052-preview.mjs)로 제공. 서버는 전용 디렉터리의 허용 파일만 제공하며 .env/API는 연결하지 않음.
- 확인: HTTP 200, 일반 시안 자산 탐색 화면 진입, QA search 390px에서 패널 1372px/본문 317px/가로 넘침 없음/요약-카드 3/3/자동 초점 없음. 문단 손실 예제 5건 통과, 브라우저 error 로그 0. 이는 시안 예제 시험이며 실제 AI/크롤러 시험이 아님.
- 남은 사항: 원본에 Trust Score/오프라인 안내/QA 버튼 등 이전 항목이 남음. 200% 확대 및 장기 대화 등 전체 검수·실제 API 통합은 미완료. Claude는 별도로 최종 문서와 검수를 진행 중.
- 영향: 제품/API/데이터 계약 변화 없음. 현행 제품 소스·디자인 원본 교체, 제품 빌드, 커밋·푸시·공개 배포 없음. 사용자 테스트용 독립 시안만 실행.

## HIST-20260923-003

- 근거/승인: 직접 Claude 조율 후 제안 1~3번의 보완 시안 제작에 사용자 "시작해"(P35).
- 변경 전/후: 방향 결정 대기 → 최대 3건 요약, 모바일 M2, 엄격 S1 방향 승인 및 Claude Design에 직접 제작 요청 전송. 기존 0923본 보존, 별도 보완본/상태 예제/QA/문서 제작 착수 확인.
- 로컬 작업: DECISIONS/GLI-052 작업지시서/HISTORY 승인 기록. 제품/API/데이터 계약 및 실제 실행 동작은 변경하지 않음.
- 승인 제외: 새 문구 15건, 고정 입력창, 조건 밖 고가 매물, 유료 노출, 타 페이지 재설계. 제품 통합/공개 배포는 별도 승인.
- 검수 상태: Claude 납품 대기. 완료 증거는 후속 항목으로 남기며 착수를 완성으로 간주하지 않음. 제품 빌드·커밋·푸시·공개 배포 없음.

## HIST-20260923-002

- 근거: 사용자가 로그인한 Claude Design과 직접 대화하여 조율 요청.
- 작업: GLI-052 검수 7건 전달 및 두 차례 회신 확인. 후보 순서·모바일·누락 상태·인용·텍스트 손실·스크롤·선별 통합에 동의. 서버 계약 오해(18건/인용 ID) 정정.
- 기록: GLI-052-REVIEW-20260923.md에 담당 분장, 사용자 결정 대기, 승인 경계 추가. Claude는 TOP3 한 화면 주장 철회, 모바일 두 안은 미착수였음을 정정.
- 범위: 협의 및 문서 기록만. 새 디자인/문구 승인, 제품 소스 수정, 빌드, 커밋/푸시/배포 없음. API 키/비밀 파일 전달 없음.

정책 P28에 따라 모든 개발 작업에서 항목을 추가한다. 기존 항목은 보존하고 정정·취소는 해당 이력 ID를 참조하는 새 항목으로 기록한다. 이전 개발 이력은 [DECISIONS.md](DECISIONS.md)와 기존 PM_BOARD/ADR에 보존되어 있다. 이 파일의 첫 항목 이전 작업이 없었다는 뜻이 아니다.

## HIST-20260918-004

- 근거/승인: Fable/Astra 비교 후 Astra 주 상담 모델 및 의도 선해석 연결 제안에 사용자 "진행해"(P32). 기존 UI 및 Gemini 별도 API 보존, 공개 배포 별도 승인.
- 변경 전 → 후: 규칙 조건으로 먼저 검색하고 AI가 설명 → 이용권 확인 후 Astra 구조화 의도/검증 → 같은 조건으로 실제 수집/엄격 필터 → Astra 근거 상담. 요청당 OR 최대 2회, 자동 재시도/모델 대체 없음.
- 데이터: 예산 종류/통화와 목표 월수입/표면·순수입을 분리, 완공·임차인 승계·가구·현금 매수 요청 보존. 기존 context와 호환. 국가/도시는 서버 경계 고정. 근거 미확인 조건을 충족했다고 보증하지 않으며 추천 0건 허용.
- 파일: lib/consultation-intent.ts, lib/consultation-search.ts, lib/search.ts, lib/ai-search.ts, app/api/search/route.ts, scripts/smoke-consultation.mjs, 관련 tests. API/OpenAPI/상담 구조/상태/결정/PM/registry/파생표/README/이력 갱신. 로컬 비밀 파일에는 모델/preview 설정만 추가, 기존 키는 보존.
- 자동 검증: npm run check 통과(184 tests, 빌드/DB, 기존 린트 경고 5). 별도 TypeScript 검사에는 프로젝트 기존 오류가 남으며 이번에 수정한 검색/의도/상담/API 파일에서 오류 없음.
- 실호출: 합성 자료 3턴에서 5000만원→총 6000만원, 표면 월세 100만원, 완공·현금 매수·기존 임차인 승계 보존 확인. OR 6회 API 보고 비용 $0.149044. 보고서 work/advisor-comparisons/intent-2026-09-18T12-11-00.133Z.json(로컬 Git 제외). 이 금액은 이후 브라우저 시험/Gemini 비용을 포함하지 않음.
- 브라우저: 127.0.0.1:8776/explore에서 시하누크빌 1억원 임대수입 목적 매매 검색. 실제 CPA 2건/CAM Realty 1건, 상담과 완료/목록 모두 3건, 타 도시 미노출 확인. Khmer24는 robots 정책 검사에서 reference search 차단. 전체 출처 수집 성공으로 보고하지 않음.
- 남은 일: 동적 도구 반복, 영속 장기 상태, 다국가 동의/미지원 도시, 최신 검색 환율·다통화, 완공/승계 증빙 필터, 공개 무료 보호 정책 및 Claude UX. 조건 기억을 모든 조건의 자동 검증 완료로 간주하지 않는다.
- 커밋/배포: 수행하지 않음. 공개 사이트는 기존 버전 유지. 로컬 8776 서버에서 확인 가능.

## HIST-20260918-003

- 근거/승인: 사용자 OpenRouter로 여러 모델 점검 요청, 이후 "제미니는 별도 API이니까 빼고 페이블과 아스트라를 비교해". GLI 전용 키 총 100달러/180일 설정 및 로컬 저장 확인. 키 값은 기록하지 않음.
- 관련: GLI-052, GS-010/011/012, P16/P17/P18/P28/P30/P31. HIST-20260918-002의 AI 체험 방향/유료 비교 미승인 상태를 이후 사용자 결정으로 대체한다. 전체 상담 구조나 공개 체험 수량 승인으로 확대하지 않는다.
- 변경 전 → 후: 직접 Gemini/OpenAI advisor만 존재 → 서버 전용 OpenRouter adapter, 명시 모델 선택, 내부 실패/사용량 진단, loopback 비운영 opt-in, 동일 입력 합성 비교 도구 추가. Gemini 별도 탐색/상담과 기존 공개 이용권 게이트는 유지.
- 파일: lib/ai-search.ts, lib/advisor-runtime.ts, app/api/search/route.ts, vite.config.ts, worker/index.ts, scripts/compare-advisors.mjs, 관련 시험 3개. CURRENT-STATE/API-CONTRACTS/DECISIONS/registry/FEATURE-STATUS/README/PM_BOARD/상담 검토안 및 OPENROUTER-COMPARISON 갱신. 시각 원본/생성물/UI 코드는 이번 작업에서 변경하지 않음.
- 실호출: `anthropic/claude-fable-5.1`, `openai/gpt-6-astra`를 3개 동일 입력 시나리오로 두 라운드 총 12회 호출, 모두 모델 응답 성공. 첫 시험의 내부 점수 노출을 고쳐 8등급만 전달하고 고정 환율도 제외한 뒤 양쪽 재시험. 보고 비용 합계 $0.5734025. 상세 품질 판단은 비교 문서에 기록.
- 인증/보안: 키 인증 성공, 총 한도와 만료일 확인. Git 제외 확인. 빌드 파일 132개에서 로컬 비밀값 일치 없음. 키/민감 원문/내부 추론을 비교 보고서에 저장하지 않음.
- 검증: npm run check 통과(빌드/DB/175 tests, 기존 린트 경고 5와 번들 경고). spec:refresh/spec:check 통과(32 features, 46 routes, 시각 기준 4개 무변경). 별도 tsc --noEmit은 프로젝트 전반 기존 import/Cloudflare/자산/API 타입 오류로 실패. 전체 타입 검사 통과로 보고하지 않는다.
- 남은 일: 후속 월세를 거주 임대로 추출하는 규칙 결함, 모델 주도 재조회 도구, 카드/서버 내용 불일치, 공개 체험 제한, 복잡한 상담 검증. 기본 상담 모델 선택과 공개 배포는 사용자 후속 승인.
- 커밋/배포: 수행하지 않음. `.env.local` 키만 사용자 저장. 사이트 기본 모델/공개 환경은 바꾸지 않음.

## HIST-20260918-002

- 작업일 / 작성자: 2026-09-18 / Codex PM.
- 근거: 사용자 "1,4승인, 2와3은 ... 어떤 아키텍쳐가 필요한가 부터 고민".
- 변경: GLI-052 A1/A4 승인 기록, A2/A3은 고정 추천 범위/3개 후보/예산 선질문 대신 상담 아키텍처 검토 후 결정하도록 보류. 작업지시서·Claude 지시서·README·PM_BOARD·registry와 파생 기능표를 동기화.
- 제안: 상태를 가진 도구 사용형 상담자, 서버 권한/사실 검증, 동일 결과 계약, 모델 역할 확장 경계. 비로그인 실제 AI 체험 정책은 추가 사용자 결정 필요. 제안을 현재 구현 또는 승인 정책으로 기록하지 않음.
- 코드 확인: runAdvisorSearch가 규칙 검색 후 모델을 호출하며 공개 비로그인 advisor는 이용권 게이트에 따라 규칙 경로가 된다. 당시 스크린샷의 실제 호출 경로는 미확인.
- 검증: spec:refresh 및 spec:check 통과(32개 기능, 46개 경로, 보호 시각 파일 4개 무변경). 실행 코드/디자인 변경, 모델 유료 호출, 빌드/배포는 수행하지 않음. 기존 가격/열람권/국가 소스 정책 변경 없음.
- 남은 일: 상담 아키텍처와 비로그인 이용 정책 논의. 독립 결함 수정의 착수 승인은 유지. 실제 Claude 시각안과 공개 배포는 후속 승인.

## HIST-20260918-001

- 작업일 / 작성자: 2026-09-18 / Codex PM.
- 관련 항목: GLI-052, GS-001/006/010/011/032, P28/P29. 사용자 요청은 Codex와 Claude Design의 작업 분담 지시서 작성 및 승인 항목 질문이다.
- 변경 전 → 후: AX/UX 검토 결과가 대화에만 존재 → 개발 작업 C1~C6, 디자인 작업 D1~D5, A1~A4 승인표, T1~T12 수용시험, 납품·시각 승인·배포 절차를 문서화.
- 변경 문서: GLI-052-AI-CONSULTATION-WORK-ORDER.md, GLI-052-CONSULTATION-UX-BRIEF.md, 각 README, PM_BOARD, registry 및 파생 기능표, HISTORY.
- 구현 현황 정정: GLI-048의 과거 COMPLETE를 유지하되 새 데이터 연결/후속 조건/입력창 순서 결함을 후속 과제로 기록. 제안 API 필드를 현재 구현 계약으로 변경하지 않음.
- 승인 상태: A1~A4 대기. 문서 작성은 개발·디자인 착수 또는 공개 배포 승인이 아님.
- 검증: spec:refresh 및 spec:check 통과(32개 기능, 46개 경로, 보호된 시각 파일 4개 무변경). 실행 코드 변경 없음. 이전 턴의 로컬 재현을 근거로 사용하며 이번 문서 작업에서 live 호출·전체 빌드·실기기 시험은 수행하지 않음.
- 남은 일: 사용자 답변 기록 후 승인 범위 착수. Claude 실제 시안·신규 비용·공개 배포는 별도 승인.
- 커밋·배포: 수행하지 않음.

## HIST-20260916-001

- 작업일 / 작성자: 2026-09-16 / Codex.
- 관련 항목: GLI-051. 사용자 승인: 0916 시안의 모바일 변경만 선별 적용, 기존 기능 보존.
- 변경: 모바일 헤더 버튼 정리, 제목 36px/1.18, 통계 설명 14px 유지, CTA 반응형 여백 및 최소 너비. 펼친 메뉴가 잘리는 기존 문제는 스크롤 대상을 details에서 nav 패널로 이동하여 수정.
- 변경 파일: design-handoff/source/gli-demo.dc.html 및 생성된 app/claude-design.css, app/generated/claude-static.ts.
- 보존: 상담 이벤트/문구, 후보 변경 판단, 공식 홈페이지 링크, 뉴스 CMS 주석, 데이터/API 코드. ZIP 전체 교체와 전역 줄바꿈 변경은 미적용.
- 명세: 모바일에서 로그인/언어의 상단 중복 버튼은 숨기고 기존 메뉴 경로 사용. 콘텐츠 14px 정책 유지. 데스크톱 정보 구조와 사업 정책 변경 없음.
- 검증: design:generate 성공. Chrome Playwright에서 랜딩/탐색 각각 320/360/390/412/768/1440px의 document.scrollWidth == clientWidth 확인. 메뉴 및 390px 화면 캡처 검수. 실제 Android 글꼴 확대 및 외부 AI 호출 검증은 미실행.
- 명세 검사: spec:check/spec:refresh는 승인 전 시각 기준 해시 변경을 감지하여 실패. 변경을 숨기기 위한 기준 갱신은 하지 않았으며 사용자 시각 검수 뒤 확정한다. git diff --check 통과.
- 후속: 실제 모바일 기기 및 사용자 시각 검수 후 공개 배포 판단. 공개 배포/커밋 미실행.

## HIST-20260917-001

- 근거: 사용자의 레포 반영 및 커밋/푸시 요청. GLI-051 모바일 변경을 현재 시각 기준으로 등록했으며 이전 이력의 해시 검증 보류를 대체한다. 실제 휴대폰 시험 완료를 의미하지 않는다.
- 변경: registry.json 시각 파일 해시 및 기준일 갱신, spec:refresh로 파생 명세 동기화. 제품 기능/디자인 추가 변경 없음.
- 검증: spec:check 통과. npm run check 통과(빌드, DB 검증, 테스트 167/167). 린트 오류 0, 기존 경고 5. 빌드 큰 청크 경고 있음.
- 커밋/푸시: 미완료. .git 쓰기 권한 승인 후에도 Windows ACL이 FETCH_HEAD 및 index.lock 쓰기를 거부함. 접근 제한을 임의 해제하지 않음. 현재 브랜치 agent/gli-ai-orchestration-demo, 대상 github 원격. 공개 배포 미실행.
- 검수용 work 파일, 로컬 실행 로그 및 비밀키는 커밋 대상에서 제외.

## 기록 양식

## HIST-20260917-002

- 사용자 승인: 기존 브랜치는 보존하고 최신 로컬 소스를 별도 브랜치 agent/gli-latest-20260917에 등록.
- 방식: GitHub 웹에서 main 기반 새 브랜치를 생성하고, 연결된 GitHub 도구로 현재 추적 파일의 전체 스냅샷을 등록한다. 과거 로컬 커밋의 재작성이나 기존 원격 브랜치 강제 갱신은 하지 않는다.
- 포함: GLI-051 모바일 수정, 기존 구현 소스/자산, 개발 명세 및 코드 주석. 제외: 비밀키, 로컬 로그, work 검수 파일, node_modules, 빌드 임시 산출물.
- 검증 근거: 직전 npm run check의 테스트 167/167 및 명세 검사 통과. 이 작업은 저장소 동기화이며 공개 서비스 배포를 수행하지 않는다.
- 참고: 로컬 Git 쓰기/인증 제한으로 일반 push 대신 원격 스냅샷 커밋을 사용한다. 로컬 브랜치와 새 원격 브랜치의 커밋 이력은 별도로 유지된다. 완료 여부와 커밋 ID는 원격 브랜치 조회로 확인한다.

```text
ID: HIST-YYYYMMDD-NNN
작업일 / 작성자:
관련 GS/GLI / 결정·승인 근거:
변경 전 → 변경 후:
변경 파일 / 갱신 명세:
검증: 명령·결과·환경, 실행하지 않은 시험
남은 일 / 후속 담당:
커밋·배포: 실제 수행 상태와 확인된 식별자만
정정·대체하는 이력: 해당할 때만
```

작업 중인 항목은 미완료로 표시하고 완료 전 검증 결과를 채운다. 완료된 이력은 새 항목으로만 정정한다. 제품 계약 변경이 없으면 '명세 영향 없음'과 이유를 기록한다. 비밀값·개인정보를 이력에 넣지 않는다.

## HIST-20260921-001

- 작업일 / 작성자: 2026-09-21 / Codex. 관련 GS-017/018 및 Trust/FAQ 콘텐츠 인계. 사용자 요청: LIU JIAN의 봇 지식베이스용 콘텐츠 원본 제공.
- 변경 전 → 후: 소스/기획에 분산된 콘텐츠 → docs/knowledge-base/2026-09-21에 Trust 8등급(부동산/프로젝트), 3개 멤버십, 생성 화면 FAQ 5개, 담당자 검토 메모와 README로 분리. 소스코드와 비밀값 없이 별도 전달 가능한 문서 묶음.
- 명세 영향 없음: 제품 동작/API/데이터 계약/정책을 변경하지 않은 문서 추출. implementation/README에 스냅샷 링크 추가. 원본 HTML의 구형 3등급 FAQ 대신 생성 단계에서 교정된 현행 FAQ 사용.
- 검증: spec:check 통과(33개 기능/46개 경로/시각 기준 4개 무변경). parse5로 생성 화면 FAQ 5쌍과 문서 원문 일치 검사, 멤버십 3개 설명/혜택 원문 일치 검사, 두 유형 각각 8등급 행 검사 통과. 런타임 변경이 없어 빌드·전체 시험 미실행.
- 남은 일: 상세 등급 판정 세칙, 데모 상담 한도/운영 혜택, 날짜 표시 FAQ의 후속 정책 정합성 확정. 공개 사이트 일치 여부는 미확인. 콘텐츠를 임의 보충하거나 정책 변경하지 않음.
- 커밋·배포: 로컬 문서만 작성. Git 커밋·푸시·공개 배포 및 외부 수신자 직접 전송 없음.

## HIST-20260908-001

- 작업일 / 작성자: 2026-09-08 / Codex.
- 관련 항목: GS-031, GLI-050 후속, P28. 근거는 사용자의 모든 후속 작업에 대한 명세 동시 갱신·이력 보존 지시.
- 변경 전 → 후: 기능 변경 시 registry 갱신 규칙 → 모든 개발 작업에 관련 명세 갱신과 누적 이력 기록을 의무화하고 완료 조건에 포함.
- 변경 파일/명세: AGENTS.md, implementation/README.md, DECISIONS.md, registry.json, HISTORY.md와 자동 생성 FEATURE-STATUS.md.
- 검증: `npm run spec:refresh`, `npm run spec:check`, `git diff --check` 통과. 32개 기능/46개 경로 정합성과 시각 파일 4개 무변경 확인. 실행 코드 변경이 없어 전체 build/live 시험은 실행하지 않음.
- 남은 일: 후속 작업자가 매 작업마다 이 규칙을 적용. 문서 내용의 정확성은 작성자의 검토가 필요하며 자동 검사는 경로/ID 정합성을 보조한다.
- 커밋·배포: 로컬 문서 반영. Git 커밋·푸시·공개 배포 수행하지 않음.

## HIST-20260917-003

- 작업일 / 작성자: 2026-09-17 / Codex.
- 사용자 결정: 향후 iOS·Android 스토어 출시를 목업 단계부터 설계 전제로 반영(P29).
- 변경: DECISIONS.md에 웹/API 분리, 모바일 인증·알림·딥링크·결제 확장 검토와 기술 선택 미확정 범위를 기록.
- 검증 범위: 문서 변경만 수행. 실행 코드·디자인·현재 결제 정책 변경 없음. 앱 구현 또는 실기기 검증 완료를 의미하지 않음.
- 남은 일: 후속 기능 설계와 앱 전환 기획 시 P29 적용. 구체적인 기술·스토어 정책·출시 범위는 별도 검토 및 승인.
- 커밋·배포: 이 문서 변경은 로컬 기록이며 추가 커밋·배포하지 않음.

## HIST-20260913-001

- 작업일 / 작성자: 2026-09-13 / Codex.
- 관련 항목: GS-001, GLI-042, GLI-051, P28. 근거는 모바일 시각 변경을 Claude Design AI가 담당하도록 구체적인 핸드오프를 작성하라는 사용자 지시.
- 변경 전 → 후: 모바일 가로 넘침이 일반적인 반응형 개선 항목으로만 남아 있음 → 360/390/412px에서 문서 폭이 434px까지 늘어나는 재현 수치, 공통 헤더 원인, 변경 허용·금지 범위, 수치 기반 완료 기준과 Claude→사용자 승인→Codex 통합 순서를 명시.
- 변경 파일/명세: `design-handoff/GLI-051-MOBILE-RESPONSIVE-FIX-BRIEF.md`, `design-handoff/README.md`, `docs/PM_BOARD.md`, `docs/implementation/registry.json`, 자동 생성 `docs/implementation/FEATURE-STATUS.md`.
- 검증: `npm run spec:refresh`, `npm run spec:check` 통과. 32개 기능, 46개 경로, 시각 기준 파일 4개 무변경을 확인했으며 `git diff --check`도 통과. 로컬·공개 페이지의 360/390/412px 읽기 전용 측정으로 결함을 재현했으나 디자인 소스와 React 실행 코드는 변경하지 않아 빌드·런타임 회귀 시험은 수행하지 않음.
- 남은 일: Claude가 시안과 폭별 캡처·측정값을 제출하고 GLI Product Owner가 승인한 뒤 Codex가 승인된 변경분만 React에 통합·검수한다.
- 커밋·배포: 로컬 핸드오프 문서 작업. Git 커밋·푸시·공개 배포 수행하지 않음.

## HIST-20260918-005

- 작업일 / 작성자: 2026-09-18 / Codex. 관련 GS-010/011/015/032, GLI-052, P33.
- 승인 근거: BuildBlock 실제 상담 벤치마크 후 "핸드오프 만들고, 네가 해야할 AI 상담 강화 계속해". Claude 시각안/신규 문구/통합/배포 승인을 대신하지 않는다.
- 변경 전 → 후: 매 질문마다 새 검색 → 이전 공개 후보 ID 재조회, search/review 분기, 순번 유지 및 대상 미확인 질문. 기존 후보 비교 중 예산 변경으로 목록을 몰래 대체하지 않는다. 외부 원문/공개 참고자료/detailFacts/checks를 상담에 전달하고 허용 목록 밖 URL을 거부한다. 실제 계약/비용 자료가 없어 검증된 수익 계산 기능은 미구현이다.
- 파일: lib/consultation-references.ts, consultation-intent.ts, consultation-search.ts, ai-search.ts, app/api/search/route.ts, claude-design-shell.tsx의 데이터/순서 연결, tests/consultation-references.test.mjs, scripts/smoke-consultation-references.mjs. 디자인 HTML/CSS/생성 시각 소스 변경 없음.
- 명세/핸드오프: GLI-052-CONSULTATION-UX-BRIEF B1~B5에 경쟁사 관찰 5턴, 채택/배제, 업무분장, API 경계, 상태/모바일 검수와 사용자 별도 승인 목록을 기록. API-CONTRACTS/openapi/CURRENT-STATE/DECISIONS/registry/PM/README를 함께 갱신.
- 검증: 최종 npm run check 통과(194개 시험, 빌드, DB migration 검증; 기존 lint 경고 5개). Astra 합성 2턴/4회 실호출에서 정확한 두 번째 자산, 가격 보존, 출처 URL, 점유/대출 제약 설명, 총예산/순수입 분리 및 근거 없는 순수익 계산 거절 확인. 해당 합성 시험 반환 비용 $0.1582675(추가 브라우저 시험 비용과 별개). 보고서는 무시 경로 work/advisor-comparisons/references-2026-09-18T12-51-34.512Z.json. 실제 투자자료 검증이 아니다.
- 추가 검수: 로컬 127.0.0.1:8776/explore에서 시하누크빌 매매 3개 검색 후 두 번째 CAM Realty 자산의 $56,721 및 원문 링크를 정확히 이어 설명했다. 후속 입력만으로 목록이 초기 fixture로 돌아가는 결함을 재현해 layout commit 후 결과 재적용으로 수정하고, 입력/지우기 중 3개 후보와 순서 유지 확인. 문단 개행/클릭 가능한 출처와 입력 위치는 Claude 시안 과제로 남겼다. spec:refresh/spec:check, git diff --check 통과. 시각 기준 4개 해시 무변경, dist/client 70개 파일에서 설정된 API 비밀값 일치 0. 별도 tsc는 기존 프로젝트 오류로 실패했으며 이번 수정 상담 파일의 오류는 없었다. 실제 휴대폰/공개 사이트는 미검수.
- 남은 일: C1 정적 카드/상세와 서버의 일부 필드 불일치, 더 오래된 후보/영속 세션, 외부 Map 캐시 소실 후 복원, 지원 지역/환율, 계약/비용 evidence, 공개 체험 보호, Claude 디자인/문구 승인 및 통합. 일반 자유문장 전체의 사실 검증을 URL 허용 목록 검사만으로 보장하지 않는다.
- 커밋·배포: 로컬 변경만. Git 커밋·푸시·공개 배포 없음.

## HIST-20260918-006

- 작업일 / 작성자: 2026-09-18 / Codex. 관련 GS-033/011/012/015, GLI-052, P34.
- 승인 근거: 외부 영어 매물의 Gemini 번역/원문 분리/캐시 재사용/목록·상세·상담 공통 적용 제안에 사용자 "적용해". AI Studio 추가 설정은 필요 없다고 안내했으며 기존 GLI 전용 키만 사용했다.
- 변경 전 → 후: 외부 영어 제목/요약 그대로 표시 → 원문 검색 후 후보 최대 18건을 6건씩 한국어로 번역. 원문 Asset은 불변이고 표시용 복사본만 사용. ID·가격·통화·면적·날짜·출처·등급 보존, 숫자/URL/통화 토큰 보호 및 응답 검증, 실패 시 원문 유지. R2에 번역 대상 원문/번역/버전/모델/시각을 별도 저장하고 동일 문장은 재사용한다.
- 파일: lib/asset-localization.ts, app/api/search/route.ts, app/api/assets/route.ts, app/assets/[id]/page.tsx, lib/ai-search.ts(이미 번역된 후보명 재번역 금지), vite.config.ts, worker/index.ts, tests/asset-localization.test.mjs, tests/rendered-html.test.mjs, scripts/smoke-asset-localization.mjs. 기존 raw-store helper를 재사용한다. API/데이터 계약·P34·GS-033·PM·현재상태·README 동시 갱신.
- 검증: npm run check 통과(207개 시험, build/DB 검사; 기존 lint 경고 5개). 실제 CAM Realty 3건을 Gemini 1회로 번역한 성공 시험은 약 3초, 입력 526/출력 378 토큰이며 저장소를 공유하는 새 번역 서비스에서 재호출 없이 재사용했다. 앞선 1회 시험은 번역 실패가 아니라 고유명사만 있는 제목에도 한글이 필수라고 잘못 요구한 assertion으로 실패했고, 요약/원문 불변 조건으로 바로잡았다. 이 시험과 브라우저 검색/상담은 GLI 목적의 제한된 실제 API 호출이다.
- 로컬 검수: 시하누크빌 1억원 이하 매매 결과 3건에서 한국어 제목, 상세 요약, $36,000 가격과 원문 링크 확인. 이어 첫 번째 후보 질문에 기존 매물/가격 유지. 로컬 R2 저장소에서 번역 객체 12개 확인. 390px 카드 제목에 가로 넘침/가격 겹침 없음을 확인하고 기본 화면 폭 복원. 공개 사이트/실제 휴대폰은 미검수.
- 보안/도구: 클라이언트 산출물 70개에서 설정된 API 비밀값 일치 0. 전체 tsc는 기존 프로젝트/Cloudflare 타입 선언 오류 등으로 실패하며 npm build/test 통과와 구분한다. 원본 디자인 기준 파일은 수정하지 않는다.
- 새로 확인한 별도 이슈: 외부 매물 상세 경로는 여전히 구형 Trust Score/5탭 화면. 상세에서 탐색으로 복귀 시 상담 이력이 초기화되고 결과 수 3건과 기본 fixture 카드 노출이 어긋날 수 있다. 재검색/후속 요청 이후 서버 후보는 정상 유지되나 화면 복원 문제는 C1/GLI-052 후속으로 기록했으며 번역 범위에서 디자인을 임의 수정하지 않았다.
- 남은 일: 언어 선택 UI/전체 다국어, 번역 교정 관리툴, 저장소 정리/운영 정책, 서버 간 동시 호출 잠금, 공개 체험 총비용 제한. 이 작업은 원문 전체 크롤링 영속화, 의미 오역의 완전한 검출 또는 직원 검증 완료가 아니다. Khmer24는 robots 제한으로 snapshot인 상태를 유지했다.
- 커밋·배포: 로컬 변경만. Git 커밋·푸시·공개 배포 없음.

## HIST-20260923-001

- 작업일 / 작성자: 2026-09-23 / Codex. 관련 GLI-052, P19/P20/P28/P29/P33. 사용자 요청은 Claude 0923 시안과 기존 합의 대조 및 개선 의견이며 통합 승인이 아니다.
- 변경 전 → 후: 미검수 전달본 → GLI-052-REVIEW-20260923.md에 일치점/7개 수정 항목/승인 경계/재납품 기준을 기록하고 기존 작업지시서에서 연결.
- 명세 영향 없음: 제품 동작·API·데이터·정책 변경 없음. 디자인 원본/CSS/JS 미수정. 원본 HTML 해시 0601b4f0...8df5c 유지. ZIP은 work/review-20260923 검수 폴더에서만 풀어 확인했다.
- 검증: 납품 6개 해시 및 0916 기준 해시 일치. 해당 기준 대비 상담 변경 범위 검토. 분리된 루프백 정적 서버에서 6개 폭 측정과 모바일/데스크톱 육안 확인, 후보 이동/선택/후속 입력 재현. 390px 후보 블록 높이 약1178px 및 답변·카드 추천 순위 불일치 확인. 문단 정규식에서 말미 무구두점 구절 소실 재현. 실제 AI/API 호출, 실기기·키보드·200% 확대·10턴·공개 배포 검수는 미실행.
- 남은 일: Claude 모바일/필수 상태 보완, 사용자 시각안·새 문구·TOP3 등 선택 승인, Codex의 승인분 데이터 통합 후 회귀 검수. 승인되지 않은 광고/정렬 정책은 적용하지 않음.
- 커밋·배포: 검수 문서만 추가. 제품 빌드·커밋·푸시·공개 배포 없음.

## HIST-20260923-014

- 작성자: Codex. 관련 GS-001/010/011/012/032/033, GLI-052, P28/P36/P37/P38. 승인 근거: 사용자 "개선 작업해" 및 일일 운영 한도 "전체 300회, 사용자별 100회".
- 변경 전 → 후: 상담 이용권 밖 Gemini 비용과 실패 비용이 별도 계량되지 않던 상태 → `/api/search` 모든 유료 단계에 공통 D1 요청 예약, 공급사 호출 전 원장과 반환 usage 기록. 고객 월 상담 횟수 반환과 운영 시도 보존 분리. 한국 날짜 기준 전체 300회/계정 100회, 비로그인 안정 신원 미구현으로 공통 풀 100회. 금액 상한 아님. 원장 불가 시 유료 호출 차단. 목록/상세는 번역 캐시 전용.
- 동시·취소·대화: Gemini 동일 계정/질문/조건의 in-flight 공유와 실패 60초 cooldown, 브라우저 동기 중복 클릭 차단 및 이탈 AbortController→서버 유료 fetch signal/후속 단계 중단. 공유 실행자 취소 시 공유 결과도 중단 가능하며 분산 idempotency는 미완료다. 긴 화면 답변은 그대로 두고 모델 재전송 문맥만 최대 8턴/각 1200자 이내의 앞·뒤 발췌로 제한, 구 클라이언트의 최대 32000자 턴도 검증 후 축약. 조건/후보 ID는 별도 유지하며 AI 요약 호출 추가 없음.
- 검사 개선: tsconfig `.ts` import/검사 범위와 명시 Cloudflare binding·Wrangler runtime 타입을 정리하고 `npm run check`에 typecheck 추가. 관리자 import의 무효 인자, 거래유형 narrowing, 열람 level union, 국가 alias/connector 계약, 회원 이름 null 등을 교정. 디자인 값/DOM/문구 변경 없음. migration 검사에서 누락돼 있던 0015/0016과 새 0017을 포함.
- 주요 파일: lib/ai-operation.ts, conversation-context.ts, gemini-discovery.ts, asset-localization.ts; search route/shell의 실행 연결; drizzle/0017_ai_operating_usage.sql와 db/schema.ts; 타입 오류 해당 모듈·package/tsconfig/worker 타입; ai-operation/conversation-context/gemini-discovery/asset-localization/deployment-workflows tests. API/openapi/PRODUCT-DATA/CURRENT-STATE/DECISIONS/registry/PM/README와 AI-OPERATING-GUARD를 함께 갱신. 과거 QA 보고서는 후속 링크만 추가하고 당시 증거를 보존.
- 검증: 비밀값·기존 DB 없이 `work/qa-stage1-20260923` 격리 사본에서 `npm run check` 통과: 타입 검사, 전체 migration, vinext client/RSC/SSR build, **223/223 tests**. lint 오류 0, 기존 경고 5 및 생성 runtime 선언의 unused eslint-disable 경고 3. 기존 bundle 500kB 경고 유지. 실제 빌드 worker의 긴 답변 후 200 응답, Gemini 모의 실패 usage 기록/재호출 억제/300회 한도 후 fetch 0회, 메모리 SQLite 동시 계정 100/전체 300 한도, 취소·원장 장애·미제공 비용 null 시험 통과. 실제 GLI 유료 API 호출은 하지 않음.
- 시각 보존: 보호된 원본 HTML, app/claude-design.css, app/generated/claude-static.ts, app/globals.css의 SHA-256이 기존 승인 기준 및 격리 빌드 산출물과 모두 일치. 최신 Claude GLI-052-R/미승인 문구 통합 없음. 브라우저 육안/실기기 재검수나 실제 모델 상담 품질 시험을 대신하지 않음.
- 로컬 실행: 기존 8776 연결 거절을 확인하고 숨김 dev 프로세스로 복구. 자산 API GET 200 확인. 기존 로컬 D1의 migration 이력 공백을 확인하여 `.wrangler/backups/before-ai-guard-1790161682058.sqlite` 백업 후 새 0017만 CLI `--local` 적용/해당 이력 기록. 운영 원장 요청/호출 0건 확인. 과거 회원/운영 DB 전체 정합성 정리는 별도이며 완료로 표시하지 않음.
- 추가 로컬 안정화: QA 빌드 도중 dev watcher가 `work/qa-stage1-20260923/dist/client/og.png`를 감시하다 Windows EBUSY로 종료되는 것을 로그로 재현했다. vite.config.ts의 감시 제외에 work/.wrangler를 추가하고 숨김 프로세스(PID 6196)로 8776을 재실행. 실행 중 격리 전체 check를 다시 통과한 뒤 `/explore` GET 200을 확인했다. 테스트 파일 잠금 방지이며 제품 화면/배포 설정/키 변경이 아니다.
- 남은 일: 외부 후보 영속 저장·인스턴스 전환 복원(Q3), 실제 환경 원장/비용 smoke와 단기 rate limit/금액 상한·guest 신원/분산 single-flight·관리자 조회/보존 정책, 최신 Claude typed adapter/문구·모바일 승인(Q7). GCP/AWS 이전은 P37의 다음 단계. 키/모델/Fable 제외 정책은 변경하지 않음.
- 커밋·배포: 로컬 코드·문서·로컬 DB 원장만 반영. 공개 DB/사이트·설정·키·커밋·푸시·GCP/AWS 리소스 변경 없음. 공개 배포는 별도 승인 후 0017 적용과 환경 검증 필요.

## HIST-20260923-015

- 작성자: Codex. 관련 GS-001/010, GLI-048/052, P19/P20/P28. 승인 근거: 사용자 "후속 질문을 하려고 할 때 자꾸 초기 입력창으로 돌아가는데 불편해"에 대한 기존 상담 동작 복구. 새 디자인 지시가 아니다.
- 재현: 390px 별도 Edge/Playwright 세션에서 후속 질문 `Keep the same city`를 입력하면 첫 글자 `K`만 남고 활성 입력 노드가 소실됐다. React 상태 갱신 시 dangerouslySetInnerHTML 노드 재설정과 모든 대화 행 재생성이 원인이다. 원본 HTML은 대화→입력창 순서이나 React는 안내문 앞에 답변을 삽입하여 입력창이 답변 위에 놓였다.
- 변경 후: memo 처리된 ApprovedHtml 경계로 같은 HTML의 DOM 유지, 기존 대화 행은 ID별 보존, 결과 복원은 뷰/대화 변경 때만 실행. 동일 textarea 값 재할당 방지와 IME 조합 Enter/229 전송 제외. 대화 행을 기존 후속 composer 앞에 삽입하여 승인 원본 순서 복구. CSS/문구/폰트/크기/반응형/원본 HTML/생성 파일 변경 없음. 최신 GLI-052-R 전체 통합과는 별개다.
- 파일: app/components/claude-design-shell.tsx, tests/followup-composer.test.mjs, tests/browser/followup-continuity.mjs. CURRENT-STATE/GS-001 registry 및 생성 FEATURE-STATUS를 갱신. API/데이터/모델/이용 정책 변경 없음.
- 검증: 비밀값 없는 기존 격리 사본 work/qa-stage1-20260923에서 npm run check 통과(224/224, lint 오류 0/경고 9, typecheck, migration, build). 390/1440px 별도 브라우저에서 연속 입력·노드/포커스/스크롤 유지, IME 확정 미전송, 후속 문맥 전달, 모의 503 후 초안 유지·중복 없는 재시도, 모든 답변 뒤 composer 배치 통과. API 검색은 전부 route mock으로 가로채 유료 호출 없음. 스크린샷은 work/followup-continuity-{390,1440}.png. 실제 휴대폰 키보드와 공개 사이트는 미검수.
- 남은 일: 새 Claude S1/모바일 디자인의 선별 통합과 사용자 검수, 상세 복귀/영속 상담, 시안 카드와 서버 데이터 대응 등 기존 GLI-052 범위 유지. 이번 좁은 입력 버그 수정으로 전체 상담 UX 완료를 선언하지 않는다.
- 커밋·배포: 로컬 127.0.0.1:8776에서만 반영. 커밋·푸시·공개 배포·키/설정 변경 없음.

## HIST-20260923-016

- 작성자: Codex. 관련 GS-001/010/014/015, GLI-048/052, P19/P20/P28/P35/P39. 승인 근거: 사용자 "시안을 모두 반영해서 커밋 푸시 하기 직전 버전을 보고 싶다". 로컬 검수본 통합이며 커밋/푸시/공개 배포 승인이 아니다.
- 변경 전 → 후: GLI-052-R 요약/출처/대화 상태가 별도 시안에만 존재 → 실제 search API에 연결한 React ConsultationPanel. 최대 3건 요약·전체 목록 순번·가격 동기화, 원문 출처/모바일 접기, 조건 chip, 이전 대화 접기, 자산 선택·해제 및 selectedAssetIds 전송, 모바일 M2, S1 누적 스크롤 이탈/응답 직전 확인/새 답변 알림. 같은 건수의 ID·순서 교체도 기존 안내 조건으로 감지한다. review/clarify는 기존 목록을 유지한다.
- 원본 보존: 수령 HTML을 design-handoff/source/gli-052-consultation.dc.html에 그대로 보관. 생성기가 상담 CSS 블록만 app/generated/claude-consultation.css로 복제하며 바이트 일치 시험 추가. 기존 gli-demo.dc.html/claude-design.css/claude-static.ts/globals.css 4개 기준 해시는 그대로다. 랜딩/뉴스/멤버십 등 타 페이지 재디자인 없음. Lucide 아이콘과 React props/events로 실행 문법만 변환했다.
- API/운영: 기존 selectedAssetIds 검증 계약 재사용, 새로운 AI 호출·재시도·프롬프트 변경 없음. UI의 목록·요약은 서버 matches를 참조하고 실제 rate가 있을 때만 환산한다. 원본 fixture/QA/window.claude/local rank를 제품에 넣지 않았다. 예시 예산 확대 options는 서버 미제공으로 숨긴다. 전문가 신청은 기존 coming-soon 경로다. 이 제한을 GLI-052-INTEGRATION-20260923에 기록.
- 파일: consultation-panel.tsx, consultation-view.ts, claude-design-shell.tsx, layout.tsx, render-claude-handoff.mjs, 별도 원본/생성 CSS 및 followup-composer/consultation-view/browser tests. GS-001/014 registry와 CURRENT-STATE/DECISIONS/시안검수 후속 링크/통합 계약/생성 기능표 동시 갱신.
- 원본 아이콘: 결과 카드의 질문 버튼에 들어가는 두 SVG는 최종 원본을 parse5로 읽어 claude-consultation-icons.ts로 그대로 추출한다. 모델이 다시 그리지 않고, 후보 문장은 별도 textContent로 넣어 외부 텍스트 HTML 실행을 막는다.
- 검증: 비밀값 없는 work/qa-stage1-20260923 격리 사본에서 npm run check 통과(229/229, lint 오류 0/경고 10, typecheck/migration/client·RSC·SSR build). 실제 8776 앱의 별도 Edge Playwright 세션에서 API를 모두 mock: 320/360/390/412/768/1440px 가로 넘침 없음, 요약 3/전체 4 순서/가격 일치. 390/1440에서 선택 ID·review 순서 보존·이력 토글·S1 사용자 스크롤 이탈 시 알림 및 명시 이동 통과. 입력 노드·IME·오류/초안/재시도 별도 회귀 통과. 모바일/PC 스크린샷 육안 검수(work/gli-052-panel-{width}.png). 실제 유료 API 호출은 하지 않았다.
- 검수 중 처리: 신규 CSS 생성 전 import에 대한 Vite 모듈 캐시 500을 확인해 기존 8776 dev 프로세스를 재기동했다(PID 4784, work/gli-052-integrated*.log). 초기 브라우저 두 실행에서 hydration 전 클릭으로 후속 폭 시험이 timeout되어, React panel mount를 기다리도록 시험을 보완한 뒤 6개 폭 재검수 통과. 실제 휴대폰 키보드/Safari/공개 서버는 미검수다.
- 남은 일: 사용자 로컬 시각 확인, 전체 실제 상담 품질/실기기 검증, 조건 확대 선택지 서버 계약, 상세 C1/외부 후보 영속화 및 복원, 직원 상담 실서비스. 이전 QA의 운영 미완료 사항을 디자인 통합 완료와 혼동하지 않는다.
- 커밋·배포: 127.0.0.1:8776 로컬 검수본만. 커밋·푸시·공개 사이트·키·유료 모델 설정·GCP/AWS 변경 없음.

## HIST-20260923-017

- 작성자: Codex. 관련 GS-001/010/033, GLI-052, P34/P38/P39. 사용자 "번역 적용이 안되어 있는데?"의 로컬 화면 결함 수정이다. 추가 디자인/모델/공개 배포 승인이 아니다.
- 확인: 사용자 브라우저에서 GLI-KH-101/102/106 제목이 AI 답변·요약·카드 모두 영어였다. 이들은 sourceUrl 없는 내장 fixture라 외부 Gemini 번역 대상에서 제외됐다. 별도로 displayResult가 review/clarify의 새 matches를 이전 객체로 전부 대체하여 새 번역값도 버리는 오류를 확인했다.
- 수정: 알려진 fixture 8건의 ID+원 제목이 일치하고 외부 URL이 없을 때만 무비용 한국어 제목 투영. 원 Asset/출처/숫자는 보존하고 외부 자산은 기존 metered Gemini 경로를 유지한다. 이전 세션의 알려진 fixture 제목은 AI 답변/인용/후보에도 투영하되 사용자 발언은 그대로다. review/clarify는 기존 ID·순서에 동일 ID 새 필드를 적용한다.
- 연관 표시 오류: static 카드의 cspec이 예전 면적/침실/욕실 값으로 남는 문제를 같은 API 값으로 갱신. 새로고침의 static 필터가 저장 검색 목록 위로 전체 시안을 다시 노출하는 문제를 방지하고 sessionStorage의 마지막 결과/AI 답변만 복구. 전체 대화 영속 저장이나 상세 C1 완료를 뜻하지 않는다.
- 파일: lib/demo-asset-localization.ts, asset-localization.ts, consultation-view.ts, app/components/claude-design-shell.tsx, 단위/브라우저 번역 시험. PRODUCT-DATA/CURRENT-STATE/GS-033 registry와 기능표 동시 갱신. 키/요금/프롬프트/출처 수집 정책 변경 없음.
- 검증: 격리 사본 work/qa-stage1-20260923 npm run check 통과(232/232, lint 오류 0/기존 경고 10, typecheck/migration/build). 첫 검사에서 저장 결과 복구의 동기 effect 상태 변경 lint 오류를 확인해 취소 가능한 hydration 이후 복구로 수정했다. 390/1440px 번역 브라우저 시험에서 저장 답변/인용/카드 한국어, 외부 번역 응답의 review 유지, 순서/수치/가로 넘침 검증 통과. 기존 6폭 상담 시안 검사와 390/1440px 입력/IME/오류 재시도 회귀 통과. 모든 검색 시험은 API mock이며 추가 유료 AI 호출 없음. 사용자 실제 탭 DOM에서도 한국어 제목 3건과 답변/요약 3건 확인. 4개 보호 시각 파일 해시 불변. 스크린샷 work/translation-{390,1440}.png.
- 남은 일: 실제 외부 신규 번역 공급사 성공률/운영 교정, 전체 다국어·위치 정규화·영속 대화/상세 C1은 기존 범위. 이번 결과를 모든 외부 매물의 유료 번역 성공으로 확대 해석하지 않는다.
- 커밋·배포: 127.0.0.1:8776 로컬만 반영. 커밋·푸시·공개 배포 없음.

## HIST-20260923-018

- 관련 GS-001/010, GLI-052-PROGRESS. 사용자 요청: `GLI AI가 답변을 정리하고 있습니다`를 실제 하는 일이 드러나는 안내로 구체화하되 작업 목록에 넣고 다음 업데이트에 일괄 반영.
- PM_BOARD/상담 통합 명세/GS-001 next에 구현 대기 항목을 등록했다. 실제 서버 단계와 일치, 초기·후속 상담 적용, 캐시·실패 상태 정합성, 공급사명 비노출, 가짜 진행 단계/추가 LLM 호출 금지를 수용 기준으로 기록했다. 예시 문구는 확정 UI 문구가 아니다.
- 이번 작업은 문서만 변경했다. 런타임/API 계약/디자인/설정 변경 및 빌드·유료 API 호출·커밋·푸시·배포 없음. 문서 검증과 diff 검사로 확인한다.

## HIST-20260923-019

- 관련 GS-001/010, GLI-052-RETURN/C1. 사용자 상세 복귀 버튼 누락 지적을 다음 업데이트 작업 목록에 등록했다. 기존 검색 탭을 이동시키지 않고 별도 임시 상세 탭으로 확인한 후 닫았다.
- 확인 증거: 실제 GLI-KH-102 시안 상세에 복귀 버튼이 없고, 외부 자산 상세는 기존 BackToResultsButton을 렌더한다. GLI-KH-102 검색은 매매 $75,360/47㎡이나 상세는 BKK1 임대 $700/56㎡로 다르게 표시된다. 기존 C1을 재현한 것이며 새 정상 동작으로 인정하지 않는다.
- PM_BOARD/통합 명세/GS-001 next에 복귀 버튼·전체 상담/검색 조건/후보 순서/스크롤 보존·재검색 과금 방지·직접 진입 fallback·ID별 상세 일치 회귀를 등록했다. 현재는 구현 전이다.
- 제품 코드/디자인/설정 변경, 빌드, 유료 API 호출, 커밋·푸시·배포 없음. 문서 검증/diff 검사만 수행한다.

## HIST-20260923-020

- 관련 GS-033/001/014, GLI-052-TRANSLATION-COVERAGE/C1. 사용자 일부 줄 번역 누락 원인 문의에 실제 외부 상세를 읽기 전용 확인했다. 한국어 자산명과 영문 지명/고유명사, MARKET DATA 및 구형 Trust Score/Verification Progress가 공존한다.
- 원문 유지 정책, 한글 포함 문장 전체를 제외하는 extractFields 조건, 번역 대상이 아닌 구형 UI 라벨을 구분해 설명하고 다음 업데이트 목록/명세/GS-033 next에 기록했다. 공급사 오류가 이번 화면의 원인이라고 추정하지 않는다.
- 문서만 변경. 제품/설정/빌드/유료 API/커밋/푸시/배포 없음. 문서 검증과 diff 검사 적용.

## HIST-20260923-021

- GLI-052-TRANSLATION-COVERAGE / GS-033/014. 사용자가 Phnom Penh의 고유명사 취급을 질문하고 구형 화면 문구(이전 답변 3번) 수정을 명시했다.
- 지명 분류와 표시 언어를 구분해 정정: 한국어 화면의 알려진 지명은 프놈펜처럼 한국어로 표시할 수 있으며 원문/정규화 값 보존과 모순되지 않는다. 구형 상세 라벨과 점수→등급 정책 정합성 수정은 다음 일괄 업데이트 대상임을 통합 명세에 기록했다. 프로젝트/브랜드/등급 영문 전체를 임의 변경하는 승인은 아니다.
- 문서만 변경. 기존 다음 업데이트 일괄 반영 일정 유지, 제품 코드/빌드/유료 API/커밋/푸시/배포 없음. spec:check 및 문서 diff 확인.

## HIST-20260923-022

- GLI-052-TRANSLATION-COVERAGE / GS-033. 사용자가 R&F City와 Phnom Penh가 하나의 명칭이면 전체를 고유명사로 취급하도록 확정했다.
- 통합 명세에 복합 자산/프로젝트명 전체 원문 보존, 별도 위치 필드의 한국어 표시, 설명형 매물 문구 번역을 구분해 기록했다. 021의 지명 한국어 표시를 명칭 내부에 일괄 적용하지 않는다. 명칭 경계는 출처 필드/문맥으로 확인한다.
- 다음 일괄 업데이트 대기. 문서만 변경하며 제품/빌드/유료 API/커밋/푸시/배포 없음. spec:check 및 문서 diff 확인.

## HIST-20260923-023

- GLI-052-TRANSLATION-COVERAGE / GS-033. 사용자 성수트리마제 예시로 명칭 보호 기준을 구체화했다. 원문 언어와 관계없이 하나의 상표/자산명 전체를 유지하며 내부 지명만 분리 번역하지 않는다.
- 출처 근거가 부족하면 명칭 경계를 AI가 확정하지 않고 원문 보존/조사 대상으로 남기는 보수적 처리 기준을 통합 명세에 추가했다. 실제 상표 등록 여부를 이번에 확인했다는 뜻이 아니다.
- 문서만 변경. 다음 일괄 업데이트 대기이며 제품/빌드/유료 API/커밋/푸시/배포 없음. spec:check 및 문서 diff 확인.

## HIST-20260923-024

- GLI-052-TRANSLATION-COVERAGE / GS-033. 사용자가 현재 R&F City, Phnom Penh는 쉼표로 구분되므로 하나의 상표명이 아닌 번역 대상이라고 판정했다.
- 해당 사례를 `R&F City` 명칭 보존 + 위치 `프놈펜` 번역으로 확정하고 통합 명세에 표시값 `R&F City, 프놈펜`을 기록했다. 022/023의 하나의 명칭일 때 전체 보존 원칙은 유지하되 이 사례에 대한 가정과 구분한다.
- 다음 일괄 업데이트 대기. 문서만 변경하며 제품/빌드/유료 API/커밋/푸시/배포 없음. 문서 검증 및 diff 확인.

## HIST-20260923-025

- GLI-052-TRANSLATION-COVERAGE / GS-033. 사용자 명칭 경계 보조 규칙 확정: 구분이 어려우면 문장부호로 분리된 지역명은 번역하고, 따옴표로 묶인 명칭/띄어쓰기 없는 명칭은 원문 보존.
- 통합 명세에 적용 범위와 예시, 따옴표 내부 구두점 보호를 기록했다. 기존 원문 데이터 보존과 명확한 출처 정보 우선은 유지한다. 가격/URL/일반 설명까지 임의로 지역명으로 분류하는 규칙이 아니다.
- 문서만 변경, 다음 일괄 업데이트 대기. 제품 코드/빌드/유료 API/커밋/푸시/배포 없음. spec:check 및 문서 diff 확인.

## HIST-20260923-026

- 사용자 "여기까지 작업을 기록하고. 정책서를 업데이트 해라, 수정은 다음번 토큰 충전 시에 수행한다"에 따른 최종 기록 및 구현 보류.
- DECISIONS P40에 혼합 문장 번역, 원문/수치 보존, 복합 명칭 보호, 지역 분리, 따옴표/붙여쓰기/구두점 보조 규칙과 R&F City 사례의 최종 판정을 통합했다. P41에 토큰 충전 후 사용자 재개 지시, 완료/미완료 경계, C1/복귀/진행 안내/번역/구형 라벨의 재개 목록을 기록했다.
- CURRENT-STATE/PM_BOARD에 재개 지점을 표시하고 GLI-052 통합 명세의 정책 참조와 문서 제목 구조를 정리했다. 017까지의 로컬 코드 검증(232개)을 보존하고 018 이후 기록을 새 기능 완료로 오인하지 않도록 명시했다. 전체 대화 영속 저장, 상세 정합성, 공개 배포는 미완료다.
- 문서만 변경. 제품 코드/설정/키/모델/빌드/유료 API/커밋/푸시/공개 배포 변경 없음. 자동 재개/토큰 충전 감시를 생성하지 않았다. spec:check 및 문서 diff 검사로 검증한다.
