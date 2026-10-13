// GS-033: fixed demo copy is localized without a paid provider or invented source.
// Match both ID and original title so changed/real records never inherit fixture copy.
const DEMO_TITLES: Record<string, readonly [string, string]> = {
  "GLI-PT-PH-507": ["Mantawi Residences Tower 1", "만타위 레지던스 1차"],
  "GLI-KH-101": ["Central Phnom Penh studio residence", "프놈펜 중심부 스튜디오 레지던스"],
  "GLI-KH-102": ["Central Phnom Penh 1BR residence", "프놈펜 중심부 1베드룸 레지던스"],
  "GLI-KH-103": ["BKK3 future-completion 1BR condo", "BKK3 준공 예정 1베드룸 콘도"],
  "GLI-KH-104": ["BKK1 high-floor 1BR condo", "BKK1 고층 1베드룸 콘도"],
  "GLI-KH-105": ["Urban Village high-floor 1BR condo", "Urban Village 고층 1베드룸 콘도"],
  "GLI-KH-004": ["High-floor 2BR with Mekong River view", "메콩강 전망 고층 2베드룸"],
  "GLI-KH-005": ["15th-floor 1BR condo in Boeng Trabek", "Boeng Trabek 15층 1베드룸 콘도"],
  "GLI-KH-106": ["Riverside compact condo residence", "강변 소형 콘도 레지던스"],
};

export function localizeDemoAsset<T extends { id: string; title: string; sourceUrl?: string }>(asset: T): T {
  const title = DEMO_TITLES[asset.id.replace(/^fixture:/, "")];
  return !asset.sourceUrl && title && asset.title === title[0] ? { ...asset, title: title[1] } : asset;
}

export function englishDemoAsset<T extends { id: string; title: string; sourceUrl?: string }>(asset: T): T {
  const title = DEMO_TITLES[asset.id.replace(/^fixture:/, "")];
  return !asset.sourceUrl && title && asset.title === title[1] ? { ...asset, title: title[0] } : asset;
}
