CREATE SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."account" SET SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."session" SET SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."tenant" SET SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."tenantrpcconfig" SET SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."user" SET SCHEMA "walnut";
--> statement-breakpoint
ALTER TABLE "public"."verification" SET SCHEMA "walnut";

--

ALTER TABLE "walnut"."tenantrpcconfig" DROP CONSTRAINT "tenantrpcconfig_tenantId_tenant_id_fk";
ALTER TABLE "walnut"."user" DROP CONSTRAINT "user_tenantId_tenant_id_fk";

--

ALTER TABLE "walnut"."tenant" ALTER COLUMN "id" TYPE UUID USING gen_random_uuid();
ALTER TABLE "walnut"."tenant" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "walnut"."tenantrpcconfig" ALTER COLUMN "id" TYPE UUID USING gen_random_uuid();
ALTER TABLE "walnut"."tenantrpcconfig" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "walnut"."tenantrpcconfig" ALTER COLUMN "tenantId" TYPE UUID USING gen_random_uuid();

ALTER TABLE "walnut"."user" ALTER COLUMN "tenantId" TYPE UUID USING gen_random_uuid();

--

ALTER TABLE "walnut"."tenantrpcconfig" ADD CONSTRAINT "tenantrpcconfig_tenantId_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "walnut"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walnut"."user" ADD CONSTRAINT "user_tenantId_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "walnut"."tenant"("id") ON DELETE set null ON UPDATE no action;
