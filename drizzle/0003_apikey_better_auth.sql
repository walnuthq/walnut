-- Combined migration: creates apikey table with better-auth structure
-- This replaces migrations 0003_swift_drax, 0004_better_auth_apikey, and 0005_make_tenantid_nullable
DROP TABLE IF EXISTS "walnut"."apikey" CASCADE;
--> statement-breakpoint
CREATE TABLE "walnut"."apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"userId" text NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"rateLimitEnabled" boolean DEFAULT true NOT NULL,
	"rateLimitTimeWindow" integer DEFAULT 86400000,
	"rateLimitMax" integer DEFAULT 10,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"lastRequest" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"permissions" text,
	"metadata" text,
	"tenantId" uuid,
	CONSTRAINT "apikey_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "walnut"."apikey" ADD CONSTRAINT "apikey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "walnut"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "walnut"."apikey" ADD CONSTRAINT "apikey_tenantId_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "walnut"."tenant"("id") ON DELETE cascade ON UPDATE no action;

