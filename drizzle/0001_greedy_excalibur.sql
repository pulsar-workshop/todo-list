CREATE TABLE `folders` (
	`ID` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updatedAT` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
