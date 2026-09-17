CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`request_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resource_type`,`resource_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`listing_id` integer,
	`request_text` text NOT NULL,
	`preferred_at` integer,
	`assignee_user_id` text,
	`status` text DEFAULT 'RECEIVED' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `consultations_user_status_idx` ON `consultations` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`listing_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_user_listing_uidx` ON `favorites` (`user_id`,`listing_id`);--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`discovered_count` integer DEFAULT 0 NOT NULL,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ingestion_runs_source_started_idx` ON `ingestion_runs` (`source_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `listing_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`source_id` integer NOT NULL,
	`external_key` text NOT NULL,
	`source_url` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_sources_external_uidx` ON `listing_sources` (`source_id`,`external_key`);--> statement-breakpoint
CREATE INDEX `listing_sources_listing_idx` ON `listing_sources` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listing_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`raw_snapshot_id` integer,
	`normalized_hash` text NOT NULL,
	`normalized_payload_json` text NOT NULL,
	`changed_fields_json` text DEFAULT '[]' NOT NULL,
	`observed_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`raw_snapshot_id`) REFERENCES `raw_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_versions_hash_uidx` ON `listing_versions` (`listing_id`,`normalized_hash`);--> statement-breakpoint
CREATE INDEX `listing_versions_observed_idx` ON `listing_versions` (`listing_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`district` text,
	`transaction_type` text NOT NULL,
	`property_type` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`price_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`area_sqm_x100` integer,
	`bedrooms` integer,
	`bathrooms` integer,
	`image_url` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`is_gli_direct` integer DEFAULT false NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_public_id_uidx` ON `listings` (`public_id`);--> statement-breakpoint
CREATE INDEX `listings_search_idx` ON `listings` (`country`,`city`,`transaction_type`,`status`,`price_minor`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_customer_id` text,
	`provider_subscription_id` text,
	`status` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `memberships_user_status_idx` ON `memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `raw_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`ingestion_run_id` integer,
	`source_url` text NOT NULL,
	`source_url_hash` text NOT NULL,
	`content_hash` text NOT NULL,
	`object_key` text NOT NULL,
	`http_status` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingestion_run_id`) REFERENCES `ingestion_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `raw_snapshots_lookup_idx` ON `raw_snapshots` (`source_id`,`source_url_hash`,`fetched_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `raw_snapshots_object_key_uidx` ON `raw_snapshots` (`object_key`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_internal` text NOT NULL,
	`country` text NOT NULL,
	`base_url` text NOT NULL,
	`policy_url` text,
	`approval_status` text DEFAULT 'PENDING' NOT NULL,
	`permitted_fields_json` text DEFAULT '[]' NOT NULL,
	`approved_at` integer,
	`approval_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_slug_uidx` ON `sources` (`slug`);--> statement-breakpoint
CREATE TABLE `trust_score_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`score` integer NOT NULL,
	`status` text NOT NULL,
	`rule_version` text NOT NULL,
	`input_manifest_hash` text NOT NULL,
	`dimensions_json` text NOT NULL,
	`explanation` text NOT NULL,
	`calculated_at` integer NOT NULL,
	`approved_by_user_id` text,
	`approved_at` integer,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trust_score_runs_manifest_uidx` ON `trust_score_runs` (`listing_id`,`rule_version`,`input_manifest_hash`);--> statement-breakpoint
CREATE INDEX `trust_score_runs_latest_idx` ON `trust_score_runs` (`listing_id`,`calculated_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uidx` ON `users` (`email`);