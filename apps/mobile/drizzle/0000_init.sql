CREATE TABLE `activity` (
	`trip_id` text NOT NULL,
	`seq` text NOT NULL,
	`type` text NOT NULL,
	`entity_id` text NOT NULL,
	`actor_member_id` text,
	`summary` text NOT NULL,
	`server_ts` text NOT NULL,
	PRIMARY KEY(`trip_id`, `seq`)
);
--> statement-breakpoint
CREATE TABLE `expense_payers` (
	`revision_id` text NOT NULL,
	`member_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`base_minor` integer NOT NULL,
	PRIMARY KEY(`revision_id`, `member_id`)
);
--> statement-breakpoint
CREATE TABLE `expense_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`trip_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`fx_rate` text NOT NULL,
	`is_refund` integer DEFAULT false NOT NULL,
	`engine_version` text NOT NULL,
	`fx_source` text NOT NULL,
	`fx_rate_date` text,
	`base_amount_minor` integer NOT NULL,
	`spent_at` text NOT NULL,
	`category_id` text,
	`description` text,
	`split_mode` text NOT NULL,
	`split_input` text NOT NULL,
	`paid_from_kitty` integer DEFAULT false NOT NULL,
	`is_committed` integer DEFAULT false NOT NULL,
	`op_id` text NOT NULL,
	`created_by_user` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expense_revisions_expense` ON `expense_revisions` (`expense_id`,`revision_no`);--> statement-breakpoint
CREATE TABLE `expense_shares` (
	`revision_id` text NOT NULL,
	`member_id` text NOT NULL,
	`share_minor` integer NOT NULL,
	`base_minor` integer NOT NULL,
	PRIMARY KEY(`revision_id`, `member_id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`current_revision_id` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_by_user` text NOT NULL,
	`created_by_member_id` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`local_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_trip` ON `expenses` (`trip_id`,`is_deleted`);--> statement-breakpoint
CREATE TABLE `kitty_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`member_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`recorded_by_user` text NOT NULL,
	`recorded_at` text NOT NULL,
	`voided_at` text,
	`voided_by_user` text,
	`op_id` text NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`local_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kitty_contributions_trip` ON `kitty_contributions` (`trip_id`);--> statement-breakpoint
CREATE TABLE `kitty_handovers` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`from_member_id` text NOT NULL,
	`to_member_id` text NOT NULL,
	`remaining_minor` integer NOT NULL,
	`recorded_by_user` text NOT NULL,
	`recorded_at` text NOT NULL,
	`voided_at` text,
	`voided_by_user` text,
	`op_id` text NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`local_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kitty_handovers_trip` ON `kitty_handovers` (`trip_id`);--> statement-breakpoint
CREATE TABLE `kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
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
	`next_attempt_at` text,
	`state` text DEFAULT 'queued' NOT NULL,
	`reject_code` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `outbox_trip` ON `outbox` (`trip_id`,`state`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`from_member_id` text NOT NULL,
	`to_member_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`method` text NOT NULL,
	`pending_confirmation` integer DEFAULT false NOT NULL,
	`confirmed_at` text,
	`note` text,
	`recorded_by_user` text NOT NULL,
	`recorded_at` text NOT NULL,
	`voided_at` text,
	`voided_by_user` text,
	`void_reason` text,
	`op_id` text NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`local_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settlements_trip` ON `settlements` (`trip_id`);--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`trip_id` text PRIMARY KEY NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`last_pulled_at` text
);
--> statement-breakpoint
CREATE TABLE `trip_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	`is_default` integer DEFAULT true NOT NULL,
	`deleted_at` text,
	`last_seq` text DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trip_categories_trip` ON `trip_categories` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`joined_from` text,
	`claimed_at` text,
	`claimed_via` text,
	`removed_at` text,
	`last_seq` text DEFAULT '0' NOT NULL,
	`created_by_user` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`local_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trip_members_trip` ON `trip_members` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`destination_name` text,
	`start_date` text,
	`end_date` text,
	`base_currency` text NOT NULL,
	`time_zone` text NOT NULL,
	`template` text NOT NULL,
	`status` text NOT NULL,
	`settle_mode` text DEFAULT 'simplified' NOT NULL,
	`kitty_enabled` integer DEFAULT false NOT NULL,
	`kitty_holder_member_id` text,
	`closed_at` text,
	`kitty_target_minor` integer,
	`kitty_low_bp` integer DEFAULT 2000 NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`last_seq` text DEFAULT '0' NOT NULL,
	`created_by_user` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`local_state` text DEFAULT 'pending' NOT NULL
);
