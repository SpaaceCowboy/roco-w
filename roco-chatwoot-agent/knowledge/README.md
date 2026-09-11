# ROCO support knowledge governance

The Markdown files in this directory are customer-facing policy inputs. Update
them only after the corresponding business or compliance owner approves the
change.

Every policy change must update `metadata.json` with:

- `owner`: accountable business or compliance owner
- `status`: `approved`, `draft`, or `expired`
- `last_reviewed`: ISO date of the latest review
- `review_after`: date when another review is required
- `sources`: approved internal or public references

The agent does not use files marked `draft` or `expired`.
