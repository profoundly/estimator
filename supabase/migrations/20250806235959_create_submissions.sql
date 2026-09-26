-- submissions had no creation migration in this repo — it exists on the
-- real project only because it was created manually outside of migrations
-- (discovered when 20250807_add_name_to_submissions.sql, which ALTERs this
-- table, failed against a fresh local database with "relation submissions
-- does not exist"). This recreates it to match the real table's schema
-- (checked against information_schema on production) so local and CI
-- databases match it. description starts NOT NULL here, as it is in
-- production; 20260926_make_submission_description_optional.sql relaxes it.
-- Filename sorts before 20250807_add_name_to_submissions.sql on purpose.

create table if not exists submissions (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  description       text not null,
  estimate_low      integer,
  estimate_typical  integer,
  estimate_high     integer,
  estimate_currency text default 'usd',
  match_count       integer,
  confidence        text,
  created_at        timestamptz default now(),
  -- From the earlier qualification/feedback step; read by notify-feedback.
  job_title         text,
  expected_cost     text,
  feedback_rating   text,
  company_size      text
);

-- Same access model as proposals: no anon/authenticated policies, so only
-- service-role edge functions (capture-lead, and formerly estimate) can
-- read or write this table.
alter table submissions enable row level security;
