# GLI Decision Log

## 2026-08-13 — Web2 business/product baseline
- GLI defined as a human-AI verification orchestration platform, not merely RAG property search.
- Residential, commercial, leisure, and project-investment assets supported.
- Online verification is not final verification.
- Trust Score, Asset Quality, and Buyer Fit separated.
- LLM cannot directly write Trust Score or verification state.
- Account membership and asset information/value tiers separated.
- Web2 prioritized; Web3 retained as later extension.

## 2026-10-05 to 2026-10-06 — UX reset
- User experience must not behave like a correct-answer exam.
- Candidate discovery should not be suppressed solely because full verification is missing.
- Canonical UX: **먼저 찾아준다 → 얼마나 믿을 수 있는지 보여준다 → 부족하면 GLI가 더 알아본다.**
- Discovery and Verification must be treated as different stages/functions.
- External foreign-language source content should be translated/normalized and shown inside GLI; original links remain evidence, not the primary UX.
- Missing internal data is not a reason to stop. GLI should perform additional automated research or route to expert/field verification and later return the result.

## 2026-10-06 — Strategic interpretation
- Generic AI/property-search capability is not considered a durable moat.
- GLI should focus investment on verification orchestration, local execution network, persistent verification records, transaction accessibility, and later RWA/fractional access.
- Web2 and Web3+ solve different layers of need:
  - Web2: information, trust, transaction accessibility
  - Web3+: capital accessibility
- Web2 must be commercially viable without relying on future Web3 revenue.
- Biggest business risk identified: excessive pre-revenue capital burn from an overbuilt global platform.

## Unresolved / requires separate decision
- Exact country rollout sequence beyond initial Southeast Asia focus.
- Exact SNS/source list and crawl cadence.
- Exact Trust Score weights and thresholds.
- Exact Premium/Business prices and SLA.
- Exact 2027+ RWA/fractional structure subject to legal/regulatory review.

## 2026-10-06 — Highest-level product principle established
- **Top-level rule:** if GLI gives a slower, less detailed, or less practically useful answer than a leading general-purpose LLM, the product has failed at the first user-value layer.
- GLI must treat the capabilities of leading general-purpose LLMs as the minimum baseline, not as differentiation.
- Verification, data-quality, safety, or internal DB rules may not suppress useful discovery to the point that GLI becomes less useful than general-purpose AI.
- GLI differentiation must begin after baseline discovery/advice: normalization, evidence-state management, additional investigation, expert/field execution, persistent Verification Record, transaction support, and future compliant RWA/fractional access.
- Any lower-level architecture or requirement that conflicts with this principle must be re-evaluated.

## 2026-10-08 — GPT–Claude 공동 협업 및 3회 반복 중단 규칙

상태: **사용자 확정.** 원문 취지: 하나의 컨텍스트에 지배되어 다른 발상을 못하는 상황을 피하기 위해 Claude와 공동 협업한다. 동일 문제에 코드 변경 수준의 답을 3회 이상 반복하면 GitHub에 커밋하여 Claude 의견을 듣는다.

- 발동 기준: 같은 미해결 사용자 문제에 국소 코드 수정 수준의 답변·제안을 3회 반복하면 컨텍스트 매몰을 의심하는 운영상 경고로 취급한다. 실제 수정·배포를 하지 않은 제안도 포함한다. 표현·파일명·세션이 바뀌었다고 같은 문제의 횟수를 초기화하지 않는다.
- 세 번째에 추가 처방을 중단한다. Claude 검토 전에 동일 방식의 네 번째 수정 제안을 반복하지 않는다. 사용자가 원점 재검토를 지시하면 3회를 기다리지 않는다.
- Git 기록 순서: **문제 → 시행착오 → 결정 과정 → 기존 전제를 다시 묻는 질문 → 증거·관련 커밋 → 다음 할 일**. 확인된 사실, 추정, 미측정 결과, 확정 정책, 미확정 제안을 분리한다.
- 인계 파일: `docs/research/HANDOFF-REVIEW-YYYYMMDD-<issue>.md`. 기존 관련 기록이 있으면 갱신한다. 브랜치·기준 커밋·PR과 반복 횟수를 적고 필요한 최소 증거를 첨부한다.
- Claude의 역할: GPT의 코드 수정안을 추인하는 것이 아니라 고객 목표와 관찰 사실부터 문제를 독립적으로 재정의하고, 기존 접근을 유지·수정·폐기할 근거와 가장 작은 검증 방법을 제시한다.
- 검토 이후: GPT와 Claude의 동의·반대·새 가설을 Git에 남기고, 기존 합의와 충돌하는 변경은 사용자 승인 대상으로 올린다. 모델끼리 동의했다는 사실만으로 확정하거나 구현하지 않는다.
- Git 커밋, Claude 전달, Claude 검토 완료는 별개다. 자동 호출의 실제 실행을 확인하지 못했으면 커밋 경로를 전달하고 검토 대기로 기록한다.
- 충돌 확인: 기존 최상위 제품 원칙을 수행하기 위한 절차 보완이다. 사실성·검증상태 구분과 개발 승인 경계는 유지한다. 이번 결정은 검토 문서 기록을 허용하며 앱 코드 수정·PR 머지·배포·자동 Claude 호출 설정을 승인하는 것은 아니다.
- 규칙 본문: `docs/GLI_MASTER_BUSINESS_HANDOFF.md` §1.1.

## 2026-10-14 기록 — 총괄 PM 지정 및 구조기획·SNS 세션 업무 통합

상태: **사용자 확정.** 사용자 요청은 현재 GPT를 총괄 사업기획자·PM으로 두고, 근본적인 사용자 경험 개선과 일반 LLM보다 더 효용성 있는 가치 제공을 최상위 연구과제로 관리하는 것이다. 이어서 “구조 기획 회의, SNS 정보 수집 세션은 니가 통합해”라고 지시했다.

- `GLI 구조기획 회의`와 `GLI SNS 정보 수집 전략`의 향후 기획·결정 정리·미해결 과제 담당을 현재 GPT PM(S-PM)으로 통합한다. 별도 상주 기획 세션으로 새 논의를 분산하지 않는다.
- 구조기획, 출처·SNS 수집, 수요에 따른 조사와 결과 반환을 최상위 UX/사용자가 얻는 가치와 함께 관리한다. 기존 합의를 새로 미정으로 돌리거나, 기존 제안을 승인사항으로 바꾸지 않는다.
- 확인 가능한 마스터 기준, SNS 부분 복원본, 프로젝트 기획서와 Claude 결과화면 결정 기록의 연결을 PM 문서에 정리했다. 두 원본 채팅의 고유한 내용까지 모두 회수했다는 의미는 아니다.
- 과거 맥락 및 프로젝트/Library 파일 검색에서 두 세션의 전체 원문은 이번에도 확보하지 못했다. 국가별 상세 소스·수집주기·가중치 등은 미회수/미확정으로 남긴다. 해당 기록 회수 책임도 PM이 인수한다.
- 원 세션은 과거 기록 보존 대상으로 두며 채팅·원문·브랜치를 삭제하거나 자동 보관하지 않았다. Claude 독립 공동연구와 개발 실행 역할은 계속 분리한다.
- 문서: `docs/GLI_PM_SESSION_CONTROL.md` §0·§3·§6, `docs/GLI_SNS_DATA_STRATEGY.md` 관리 담당·§8. 새로운 중복 마스터 문서는 만들지 않는다.
- 이번 반영 범위는 문서다. 앱 코드, PR #3 병합, 배포, 수집 자동화, 유료 조사 착수는 포함하지 않는다.

## 2026-10-14 — 설계 철학 확정: 편리한 정보 전달, 사람의 정보 확보, 구매·재방문·참여

상태: **사용자 확정.** 근거는 같은 날 현재 대화의 연속된 사용자 지시다.

- 사용자는 목표를 학술 이론이나 새로운 방법론의 개발이 아니라 **최소한의 리소스로 최대한의 고객만족을 얻는 사업기획**으로 명확히 했다.
- “좋은 답변은 기존 LLM을 활용하고, GLI는 그 답을 따라 고객이 물건을 찾아보고 이해하는 일을 편하게 만들어준다”를 GLI의 설계 철학으로 확정했다.
- AI가 우선 맡을 일은 기존 LLM이 잘 찾아주는 정보를 어떻게 더 편하게 고객에게 전달할 것인가이다. 검색·추론 능력을 자체적으로 재발명하거나 AI가 모든 정보 확보를 끝내도록 요구하지 않는다.
- 다른 곳에서 얻기 어려운 정보는 **사람이 직접 정보를 모으는 프로세스**로 해결한다. 이는 GLI의 또 다른 핵심 강점이며, 사람의 역할을 AI 실패 후 검증이나 최종 법률실사로만 축소하지 않는다.
- 정보 전달의 편리함에서 **구매 욕구·재방문 욕구·참여 욕구**를 어떻게 일으킬 것인가가 사업기획의 핵심이다. 구체적인 기능·과금·보상 정책은 별도 결정한다.
- 실제 불편 사례는 검은 바탕/흰 글자, 이탤릭체, 이미지 없는 긴 텍스트, 핵심과 참고사항을 구분하기 어려운 서술이다. 내용이 유용하다면 의미와 출처·단위·가정을 유지하면서 표현을 개선하는 것 자체를 첫 번째 제품 가치로 인정한다.
- 기존 합의와의 관계: 일반 LLM 수준을 최소선으로 삼는 원칙은 유지하되, 과거의 “GLI 차별성은 검색 이후부터”라는 제한적 해석은 수정한다. 첫 화면부터 편리한 전달로 차별화할 수 있다. 검증은 유지하지만 모든 제품 가치를 검증으로만 설명하지 않는다.
- 비용 기준: 기존 LLM·화면·카드·상세·운영 기반을 우선 활용한다. 새로운 모델 체계·검색엔진·방법론은 자체 목적이 아니다. 개발비와 지속적인 호출·수집·사람 작업비를 함께 본다.
- 반영: 마스터 §0/§0.1, §3, §7, §15. 기존 코드·상품 가격·신규 조사 비용·Web2/Web3 단계·사실성·승인 경계는 이번 기록으로 변경하지 않는다. Claude 시안도 참고안 상태를 유지한다.

## 2026-10-14 — Instant 결과를 1차 검색 UX의 구체적 기준으로 채택

상태: **사용자 승인 기준 사례.** 사용자는 첨부한 GPT Instant 결과에 대단히 만족하며, 이 결과를 GLI UI로 표현하면 1차 고객 경험을 확보할 수 있을 것으로 판단한다고 밝혔다.

- 기준 자료: 현재 대화 첨부 `screencapture-chatgpt-c-6aced208-2c90-83ec-9d42-89c472785d31-2026-10-14-09_53_07.png`. 자료는 대화 첨부에 있으며 이번 커밋으로 이미지가 Git에 업로드된 것은 아니다.
- 1차 목표: 이 사례의 답변 품질·적절한 길이·읽는 흐름·시각적 정보 구성을 GLI의 기존 UI에서 편하게 경험하도록 한다. 일반 LLM보다 더 복잡한 분석이나 독자적 방법론을 먼저 만드는 것이 아니다.
- 기준 화면의 흐름: 질문에 대한 결론과 예산 등의 핵심 요약 → 이미지·가격·짧은 설명이 있는 매물/검토 후보 → 가정에 따른 월세 수입 표시 → 지역 지도 → 중개업체 정보 → 판단 요약과 투자목적 선택/다음 질문. 단지·지역 참고 이미지, 개별 매물, 조사 필요 후보를 구분하는 설명을 보존한다.
- 적용 범위: 한 예시의 모든 구역을 모든 질문에 강제하지 않는다. 답변에 없는 숫자·후보·사진의 실물 연관성·업체 확인을 채우지 않는다. 표시된 투자 수치·법률 설명·매물 유효성이 사용자 만족만으로 검증된 것은 아니다.
- 만족의 핵심은 원래 유용한 답을 유지하면서 쉽게 보고, 이해하고, 다음 질문으로 이어가는 경험이다. 이를 불필요하게 재요약하거나 가상의 상세 매물 3열 화면·홍보용 인포그래픽으로 대체하지 않는다.
- 기존 철학과의 정합성: 기존 LLM의 좋은 정보를 활용하고 최소자원으로 편하게 전달한다는 마스터 §0.1의 구체적 기준 사례다. “일반 LLM도 제공하니 차별성부터 더 연구해야 한다”는 이유로 1차 UX 개선을 미루지 않는다. 사람의 정보 확보와 이후 구매·재방문·참여 기획은 유지하되, 첫 경험 적용의 선행 완성조건으로 만들지 않는다.
- 개발팀 전달 제안: 승인된 사례를 기준으로 기존 GLI 응답 영역·후보 카드·상세·출처 표시 중 재사용할 것을 정하고, 내용의 의미·단위·가정·불확실성을 유지한 표시안을 만든다. 구체적인 변경 범위는 별도 확인하며 이번 기록만으로 앱 코드를 수정하거나 배포하지 않는다.
- 미확정: Gemini에서 GPT로의 공급자 교체, Astra의 고정 역할 변경, 웹 화면 구성요소의 API 제공 여부, 특정 레이아웃 전면 채택, 인터랙션 구현방식과 성능 수치. 캡처에 보이는 선택/계산 UI의 실제 동작은 이번에 시험하지 않았다.
- 검증 범위: 사용자가 즉시 결과를 받았다고 보고했고 이에 만족한 사실을 기록한다. 동일한 속도를 GLI가 이미 달성했다거나 일반 고객 모두의 만족을 보장한다는 의미는 아니다. 1차 사용자 승인 기준과 실제 구현·고객 검증을 구분한다.
