CREATE TABLE `member_notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `kind` text NOT NULL,
  `title` text NOT NULL,
  `body` text NOT NULL,
  `href` text NOT NULL,
  `resource_type` text NOT NULL,
  `resource_id` text NOT NULL,
  `event_key` text NOT NULL,
  `read_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_notifications_event_uidx` ON `member_notifications` (`event_key`);
--> statement-breakpoint
CREATE INDEX `member_notifications_user_unread_idx` ON `member_notifications` (`user_id`,`read_at`,`created_at`,`id`);
