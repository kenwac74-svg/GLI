CREATE TABLE `listing_review_decisions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `listing_id` integer NOT NULL,
  `trust_score_run_id` integer,
  `action` text NOT NULL,
  `reviewer_user_id` text NOT NULL,
  `checklist_json` text NOT NULL,
  `note` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`trust_score_run_id`) REFERENCES `trust_score_runs`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listing_review_decisions_listing_created_idx` ON `listing_review_decisions` (`listing_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `listing_review_decisions_reviewer_created_idx` ON `listing_review_decisions` (`reviewer_user_id`,`created_at`);
