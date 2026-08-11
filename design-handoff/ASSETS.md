# 사용 자산 목록

`design-handoff/source/` 기준. 시안이 참조하는 모든 외부 리소스다.

---

## 1. 로컬 이미지 (`source/public/`)

번들 크기 제약으로 **전량 재압축**되었다. 자산 사진은 960px 폭 JPEG q0.72, 인물 사진은 360px JPEG q0.82. 화면상 최대 표시 크기(자산 660px, 인물 92px)를 넘지 않으므로 육안 차이는 없다. **Next.js 구현 시에는 원본 해상도를 쓰고 `next/image`로 최적화하는 것이 맞다.**

### 자산 사진 — 골든크라운 갤러리 (8장)
`public/partner-assets/golden-crown/`

| 파일 | CSS 클래스 | 용도 |
|---|---|---|
| `facade.jpg` | `.c12` `.g0` `.n0` | 자산 카드 · 갤러리 1번 · 뉴스 썸네일 |
| `exterior.jpg` | `.g1` | 갤러리 2번 |
| `lobby.jpg` | `.g2` | 갤러리 3번 |
| `bedroom.jpg` | `.g3` | 갤러리 4번 |
| `pool.jpg` | `.g4` | 갤러리 5번 |
| `gym.jpg` | `.g5` | 갤러리 6번 |
| `bbq.jpg` | `.g6` | 갤러리 7번 |
| `pavilion.jpg` | `.g7` | 갤러리 8번 |

### 자산 사진 — 파트너 자산 (7장)
`public/partner-assets/`

| 파일 | CSS 클래스 | 자산 |
|---|---|---|
| `orchard-grand.jpg` | `.c8` `.n4` | Orchard Grand |
| `thu-thiem-zeit-river.jpg` | `.c9` `.n2` | Thu Thiem Zeit River |
| `rlc-portfolio.jpg` | `.c10` | RLC 포트폴리오 |
| `mantawi-residences.jpg` | `.c11` `.n3` | Mantawi Residences |
| `pavilion-square.jpg` | `.c13` `.n5` | Pavilion Square |
| `clouthaus.jpg` | `.c14` `.n1` | Clouthaus |
| `times-square-2.jpg` | `.c15` | Times Square 2 |

### 인물 사진 (5장)
`public/team/` — 원본 PNG는 프로젝트 루트 `originals/team/`에 한글명으로 보관.

| 파일 | 인물 | 사용처 |
|---|---|---|
| `ceo.jpg` | 김세호 | 랜딩 인용문 밴드 · 소개 페이지 팀 카드 |
| `coo.jpg` | 정웅모 | 소개 페이지 팀 카드 |
| `cbo.jpg` | 신재일 | 소개 페이지 팀 카드 |
| `cco.jpg` | 함동환 | 소개 페이지 팀 카드 |
| `chro.jpg` | 이형희 | 소개 페이지 팀 카드 |

사진 없음 → 이니셜 아바타로 처리: 김상연(KS) · 안동현(AD) · 한해수(HS)

### 브랜드
`public/brand/gli-logo.png` — 헤더 로고 (597×276, 무압축 유지)

---

## 2. 외부 이미지 — Unsplash 스톡 (8장)

캄보디아 시장 매물 8건(`.c0`~`.c7`)이 Unsplash CDN을 직접 참조한다. URL은 시안 `<helmet><style>` 블록에 하드코딩되어 있다.

**실사진으로 교체가 필요하다.** 검증을 파는 서비스에서 스톡 사진은 메시지를 훼손한다. 교체 전까지 카드에 `참고 이미지` 고지를 유지한다.

---

## 3. 웹폰트

| 서체 | 출처 | 용도 |
|---|---|---|
| **Pretendard Variable** | 로컬 시스템 폰트 (fallback: `-apple-system`, `Apple SD Gothic Neo`, `Malgun Gothic`) | 본문·제목 전체 |
| **Schibsted Grotesk** 400/500/600/700/800 | Google Fonts | 숫자·라틴 지표 전용 (`--fn`) |

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap" />
```

Next.js에서는 `next/font/google`로 Schibsted Grotesk를, Pretendard는 자체 호스팅 또는 CDN(`cdn.jsdelivr.net/gh/orioncactus/pretendard`)으로 로드한다.

---

## 4. 아이콘

**Lucide** SVG를 전량 인라인 처리했다. 외부 의존성 없음. 구현 시에는 `lucide-react` 패키지를 쓰는 것이 낫다.

사용 중인 아이콘: `house` · `landmark` · `tree-palm` · `rocket` · `sparkles` · `globe` · `map-pin` · `shield-check` · `message-circle` · `building-2` · `badge-check` · `circle-check` · `heart` · `arrow-right` · `layout-grid` · `list` · `file-text`

---

## 5. 런타임

`source/support.js` — 시안 실행에만 필요한 파일이다. **Next.js 구현에는 옮기지 않는다.** 시안을 브라우저에서 열어 볼 때만 쓰인다.
