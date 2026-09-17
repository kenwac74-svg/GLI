ALTER TABLE `listings` ADD `fingerprint` text;
--> statement-breakpoint
CREATE INDEX `listings_fingerprint_idx` ON `listings` (`country`,`fingerprint`);
