CREATE TABLE `backup_verifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `environment` text NOT NULL,
  `storage_provider` text NOT NULL,
  `object_key` text NOT NULL,
  `manifest_sha256` text NOT NULL,
  `captured_at` integer NOT NULL,
  `restore_tested_at` integer,
  `restore_result` text NOT NULL,
  `record_counts_json` text NOT NULL,
  `verified_by_user_id` text NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`verified_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `backup_verifications_object_manifest_uidx` ON `backup_verifications` (`object_key`,`manifest_sha256`);--> statement-breakpoint
CREATE INDEX `backup_verifications_environment_created_idx` ON `backup_verifications` (`environment`,`created_at`);

