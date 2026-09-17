export type NewsCategory = "공지사항" | "보도자료" | "인사이트" | "이벤트";

export type NewsItem = {
  id: string;
  category: NewsCategory;
  date: string;
  dateTime: string;
  image: string;
  title: string;
  summary: string;
  lead?: string;
  body: readonly string[];
  sourceUrl?: string;
};

// DEMO CONTENT ONLY:
// GLI-SPEC: GS-023; docs/implementation/ADMIN.md defines the production CMS handoff.
// The public demo keeps these records in source control so every news route is stable.
// TODO(live/admin): replace this array with admin-managed news storage supporting
// create, edit, delete, publish/unpublish, category assignment, scheduling, and updates.
export const newsItems: readonly NewsItem[] = [
  {
    id: "gli-news-iqi-vietnam-mou-2025-12-12",
    category: "보도자료",
    date: "2025. 12. 12.",
    dateTime: "2025-12-12",
    image: "/partner-assets/golden-crown/facade.jpg",
    title: "GLI Vietnam, 글로벌 프롭테크 'Juwai IQI' 산하 'IQI Vietnam'과 전략적 MOU 체결",
    summary:
      "이상호 공동대표 등이 '더 글로벌 시티' 현장을 실사하고 하이엔드 RWA 자산 파이프라인을 정밀 검증했습니다.",
    body: [
      "웹3 기반 실물자산 플랫폼 기업 GLI Vietnam이 아시아 최대 글로벌 부동산 기술 그룹 'Juwai IQI'의 베트남 법인 IQI Vietnam과 전략적 업무협약을 체결하고, 베트남 내 우량 부동산 자산 확보를 위한 협력에 나섰습니다.",
      "IQI 베트남은 홍콩과 말레이시아에 본사를 둔 프롭테크 그룹 Juwai IQI의 베트남 거점입니다. 그룹은 20개국 이상에 진출해 5만 명 이상의 에이전트 네트워크를 보유하고 있으며, IQI 베트남은 현지 럭셔리 개발사 Masterise Homes의 상위 파트너입니다.",
      "협약식 직후 GLI 서포트팀은 IQI 베트남 관계자와 함께 호치민의 '더 글로벌 시티'와 Masterise Homes 세일즈 갤러리를 방문해 입지적 가치와 시공 품질, 법적 안정성을 검토했습니다.",
      "이상호 GLI 베트남 대표는 서류 검토를 넘어 현장 실사로 자산의 내재 가치를 검증하는 절차를 확립했다며, 이번 파트너십이 신뢰할 수 있는 생태계 확장의 이정표가 될 것이라고 밝혔습니다.",
    ],
  },
  {
    id: "47935be4-bc05-4fe0-9cdd-2f1d8b1cb19c",
    category: "보도자료",
    date: "2025. 12. 12.",
    dateTime: "2025-12-12",
    image:
      "https://cliimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=5&simg=20251112173648019599aeda6993417521136223.jpg&nmt=7",
    title:
      "RWA 디지털자산화 플랫폼 GLI, 투자 컨설팅 전문기업 'DealFlow'와 전략적 MOU 맺어",
    summary:
      "DealFlow의 동남아 M&A 전문성과 GLI의 RWA 기술을 결합해 베트남 자산 소싱과 파일럿 프로젝트를 공동 추진합니다.",
    lead: "동남아 자산 발굴 네트워크와 디지털 자산화 역량을 연결하는 전략적 협력입니다.",
    body: [
      "GLI Gateway Holdings는 베트남 투자 컨설팅 기업 DealFlow와 동남아시아 시장 개척 및 실물자산 프로젝트 공동 개발을 위한 업무협약을 체결했습니다.",
      "양사는 DealFlow가 보유한 현지 기업 네트워크와 GLI의 자산 검토·디지털화 역량을 결합해 베트남 리조트와 부동산을 중심으로 자산 발굴 체계를 구축할 계획입니다.",
      "이번 협력은 실제 사업성이 있는 후보를 발굴하고 검토하는 단계부터 파일럿 프로젝트 설계까지 이어지는 현지 실행 기반을 만드는 데 초점을 둡니다.",
    ],
    sourceUrl: "https://m.thepowernews.co.kr/view.php?ud=2025111217360863399aeda69934_7",
  },
  {
    id: "08ac41f7-15ae-42ab-a275-6afbfb70b8da",
    category: "보도자료",
    date: "2025. 12. 11.",
    dateTime: "2025-12-11",
    image:
      "https://cgeimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=3&simg=20251211163743054829aeda6993417521136223.jpg&nmt=30",
    title: "GLI Gateway, 태국 레저 대표 브랜드 Seafood Club과 MOU 체결",
    summary:
      "태국의 프리미엄 레저 콘텐츠와 GLI의 글로벌 플랫폼을 연결하는 전략적 업무협약을 체결했습니다.",
    lead: "GLI의 Leisure 영역을 태국 현지 호스피탈리티 자산으로 확장합니다.",
    body: [
      "GLI Gateway Holdings는 태국 호스피탈리티 기업 Seafoodclub Co. Ltd.와 전략적 업무협약을 체결했습니다.",
      "Seafoodclub은 촌부리 방센 지역에서 복합 외식 문화 공간과 풀빌라 리조트를 운영하며, 현지 관광객과 젊은 이용자에게 차별화된 공간 경험을 제공하고 있습니다.",
      "양사는 태국의 경쟁력 있는 레저 콘텐츠를 GLI 플랫폼과 연결하고, 이용자가 현지 상품과 서비스를 발견하고 이용할 수 있는 협력 모델을 단계적으로 구체화할 예정입니다.",
    ],
    sourceUrl: "https://m.beyondpost.co.kr/view.php?ud=2025121116372338289aeda69934_30",
  },
  {
    id: "gli-news-deemples-mou-2025-12-03",
    category: "보도자료",
    date: "2025. 12. 03.",
    dateTime: "2025-12-03",
    image: "/partner-assets/mantawi-residences.jpg",
    title: "GLI, 말레이시아 골프 플랫폼 'Deemples'와 레저·멤버십 협력 MOU",
    summary:
      "쿠알라룸푸르 골프 앤 컨트리 클럽에서 체결해, GLI 회원이 동남아 주요 국가의 골프 서비스를 이용할 수 있게 됩니다.",
    body: [
      "GLI가 말레이시아 Kuala Lumpur에서 동남아시아 골프 커뮤니티·부킹 플랫폼 Deemples와 레저 및 멤버십 협력을 위한 전략적 업무협약을 체결했습니다. 체결식은 Kuala Lumpur Golf & Country Club에서 진행됐습니다.",
      "Deemples는 말레이시아에 본사를 둔 동남아 골프 서비스 기업으로, 골프장 예약과 동반자 매칭을 함께 제공하는 플랫폼입니다. 협약에 따라 GLI 회원은 말레이시아와 동남아 주요 국가의 골프장 부킹과 프로모션, 커뮤니티 매칭을 이용할 수 있게 됩니다.",
      "GLI는 이번 MOU를 시작으로 말레이시아 법인을 거점 삼아 동남아 레저 시장을 넓혀가고, 회원에게 실질적인 가치를 제공하는 라이프스타일 플랫폼으로 나아갈 계획입니다.",
    ],
  },
  {
    id: "ec77ba82-7abb-44cc-9328-486e1bac695d",
    category: "보도자료",
    date: "2025. 11. 26.",
    dateTime: "2025-11-26",
    image:
      "https://kinhdoanhvathitruong.net/app/webroot/uploads/files/2025/t11-2025/GLI_Vietnam.jpg",
    title: "GLI 베트남과 ERA 베트남, Web3 기반 실물 자산 생태계 구축 협력",
    summary:
      "GLI의 기술 인프라와 ERA 베트남의 부동산 네트워크를 결합해 새로운 자산 연결 모델을 추진합니다.",
    lead: "기술과 현지 시장 네트워크를 결합해 베트남 부동산 프로젝트의 실행 기반을 넓힙니다.",
    body: [
      "GLI 베트남은 ERA 베트남과 실물자산 생태계 구축을 위한 전략적 협력 양해각서를 체결했습니다.",
      "ERA 베트남은 현지 개발사와 전문 브로커 네트워크를 기반으로 부동산 공급과 시장 정보를 연결하고 있습니다. GLI는 이 네트워크를 자산 탐색과 검토 기술에 접목할 계획입니다.",
      "협력 범위에는 부동산 자산의 디지털화와 글로벌 유통 가능성 검토, 현지 시장에서의 테스트, 실제 이용 사례 발굴 등이 포함됩니다.",
    ],
    sourceUrl:
      "https://kinhdoanhvathitruong.net/gli-vietnam-va-era-vietnam-ky-ket-bien-ban-ghi-nho-hop-tac-xay-dung-he-sinh-thai-tai-san-thuc-web3.html",
  },
  {
    id: "ef83059e-5748-4e2c-bf6b-ec8a791e8d68",
    category: "보도자료",
    date: "2025. 11. 20.",
    dateTime: "2025-11-20",
    image:
      "https://cgeimage.commutil.kr/phpwas/restmb_allidxmake.php?pp=002&idx=3&simg=20251120125706044839aeda6993417521136223.jpg&nmt=23",
    title:
      "싱가포르 GLI, 필리핀 RLC와 PropTech MOU 체결… 동남아 자산 연결 생태계 확장",
    summary:
      "필리핀 RLC 레지던스의 검증된 주거 자산과 GLI의 글로벌 탐색 플랫폼을 연결하는 협력입니다.",
    lead: "필리핀 주요 개발사의 자산 공급망을 GLI의 글로벌 회원 경험과 연결합니다.",
    body: [
      "GLI Gateway Holdings는 필리핀 부동산 개발사 RLC 레지던스와 실물 자산 연결성 강화를 위한 업무협약을 체결했습니다.",
      "RLC 레지던스는 로빈슨스 랜드의 주거 부문으로, 필리핀 주요 도시에서 다양한 프리미엄 주거 프로젝트를 전개하고 있습니다.",
      "양사는 RLC의 자산 정보와 GLI의 탐색·분석 기능을 연계해 글로벌 이용자에게 필리핀 투자 후보를 소개하고, 향후 디지털 기반 협력 모델을 구체화할 계획입니다.",
    ],
    sourceUrl: "https://m.thebigdata.co.kr/view.php?ud=2025112012564559979aeda69934_23",
  },
  {
    id: "0547d99f-b44b-4303-add7-6a095c943292",
    category: "보도자료",
    date: "2025. 11. 06.",
    dateTime: "2025-11-06",
    image: "https://baodoanhnhanonline.net/app/webroot/uploads/files/2025/t11-2025/DealFlow.jpg",
    title: "Nền tảng số hóa tài sản thực GLI ký kết MOU chiến lược với DealFlow",
    summary:
      "GLI와 DealFlow가 베트남 리조트·부동산 분야의 프리미엄 자산 발굴과 RWA 파일럿 협력을 추진합니다.",
    lead: "베트남 현지 독자를 대상으로 소개된 GLI와 DealFlow의 전략적 협력 소식입니다.",
    body: [
      "GLI Gateway Holdings와 DealFlow는 동남아 시장 확대와 실물자산 프로젝트 공동 개발을 위한 전략적 양해각서를 체결했습니다.",
      "이번 협력은 DealFlow의 동남아 M&A 경험과 기업 네트워크를 활용해 베트남의 프리미엄 자산 공급망을 구축하는 것을 목표로 합니다.",
      "양사는 리조트와 부동산 분야에서 우선 적용 가능한 후보를 검토하고, 현지 사업 여건에 맞는 파일럿 모델을 단계적으로 추진할 예정입니다.",
    ],
    sourceUrl:
      "https://baodoanhnhanonline.net/nen-tang-so-hoa-tai-san-thuc-rwa-gli-ky-ket-bien-ban-ghi-nho-chien-luoc-mou-voi-cong-ty-tu-van-dau-tu-dealflow.html",
  },
  {
    id: "gli-news-global-expansion-2025-10-15",
    category: "보도자료",
    date: "2025. 10. 15.",
    dateTime: "2025-10-15",
    image: "/partner-assets/golden-crown/pavilion.jpg",
    title: "싱가포르 기반 RWA 디지털자산 플랫폼 'GLI', 글로벌 확장 추진",
    summary:
      "동남아 실물 자산을 디지털화하는 프로젝트를 동북아·유럽으로 넓혀가며, 베트남 법인 설립을 마쳤습니다.",
    body: [
      "GLI 싱가포르는 동남아시아 실물 자산을 디지털화하는 블록체인 프로젝트를 글로벌 사업화하고 있다고 밝혔습니다. GLI는 Game·Leisure·Investment를 핵심 축으로 하는 RWA 기반 프로젝트입니다.",
      "싱가포르를 거점으로 동남아시아와 동북아시아, 유럽으로 사업 범위를 넓혀가고 있습니다. 베트남 호치민에서는 오피스 계약과 법인 설립이 마무리되었으며, 해당 지역 리조트·부동산 자산을 디지털 자산화하는 파일럿 프로젝트가 진행되고 있습니다.",
      "플랫폼은 실물자산 가치와 연동된 GLIB, 운영과 거버넌스 참여를 위한 GLID, 게임·레저 분야에서 쓰이는 GLIL 세 가지 토큰 구조를 적용합니다. 금융·게임·관광 산업을 서로 잇는 것이 목표입니다.",
      "한국의 솔리드넥스는 GLI 싱가포르와 용역계약을 체결하고 플랫폼 기술 개발과 전략 기획을 맡고 있습니다. 1단계로 RWA 기반 플랫폼 인프라 구축이 진행 중이며, 이후 게임 서비스 개발로 확장됩니다.",
    ],
  },
  {
    id: "33d997d3-5984-4554-b3be-5fd9ddf41b00",
    category: "인사이트",
    date: "2025. 08. 28.",
    dateTime: "2025-08-28",
    image: "https://veyond.asia/wp-content/uploads/2020/09/01-11.jpg",
    title: "GLI: 베트남 부동산 및 고급 리조트 투자에 새로운 선두주자",
    summary:
      "GLI가 베트남 부동산과 고급 리조트 시장에 제시하는 투자 솔루션과 글로벌 자산 생태계의 확장 방향을 살펴봅니다.",
    lead: "베트남 주요 도시와 리조트 시장을 중심으로 GLI의 자산 연결 전략을 소개합니다.",
    body: [
      "베트남 부동산 시장은 도시 성장과 관광 수요를 함께 살펴볼 수 있는 동남아의 주요 투자 지역입니다. GLI는 현지 정보와 글로벌 이용자의 조건을 연결하는 탐색·검토 체계를 구축하고 있습니다.",
      "고가 자산은 접근 비용과 거래 유동성이 낮다는 특성이 있습니다. GLI는 이용자가 공개 정보, 비교 분석, 현지 검토 자료를 단계적으로 확인할 수 있도록 정보 접근 구조를 세분화합니다.",
      "호트람과 같은 리조트 지역에서는 운영 브랜드, 장기 임대 구조, 관광 수요, 권리관계가 함께 검토돼야 합니다. GLI는 후보 소개를 넘어 이러한 확인 항목과 다음 행동을 정리하는 것을 목표로 합니다.",
    ],
    sourceUrl:
      "https://www.facebook.com/groups/diendanbatdongsanso1/permalink/3276988625794375/?mibextid=wwXIfr&rdid=cRc7Xo6Qnuz2Cee4#",
  },
] as const;

export function findNewsItem(id: string): NewsItem | undefined {
  return newsItems.find((item) => item.id === id);
}
