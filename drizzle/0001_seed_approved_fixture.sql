INSERT OR IGNORE INTO sources (
  slug, name_internal, country, base_url, policy_url, approval_status,
  permitted_fields_json, approved_at, approval_expires_at, created_at, updated_at
) VALUES (
  'approved-fixture',
  'GLI approved Cambodia fixture',
  'Cambodia',
  'https://fixtures.glibiz.local/',
  NULL,
  'APPROVED',
  '["externalId","title","summary","price","currency","areaSqm","bedrooms","bathrooms","imageUrl","observedAt"]',
  1785387600000,
  NULL,
  1785387600000,
  1785387600000
);
--> statement-breakpoint

INSERT OR IGNORE INTO listings (
  public_id, country, city, district, transaction_type, property_type, title,
  summary, price_minor, currency, area_sqm_x100, bedrooms, bathrooms, image_url,
  status, is_gli_direct, first_seen_at, last_seen_at, created_at, updated_at
) VALUES
  (
    'GLI-KH-101', 'Cambodia', 'Phnom Penh', 'Boeng Reang', 'sale', 'condo',
    'Central Phnom Penh studio residence',
    '프놈펜 중심 생활권의 소형 스튜디오 매매 후보입니다. 예산 진입성이 좋지만 실제 임대료와 준공·소유권 자료 확인이 필요합니다.',
    4888800, 'USD', 3200, 0, 1,
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 0, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  ),
  (
    'GLI-KH-102', 'Cambodia', 'Phnom Penh', 'Boeng Reang', 'sale', 'condo',
    'Central Phnom Penh 1BR residence',
    '도심 생활권의 1베드룸 매매 후보입니다. 장기 임대와 계절 체류를 함께 검토할 수 있지만 운영 규정과 순수익 검증이 필요합니다.',
    7536000, 'USD', 4700, 1, 1,
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 0, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  ),
  (
    'GLI-KH-103', 'Cambodia', 'Phnom Penh', 'BKK3', 'sale', 'condo',
    'BKK3 future-completion 1BR condo',
    'BKK3의 향후 준공 예정 1베드룸입니다. 입지는 매력적이지만 공정률, 대금 일정과 개발사 이력을 먼저 검증해야 합니다.',
    7537500, 'USD', 4700, 1, 1,
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 0, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  ),
  (
    'GLI-KH-104', 'Cambodia', 'Phnom Penh', 'BKK1', 'rent', 'condo',
    'BKK1 high-floor 1BR condo',
    'BKK1 중심 생활권의 고층 1베드룸 임대 후보입니다. 3개월 체류에는 편리하지만 최소 계약 기간과 단기 전대 허용 여부를 확인해야 합니다.',
    70000, 'USD', 5600, 1, 1,
    'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 0, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  ),
  (
    'GLI-KH-105', 'Cambodia', 'Phnom Penh', 'Meanchey', 'rent', 'condo',
    'Urban Village high-floor 1BR condo',
    '복합단지 내 고층 1베드룸입니다. 생활 편의와 커뮤니티 시설을 갖춘 장기 거주 후보로 GLI 현지 확인 프로그램을 준비 중입니다.',
    50000, 'USD', 5400, 1, 1,
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 1, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  ),
  (
    'GLI-KH-004', 'Cambodia', 'Phnom Penh', 'Chrouy Changva', 'rent', 'condo',
    'High-floor 2BR with Mekong River view',
    '메콩강 전망의 2베드룸 임대 후보입니다. 월 $500 예산과 장기 체류 조건에 잘 맞으며 관리비와 가구 포함 범위를 확인 중입니다.',
    50000, 'USD', 7400, 2, 2,
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 1, 1784858400000, 1784858400000, 1784858400000, 1784858400000
  ),
  (
    'GLI-KH-005', 'Cambodia', 'Phnom Penh', 'Boeng Trabek', 'rent', 'condo',
    '15th-floor 1BR condo in Boeng Trabek',
    'Boeng Trabek의 15층 1베드룸으로 예산 효율과 중심 생활권 접근성이 좋습니다. GLI 현지 확인 후보로 관리비를 검토 중입니다.',
    38000, 'USD', 5000, 1, 1,
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 1, 1784858400000, 1784858400000, 1784858400000, 1784858400000
  ),
  (
    'GLI-KH-106', 'Cambodia', 'Phnom Penh', 'Chak Angrae Leu', 'sale', 'condo',
    'Riverside compact condo residence',
    '강변 접근성이 있는 소형 콘도 매매 후보입니다. 휴가용 거점과 임대 운영을 함께 검토할 수 있지만 관리 계약과 운영 수수료 확인이 필요합니다.',
    8601300, 'USD', 3800, 1, 1,
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=84',
    'ACTIVE', 0, 1784869200000, 1784869200000, 1784869200000, 1784869200000
  );
--> statement-breakpoint

INSERT OR IGNORE INTO listing_sources (
  listing_id, source_id, external_key, source_url, first_seen_at, last_seen_at
)
SELECT
  l.id,
  s.id,
  lower(l.public_id),
  'https://fixtures.glibiz.local/listings/' || lower(l.public_id),
  l.first_seen_at,
  l.last_seen_at
FROM listings l
JOIN sources s ON s.slug = 'approved-fixture'
WHERE l.public_id LIKE 'GLI-KH-%';
--> statement-breakpoint

INSERT OR IGNORE INTO listing_versions (
  listing_id, raw_snapshot_id, normalized_hash, normalized_payload_json,
  changed_fields_json, observed_at
)
SELECT
  l.id,
  NULL,
  'approved-fixture-v1-' || l.public_id,
  json_object(
    'strengths',
      CASE l.public_id
        WHEN 'GLI-KH-101' THEN json('["도심 생활권","소형 임대 수요 후보","초기 예산 진입성"]')
        WHEN 'GLI-KH-102' THEN json('["1인·커플 임대 수요","중심지 접근성","47㎡ 실용 평면"]')
        WHEN 'GLI-KH-103' THEN json('["BKK3 입지","신축 설계","준공 후 임대 후보"]')
        WHEN 'GLI-KH-104' THEN json('["BKK1 생활 편의","고층 전망","가구 포함 후보"]')
        WHEN 'GLI-KH-105' THEN json('["복합단지 편의시설","월 $500","GLI 현지 확인 후보"]')
        WHEN 'GLI-KH-004' THEN json('["메콩강 전망","2베드룸","월 $500"]')
        WHEN 'GLI-KH-005' THEN json('["월 $380","50㎡","도심 접근성"]')
        ELSE json('["강변 접근성","소형 관리","휴가용 거점 후보"]')
      END,
    'checks',
      CASE l.public_id
        WHEN 'GLI-KH-101' THEN json('["외국인 소유 가능 층","실제 임대료","관리비와 공실률"]')
        WHEN 'GLI-KH-102' THEN json('["소유권 자료","예상 임대료","운영 규정"]')
        WHEN 'GLI-KH-103' THEN json('["공정률","개발 인허가","에스크로와 환불 조항"]')
        WHEN 'GLI-KH-104' THEN json('["최소 계약 기간","단기 전대 조항","공과금"]')
        WHEN 'GLI-KH-105' THEN json('["관리비","가구 목록","현장 호실 확인"]')
        WHEN 'GLI-KH-004' THEN json('["관리비","가구 인벤토리","임대인 신원"]')
        WHEN 'GLI-KH-005' THEN json('["관리비","인터넷 포함 여부","호실 상태"]')
        ELSE json('["소유권 자료","관리 계약","단기 임대 허용"]')
      END
  ),
  '[]',
  l.updated_at
FROM listings l
WHERE l.public_id LIKE 'GLI-KH-%';
--> statement-breakpoint

INSERT OR IGNORE INTO trust_score_runs (
  listing_id, score, status, rule_version, input_manifest_hash, dimensions_json,
  explanation, calculated_at, approved_by_user_id, approved_at
)
SELECT
  l.id,
  CASE l.public_id
    WHEN 'GLI-KH-101' THEN 72
    WHEN 'GLI-KH-102' THEN 74
    WHEN 'GLI-KH-103' THEN 61
    WHEN 'GLI-KH-104' THEN 82
    WHEN 'GLI-KH-105' THEN 80
    WHEN 'GLI-KH-004' THEN 81
    WHEN 'GLI-KH-005' THEN 83
    ELSE 69
  END,
  CASE l.public_id
    WHEN 'GLI-KH-103' THEN 'NEEDS_ATTENTION'
    WHEN 'GLI-KH-106' THEN 'PRELIMINARY'
    ELSE 'REVIEWING'
  END,
  'trust-v0.1-fixture',
  'approved-fixture-manifest-' || l.public_id,
  '{"mode":"approved-fixture","humanApproved":false}',
  '승인된 데모 자료의 완전성, 최신성 및 일관성에 대한 예비 평가입니다.',
  l.updated_at,
  NULL,
  NULL
FROM listings l
WHERE l.public_id LIKE 'GLI-KH-%';
