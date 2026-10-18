CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "blocked_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"blockDate" varchar(10) NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"professionalId" varchar(32) DEFAULT 'amanda' NOT NULL,
	"reason" varchar(160),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerName" varchar(120) NOT NULL,
	"rating" integer NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"p256dh" varchar(255) NOT NULL,
	"auth" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingCode" varchar(32) NOT NULL,
	"customerName" varchar(120) NOT NULL,
	"whatsapp" varchar(32) NOT NULL,
	"reservationDate" varchar(10) NOT NULL,
	"reservedHours" text NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"endTime" varchar(5) NOT NULL,
	"resources" text NOT NULL,
	"professionalId" varchar(32) DEFAULT 'any' NOT NULL,
	"extras" text,
	"amountCents" integer NOT NULL,
	"paymentStatus" "payment_status" DEFAULT 'pending' NOT NULL,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_bookingCode_unique" UNIQUE("bookingCode")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
