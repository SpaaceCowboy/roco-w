\set ON_ERROR_STOP on

-- Verifies that permanent content deletion can cascade to post_revisions while
-- revision snapshots stay immutable to edits. Run against a disposable
-- PostgreSQL database that has the migrations applied:
--
--   psql "$DATABASE_URL" -f scripts/verify-content-deletion.sql

BEGIN;

DO $$
DECLARE
  v_admin_id uuid;
  v_post_id uuid := '00000000-0000-4000-8000-000000000020';
  v_localization_id uuid := '00000000-0000-4000-8000-000000000021';
  v_remaining integer;
BEGIN
  INSERT INTO admin_users (id, email, normalized_email, role)
  VALUES ('00000000-0000-4000-8000-000000000022', 'delete-check@example.com',
          'delete-check@example.com', 'admin')
  RETURNING id INTO v_admin_id;

  INSERT INTO posts (id, default_locale, created_by_id)
  VALUES (v_post_id, 'en', v_admin_id);

  INSERT INTO post_localizations (id, post_id, locale, slug, title, author_name)
  VALUES (v_localization_id, v_post_id, 'de', 'delete-check-de', 'Delete check', 'Verifier');

  INSERT INTO post_revisions (id, localization_id, revision_number, title, slug,
                              excerpt, editor_document, rendered_html)
  VALUES ('00000000-0000-4000-8000-000000000023', v_localization_id, 1,
          'Delete check', 'delete-check-de', '', '{}', '');

  -- Deleting the localization must cascade to its revisions. Before migration
  -- 0005 the revision immutability trigger aborted this delete with SQLSTATE
  -- 55000 ("post_revisions records are immutable").
  DELETE FROM post_localizations WHERE id = v_localization_id;

  SELECT count(*) INTO v_remaining FROM post_revisions
  WHERE localization_id = v_localization_id;
  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'revisions were not removed with their localization';
  END IF;

  -- Revision snapshots must remain immutable to edits.
  INSERT INTO post_localizations (id, post_id, locale, slug, title, author_name)
  VALUES ('00000000-0000-4000-8000-000000000024', v_post_id, 'de',
          'delete-check-de-2', 'Delete check 2', 'Verifier');

  INSERT INTO post_revisions (id, localization_id, revision_number, title, slug,
                              excerpt, editor_document, rendered_html)
  VALUES ('00000000-0000-4000-8000-000000000025',
          '00000000-0000-4000-8000-000000000024', 1, 'Delete check 2',
          'delete-check-de-2', '', '{}', '');

  BEGIN
    UPDATE post_revisions SET title = 'rewritten'
    WHERE id = '00000000-0000-4000-8000-000000000025';
    RAISE EXCEPTION 'a revision update was accepted';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
