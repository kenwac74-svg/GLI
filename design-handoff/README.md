# GLI 디자인 핸드오프

> **현재 결과 화면 작업지시:** [`GLI-052-RESULT-SCREEN-BRIEF.md`](GLI-052-RESULT-SCREEN-BRIEF.md)
>
> AI 탐색 결과 화면을 일반 AI 수준의 답과 GLI 확인 정보 두 층으로 개선하는 디자인 지시서다. PC를 먼저 확정하고 모바일은 후속이며, 승인 전에는 시각 원본이나 React 구현을 변경하지 않는다.

> **현재 모바일 작업지시:** [`GLI-051-MOBILE-RESPONSIVE-FIX-BRIEF.md`](GLI-051-MOBILE-RESPONSIVE-FIX-BRIEF.md)
>
> 실제 Android와 360/390/412px 브라우저에서 확인된 페이지 전체 가로 넘침을 다룬다. 이 문서는 모바일 헤더·랜딩 타이포·내부 스크롤에 한정된 후속 지시이며, 사용자 승인 전에는 시각 원본이나 React 구현을 변경하지 않는다.

> ## ⚠ 이 문서는 2026-08-12 시안 기준이다
>
> 이후 화면 구조가 크게 바뀌었다 — 상세 페이지가 5탭에서 접힌 줄 방식으로, 등급이 5단에서 8단으로, 최상단 메뉴가 4개로, 자산 유형이 4분류로 재편되었고 프로젝트 템플릿이 추가되었다.
>
> **기능 구현은 아래 문서를 먼저 읽을 것.**
>
> | 문서 | 내용 |
> |---|---|
> | `HANDOFF-2026-08-26.md` | **시작점.** 범위·역할·라우트 맵·금지 사항 |
> | `DATA-MODEL.md` | 자산·지역·기록·프로젝트 스키마, 등급 산정 |
> | `AI-SPEC.md` | AI 검색 계약, 프롬프트, 순위 산식, 파이프라인 |
> | `CRAWLER-SPEC.md` | 수집 대상·주기·출처 기록·수집 금지 항목 |
>
> 이 문서와 `IMPLEMENTATION-NOTES.md` · `CHANGELOG-2026-08-12.md` · `DEMO-DATA.md`는 참고용으로 남긴다. rev.2의 이벤트·CSS 클래스 계약은 지금도 유효하다.

---

`kenwac74-svg/GLI` · 작업 브랜치 `design/claude-ui-refresh` · **2026-08-12 (rev.2)**

> **이 버전이 구현 기준 최종본이다.** `source/gli-demo.dc.html`은 Claude Artifact로 퍼블리싱된 것과 동일한 파일이며, 이후 디자인 변경은 없다. 이전 시안(v1 딥그린 단일 팔레트 / 6px 라운드)은 폐기됐다. 구현은 이 폴더만 참조하면 된다.
>
> **rev.2 (2026-08-12)**: 지시서 `CLAUDE-UI-REVISION-BRIEF.md` 대상 수정 반영. 변경 내역은 `CHANGELOG-2026-08-12.md`, 이벤트·상태 계약과 지시서와 다른 부분은 `IMPLEMENTATION-NOTES.md`에 있다. **구현 착수 전에 이 두 문서를 먼저 읽을 것.**

이 폴더는 **디자인 시안과 그 규칙**이다. 개발 코드는 포함하지 않는다. Next.js 구현 시 이 시안의 구조·토큰·카피를 옮기면 된다.

---

## 파일

| 파일 | 내용 |
|---|---|
| `source/gli-demo.dc.html` | **전체 시안 원본 (최종).** 11개 화면 · HTML·CSS·JS 전부가 이 한 파일에 있다 || `source/public/` | 시안이 참조하는 이미지 20장 (자산 15 · 인물 5) + 로고 |
| `source/support.js` | 시안 실행 런타임. **구현에는 옮기지 않는다** |
| `ASSETS.md` | **사용 자산 목록.** 이미지·폰트·아이콘 출처와 CSS 클래스 매핑 |
| `CHANGELOG-2026-08-12.md` | **rev.2 변경 목록.** 구역별 변경 내역과 새 클래스·이벤트 |
| `IMPLEMENTATION-NOTES.md` | **이벤트·상태 계약과 지시서와 달라진 부분.** 구현 착수 전 필독 |
| `GLI-051-MOBILE-RESPONSIVE-FIX-BRIEF.md` | **현재 모바일 후속 지시.** 재현 수치·허용 범위·납품물·완료 기준 |
| `DEMO-DATA.md` | **가상 데이터 목록.** 실개발 전 반드시 확인 |
| `DESIGN-RULES.md` | 타이포·색상·형태·레이아웃 규정 (v2) |
| `index.html` | 핸드오프 개요 페이지 |

시안을 보려면 `source/gli-demo.dc.html`을 브라우저로 연다. 별도 빌드 불필요.

---

## 화면 목록

시안은 단일 파일 안에서 `state.view` 값으로 화면을 전환한다. 각 화면은 `<div class="{{ ___Cls }}">`로 감싸여 있고, 활성 화면만 보인다.

| view | 화면 | 진입 경로 | 저장소 대응 |
|---|---|---|---|
| `land` | **랜딩 (기본 진입)** | 로고 클릭 | 신규 — 대응 없음 |
| `home` | 마켓플레이스 | 자산 탐색, 히어로 CTA | `app/components/explore-client.tsx` |
| `detail` | 자산 상세 | 카드 클릭 | `app/assets/[id]/page.tsx` 외 |
| `about` | **GLI 소개** | GLI 소개 ▸ 소개 | 신규 — 대응 없음 |
| `fav` | 관심자산 | 헤더 하트 | 신규 — 대응 없음 |
| `plan` | 멤버십 요금 | 멤버십 | `app/membership/page.tsx` |
| `co` | 결제 확인 | 플랜 선택 후 | `app/membership/checkout/page.tsx` |
| `news` / `article` | 뉴스 목록 / 기사 | GLI 소개 ▸ 뉴스 | 라이브 `/news` |
| `paper` | 백서 | GLI 소개 ▸ GLI 백서 | 라이브 `/whitepaper` |
| `trust` | 검증 체계 | 검증 체계 | 라이브 대응 |
| `soon` | 준비중 | 미구현 메뉴 | `app/coming-soon/page.tsx` |

---

## 이번 개편의 핵심 변경

**1. 진입 화면이 바뀌었다.** 기존에는 접속 즉시 자산 목록이 나왔다. 이제 랜딩 페이지가 기본이고, 마켓플레이스는 `자산 탐색` 메뉴로 들어간다.

**2. 액센트 컬러 도입.** 딥그린 단일 팔레트에서 `딥그린(면) + 라임(행동)` 2축으로. CTA·활성 필터·차트가 라임으로 통일된다.

**3. 마켓플레이스 필터 구조 변경.** 국가 탭 + 카테고리 4박스 + 거래유형 세그먼트 3개가 흩어져 있던 것을 **스티키 칩 레일 하나**로 통합했다. 동작하지 않던 카테고리 박스는 제거.

**4. 자산 카드 재설계.** 카드 전체가 클릭 영역이 되고 하단 CTA 버튼을 뺐다. 가격이 카드의 주인공이 되도록 전용 서체·크기로 분리.

**5. 상세 우측 사이드바 확장.** 스펙 스트립(침실·욕실·면적·거래유형)과 Trust Score 추이 차트를 추가.

**6. 형태 토큰 조정.** 라운드 6→14px, 그림자 1단→2단 레이어.

---

## 구현 시 주의

- **`DEMO-DATA.md`를 먼저 읽을 것.** 후기·차트·인용문 등 가상 데이터가 섞여 있다.
- 시안의 `renderVals()`는 뷰 모델이다. 여기서 계산되는 값(정렬, 필터, 등급 판정, 차트 경로)을 그대로 옮기면 된다.
- 카드 하트 버튼은 `stopPropagation` 필수. 빠뜨리면 카드 클릭과 충돌한다.
- 이미지는 `<img src>` 대신 `background-image`. 이유는 `DESIGN-RULES.md` §8.
- 마퀴 애니메이션(티커·후기 배너)은 `prefers-reduced-motion`을 존중해야 한다.

---

## 파일 구조

```
design-handoff/
├── README.md              ← 이 문서
├── CHANGELOG-2026-08-12.md  ← rev.2 변경 목록
├── IMPLEMENTATION-NOTES.md  ← 이벤트·상태 계약 (필독)
├── ASSETS.md              ← 자산 목록
├── DEMO-DATA.md           ← 가상 데이터 목록
├── DESIGN-RULES.md        ← 디자인 규정 v2
├── index.html             ← 개요 페이지
└── source/
    ├── gli-demo.dc.html   ← 시안 전문 (최종)
    ├── support.js         ← 시안 런타임 (구현 제외)
    └── public/
        ├── brand/gli-logo.png
        ├── team/           (5장)
        └── partner-assets/ (7장 + golden-crown/ 8장)
```

---

## 미착수

- `/notices`, `/my` — 준비중 화면으로 연결
- 지도 뷰 — 제안만 (`DESIGN-RULES.md` §9)
- 수익 시뮬레이터 — 제안만
- 카드 사진 캐러셀 — 사진 확보 대기
