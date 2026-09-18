CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'denied', 'failure');--> statement-breakpoint
CREATE TYPE "public"."content_locale" AS ENUM('en', 'fa', 'de', 'ru', 'ar', 'zh-hans');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"display_name" text,
	"oidc_issuer" text,
	"oidc_subject" text,
	"role" "admin_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_normalized_email_lowercase" CHECK ("admin_users"."normalized_email" = lower(trim("admin_users"."normalized_email"))),
	CONSTRAINT "admin_users_oidc_identity_complete" CHECK (("admin_users"."oidc_issuer" is null and "admin_users"."oidc_subject" is null) or ("admin_users"."oidc_issuer" is not null and "admin_users"."oidc_subject" is not null))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"outcome" "audit_outcome" NOT NULL,
	"correlation_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_action_not_blank" CHECK (length(trim("audit_events"."action")) > 0),
	CONSTRAINT "audit_events_entity_type_not_blank" CHECK (length(trim("audit_events"."entity_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_localizations" (
	"category_id" uuid NOT NULL,
	"locale" "content_locale" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "category_localizations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "category_localizations_slug_not_blank" CHECK (length(trim("category_localizations"."slug")) > 0),
	CONSTRAINT "category_localizations_name_not_blank" CHECK (length(trim("category_localizations"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"checksum_sha256" text NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_byte_size_positive" CHECK ("media"."byte_size" > 0),
	CONSTRAINT "media_width_positive" CHECK ("media"."width" is null or "media"."width" > 0),
	CONSTRAINT "media_height_positive" CHECK ("media"."height" is null or "media"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_localizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"locale" "content_locale" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"editor_document" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_html" text DEFAULT '' NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_revision_number" integer,
	"author_name" text NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"featured_media_id" uuid,
	"featured_image_alt" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"canonical_override" text,
	"no_index" boolean DEFAULT false NOT NULL,
	"social_title" text,
	"social_description" text,
	"social_media_id" uuid,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_localizations_slug_not_blank" CHECK (length(trim("post_localizations"."slug")) > 0),
	CONSTRAINT "post_localizations_title_not_blank" CHECK (length(trim("post_localizations"."title")) > 0),
	CONSTRAINT "post_localizations_version_positive" CHECK ("post_localizations"."version" > 0),
	CONSTRAINT "post_localizations_reading_minutes_positive" CHECK ("post_localizations"."reading_minutes" > 0),
	CONSTRAINT "post_localizations_schedule_required" CHECK ("post_localizations"."status" <> 'scheduled' or "post_localizations"."scheduled_at" is not null),
	CONSTRAINT "post_localizations_publication_fields" CHECK ("post_localizations"."status" not in ('published', 'archived') or ("post_localizations"."published_at" is not null and "post_localizations"."published_revision_number" is not null)),
	CONSTRAINT "post_localizations_approval_complete" CHECK (("post_localizations"."approved_at" is null and "post_localizations"."approved_by_id" is null) or ("post_localizations"."approved_at" is not null and "post_localizations"."approved_by_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"localization_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"editor_document" jsonb NOT NULL,
	"rendered_html" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_revisions_number_positive" CHECK ("post_revisions"."revision_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_slug_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"localization_id" uuid NOT NULL,
	"locale" "content_locale" NOT NULL,
	"old_slug" text NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_slug_history_slug_not_blank" CHECK (length(trim("post_slug_history"."old_slug")) > 0)
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" integer,
	"default_locale" "content_locale" NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tag_localizations" (
	"tag_id" uuid NOT NULL,
	"locale" "content_locale" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_localizations_tag_id_locale_pk" PRIMARY KEY("tag_id","locale"),
	CONSTRAINT "tag_localizations_slug_not_blank" CHECK (length(trim("tag_localizations"."slug")) > 0),
	CONSTRAINT "tag_localizations_name_not_blank" CHECK (length(trim("tag_localizations"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_localizations" ADD CONSTRAINT "category_localizations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_admin_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_localizations" ADD CONSTRAINT "post_localizations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_localizations" ADD CONSTRAINT "post_localizations_featured_media_id_media_id_fk" FOREIGN KEY ("featured_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_localizations" ADD CONSTRAINT "post_localizations_social_media_id_media_id_fk" FOREIGN KEY ("social_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_localizations" ADD CONSTRAINT "post_localizations_approved_by_id_admin_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_localization_id_post_localizations_id_fk" FOREIGN KEY ("localization_id") REFERENCES "public"."post_localizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_created_by_id_admin_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_slug_history" ADD CONSTRAINT "post_slug_history_localization_id_post_localizations_id_fk" FOREIGN KEY ("localization_id") REFERENCES "public"."post_localizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_slug_history" ADD CONSTRAINT "post_slug_history_created_by_id_admin_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_id_admin_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_localizations" ADD CONSTRAINT "tag_localizations_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_normalized_email_unique" ON "admin_users" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_oidc_identity_unique" ON "admin_users" USING btree ("oidc_issuer","oidc_subject");--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_created_idx" ON "audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_correlation_action_unique" ON "audit_events" USING btree ("correlation_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "category_localizations_locale_slug_unique" ON "category_localizations" USING btree ("locale","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_key_unique" ON "media" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_checksum_sha256_unique" ON "media" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "post_localizations_post_locale_unique" ON "post_localizations" USING btree ("post_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "post_localizations_locale_slug_unique" ON "post_localizations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "post_localizations_status_schedule_idx" ON "post_localizations" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "post_localizations_published_idx" ON "post_localizations" USING btree ("locale","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "post_revisions_localization_number_unique" ON "post_revisions" USING btree ("localization_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "post_slug_history_locale_slug_unique" ON "post_slug_history" USING btree ("locale","old_slug");--> statement-breakpoint
CREATE INDEX "post_slug_history_localization_idx" ON "post_slug_history" USING btree ("localization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_source_id_unique" ON "posts" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_localizations_locale_slug_unique" ON "tag_localizations" USING btree ("locale","slug");--> statement-breakpoint
ALTER TABLE "post_localizations"
  ADD CONSTRAINT "post_localizations_published_revision_fk"
  FOREIGN KEY ("id", "published_revision_number")
  REFERENCES "post_revisions" ("localization_id", "revision_number")
  DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
CREATE FUNCTION prevent_immutable_record_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE TRIGGER post_revisions_are_immutable
BEFORE UPDATE OR DELETE ON "post_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();--> statement-breakpoint
CREATE TRIGGER audit_events_are_immutable
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();
