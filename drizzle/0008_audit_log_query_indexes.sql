CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_created_idx` ON `audit_logs` (`action`,`created_at`,`id`);

