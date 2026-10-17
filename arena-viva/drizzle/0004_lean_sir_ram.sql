CREATE TABLE `blocked_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`reason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_slots_id` PRIMARY KEY(`id`)
);
