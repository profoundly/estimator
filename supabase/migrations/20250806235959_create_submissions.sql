-- submissions had no creation migration in this repo — it exists on the
-- real project only because it was created manually outside of migrations
-- (discovered when 20250807_add_name_to_submissions.sql, which ALTERs this
-- table, failed against a fresh local database with "relation submissions
-- does not exist"). This recreates it from every column referenced in code
-- (supabase/functions/estimate/index.ts, capture-lead/index.ts) so local
-- and CI databases match the real one. Filename sorts before
-- 20250807_add_name_to_submissions.sql on purpose (00_ prefix).

create table if not exists submissions (
  id                bigint generated always as identity primary key,
  email             text not null,
  description       text,
  estimate_low      numeric,
  estimate_typical  numeric,
  estimate_high     numeric,
  estimate_currency text,
  match_count       integer,
  confidence        text,
  created_at        timestamptz not null default now()
);

-- Same access model as proposals: no anon/authenticated policies, so only
-- service-role edge functions (capture-lead, and formerly estimate) can
-- read or write this table.
alter table submissions enable row level security;
