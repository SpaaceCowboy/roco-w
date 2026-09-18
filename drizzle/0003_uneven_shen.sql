CREATE TYPE "public"."operation_status" AS ENUM('started', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."publication_action" AS ENUM('request_review', 'return_to_draft', 'publish', 'schedule', 'unpublish', 'archive', 'restore');--> statement-breakpoint
CREATE TABLE "publication_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"localization_id" uuid NOT NULL,
	"action" "publication_action" NOT NULL,
	"request_hash" text NOT NULL,
	"status" "operation_status" DEFAULT 'started' NOT NULL,
	"requested_by_id" uuid,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_operations_idempotency_key_not_blank" CHECK (length(trim("publication_operations"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "publication_refreshes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"target" text NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"error_code" text,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_refreshes_latency_nonnegative" CHECK ("publication_refreshes"."latency_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "post_localizations" DROP CONSTRAINT "post_localizations_approval_complete";--> statement-breakpoint
ALTER TABLE "post_localizations" ADD COLUMN "approved_revision_number" integer;--> statement-breakpoint
UPDATE "post_localizations"
SET "approved_revision_number" = "published_revision_number"
WHERE "approved_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "publication_operations" ADD CONSTRAINT "publication_operations_localization_id_post_localizations_id_fk" FOREIGN KEY ("localization_id") REFERENCES "public"."post_localizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_operations" ADD CONSTRAINT "publication_operations_requested_by_id_admin_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_refreshes" ADD CONSTRAINT "publication_refreshes_operation_id_publication_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."publication_operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_operations_idempotency_key_unique" ON "publication_operations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "publication_operations_localization_created_idx" ON "publication_operations" USING btree ("localization_id","created_at");--> statement-breakpoint
CREATE INDEX "publication_refreshes_operation_idx" ON "publication_refreshes" USING btree ("operation_id");--> statement-breakpoint
ALTER TABLE "post_localizations" ADD CONSTRAINT "post_localizations_approval_complete" CHECK (("post_localizations"."approved_at" is null and "post_localizations"."approved_by_id" is null and "post_localizations"."approved_revision_number" is null) or ("post_localizations"."approved_at" is not null and "post_localizations"."approved_by_id" is not null and "post_localizations"."approved_revision_number" is not null));--> statement-breakpoint
ALTER TABLE "post_localizations"
  ADD CONSTRAINT "post_localizations_approved_revision_fk"
  FOREIGN KEY ("id", "approved_revision_number")
  REFERENCES "post_revisions" ("localization_id", "revision_number")
  DEFERRABLE INITIALLY DEFERRED;
