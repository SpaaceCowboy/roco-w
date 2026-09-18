\set ON_ERROR_STOP on

BEGIN;

INSERT INTO admin_users (
  id, email, normalized_email, role
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'editor@example.com',
  'editor@example.com',
  'editor'
);

INSERT INTO posts (
  id, default_locale, created_by_id
) VALUES (
  '00000000-0000-4000-8000-000000000002',
  'en',
  '00000000-0000-4000-8000-000000000001'
);

INSERT INTO post_localizations (
  id, post_id, locale, slug, title, author_name
) VALUES (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'en',
  'schema-verification',
  'Schema verification',
  'ROCO Editorial'
);

INSERT INTO post_revisions (
  id, localization_id, revision_number, title, slug, excerpt,
  editor_document, rendered_html, created_by_id
) VALUES (
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000003',
  1,
  'Schema verification',
  'schema-verification',
  'Verification fixture',
  '{}'::jsonb,
  '<p>Verification fixture</p>',
  '00000000-0000-4000-8000-000000000001'
);

UPDATE post_localizations
SET status = 'published', published_at = now(), published_revision_number = 1
WHERE id = '00000000-0000-4000-8000-000000000003';

SET CONSTRAINTS ALL IMMEDIATE;

DO $$
BEGIN
  UPDATE post_revisions
  SET title = 'Mutation must fail'
  WHERE id = '00000000-0000-4000-8000-000000000004';
  RAISE EXCEPTION 'post revision immutability trigger did not run';
EXCEPTION
  WHEN SQLSTATE '55000' THEN NULL;
END;
$$;

INSERT INTO audit_events (
  actor_id, action, entity_type, entity_id, outcome, correlation_id
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'schema.verify',
  'post',
  '00000000-0000-4000-8000-000000000002',
  'success',
  '00000000-0000-4000-8000-000000000005'
);

DO $$
BEGIN
  DELETE FROM audit_events
  WHERE correlation_id = '00000000-0000-4000-8000-000000000005';
  RAISE EXCEPTION 'audit immutability trigger did not run';
EXCEPTION
  WHEN SQLSTATE '55000' THEN NULL;
END;
$$;

DO $$
BEGIN
  INSERT INTO post_localizations (
    post_id, locale, slug, title, author_name, status
  ) VALUES (
    '00000000-0000-4000-8000-000000000002',
    'fa',
    'scheduled-without-date',
    'Invalid schedule',
    'ROCO Editorial',
    'scheduled'
  );
  RAISE EXCEPTION 'scheduled_at constraint did not run';
EXCEPTION
  WHEN check_violation THEN NULL;
END;
$$;

INSERT INTO auth_users (
  id, name, email, email_verified
) VALUES (
  '00000000-0000-4000-8000-000000000006',
  'Schema Admin',
  'editor@example.com',
  true
);

UPDATE admin_users
SET auth_user_id = '00000000-0000-4000-8000-000000000006'
WHERE id = '00000000-0000-4000-8000-000000000001';

INSERT INTO auth_sessions (
  id, expires_at, token, user_id
) VALUES (
  '00000000-0000-4000-8000-000000000007',
  now() + interval '8 hours',
  'schema-verification-session-token',
  '00000000-0000-4000-8000-000000000006'
);

DO $$
BEGIN
  UPDATE admin_users
  SET auth_user_id = '00000000-0000-4000-8000-999999999999'
  WHERE id = '00000000-0000-4000-8000-000000000001';
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'admin auth user foreign key did not run';
EXCEPTION
  WHEN foreign_key_violation THEN NULL;
END;
$$;

ROLLBACK;
