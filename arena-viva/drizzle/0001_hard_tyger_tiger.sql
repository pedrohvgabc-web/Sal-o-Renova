CREATE TABLE "released_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"releaseDate" varchar(10) NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"professionalId" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
