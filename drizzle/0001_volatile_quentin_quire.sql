CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"githubEmails" text[] DEFAULT '{}' NOT NULL,
	"rpcUrls" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tenantId" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_tenantId_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenant"("id") ON DELETE set null ON UPDATE no action;