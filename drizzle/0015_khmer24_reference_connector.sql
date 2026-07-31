UPDATE `sources`
SET
  `approval_status` = 'AUTHORIZATION_REQUIRED',
  `permitted_fields_json` = '["externalId","country","city","district","transaction","propertyType","price","currency","areaSqm","bedrooms","bathrooms","imageUrl","title","summary","sourceUrl","observedAt"]',
  `connector_kind` = 'KHMER24_REFERENCE_SEARCH_V1',
  `connector_config_json` = '{"categoryUrl":"https://www.khmer24.com/km/c-property-housing-rentals"}',
  `allowed_hosts_json` = '["www.khmer24.com"]',
  `max_records_per_run` = 40,
  `policy_url` = 'https://www.khmer24.com/robots.txt',
  `approval_reference` = 'Reference-search connector prepared. Written AI-use scope and source-side collector allowlisting remain required before activation.',
  `policy_reviewed_at` = 1785513600000,
  `approved_at` = NULL,
  `approved_by_user_id` = NULL,
  `approval_expires_at` = NULL,
  `updated_at` = 1785513600000
WHERE `slug` = 'khmer24-cambodia';
