# CHANGELOG 2026-08-12

작업지시서 `CLAUDE-UI-REVISION-BRIEF.md`(2026-08-12) 대응. 디자인 담당 Claude 수행분.

## 변경 파일

- `source/gli-demo.dc.html`

이미지·폰트·아이콘 자산은 변경 없음. `ASSETS.md` 재전달 불필요.

## 변경 구역

### LANDING HERO — CTA 위계 및 후킹 입력
- 주 CTA 문구를 `투자 기회 탐색하기` → `GLI AI와 투자 탐색 시작`으로 교체. Sparkles 아이콘, `min-height:56px`, `font-size:17px`.
- CTA 하단 보조 문구 신설: `예산·국가·목적을 대화로 입력하면 AI가 조건을 정리합니다.`
- 보조 CTA `GLI 검증 방식`을 별도 행으로 내리고 `.btn-ghost-sm`(44px, 낮은 대비)으로 위계 하향.
- **히어로에 한 줄 입력창 `.hookrow` 추가** — 지시서 §5.2와 다름. 사용자 협의로 승인된 변경. 상세는 `IMPLEMENTATION-NOTES.md` §1.
- 모바일에서 주 CTA `width:100%`, 히어로 H1의 고정 `<br>` 해제.

### EXPLORE PIPE — idle/active/done/error 상태
- 4단계가 모두 동일하게 보이던 구조를 상태 기반으로 재작성. 클래스 계약 `.pipe-step.is-idle / .is-active / .is-done / .is-error` 적용.
- 대기: `--ink-2` + 회색 원형 번호. 진행: `--lime` 원형 + `pulse` 애니메이션(reduced-motion에서 정지). 완료: `--green` 원형 + 체크. 오류: `--red` 원형 + `!` + 단계 옆 오류 문구.
- 완료 시 4단계 전부 done 상태로 잔존.
- 퍼센트 표기 없음.
- 컨테이너에 `aria-live="polite"` 부여.
- **DEMO 상태 전환 컨트롤 `.statedemo` 추가** — 7개 상태를 눌러 확인. 구현 시 제거 대상. 상세는 `IMPLEMENTATION-NOTES.md` §2.

### MOBILE — 검색 입력, 예시 질문, 통계, 탭, 메뉴
- 검색 컴포저: `flex-direction:column`, textarea `font-size:16px`(자동 확대 방지) / `min-height:104px`, 실행 버튼 `width:100%` / `min-height:54px`.
- 파이프라인: 데스크톱 4단계 숨김, 압축 표기 `.pipe-mob` 노출 (`2/4 후보 탐색 중` 형식).
- 예시 질문 칩: 세로 스택 → 한 줄 가로 스크롤 + `scroll-snap-type: x mandatory`, `max-width:78%`로 다음 칩 일부 노출. 높이 48px 유지.
- 랜딩 통계: 520px 이하 1열 → **3열 축약 유지**(숫자 21px, 라벨 13px).
- 자산 상세 등급 탭: 가로 스크롤 + `scroll-snap-align:center`.
- 모바일 메뉴: `max-height:calc(100vh - 76px)` + `overflow-y:auto` + `overscroll-behavior:contain`.

### ACCESSIBILITY — ticker / marquee 정지 규칙
- `.tick`·`.vmarquee`에 `:focus-within` 정지 추가 (기존 hover만 지원).
- `prefers-reduced-motion: reduce`에서 `animation:none` + `transform:none`.
- 파이프라인 진행 애니메이션도 reduced-motion에서 정지.

### COPY — 오타, 데모 고지 정책
- `프놌펜` → `프놈펜` 3곳 (INSIDE GLI 목업 1, `voicesLoop` 2). 검색 placeholder의 정상 표기는 유지.
- 본문 데모 고지 제거:
  - 후기 섹션 `데모용 예시 후기입니다…` → `이용 후기는 회원 동의 후 익명으로 공개됩니다.`
  - Trust 추이 차트 `데모용 예시 데이터입니다…` → `검증 이력과 시세 기록을 기준으로 산정합니다.`
- `soon` 화면 3건(`notice`·`news`·`paper`)의 `이 데모에는…` → `현재 준비 중인 기능입니다.` 계열로 교체.
- 푸터 데모 고지는 원문 그대로 유지.

## 새 이벤트 또는 클래스

| 이름 | 종류 | 용도 |
|---|---|---|
| `startExplore` | 이벤트 | 히어로 주 CTA. 입력값을 들고 탐색 화면으로 이동 |
| `onHook` / `onHookKey` | 이벤트 | 히어로 입력창 onInput / Enter |
| `hook` | 상태 | 히어로 입력값 |
| `pipeState` | 상태 | 파이프라인 상태 (`null`이면 실제 검색 상태에서 파생) |
| `pickPipeState` | 이벤트 | DEMO 컨트롤. 구현 시 제거 |
| `.pipe-step.is-idle/.is-active/.is-done/.is-error` | 클래스 | 지시서 §6.1 계약 |
| `.pipe-mob` | 클래스 | 모바일 압축 표기 |
| `.statedemo` | 클래스 | DEMO 컨트롤 컨테이너. 구현 시 제거 |
| `.hookrow` · `.cta-main` · `.cta-sub` · `.btn-ghost-sm` | 클래스 | 히어로 CTA 위계 |

기존 훅 `goHome` · `goTrust` · `runSearch` · `pickPrompt` · `openDetail` · `setTier` · `toggleFav`는 모두 유지.

## 의도적으로 변경하지 않은 영역

- 자산 데이터 16건, Trust Score, 등급 판정 로직
- 멤버십 3플랜 가격·권한, GLI Cash 정책
- 회사 정보, 경영진 8명, 법인 구조, 파트너
- 랜딩 헤드라인 2행
- 색상 토큰, 폰트, 라운드, 그림자
- 랜딩 외 페이지의 정보 구조
- 내비게이션 메뉴 항목과 순서
- 푸터 법인·운영 주체 문구
- 자산 상세 5단계 정보 구조
- 이미지 자산 (교체·추가 없음)
