\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid;
  v_post_id uuid;
  v_localization_id uuid;
  v_media_id uuid;
  affected integer;
BEGIN
  INSERT INTO admin_users (email, normalized_email, display_name, role)
  VALUES ('phase2@example.test', 'phase2@example.test', 'Phase 2 verifier', 'editor')
  RETURNING id INTO v_admin_id;

  INSERT INTO posts (default_locale, created_by_id)
  VALUES ('fa', v_admin_id)
  RETURNING id INTO v_post_id;

  INSERT INTO post_localizations (
    post_id, locale, slug, title, author_name, editor_document, rendered_html
  ) VALUES (
    v_post_id, 'fa', 'آزمون-ویرایش', 'آزمون ویرایش', 'Editorial',
    '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb, '<p></p>'
  ) RETURNING id INTO v_localization_id;

  INSERT INTO post_revisions (
    localization_id, revision_number, title, slug, excerpt,
    editor_document, rendered_html, created_by_id
  ) VALUES (
    v_localization_id, 1, 'آزمون ویرایش', 'آزمون-ویرایش', '',
    '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb, '<p></p>', v_admin_id
  );

  UPDATE post_localizations
  SET title = 'نسخه دوم', version = 2
  WHERE id = v_localization_id AND version = 1;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'first optimistic update was not accepted'; END IF;

  UPDATE post_localizations
  SET title = 'stale overwrite', version = 2
  WHERE id = v_localization_id AND version = 1;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'stale optimistic update was accepted'; END IF;

  INSERT INTO post_revisions (
    localization_id, revision_number, title, slug, excerpt,
    editor_document, rendered_html, created_by_id
  ) VALUES (
    v_localization_id, 2, 'نسخه دوم', 'آزمون-ویرایش', '',
    '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb, '<p></p>', v_admin_id
  );

  INSERT INTO media (
    storage_key, original_filename, mime_type, byte_size, checksum_sha256,
    width, height, uploaded_by_id
  ) VALUES (
    'content/images/00000000-0000-4000-8000-000000000001.webp', 'test.webp',
    'image/webp', 128, repeat('a', 64), 64, 64, v_admin_id
  ) RETURNING id INTO v_media_id;

  INSERT INTO media_usages (media_id, localization_id, kind, alt_text)
  VALUES (v_media_id, v_localization_id, 'inline', 'نمودار نمونه');

  BEGIN
    INSERT INTO media_usages (media_id, localization_id, kind, alt_text)
    VALUES (v_media_id, v_localization_id, 'featured', '');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'media usage primary key incorrectly omits kind';
  END;

  BEGIN
    UPDATE media_usages SET alt_text = ''
    WHERE media_id = v_media_id AND localization_id = v_localization_id AND kind = 'inline';
    RAISE EXCEPTION 'blank inline alt text was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
