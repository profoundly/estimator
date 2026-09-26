-- Backfill proposals.category — the SQL Editor equivalent of
-- scripts/categorize-proposals.ts, for running without Node or a local
-- service-role key. Paste into the Supabase SQL Editor and run.
--
-- Same keyword classifier, same result: each category scores one point per
-- keyword found in the lowercased, HTML-stripped "job_title job_description";
-- highest score wins, ties go to the category listed first, no match is
-- 'General'. Verified row-for-row against the TypeScript classifier.
-- Keep the keyword list in sync with scripts/categorize-proposals.ts and
-- supabase/functions/classify-project/index.ts.
--
-- Re-runnable. Run it again after every `npm run import:proposals`:
-- imported rows arrive uncategorized and stay off the chart until then.

with keywords (category_order, category, keyword) as (
  values
  (1, 'Reporting & Dashboards', 'dashboard'),
  (1, 'Reporting & Dashboards', 'reporting'),
  (1, 'Reporting & Dashboards', 'report'),
  (1, 'Reporting & Dashboards', 'analytics'),
  (1, 'Reporting & Dashboards', 'metrics'),
  (1, 'Reporting & Dashboards', 'attribution report'),
  (2, 'Marketing & Campaigns', 'marketing hub'),
  (2, 'Marketing & Campaigns', 'email campaign'),
  (2, 'Marketing & Campaigns', 'landing page'),
  (2, 'Marketing & Campaigns', 'lead nurture'),
  (2, 'Marketing & Campaigns', 'marketing automation'),
  (2, 'Marketing & Campaigns', 'attribution'),
  (2, 'Marketing & Campaigns', 'ads'),
  (2, 'Marketing & Campaigns', 'seo'),
  (2, 'Marketing & Campaigns', 'content strategy'),
  (2, 'Marketing & Campaigns', 'lead generation'),
  (2, 'Marketing & Campaigns', 'email marketing'),
  (3, 'Integrations', 'integration'),
  (3, 'Integrations', 'salesforce'),
  (3, 'Integrations', 'api'),
  (3, 'Integrations', 'connector'),
  (3, 'Integrations', 'sync'),
  (3, 'Integrations', 'zapier'),
  (3, 'Integrations', 'shopify'),
  (3, 'Integrations', 'quickbooks'),
  (3, 'Integrations', 'netsuite'),
  (3, 'Integrations', 'third-party'),
  (4, 'Workflow Automation', 'workflow'),
  (4, 'Workflow Automation', 'automation'),
  (4, 'Workflow Automation', 'automate'),
  (4, 'Workflow Automation', 'sequence automation'),
  (4, 'Workflow Automation', 'operations hub'),
  (5, 'Portal Setup & Implementation', 'setup'),
  (5, 'Portal Setup & Implementation', 'implementation'),
  (5, 'Portal Setup & Implementation', 'configure'),
  (5, 'Portal Setup & Implementation', 'get started'),
  (5, 'Portal Setup & Implementation', 'onboard'),
  (5, 'Portal Setup & Implementation', 'reset'),
  (5, 'Portal Setup & Implementation', 'new account'),
  (5, 'Portal Setup & Implementation', 'initial'),
  (6, 'CRM & Sales Process', 'sales pipeline'),
  (6, 'CRM & Sales Process', 'sales process'),
  (6, 'CRM & Sales Process', 'deal stage'),
  (6, 'CRM & Sales Process', 'deal pipeline'),
  (6, 'CRM & Sales Process', 'sales hub'),
  (6, 'CRM & Sales Process', 'forecast'),
  (6, 'CRM & Sales Process', 'sequences'),
  (6, 'CRM & Sales Process', 'playbook'),
  (6, 'CRM & Sales Process', 'crm clean'),
  (6, 'CRM & Sales Process', 'pipeline setup'),
  (6, 'CRM & Sales Process', 'quote template'),
  (7, 'Audit & Strategy', 'audit'),
  (7, 'Audit & Strategy', 'overview'),
  (7, 'Audit & Strategy', 'technical review'),
  (7, 'Audit & Strategy', 'strategy'),
  (7, 'Audit & Strategy', 'assessment'),
  (7, 'Audit & Strategy', 'consult'),
  (8, 'Website & CMS', 'website'),
  (8, 'Website & CMS', 'cms'),
  (8, 'Website & CMS', 'landing page design'),
  (8, 'Website & CMS', 'web design'),
  (8, 'Website & CMS', 'web page'),
  (8, 'Website & CMS', 'blog'),
  (9, 'Data Migration & Cleanup', 'migration'),
  (9, 'Data Migration & Cleanup', 'migrate'),
  (9, 'Data Migration & Cleanup', 'data clean'),
  (9, 'Data Migration & Cleanup', 'deduplicate'),
  (9, 'Data Migration & Cleanup', 'dedupe'),
  (9, 'Data Migration & Cleanup', 'data hygiene'),
  (9, 'Data Migration & Cleanup', 'data integrity'),
  (9, 'Data Migration & Cleanup', 'import'),
  (9, 'Data Migration & Cleanup', 'sanitized list'),
  (9, 'Data Migration & Cleanup', 'clean up'),
  (10, 'RevOps & Architecture', 'revops'),
  (10, 'RevOps & Architecture', 'architecture'),
  (10, 'RevOps & Architecture', 'portal structure'),
  (10, 'RevOps & Architecture', 'operations'),
  (10, 'RevOps & Architecture', 'data model'),
  (10, 'RevOps & Architecture', 'property structure'),
  (11, 'Training & Enablement', 'training'),
  (11, 'Training & Enablement', 'onboarding'),
  (11, 'Training & Enablement', 'coach'),
  (11, 'Training & Enablement', 'enablement'),
  (11, 'Training & Enablement', 'educate')
),
texts as (
  select id, lower(regexp_replace(job_title || ' ' || job_description, '<[^>]+>', ' ', 'g')) as body
  from proposals
),
scores as (
  select t.id, k.category, min(k.category_order) as category_order, count(*) as score
  from texts t
  join keywords k on position(k.keyword in t.body) > 0
  group by t.id, k.category
),
best as (
  select distinct on (id) id, category
  from scores
  order by id, score desc, category_order
)
update proposals p
set category = coalesce(b.category, 'General')
from texts t
left join best b on b.id = t.id
where p.id = t.id;
