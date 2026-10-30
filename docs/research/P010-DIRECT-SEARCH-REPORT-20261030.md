# P-010 단일 모델 직접검색 실행 보고

## 고객이 받게 될 답변부터

[실제 답변 원문](P010-DIRECT-SEARCH-ANSWER-20261030.md)을 먼저 읽는다. 아래 인용은 그 답변의 첫 문장이다. GLI가 따로 검증한 매물이라는 뜻은 아니다.

> 현재 검색된 매물 중에서는 빈떤(Bình Tân)의 ‘Ehome 3’를 먼저 검토할 만합니다.

모델은 Ehome 3 두 광고(26억 동/27억 8,500만 동)와 Akari City 두 광고(43억 동/47억 동)를 제시했다. 마지막 광고의 월 임대료 주장 1,500만 동을 사용해 비용 차감 전 연 수익률 약 3.83%를 계산했다. 매입 가능 여부·외국인 취득·계약 원본은 확인하지 못했다고 구분했다. 이 가격과 설명은 API가 전달한 광고 발췌와 모델 출력이며, 독립적인 원문/등기/거래 확인은 하지 않았다.

## 수신과 경계

- 사용자 요청을 받아 2026-10-30 17:04:25 KST 실제 시험을 시작했고 응답을 받았다. PM의 제안 문서 기록만으로 착수했다고 간주하지 않았다.
- 지시 원본: [GitHub P-010](https://github.com/kenwac74-svg/GLI/blob/a67f1f77f7f99a88950a7600b5ab56a79b1cd9b3/docs/GLI_DEVELOPMENT_PROPOSALS.md), 기준 커밋 `a67f1f77f7f99a88950a7600b5ab56a79b1cd9b3`.
- 로컬 코드 기준: `ba477090d42fdbb8e29e31e60864d59499d80018`, 기존 `agent/gli-ai-orchestration-demo`에서 별도 `research/p010-direct-search-20261030` 브랜치 생성.
- 이번 범위는 독립 스크립트/시험/연구 기록뿐이다. 앱 검색 경로, UI, DB, 환경설정, 키, 배포는 변경하지 않았다. 기존 미커밋 로컬 수정은 보존하고 이번 커밋에서 제외한다.
- B안 브랜치 `design/gli-search-ui-b-20261016`의 확인 시점 SHA는 `c5eebeb0a27933708bf392fb5dedd664ed5c9b41`; 해당 브랜치를 수정하지 않는다.
- P-009 관리자 질의 기록 기능은 구현하지 않았다. 새 키/계정/결제/수집 파이프라인도 만들지 않았다.

## 요청 구성과 무료 사전 확인

- 기존 `.env.local`의 OpenRouter 키를 서버 측 로컬 프로세스에서만 사용했다. 무료 인증 조회는 HTTP 200, 만료 아님/설정된 한도 내 사용 가능으로 확인됐다. 키 및 계정 상세는 기록하지 않았다.
- 운영 설정은 `openai/gpt-6-astra`였다. 이를 바꾸지 않고 공개 모델 카탈로그와 엔드포인트 조회에서 확인한 `openai/gpt-6.1-sol`을 시험에만 지정했다. Pro/Batch/Latest/Astra나 다중 모델 검토는 사용하지 않았다. 더 빠르다는 실측 비교는 없다.
- 모델 엔드포인트에는 OpenAI/Azure의 native web-search 지원이 표시됐다. 이번에는 검색 횟수와 발췌 크기 제한을 명시할 수 있는 OpenRouter 관리형 Exa fast를 선택했다. 별도 Exa 키는 필요하지 않았다. 실제 엔진 이름은 응답에 없으므로 요청 엔진과 관측 엔진을 동일시하지 않는다.
- 공식 `openrouter:web_search` 도구만 사용했다. 구형 web plugin/`:online`을 병용하지 않았다. 계정 보안·비용 정책을 완화하거나 우회하지 않았다.
- 입력: “베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘.”
- 검색 요청 한도: `max_tool_calls=1`, `max_uses=1`, 결과 최대 5개, 발췌 각 2,000자. 출력 `max_tokens=2200`, low reasoning, 클라이언트 전체 90초 제한. 공급자 fallback 비활성화.
- 실사용자에게 보일 형식/카드 개수/내부 DB 조건/GLI 수집 선행조건은 넣지 않았다. 한국어, 현재 검색, 출처 보존, 사실·광고·추정·미확인 구분만 짧게 지시했다.
- 클라이언트의 유료 POST는 정확히 1회였다. 자동 재시도·다른 모델·플러그인으로의 우회 호출은 없다. 한 POST 안에서의 공급자 내부 처리 횟수는 별도 관측 대상이다.

## 실제 측정

| 항목 | 실제 관측 |
|---|---|
| 요청/응답 모델 | `openai/gpt-6.1-sol` / `openai/gpt-6.1-sol` |
| 응답 공급자 | `OpenAI` |
| HTTP/종료 | 200 / `stop`, SSE 완료 마커 확인 |
| 첫 본문 수신 | 18,084ms |
| 본문 완료 | 43,674ms |
| 입력/출력/총 토큰 | 5,091 / 1,819 / 6,910 |
| 응답의 비용 | `usage.cost = 0.032792` USD |
| 응답의 upstream 추론 비용 | `0.025792000000000002` USD |
| 검색 증거 | `usage.server_tool_use_details.web_search_requests = 5`, 구조화된 URL citation 5개 |
| 요청 엔진 / 실제 엔진 증거 | Exa fast / 응답에 명시되지 않음 |
| 후속 무료 generation 조회 | HTTP 404, `Generation ... not found` |

첫 본문 시간은 로컬 스크립트가 처음 비어 있지 않은 content를 받아 콘솔로 출력하기 시작한 시점이다. 실제 고객 웹 UI의 첫 표시 시간은 측정하지 않았다. 전체 시간은 모델 HTTP/SSE 완료까지이며 후속 무료 회계 조회 시간은 제외한다. 비용은 응답에 표시된 값으로, 별도 청구서와 대조한 확정 정산 금액이 아니다.

## 막힌 사항과 불일치

1. **검색 횟수 제한의 신뢰성을 확인하지 못했다.** 요청은 1회였지만 응답 사용량은 `web_search_requests=5`, `tool_calls_requested=5`, `tool_calls_executed=5`였다. 검색 쿼리/도구 실행 이벤트는 스트림에 노출되지 않았다. 공식 문서의 필드 의미와 동일하다면 요청 한도를 넘은 것이며, 결과 개수 집계인지 다른 beta 구현 차이인지는 미확인이다. 추가 유료 호출로 조사하지 않았다. 비용 차이 $0.007만으로 검색 1회였다고 역추정하지 않는다. 재시험 전 도구 한도 계약 또는 공급자 로그 확인이 필요하다.
2. **사용량 필드가 문서와 달랐다.** 문서는 `server_tool_use`를 설명하지만 실제는 `server_tool_use_details`였다. 최초 증거 JSON의 파생 필드 `search_requests:null`은 검색 미실행을 뜻하지 않는다. 원시 `usage`에 5가 보존되어 있다. 이후 파서를 두 형태 모두 읽고 한도 불일치를 표시하도록 수정하고 무료 테스트를 추가했다. 증거 파일은 소급 수정하지 않았다.
3. **독립 회계 조회는 404였다.** 원인(반영 지연/계정·API 범위/기타)은 확정하지 않았다. 응답 모델·공급자·비용은 SSE 원시 응답 기준이며 generation 조회로 재확인하지 못했다. 자동 재조회도 하지 않았다.
4. **원화 예산을 검증하지 못했다.** 현행 환율을 확보하지 못해 원화 금액 대신 필요 환산 기준을 역산했다. “1억 5천만 원 이내” 후보인지 판정하지 못했고 임대수익이 있는 비싼 비교 후보도 섞였다. 기존 환율 API나 내부 필터를 붙이지 않은 독립 시험의 한계다.
5. **속도 개선은 입증되지 않았다.** 첫 본문 18초/완료 44초는 즉각적인 상담 경험이 아니다. 기존 GLI와 같은 시점·같은 검색 자료로 비교한 A/B가 아니므로 더 빠르거나 정확하다고 결론 내리지 않는다.
6. **광고와 사실의 분리는 개선 가능성이 있지만 추천 적합성은 별개다.** 발췌와 가격·면적을 연결하고 2022년 오래된 결과를 최종 후보에서 제외한 점은 관측됐다. 다만 Ehome의 임대 증빙이 없고 외국인 매입·매물 중복·현존 여부를 확인하지 못했다. 후속 질문도 명의/총예산 두 조건을 함께 물었다. 승인된 상담 UX를 충족했다고 볼 수 없다.
7. 최초 무료 카탈로그 접근은 실행 환경의 DNS/네트워크 제한으로 실패했다. 네트워크 권한을 확보한 후 무료 조회는 성공했다. 이를 OpenRouter 인증/모델 장애로 분류하지 않는다.

## 산출물과 검증

- `scripts/p010-direct-search.mjs`: 기본 실행은 네트워크 없는 dry-run. 실제 호출은 명시적 `--live`; 증거 파일이 있으면 중복 실행 거부. 앱에서 import하지 않는다. `--live`를 다시 실행하거나 증거 파일을 지워 재시험하려면 별도 승인이 필요하다.
- `tests/p010-direct-search.test.mjs`: 무료 모의 테스트 6개. 단일 POST, 요청 제한, UTF-8/SSE 분할, 출처/사용량, reasoning 제외, 키 마스킹, HTTP 오류/타임아웃/중도 종료, 관측 필드 차이와 한도 불일치를 검증한다. 모의 통과는 서버 측 한도 준수 증거가 아니다.
- `p010-direct-search-20261030.json`: 실제 요청 본문과 SSE 투영 기록, 답변, 출처 발췌, 사용량, 오류. 키/인증 헤더/숨은 reasoning은 저장하지 않았다. 약 476KB의 원시 증거이므로 보통은 이 보고서와 답변 원문을 먼저 읽는다.
- `P010-DIRECT-SEARCH-ANSWER-20261030.md`: 실제 출력 그대로, GLI 검증 결과와 구분한다.
- `docs/implementation/HISTORY.md`: P-010 실행 이력. 제품/API/데이터 계약 변경 없음. 관련 GS 기능 명세·registry는 변경하지 않는다.
- `CURRENT_STATE.md`: 독립 시험과 운영 미변경 상태를 짧게 기록한다.
- 전용 테스트, 전용 정적 검사, `spec:check`, diff/비밀정보 검사를 수행한다. 앱 코드가 없으므로 앱 전체 빌드·브라우저 QA·배포를 하지 않는다.
- 검증 결과: 전용 테스트 6/6 통과, 전용 ESLint 오류 없음, `spec:check` 통과(33 features/52 routes/4 unchanged visual baselines). 전체 워킹트리 diff 검사는 기존 미커밋 `lib/explore-session.ts`의 CRLF 관련 공백 경고로 실패했다. 해당 비대상 파일은 고치지 않고 이번 변경의 스테이징 diff를 별도로 검사한다.

## 다음 판단

현 단계의 결론은 **단일 Sol + OpenRouter 직접검색 경로는 응답을 생성할 수 있으나, 비용 제어·예산 적합성·속도가 검증된 대안은 아니다**이다. 운영 교체를 제안하지 않는다. 다음 유료 시험 전 검색 한도 불일치와 회계 조회 문제를 먼저 해소하고, 승인받은 동일 검색 자료 기반 비교에서 고객 효용을 평가해야 한다. 모델/엔진 변경, A/B 반복 시험, FX 결합, 운영 적용은 모두 이번 범위 밖이다.

## 참고한 공식 자료

- [Server tools: 한도·사용량·beta 범위](https://openrouter.ai/docs/guides/features/server-tools)
- [Web search: 엔진·파라미터·비용](https://openrouter.ai/docs/guides/features/server-tools/web-search)
- [Streaming: SSE와 오류](https://openrouter.ai/docs/api_reference/streaming)
- [Provider routing: fallback 제어](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Generation metadata 조회](https://openrouter.ai/docs/api/api-reference/generations/get-request-&-usage-metadata-for-a-generation)

문서는 2026-10-30 확인한 계약 설명이다. 이번 실제 응답과의 차이는 위에 별도 기록했다.
