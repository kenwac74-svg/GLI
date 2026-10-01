# GLI 봇 지식베이스 콘텐츠 전달본

작성일: 2026-09-21
수신 대상: LIU JIAN / GLI 봇 지식베이스 구축 담당

요청한 콘텐츠만 제공하며 소스코드, API 키, 개인 정보는 포함하지 않습니다. 현행 로컬 구현에 반영된 콘텐츠와 디자인 데이터 원문을 대조한 스냅샷입니다. glibiz.net 배포본과의 실시간 일치 여부는 확인하지 못했습니다.

## 파일

- `01-trust-grade.md`: 8등급별 원문 설명과 유형별 산정 기준. 상세 세칙의 미완성 범위 포함.
- `02-membership.md`: 3개 멤버십 가격, 혜택, 비교 항목.
- `03-faq.md`: 현행 생성 화면의 FAQ 질문·답변 5개 원문.
- `04-curator-notes.md`: 구축 담당자용 검토 메모. 고객 답변 콘텐츠로 직접 넣지 마세요.

## 사용 방법

01~03을 문서 단위로 등록하되 문서 상단의 상태·적용 범위도 함께 보존하세요. 이 자료는 현재 데모의 콘텐츠 원본이며 모든 기능이 실서비스에서 제공되고 있다는 보증은 아닙니다. 부족한 기준을 AI가 임의로 보완하지 않도록 하세요. 04의 확인 필요 사항은 GLI 담당자와 확정한 뒤 지식베이스에 반영하세요.

## 원본 위치 기록

- Trust: `design-handoff/DATA-MODEL.md` §5, `design-handoff/source/gli-demo.dc.html`의 `gradeWord`/`gradeNote` 생성 부분.
- 멤버십: `lib/membership-plans.ts`, 원본 HTML의 `PLANS`/`CMP`.
- FAQ: `app/generated/claude-static.ts`의 랜딩 화면 FAQ. 생성 시 `scripts/render-claude-handoff.mjs`에서 구형 Score/3등급 표현을 현행 8등급 표현으로 교정함.

위 경로는 추적용 정보이며 소스 파일 자체는 이 전달본에 포함하지 않습니다. 문구·가격·디자인·서비스 정책은 이번 추출 작업에서 변경하지 않았습니다.
