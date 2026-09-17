CREATE TABLE `operational_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `dedupe_key` text NOT NULL,
  `origin` text NOT NULL,
  `category` text NOT NULL,
  `severity` text NOT NULL,
  `status` text NOT NULL,
  `title` text NOT NULL,
  `detail` text NOT NULL,
  `resource_type` text,
  `resource_id` text,
  `occurrence_count` integer DEFAULT 1 NOT NULL,
  `first_seen_at` integer NOT NULL,
  `last_seen_at` integer NOT NULL,
  `acknowledged_by_user_id` text,
  `acknowledged_at` integer,
  `resolved_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operational_alerts_dedupe_uidx`
ON `operational_alerts` (`dedupe_key`);
--> statement-breakpoint
CREATE INDEX `operational_alerts_status_severity_idx`
ON `operational_alerts` (`status`, `severity`, `last_seen_at`);
--> statement-breakpoint

CREATE TABLE `retry_jobs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `dedupe_key` text NOT NULL,
  `job_type` text NOT NULL,
  `payload_json` text NOT NULL,
  `status` text NOT NULL,
  `attempt_count` integer DEFAULT 0 NOT NULL,
  `max_attempts` integer DEFAULT 3 NOT NULL,
  `available_at` integer NOT NULL,
  `claimed_at` integer,
  `completed_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retry_jobs_dedupe_uidx`
ON `retry_jobs` (`dedupe_key`);
--> statement-breakpoint
CREATE INDEX `retry_jobs_status_available_idx`
ON `retry_jobs` (`status`, `available_at`);
