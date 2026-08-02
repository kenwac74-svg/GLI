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
  sourceUrl: string;
};

// DEMO CONTENT ONLY:
// The public demo keeps these records in source control so every news route is stable.
// TODO(live/admin): replace this array with admin-managed news storage supporting
// create, edit, delete, publish/unpublish, category assignment, scheduling, and updates.
export const newsItems: readonly NewsItem[] = [
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
