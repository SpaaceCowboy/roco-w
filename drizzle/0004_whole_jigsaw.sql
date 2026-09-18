ALTER TABLE "post_localizations" ADD COLUMN "no_follow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "featured_media_id" uuid;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "featured_image_alt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "canonical_override" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "no_index" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "no_follow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "social_title" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "social_description" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "social_media_id" uuid;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_featured_media_id_media_id_fk" FOREIGN KEY ("featured_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_social_media_id_media_id_fk" FOREIGN KEY ("social_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "post_revisions" (
  "localization_id", "revision_number", "title", "slug", "excerpt",
  "editor_document", "rendered_html", "featured_media_id",
  "featured_image_alt", "seo_title", "seo_description", "canonical_override",
  "no_index", "no_follow", "social_title", "social_description",
  "social_media_id", "metadata", "created_by_id"
)
SELECT
  localization."id",
  COALESCE(latest."revision_number", 0) + 1,
  localization."title",
  localization."slug",
  localization."excerpt",
  localization."editor_document",
  localization."rendered_html",
  localization."featured_media_id",
  localization."featured_image_alt",
  localization."seo_title",
  localization."seo_description",
  localization."canonical_override",
  localization."no_index",
  localization."no_follow",
  localization."social_title",
  localization."social_description",
  localization."social_media_id",
  jsonb_build_object(
    'reason', 'seo-snapshot-migration',
    'authorName', localization."author_name",
    'readingMinutes', localization."reading_minutes"
  ),
  NULL
FROM "post_localizations" localization
LEFT JOIN LATERAL (
  SELECT MAX(revision."revision_number") AS "revision_number"
  FROM "post_revisions" revision
  WHERE revision."localization_id" = localization."id"
) latest ON true;
