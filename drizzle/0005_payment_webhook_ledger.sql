CREATE UNIQUE INDEX `cash_checkout_provider_session_uidx`
ON `cash_checkout_sessions` (`provider`, `provider_session_id`);
--> statement-breakpoint

CREATE TABLE `payment_webhook_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `provider` text NOT NULL,
  `provider_event_id` text NOT NULL,
  `event_type` text NOT NULL,
  `payload_hash` text NOT NULL,
  `status` text NOT NULL,
  `checkout_id` text,
  `error_summary` text,
  `received_at` integer NOT NULL,
  `processed_at` integer,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`checkout_id`) REFERENCES `cash_checkout_sessions`(`id`)
    ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_webhook_provider_event_uidx`
ON `payment_webhook_events` (`provider`, `provider_event_id`);
--> statement-breakpoint
CREATE INDEX `payment_webhook_status_received_idx`
ON `payment_webhook_events` (`status`, `received_at`);
