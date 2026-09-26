-- The email-gated scatter captures a lead before any project description
-- exists, so capture-lead inserts only email + name. On the real project
-- submissions.description is NOT NULL with no default, which made every
-- capture-lead insert fail. Descriptions are still stored when present.
-- Idempotent so it is safe to re-run.

alter table submissions alter column description drop not null;
