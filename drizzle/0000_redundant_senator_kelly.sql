CREATE TABLE IF NOT EXISTS `files` (
	`key` text PRIMARY KEY NOT NULL,
	`data` blob NOT NULL,
	`updatedAT` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`ID` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updatedAT` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `todos` (
	`ID` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updatedAT` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
