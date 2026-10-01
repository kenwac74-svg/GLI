# GLI 로우 데이터 확보 수단 검토

날짜: 2026-10-01. 기획 조사이며 구현/수집/결제 승인이 아니다.
범위: 캄보디아·베트남·필리핀 매매/임대 원자료. 미니 웹 대화의
1차 조사와 Codex의 핵심 공식 문서 검수를 구분한다.
전 세계 모든 서비스의 완전한 목록이나 각 계정의 접근 보장은 아니다.

## 결론

SNS 단일 크롤러 대신 공개 웹, 권한 있는 메시지 수신, 파일/화면 추출,
제휴 피드를 혼합한다. 캡처도 후보로 유지하되 접근 거부를 해결하는
우회 수단으로 취급하지 않는다. 수신 API는 외부 그룹 전체 조회 API와 다르다.
자료가 매물인지 보조자료인지는 수집 방식이 아니라 내용과 근거로 판단한다.

## SNS 수단

| 채널 | 가능한 경로 | 과거 자료/갱신 한계 | 확인 수준 |
|---|---|---|---|
| Telegram | 공개 채널 발견, 참여한 봇의 신규 수신, 권한 있는 사용자 Client API, Desktop 내보내기, 접근 가능한 화면 OCR | getHistory는 사용자 전용. 봇으로 임의 그룹 과거 글을 조회할 수 있다는 뜻이 아님. 일반 삭제 동기화 보장 없음 | getHistory 및 AI 이용 약관 공식 확인. 내보내기/화면 실험 미실시 |
| WhatsApp | Business 수신, 협력자 전달/내보내기, 접근 가능한 화면 OCR, 채널에서 후보 발견 | 외부 그룹 전체 과거 조회를 가정하지 않음. Groups API의 현재 자격·범위는 별도 확인 | 미니 후보. Meta 상세 문서는 429로 독립 확인 불충분 |
| Facebook | 공개 페이지/그룹에서 발견, 허용된 웹 접근·화면 OCR, Page/Messenger 제출, 작성자 자료 제공 | 공개 열람과 자동 수집 허가는 별개. 외부 그룹 전체를 읽는 공식 경로 확인 안 됨 | Meta 일반 수집 정책 확인. Groups API 현재 상세 검증 미완료 |
| LINE | 협력 OA의 신규 메시지 webhook, 초대된 일반 그룹의 수신, 권한 있는 내보내기/화면 OCR | 일반 그룹과 OpenChat을 구분. webhook은 과거 대화 덤프가 아님 | OA/일반 그룹 webhook 공식 확인. OpenChat 자동 수집 미확인 |
| Zalo | OA OpenAPI/webhook, 협력자 제출, 권한 있는 파일/화면 추출, GMF 기능 검토 | OA 연계와 임의 외부 그룹 수집은 다름. GMF 자격·과거 조회·가격 미확인 | OA 연계 공식 확인. 나머지 미니 후보로만 유지 |

Telegram 주의: 공식 콘텐츠 약관의 AI 제한은 학습뿐 아니라 AI 배포 등도
포함한다. 관련 사용자들의 명시적·계속적 동의에 따른 제한적 예외 조건이
있지만 중개사 한 명의 동의로 모든 게시물을 사용할 수 있다고 가정하지 않는다.

## SNS 밖의 원자료 경로

| 경로 | 원자료 | 자동화/갱신 | 비용·주의 |
|---|---|---|---|
| 중개사/개발사/포털 웹 | HTML, JSON-LD, 상세 페이지, 공개 다운로드 | 허용된 주기 조회, 변경분 처리 | 접근·재사용 조건과 구조 변경 비용 확인 |
| 공식/공개 API | 매물 JSON, 가격표, 프로젝트 필드 | API 갱신/이벤트 | 인증, 호출량, 재게시 권한 확인 |
| RSS/sitemap | 신규 URL, 기사/게시 시각 | 신규 후보 발견 | sitemap은 매물 상태나 삭제 보장이 아님 |
| 검색/알림 | URL, 검색 요약, 저장 검색 메일 | 발견 후 원문 확인 | 검색 결과는 전체 DB나 재사용 라이선스가 아님 |
| 이메일/뉴스레터 | 본문, 가격표, 첨부 PDF/사진 | 전용 수신함에서 신규 처리 | 발신자 허락, 개인정보, 중복 광고 |
| PDF/문서/시트 | 분양표, 호실 재고, 임대 제안서, CSV/XLSX/XML | 업로드/공유 링크/정기 전달 | 총액과 계약금·할부금 구분, 버전 추적 |
| 사진/화면 | 게시물, 가격표, 평면도, 브로셔 | 캡처 후 OCR, 불명확 항목만 멀티모달 AI | 표시된 화면만 확보. 원문 링크·시각 필요 |
| 영상/오디오 | 설명, 자막, 투어의 화면 정보 | 권한 있는 파일의 ASR/OCR | 임의 YouTube 영상 자막 다운로드 API를 가정하지 않음 |
| 은행/경매/공공 공고 | 매각 대상, 공매 PDF, 재고 목록 | 공고/파일 변경 감시 | 권리·점유·유효기간은 별도 검수 |
| 파트너 피드/CRM | CSV/XML/API, 변경 webhook | 계약한 범위에서 동기화 | 유료 또는 협력 비용. 완벽한 삭제 동기화 가정 금지 |
| 사용자/중개사 제출 | 링크, 메시지, 이미지 묶음, 폼 | 제출 후 자동 정리 | 입력 방식만으로 진실성 보장 안 됨 |
| 기타 커뮤니티 | Instagram, X, Reddit, Discord, 지역 게시판 | 공개 API/파트너/허용된 화면 경로 검토 | 다음 조사 후보. 이번 공식 기능 검수 범위 밖 |

## 1차 답변에서 채택하지 않은 주장

- Bing Search API는 2025-08-11 종료. 신규 연결안에서 제외한다.
- Google Custom Search JSON API는 신규 고객 이용 불가, 기존 고객도
  2027-01-01까지 이전 안내. 신규 GLI 기본 검색 API로 추천하지 않는다.
- YouTube captions.download는 해당 영상 편집 권한이 필요하다.
- Telegram 위험 0, CRM 완벽 동기화, 폼 무결성 보장 같은 단정은 제외한다.
- WhatsApp 그룹 인원/자격 수치와 Zalo 지역·법인 제한은 독립 검증 전 기록하지 않는다.
- 웹에서 당겨온 자료를 무조건 시장 보조자료로 분류하지 않는다.
- 보유기간 30~45일 등은 승인된 정책이 아니므로 적용하지 않는다.

## 제안 구조: 승인 전

발견 -> 권한/접근 범위 확인 -> 원문·링크·관측시각 저장 ->
URL/게시물 ID/내용 해시로 신규·변경 판별 -> 구조화 파서/OCR ->
불확실한 부분만 AI 추출 -> 매매/임대·통화·총가격/보증금·지역·호실 태그 ->
번역/관측 환율 계산 -> 동일 호실 검수 -> 후보 DB -> 재확인/거래완료 처리.

- 같은 프로젝트·면적만으로 동일 호실을 합치지 않는다.
- 수정/삭제 이벤트가 없는 채널은 주기 재확인과 유효성 상태를 둔다.
- 광고 월세는 실제 임대계약이나 순수익 근거와 분리한다.
- 모든 원자료를 매번 LLM에 재전송하지 않는다. AI 선택기도 애매한 판정에만 쓴다.
- 화면 OCR은 캡처 누락·펼침·페이지 순서·갱신 탐지 비용까지 측정한다.

## 검증 순서 제안

1. 국가별 접근 가능한 실제 매물 웹과 내려받는 가격표 표본 확보.
2. SNS/화면/문서 표본의 공통 추출 품질을 비교. 수동 캡처도 포함.
3. 협력 가능한 채널에서 수신 webhook 또는 정기 파일 전달 실험.
4. 신규/수정/거래완료, 중복 호실, 가격 단위 정확도를 측정.
5. 유효한 매물 1건당 비용·노동시간·누락률로 자동화 우선순위 결정.

아직 수집/추출을 실행하지 않았으므로 확보 건수, 실제 비용과 완성도를
보고할 수 없다. 사용자 도움이 필요한 다음 단계는 접근 가능한 표본과
협력자/작성자의 이용 허락 범위 확인이다. 별도 승인 후 실시한다.

## 공식 근거

- Telegram history: https://core.telegram.org/method/messages.getHistory
- Telegram Bot FAQ/API: https://core.telegram.org/bots/faq / https://core.telegram.org/bots/api
- Telegram AI 약관: https://telegram.org/tos/content-licensing
- LINE 수신: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- LINE 일반 그룹: https://developers.line.biz/en/docs/messaging-api/group-chats/
- Zalo OA: https://oa.zalo.me/home/function/extension
- Meta 수집 정책: https://about.fb.com/news/2021/04/how-we-combat-scraping/
- WhatsApp 상세 확인 실패(429): https://developers.facebook.com/docs/whatsapp/cloud-api/groups
- Bing 종료: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement
- Google 검색 API: https://developers.google.com/custom-search/v1/overview
- YouTube 자막 권한: https://developers.google.com/youtube/v3/docs/captions/download
- 미니 조사 대화: https://gemini.google.com/app/4eef3ca59310ee40
