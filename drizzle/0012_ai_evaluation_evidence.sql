CREATE TABLE `ai_evaluation_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `suite_version` text NOT NULL,
  `requested_mode` text NOT NULL,
  `model` text,
  `status` text NOT NULL,
  `passed_count` integer NOT NULL,
  `total_count` integer NOT NULL,
  `cases_json` text NOT NULL,
  `started_at` integer NOT NULL,
  `completed_at` integer NOT NULL,
  `executed_by_user_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`executed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_evaluation_runs_status_completed_idx` ON `ai_evaluation_runs` (`requested_mode`,`status`,`completed_at`);
