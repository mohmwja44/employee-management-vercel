CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ibsId` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`isAdmin` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_ibsId_unique` UNIQUE(`ibsId`)
);
--> statement-breakpoint
CREATE TABLE `shiftArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`weekStartDate` timestamp NOT NULL,
	`saturday` varchar(50) NOT NULL DEFAULT 'OFF',
	`sunday` varchar(50) NOT NULL DEFAULT 'OFF',
	`monday` varchar(50) NOT NULL DEFAULT 'OFF',
	`tuesday` varchar(50) NOT NULL DEFAULT 'OFF',
	`wednesday` varchar(50) NOT NULL DEFAULT 'OFF',
	`thursday` varchar(50) NOT NULL DEFAULT 'OFF',
	`friday` varchar(50) NOT NULL DEFAULT 'OFF',
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` varchar(255),
	CONSTRAINT `shiftArchives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`saturday` varchar(50) NOT NULL DEFAULT 'OFF',
	`sunday` varchar(50) NOT NULL DEFAULT 'OFF',
	`monday` varchar(50) NOT NULL DEFAULT 'OFF',
	`tuesday` varchar(50) NOT NULL DEFAULT 'OFF',
	`wednesday` varchar(50) NOT NULL DEFAULT 'OFF',
	`thursday` varchar(50) NOT NULL DEFAULT 'OFF',
	`friday` varchar(50) NOT NULL DEFAULT 'OFF',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(20) NOT NULL DEFAULT 'user';