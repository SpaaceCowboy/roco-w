import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const adminRole = pgEnum("admin_role", ["admin", "editor", "reviewer"]);
export const contentLocale = pgEnum("content_locale", ["en", "fa", "de", "ru", "ar", "zh-hans"]);
export const postStatus = pgEnum("post_status", ["draft", "review", "scheduled", "published", "archived"]);
export const auditOutcome = pgEnum("audit_outcome", ["success", "denied", "failure"]);
export const publicationAction = pgEnum("publication_action", ["request_review", "return_to_draft", "publish", "schedule", "unpublish", "archive", "restore"]);
export const operationStatus = pgEnum("operation_status", ["started", "succeeded", "failed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    displayName: text("display_name"),
    oidcIssuer: text("oidc_issuer"),
    oidcSubject: text("oidc_subject"),
    authUserId: text("auth_user_id"),
    role: adminRole("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("admin_users_normalized_email_unique").on(table.normalizedEmail),
    uniqueIndex("admin_users_oidc_identity_unique").on(table.oidcIssuer, table.oidcSubject),
    uniqueIndex("admin_users_auth_user_id_unique").on(table.authUserId),
    check("admin_users_normalized_email_lowercase", sql`${table.normalizedEmail} = lower(trim(${table.normalizedEmail}))`),
    check(
      "admin_users_oidc_identity_complete",
      sql`(${table.oidcIssuer} is null and ${table.oidcSubject} is null) or (${table.oidcIssuer} is not null and ${table.oidcSubject} is not null)`,
    ),
  ],
);

export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("auth_users_email_unique").on(table.email)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
    index("auth_accounts_user_id_idx").on(table.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    width: integer("width"),
    height: integer("height"),
    uploadedById: uuid("uploaded_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("media_storage_key_unique").on(table.storageKey),
    uniqueIndex("media_checksum_sha256_unique").on(table.checksumSha256),
    check("media_byte_size_positive", sql`${table.byteSize} > 0`),
    check("media_width_positive", sql`${table.width} is null or ${table.width} > 0`),
    check("media_height_positive", sql`${table.height} is null or ${table.height} > 0`),
  ],
);

export const mediaUsageKind = pgEnum("media_usage_kind", ["inline", "featured", "social"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: integer("source_id"),
    defaultLocale: contentLocale("default_locale").notNull(),
    createdById: uuid("created_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("posts_source_id_unique").on(table.sourceId)],
);

export const postLocalizations = pgTable(
  "post_localizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    locale: contentLocale("locale").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").default("").notNull(),
    editorDocument: jsonb("editor_document").default({}).notNull(),
    renderedHtml: text("rendered_html").default("").notNull(),
    status: postStatus("status").default("draft").notNull(),
    version: integer("version").default(1).notNull(),
    publishedRevisionNumber: integer("published_revision_number"),
    authorName: text("author_name").notNull(),
    readingMinutes: integer("reading_minutes").default(1).notNull(),
    featuredMediaId: uuid("featured_media_id").references(() => media.id, { onDelete: "restrict" }),
    featuredImageAlt: text("featured_image_alt").default("").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalOverride: text("canonical_override"),
    noIndex: boolean("no_index").default(false).notNull(),
    noFollow: boolean("no_follow").default(false).notNull(),
    socialTitle: text("social_title"),
    socialDescription: text("social_description"),
    socialMediaId: uuid("social_media_id").references(() => media.id, { onDelete: "restrict" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedById: uuid("approved_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    approvedRevisionNumber: integer("approved_revision_number"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("post_localizations_post_locale_unique").on(table.postId, table.locale),
    uniqueIndex("post_localizations_locale_slug_unique").on(table.locale, table.slug),
    index("post_localizations_status_schedule_idx").on(table.status, table.scheduledAt),
    index("post_localizations_published_idx").on(table.locale, table.status, table.publishedAt),
    check("post_localizations_slug_not_blank", sql`length(trim(${table.slug})) > 0`),
    check("post_localizations_title_not_blank", sql`length(trim(${table.title})) > 0`),
    check("post_localizations_version_positive", sql`${table.version} > 0`),
    check("post_localizations_reading_minutes_positive", sql`${table.readingMinutes} > 0`),
    check(
      "post_localizations_schedule_required",
      sql`${table.status} <> 'scheduled' or ${table.scheduledAt} is not null`,
    ),
    check(
      "post_localizations_publication_fields",
      sql`${table.status} not in ('published', 'archived') or (${table.publishedAt} is not null and ${table.publishedRevisionNumber} is not null)`,
    ),
    check(
      "post_localizations_approval_complete",
      sql`(${table.approvedAt} is null and ${table.approvedById} is null and ${table.approvedRevisionNumber} is null) or (${table.approvedAt} is not null and ${table.approvedById} is not null and ${table.approvedRevisionNumber} is not null)`,
    ),
  ],
);

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    localizationId: uuid("localization_id").notNull().references(() => postLocalizations.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull(),
    editorDocument: jsonb("editor_document").notNull(),
    renderedHtml: text("rendered_html").notNull(),
    featuredMediaId: uuid("featured_media_id").references(() => media.id, { onDelete: "restrict" }),
    featuredImageAlt: text("featured_image_alt").default("").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalOverride: text("canonical_override"),
    noIndex: boolean("no_index").default(false).notNull(),
    noFollow: boolean("no_follow").default(false).notNull(),
    socialTitle: text("social_title"),
    socialDescription: text("social_description"),
    socialMediaId: uuid("social_media_id").references(() => media.id, { onDelete: "restrict" }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdById: uuid("created_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("post_revisions_localization_number_unique").on(table.localizationId, table.revisionNumber),
    check("post_revisions_number_positive", sql`${table.revisionNumber} > 0`),
  ],
);

export const mediaUsages = pgTable(
  "media_usages",
  {
    mediaId: uuid("media_id").notNull().references(() => media.id, { onDelete: "restrict" }),
    localizationId: uuid("localization_id").notNull().references(() => postLocalizations.id, { onDelete: "cascade" }),
    kind: mediaUsageKind("kind").notNull(),
    altText: text("alt_text").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mediaId, table.localizationId, table.kind] }),
    index("media_usages_localization_idx").on(table.localizationId),
    check("media_usages_inline_alt_required", sql`${table.kind} <> 'inline' or length(trim(${table.altText})) > 0`),
  ],
);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  ...timestamps,
});

export const categoryLocalizations = pgTable(
  "category_localizations",
  {
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    locale: contentLocale("locale").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    uniqueIndex("category_localizations_locale_slug_unique").on(table.locale, table.slug),
    check("category_localizations_slug_not_blank", sql`length(trim(${table.slug})) > 0`),
    check("category_localizations_name_not_blank", sql`length(trim(${table.name})) > 0`),
  ],
);

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  ...timestamps,
});

export const tagLocalizations = pgTable(
  "tag_localizations",
  {
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    locale: contentLocale("locale").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tagId, table.locale] }),
    uniqueIndex("tag_localizations_locale_slug_unique").on(table.locale, table.slug),
    check("tag_localizations_slug_not_blank", sql`length(trim(${table.slug})) > 0`),
    check("tag_localizations_name_not_blank", sql`length(trim(${table.name})) > 0`),
  ],
);

export const postCategories = pgTable(
  "post_categories",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.categoryId] })],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })],
);

export const postSlugHistory = pgTable(
  "post_slug_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    localizationId: uuid("localization_id").notNull().references(() => postLocalizations.id, { onDelete: "cascade" }),
    locale: contentLocale("locale").notNull(),
    oldSlug: text("old_slug").notNull(),
    createdById: uuid("created_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("post_slug_history_locale_slug_unique").on(table.locale, table.oldSlug),
    index("post_slug_history_localization_idx").on(table.localizationId),
    check("post_slug_history_slug_not_blank", sql`length(trim(${table.oldSlug})) > 0`),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    outcome: auditOutcome("outcome").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_events_actor_created_idx").on(table.actorId, table.createdAt),
    index("audit_events_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
    uniqueIndex("audit_events_correlation_action_unique").on(table.correlationId, table.action),
    check("audit_events_action_not_blank", sql`length(trim(${table.action})) > 0`),
    check("audit_events_entity_type_not_blank", sql`length(trim(${table.entityType})) > 0`),
  ],
);

export const publicationOperations = pgTable(
  "publication_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    localizationId: uuid("localization_id").notNull().references(() => postLocalizations.id, { onDelete: "cascade" }),
    action: publicationAction("action").notNull(),
    requestHash: text("request_hash").notNull(),
    status: operationStatus("status").default("started").notNull(),
    requestedById: uuid("requested_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    result: jsonb("result").default({}).notNull(),
    errorCode: text("error_code"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("publication_operations_idempotency_key_unique").on(table.idempotencyKey),
    index("publication_operations_localization_created_idx").on(table.localizationId, table.createdAt),
    check("publication_operations_idempotency_key_not_blank", sql`length(trim(${table.idempotencyKey})) > 0`),
  ],
);

export const publicationRefreshes = pgTable(
  "publication_refreshes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    operationId: uuid("operation_id").notNull().references(() => publicationOperations.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    outcome: auditOutcome("outcome").notNull(),
    errorCode: text("error_code"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("publication_refreshes_operation_idx").on(table.operationId),
    check("publication_refreshes_latency_nonnegative", sql`${table.latencyMs} >= 0`),
  ],
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type PostLocalization = typeof postLocalizations.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
