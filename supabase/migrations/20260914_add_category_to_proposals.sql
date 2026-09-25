-- Add a stored category to each proposal so the scatter view can filter
-- without reclassifying on every request. Backfilled by
-- scripts/categorize-proposals.ts using the same keyword classifier the
-- classify-project edge function already uses on freeform text.

alter table proposals add column if not exists category text;

create index if not exists idx_proposals_category on proposals (category);
