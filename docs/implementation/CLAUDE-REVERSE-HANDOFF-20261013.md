# Claude Design 역인계: 언어·기본 정보 보완

사용자 승인: 2026-10-13. 소규모 디자인/상태 개선은 Codex가 직접 수행하고, 차후 대규모 Claude Design 개편 때 이 문서와 실행 소스를 대조한다. LOCAL 반영이며 Claude 웹 대화에 전송하거나 공개 배포한 상태는 아니다.

## 유지해야 할 변경

- 영어 헤더: 기존 접힌 메뉴를1400px 이하에서 사용한다. 영어 헤더 gap14px, 메뉴 가로 padding8px, 헤더 버튼 padding12px. 로고·색·서체·메뉴 항목·링크 및 한국어 헤더 규칙은 유지한다. 변경 위치: `scripts/render-claude-handoff.mjs`의 reactFidelityCss → 생성 `app/claude-design.css`.
- 샘플 가격: 원문 가격/통화/월·㎡ 단위/범위를 보존하고 참고가격만 환율 API로 투영한다. KO=KRW, EN=USD이며 같은 통화면 중복 환산 문구를 표시하지 않는다. 환산값 아래 작은 기준 시각 행을 표시한다. 원문 가격 없는 자산에 환산 가격을 만들지 않는다.
- 샘플 날짜: 원래 시드 게시 날짜를 연도 포함 절대 날짜로 표시하며8월14일 기준의 고정 경과일을 제거한다. 외부 원문 날짜/GLI 관측일과 혼동하지 않는다. 가격이 없는 상세의 과거 고정 환율 링크는 숨긴다.
- 영어 고정 UI: MY 비로그인/회원·문의 문구, BASIC 펼침 제원/지역 인프라, 외부 제원·날짜·추가 확인, 다음 단계 안내를 사전에 보완했다. 번역 캐시 없는 외부 설명을 임의 생성하지 않는다.
- 언어 전환: locale cookie와 화면 상태 변경 후 router.refresh로 서버의 캐시 기반 자산 제목/지역/번역 상태도 갱신한다. 상담 재실행/유료 번역 호출/수집은 하지 않는다. 목록의 동적 개수는 사전 투영과 충돌하지 않도록 별도 표시 소유권을 갖는다.

## 소스 경계

- Claude 원본 `design-handoff/source/gli-demo.dc.html`은 변경하지 않았다. 원본을 다시 통째로 복사하면 위 보완이 사라지므로 실행 어댑터를 유지한다.
- `scripts/render-claude-handoff.mjs`: 명시적 data-fixture-price/period/posted/fx 표시 연결. generated 파일은 이 스크립트로 재생성한다.
- `lib/fixture-display.ts`: 제한된 시드 가격 문자열을 해석하고 `lib/currency.ts`의 공통 환산·포맷을 재사용한다. Trust/예상 수익/위험 시연 값을 변경하지 않는다.
- `lib/reference-exchange-rates.ts`: 목록/상세 공통5분 요청 캐시; 실패는 재시도 가능. 실제 API의 환율 기준 시각을 표시한다.
- `app/components/ui-locale-provider.tsx`, `price-display.tsx`, `claude-design-shell.tsx`, `lib/english-ui-copy.ts`, `ui-language.ts`를 함께 대조한다.

## 검수 및 남은 범위

- 수정 전 보고서: QA-LOCALE-BASIC-20261013.md. 수정 후 영어1286px 목록: 문서1271px, 헤더 버튼 범위 초과 없음.390px 영어 샘플 상세와 MY에서 가로 넘침 없음. 실제 휴대폰 전체 검수는 별도8단계다.
- VN 외부 상세 KO→EN→KO 전환에서 제목 지역/설명 상태/가격/날짜가 새로고침 버튼 없이 갱신됨. 샘플 Mantawi BASIC 제원 펼침에서 신규 문구와 시드 게시 날짜 확인.
- [영어 헤더 증거](../../work/locale-basic-fixed-en-20261013.png). 테스트356개 통과. 정식 로그인 이후 MY/문의 제출 실화면, PH 외부 데이터/원문 정확도, 공개 환경 검수는 완료 주장하지 않는다.
- 대규모 개편 시 위 항목을 디자인 원본에 반영할지 협의한다. 새 요금제/실결제/권한/AI 품질 정책을 이 역인계로 승인하지 않는다.

## Step8 minor LOCAL integration
- Existing login button styles reused for Google staff preview and GPT developer test. Actual Google OAuth is not connected; public auth unchanged.
- Header member label follows successful member lookup; zero-result feedback uses existing small text style, no new card/layout.
- Mantawi fixture title supports prefixed references. Detailed QA boundaries: QA-INTEGRATED-20261013.md.
- Saved reverse handoff only, not sent to Claude. Real-phone/public/provider checks remain.
- Step8 follow-up: four exact EN MY copy keys (logout/watchlist/remove/missing price), no visual restructuring. Sample favorite reload/remove and inquiry login-return checked. HIST-20261013-018.
