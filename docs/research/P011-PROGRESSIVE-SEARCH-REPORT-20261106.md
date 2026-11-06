# P-011 실행 전 점검: BLOCKED

2026-11-06 KST. 사용자 지시로 착수했다. **유료 요청 0/4회, 전송 실패 0회, 미실행 4건, 추가 모델 비용 $0.** 답변 품질·속도 개선은 아직 평가할 수 없다.

## 기준과 범위

- [P-011 실행 인계서](https://github.com/kenwac74-svg/GLI/blob/b86a7ecd53b7dd68a645a12bd1a0e8e38c7ad9aa/docs/research/HANDOFF-P011-PROGRESSIVE-SEARCH-TRIAL-20261030.md) §3.3: 비용·호출 통제를 확인할 수 없으면 무료 준비까지만 진행한다.
- 코드 기준 `fe009ffbb358c6195a05a320dd1adc4d87c0ec6d`, 별도 브랜치 `research/p011-progressive-search-20261106`. 운영 서비스·앱 코드·UI·DB·키·배포·main/B안 및 기존 로컬 수정은 변경하지 않았다.
- [시험용 최종 system 지침](p011-progressive-search-20261106/system.txt)은 인계서 본문에서 날짜만 `2026-11-06`으로 바꿨다. 기존 system/요청 원문은 [P-010 사례 1](p010-five-cases-20261030/api-case-1.json)에 보존했다.
- P-010 요청 원문과 system 및 질문/이력 외 설정이 일치한다. 동일 SOL, OpenRouter/Exa fast, 검색 한도 1/1, 자료량 5/5/2,000자, low reasoning, 2,200 출력 토큰, 스트림·사용량, fallback 없음. 기존 실호출기는 90초 제한과 단일 요청을 유지하며 이번에 호출하지 않았다.

## 무료 사전 확인

1. 기존 OpenRouter 키 상태 조회 HTTP 200, 설정된 키 한도에 잔여가 있었다. SOL 엔드포인트 목록 조회 HTTP 200으로 후보 경로가 존재했다. 계정 상세·금액·키는 기록하지 않았다. 목록 조회는 실호출 라우팅/검색 한도의 보증이 아니다.
2. [공식 Web Search 문서](https://openrouter.ai/docs/guides/features/server-tools/web-search)는 `max_uses`를 요청당 검색 제한으로, `web_search_requests`를 모델이 만든 검색 쿼리 수로 설명한다. [Server Tools 문서](https://openrouter.ai/docs/guides/features/server-tools#tool-call-limits)는 `max_tool_calls`를 도구 실행 단계 제한으로 설명한다.
3. P-010의 5개 요청은 모두 `max_uses=1`, `max_tool_calls=1`, Exa였다. 원본 사용량의 검색/도구 요청/실행 계수는 각각 **4/4/5/1/1**로 같았다. 반면 `usage.cost - upstream_inference_cost`는 다섯 건 모두 **$0.007**이었다. 이는 Exa fast의 문서상 단가와 일치하지만, 계수 불일치의 원인이나 실제 한도 준수, 이번 P-011의 최대 비용은 확인하지 못했다.
4. [Chat Completions 요청 문서](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)는 비용·단계 종료 조건을 안내하지만, 발동 시 대기 중인 도구 실행과 최종 응답 단계가 남을 수 있고 이 설정은 기존 `max_tool_calls`를 덮어쓴다. 설정 변경을 지침만 변경하는 비교에 넣지 않았고, 이 조건을 절대 과금 상한으로 해석하지 않았다.

## 시험 상태

| 장면 | 상태 |
|---|---|
| T1 호치민 매입·임대수입 | 요청 구성 확인, 전송 안 함 |
| T2 실제 후속 제안 선택 | T1 실응답이 없어 미실행, 질문을 대신 만들지 않음 |
| T3 연 6% 설명 | 요청 구성 확인, 전송 안 함 |
| T4 범위 밖 질문 | 요청 구성 확인, 전송 안 함 |

`node scripts/p011-preflight.mjs --date 2026-11-06`은 네트워크 없는 dry-run이다. `--live`는 차단 상태를 반환하고 키를 읽거나 POST하지 않는다. T2 이력·출처·문장 보존은 모의 데이터로만 확인했다. 실제 제안·선택·답변·시간·비용 측정은 없다. P-010/P-011 오프라인 테스트 12개, 인계서 프롬프트 대조, 관련 정적 검사, 명세 및 diff 검사를 적용했다.

**재개 조건:** 해당 OpenRouter 요청에서 왜 1회 제한과 실행 계수가 다른지, 어떤 통제가 적용되는지 공급자 근거로 확인한다. 현재 경로의 통제가 확인되지 않으면, 설정을 바꾼 별도의 한도 검증안을 먼저 승인받는다. 이번 시험을 통과시키기 위한 추가 유료 탐색·재시도는 하지 않았다.
