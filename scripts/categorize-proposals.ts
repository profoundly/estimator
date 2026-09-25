#!/usr/bin/env -S npx tsx
//
// One-time (re-runnable) backfill: classifies every proposal's job_title +
// job_description into a category and writes it to proposals.category.
//
// Uses the exact same keyword classifier as
// supabase/functions/classify-project/index.ts, duplicated here because
// edge functions (Deno) and scripts (Node) don't share imports.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env file).
//
// Usage: npx tsx scripts/categorize-proposals.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Derived from the real proposal corpus (3,186 rows from the live
// project), not guessed up front: ranked by keyword frequency across real
// job_title/job_description text, then validated so every category has a
// distinct, sensible price median (see
// throughline-os#2 for the analysis this replaced).
// Keep in sync with supabase/functions/classify-project/index.ts
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Reporting & Dashboards": [
    "dashboard", "reporting", "report", "analytics", "metrics",
    "attribution report",
  ],
  "Marketing & Campaigns": [
    "marketing hub", "email campaign", "landing page", "lead nurture",
    "marketing automation", "attribution", "ads", "seo",
    "content strategy", "lead generation", "email marketing",
  ],
  "Integrations": [
    "integration", "salesforce", "api", "connector", "sync", "zapier",
    "shopify", "quickbooks", "netsuite", "third-party",
  ],
  "Workflow Automation": [
    "workflow", "automation", "automate", "sequence automation",
    "operations hub",
  ],
  "Portal Setup & Implementation": [
    "setup", "implementation", "configure", "get started", "onboard",
    "reset", "new account", "initial",
  ],
  "CRM & Sales Process": [
    "sales pipeline", "sales process", "deal stage", "deal pipeline",
    "sales hub", "forecast", "sequences", "playbook", "crm clean",
    "pipeline setup", "quote template",
  ],
  "Audit & Strategy": [
    "audit", "overview", "technical review", "strategy", "assessment",
    "consult",
  ],
  "Website & CMS": [
    "website", "cms", "landing page design", "web design", "web page",
    "blog",
  ],
  "Data Migration & Cleanup": [
    "migration", "migrate", "data clean", "deduplicate", "dedupe",
    "data hygiene", "data integrity", "import", "sanitized list",
    "clean up",
  ],
  "RevOps & Architecture": [
    "revops", "architecture", "portal structure", "operations",
    "data model", "property structure",
  ],
  "Training & Enablement": [
    "training", "onboarding", "coach", "enablement", "educate",
  ],
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function classify(text: string): string {
  const lower = stripHtml(text).toLowerCase();
  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) score += 1;
    }
    if (score > 0) scores[category] = score;
  }
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] ?? "General";
}

async function main() {
  const pageSize = 500;
  let from = 0;
  let totalUpdated = 0;
  const categoryCounts: Record<string, number> = {};

  for (;;) {
    const { data, error } = await supabase
      .from("proposals")
      .select("id, job_title, job_description")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Fetch failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const category = classify(`${row.job_title} ${row.job_description}`);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      const { error: updateError } = await supabase
        .from("proposals")
        .update({ category })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update id=${row.id}:`, updateError.message);
        continue;
      }
      totalUpdated += 1;
    }

    console.log(`Processed ${from + data.length} rows...`);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`\nDone. Updated ${totalUpdated} proposals.`);
  console.log("Category breakdown:");
  for (const [category, count] of Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  )) {
    console.log(`  ${category}: ${count}`);
  }
}

main();
