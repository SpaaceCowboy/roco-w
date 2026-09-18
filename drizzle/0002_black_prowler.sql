CREATE TYPE "public"."media_usage_kind" AS ENUM('inline', 'featured', 'social');--> statement-breakpoint
CREATE TABLE "media_usages" (
	"media_id" uuid NOT NULL,
	"localization_id" uuid NOT NULL,
	"kind" "media_usage_kind" NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_usages_media_id_localization_id_kind_pk" PRIMARY KEY("media_id","localization_id","kind"),
	CONSTRAINT "media_usages_inline_alt_required" CHECK ("media_usages"."kind" <> 'inline' or length(trim("media_usages"."alt_text")) > 0)
);
--> statement-breakpoint
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usages_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usages_localization_id_post_localizations_id_fk" FOREIGN KEY ("localization_id") REFERENCES "public"."post_localizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_usages_localization_idx" ON "media_usages" USING btree ("localization_id");