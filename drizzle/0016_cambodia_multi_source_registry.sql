INSERT OR IGNORE INTO `sources` (
  `slug`, `name_internal`, `country`, `base_url`, `policy_url`,
  `approval_status`, `permitted_fields_json`, `connector_kind`,
  `connector_config_json`, `allowed_hosts_json`, `max_records_per_run`,
  `approval_reference`, `approved_by_user_id`, `policy_reviewed_at`,
  `approved_at`, `approval_expires_at`, `created_at`, `updated_at`
) VALUES
  (
    'cam-realty-cambodia',
    'CAM Realty Cambodia public property API',
    'Cambodia',
    'https://camrealtyservice.com/',
    'https://camrealtyservice.com/robots.txt',
    'AUTHORIZATION_REQUIRED',
    '["externalId","country","city","district","transaction","propertyType","price","currency","areaSqm","bedrooms","bathrooms","imageUrl","title","summary","sourceUrl","observedAt"]',
    'WORDPRESS_PROPERTY_REFERENCE_V1',
    '{"apiUrl":"https://camrealtyservice.com/wp-json/wp/v2/property?per_page=40&orderby=modified&order=desc&_embed=wp:featuredmedia"}',
    '["camrealtyservice.com"]',
    30,
    'Public WordPress property API verified. Written reuse and AI-reference scope required before activation.',
    NULL,
    1785513600000,
    NULL,
    NULL,
    1785513600000,
    1785513600000
  ),
  (
    'cambodia-property-asia',
    'Cambodia Property Asia public property API',
    'Cambodia',
    'https://www.cambodiaproperty.asia/',
    'https://www.cambodiaproperty.asia/robots.txt',
    'AUTHORIZATION_REQUIRED',
    '["externalId","country","city","district","transaction","propertyType","price","currency","areaSqm","bedrooms","bathrooms","imageUrl","title","summary","sourceUrl","observedAt"]',
    'WORDPRESS_PROPERTY_REFERENCE_V1',
    '{"apiUrl":"https://www.cambodiaproperty.asia/wp-json/wp/v2/property?per_page=100&orderby=modified&order=desc&_embed=wp:featuredmedia","requiredLinkPathPrefix":"/en/"}',
    '["www.cambodiaproperty.asia"]',
    30,
    'Public WordPress property API verified. English references only; written reuse and AI-reference scope required before activation.',
    NULL,
    1785513600000,
    NULL,
    NULL,
    1785513600000,
    1785513600000
  ),
  (
    'ips-cambodia',
    'IPS Cambodia property portal',
    'Cambodia',
    'https://ips-cambodia.com/',
    'https://ips-cambodia.com/terms-of-service',
    'AUTHORIZATION_REQUIRED',
    '[]',
    'DISABLED',
    '{}',
    '["ips-cambodia.com"]',
    30,
    'Terms prohibit automated collection and searchable property databases without specific authorization.',
    NULL,
    1785513600000,
    NULL,
    NULL,
    1785513600000,
    1785513600000
  );

UPDATE `sources`
SET
  `approval_status` = 'AUTHORIZATION_REQUIRED',
  `approval_reference` = 'Terms prohibit automated access and searchable property databases without specific authorization.',
  `policy_reviewed_at` = 1785513600000,
  `updated_at` = 1785513600000
WHERE `slug` = 'realestate-kh';
