CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingCode` varchar(32) NOT NULL,
	`customerName` varchar(120) NOT NULL,
	`whatsapp` varchar(32) NOT NULL,
	`reservationDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`resources` text NOT NULL,
	`extras` text,
	`amountCents` int NOT NULL,
	`paymentStatus` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`status` enum('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservations_bookingCode_unique` UNIQUE(`bookingCode`)
);
