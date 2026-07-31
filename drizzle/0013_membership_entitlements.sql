ALTER TABLE `consultations` ADD `priority` text DEFAULT 'STANDARD' NOT NULL;
--> statement-breakpoint
CREATE INDEX `consultations_priority_status_created_idx` ON `consultations` (`priority`,`status`,`created_at`);
--> statement-breakpoint
CREATE TABLE `membership_usage_counters` (
  `user_id` text NOT NULL,
  `period_key` text NOT NULL,
  `metric` text NOT NULL,
  `used_count` integer DEFAULT 0 NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_usage_user_period_metric_uidx` ON `membership_usage_counters` (`user_id`,`period_key`,`metric`);
