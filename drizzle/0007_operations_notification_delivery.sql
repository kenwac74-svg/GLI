ALTER TABLE `operational_alerts`
ADD `notified_occurrence_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `operational_alerts`
ADD `last_notified_at` integer;
--> statement-breakpoint
CREATE INDEX `operational_alerts_notification_idx`
ON `operational_alerts` (
  `status`,
  `notified_occurrence_count`,
  `occurrence_count`
);
