CREATE TABLE `consultation_events` (
  `id` text PRIMARY KEY NOT NULL,
  `consultation_id` text NOT NULL,
  `actor_user_id` text,
  `event_type` text NOT NULL,
  `body` text,
  `status` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `consultation_events_thread_idx` ON `consultation_events` (`consultation_id`,`created_at`,`id`);
