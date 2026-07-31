ALTER TABLE `sources` ADD `connector_kind` text DEFAULT 'DISABLED' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sources` ADD `connector_config_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sources` ADD `allowed_hosts_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sources` ADD `max_records_per_run` integer DEFAULT 100 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sources` ADD `approval_reference` text;
--> statement-breakpoint
ALTER TABLE `sources` ADD `approved_by_user_id` text;
--> statement-breakpoint
ALTER TABLE `sources` ADD `policy_reviewed_at` integer;
--> statement-breakpoint

UPDATE `sources`
SET
  `connector_kind` = 'FIXTURE',
  `connector_config_json` = '{"mode":"bundled"}',
  `allowed_hosts_json` = '["fixtures.glibiz.local"]',
  `max_records_per_run` = 100,
  `approval_reference` = 'Internal anonymized fixture approval',
  `policy_reviewed_at` = 1785474000000
WHERE `slug` = 'approved-fixture';
--> statement-breakpoint

INSERT OR IGNORE INTO `sources` (
  `slug`, `name_internal`, `country`, `base_url`, `policy_url`,
  `approval_status`, `permitted_fields_json`, `connector_kind`,
  `connector_config_json`, `allowed_hosts_json`, `max_records_per_run`,
  `approval_reference`, `approved_by_user_id`, `policy_reviewed_at`,
  `approved_at`, `approval_expires_at`, `created_at`, `updated_at`
) VALUES
  (
    'khmer24-cambodia',
    'Khmer24 Cambodia property portal',
    'Cambodia',
    'https://www.khmer24.com/',
    'https://www.khmer24.com/privacy-policy',
    'PENDING',
    '[]',
    'DISABLED',
    '{}',
    '["www.khmer24.com"]',
    100,
    'Written aggregation permission or partner feed required',
    NULL,
    1785474000000,
    NULL,
    NULL,
    1785474000000,
    1785474000000
  ),
  (
    'realestate-kh',
    'Realestate.com.kh property portal',
    'Cambodia',
    'https://www.realestate.com.kh/',
    'https://www.realestate.com.kh/legal/',
    'AUTHORIZATION_REQUIRED',
    '[]',
    'DISABLED',
    '{}',
    '["www.realestate.com.kh"]',
    100,
    'Licensed API or partner feed authorization required',
    NULL,
    1785474000000,
    NULL,
    NULL,
    1785474000000,
    1785474000000
  ),
  (
    'fazwaz-kh',
    'FazWaz Cambodia property portal',
    'Cambodia',
    'https://www.fazwaz-kh.com/',
    NULL,
    'PENDING',
    '[]',
    'DISABLED',
    '{}',
    '["www.fazwaz-kh.com"]',
    100,
    'Terms review and partner feed authorization required',
    NULL,
    1785474000000,
    NULL,
    NULL,
    1785474000000,
    1785474000000
  );
