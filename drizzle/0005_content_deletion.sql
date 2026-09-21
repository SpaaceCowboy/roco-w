-- Revisions are immutable snapshots, but they must be removable when the
-- localization that owns them is permanently deleted. Restrict the guard to
-- UPDATE so an authorized content deletion can cascade through
-- post_localizations -> post_revisions. Revision history is still never
-- rewritten, and audit_events keeps its full update/delete guard.
DROP TRIGGER IF EXISTS "post_revisions_are_immutable" ON "post_revisions";--> statement-breakpoint
CREATE TRIGGER "post_revisions_are_immutable"
BEFORE UPDATE ON "post_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();
