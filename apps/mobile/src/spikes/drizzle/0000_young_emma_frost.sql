CREATE TABLE `expense_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`base_amount_minor` integer NOT NULL,
	`local_state` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`op_id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL
);
