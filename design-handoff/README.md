# Claude UI Refresh — 디자인 핸드오프

`design/claude-ui-refresh` 브랜치. 개발 코드는 건드리지 않은 **디자인 시안**입니다.

## 파일

| 파일 | 용도 |
|---|---|
| `index.html` | 동작하는 데모. 브라우저에서 바로 열림 (15MB, 이미지 내장) |
| `source/gli-demo.dc.html` | 원본 소스. **읽고 옮길 대상은 이 파일** (약 100KB) |
| `DESIGN-RULES.md` | 색·타이포·간격·접근성 규칙. 판단 기준 |

> 옮길 때는 `source/gli-demo.dc.html`을 읽으세요. `index.html`은 이미지가 base64로 박혀 있어 읽기에 부적합합니다.

## 포함된 화면

| 화면 | 소스 내 view | 저장소 대응 |
|---|---|---|
| 홈 · 자산 탐색 | `home` | `app/components/explore-client.tsx`, `site-header.tsx`, `price-display.tsx` |
| 자산 상세 | `detail` | `app/assets/[id]/page.tsx`, `asset-gallery.tsx`, `asset-access-demo.tsx`, `asset-actions.tsx` |
| 뉴스 목록 | `news` | 신규 |
| 뉴스 상세 | `article` | 신규 |
| 백서 | `paper` | 신규 (5개 하위 문서) |
| 준비 중 | `soon` | `app/coming-soon/page.tsx` |

화면 전환은 `state.view`로 처리됩니다. 실제 앱에서는 Next.js 라우트로 대체하세요.

## 핵심 변경 사항

**타이포 — 고령 투자자 기준 상향**
14px 절대 하한(기존 12px), 본문 16px, 보조 15px, 입력 17px. 공간 확보를 위해 자산 그리드를 4열 → **3열**로. 터치 대상 48px. 자간 0, `word-break: keep-all`.

**색 — 딥그린 축**
`--forest #0F3D33` / `--green #1B6B58` / `--gold #7A5214`(Trust Score 전용) / `--paper #FAF9F6`. 모든 텍스트 4.5:1 이상. 배경 그라데이션 금지, 사진 위는 단색 스크림.

**Trust Standard 재설계**
"표준화 / 근거 평가 / 사람 검토"를 폐기하고 **AI 트랙 / 전문가 트랙 2열**로 분리.
- AI: 전수 수집 → 기준 정규화 → 불일치 탐지
- 전문가: 원본 대조 → 현지 실사 → 게시 승인
- 결론: "AI가 찾은 값과 전문가가 확인한 값이 일치할 때만 Trust Score에 반영"

**법인 구조 표기 (신규 섹션)**
| 주체 | 표기 | 역할 |
|---|---|---|
| GLI Gateway Holdings (Singapore) | Global Headquarters | 사업 소유·운영 |
| GLI Vietnam | Regional Office | 현지 발굴·실사 |
| ㈜솔리드넥스 (Korea) | Technology & IP Partner | 플랫폼 개발·특허 보유 |

푸터 고지: *본 서비스는 GLI 싱가포르 본사가 운영하며, 플랫폼과 검증 기술은 ㈜솔리드넥스가 개발·공급하고 관련 특허를 보유합니다.*

**카드 이중 배지 해소** — 사진 위에는 검증 상태 하나만. 자산 유형은 본문 라벨로 이동.

**AI 검색** — 질문을 조건(국가·거래유형·예산·베드·키워드)으로 분해해 16개 자산을 점수화하고 순위·근거를 표시. 소스의 `localParse()` / `rank()` 참조. 실제 서비스에서는 파싱을 서버 LLM 호출로 대체하고 `rank()`는 그대로 사용 가능.

## 원본 자료 불일치 — 확인 필요

1. 백서는 "Global **Leisure** Investment", 메인 사이트는 "Global **Lifestyle** Investment" → 시안은 Lifestyle로 통일
2. 백서의 베트남 주소(72 Nguyen Thi Minh Khai)와 확인된 주소(74C Nguyễn Văn Cừ) 불일치 → 후자 적용
3. 백서 Leadership Team 6명(James Han, Sarah Lee 등) 실명 확인 불가 → **제외**하고 법인 구조로 대체
4. 뉴스 이미지 3건은 원 언론사 서버가 차단 → 파트너 자산 사진으로 대체하고 "참고 이미지" 표기

## 미구현

`/membership`, `/notices`, `/my`, 지도 뷰. 현재는 준비 중 화면으로 연결됩니다.
