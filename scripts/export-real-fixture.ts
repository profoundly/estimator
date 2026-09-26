#!/usr/bin/env -S npx tsx
//
// Standalone offline dataset generator — NOT wired into the app at
// runtime (src/lib/proposals.ts always calls the real proposals-summary
// edge function; there is no local-fixture code path to accidentally
// ship). Useful for manual/offline inspection or as a design reference,
// and for local dev only if you choose to point something at
// public/data/sample-proposals.json yourself.
//
// Pulls real proposals from the live project and classifies them
// client-side (same keyword logic as categorize-proposals.ts), writing
// {category, proposed_price, job_title} pairs to
// public/data/sample-proposals.json (gitignored). job_title here is a
// fully mocked, category-appropriate title (see MOCK_TITLES) — not the
// real (even scrubbed) title — since there's no reason to touch real
// client-identifying text for an offline sample when a synthetic title
// does the same visual job. category and proposed_price are still real.
// The deployed proposals-summary edge function is the one that uses
// real, scrubbed titles (scrubTitle there) — that's the production path.
//
// Classifies client-side because the `category` column doesn't exist on
// the remote `proposals` table yet — that migration needs manual
// approval (schema change, requires SQL Editor or a DB connection
// string, neither of which the service-role API key alone grants). Once
// the migration lands and categorize-proposals.ts has backfilled the
// real column, this script could select category directly instead.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env file).
//
// Usage: npx tsx scripts/export-real-fixture.ts

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Keep in sync with scripts/categorize-proposals.ts and
// supabase/functions/classify-project/index.ts
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

// Fully synthetic, category-appropriate titles for local dev — no real
// client text at all. Picked deterministically per row so re-running this
// script produces a stable fixture rather than reshuffling on every run.
const MOCK_TITLES: Record<string, string[]> = {
  "Reporting & Dashboards": [
    "Sales Performance Dashboard Build",
    "Custom Reporting for Marketing Attribution",
    "Executive KPI Dashboard Setup",
    "Revenue Reporting Overhaul",
    "Pipeline Analytics & Forecasting Reports",
    "Cross-Hub Reporting Cleanup",
  ],
  "Marketing & Campaigns": [
    "Email Nurture Campaign Build",
    "Lead Generation Landing Page Design",
    "Marketing Automation Workflow Setup",
    "Multi-Touch Attribution Configuration",
    "Content & SEO Strategy Implementation",
    "Ad Campaign Tracking Setup",
  ],
  "Integrations": [
    "Salesforce Two-Way Sync Build",
    "Custom API Integration with Internal Tools",
    "Shopify to HubSpot Connector",
    "Third-Party Billing System Integration",
    "Zapier Workflow Integration Project",
    "Data Sync Between HubSpot and ERP",
  ],
  "Workflow Automation": [
    "Lead Routing Workflow Automation",
    "Deal Stage Automation Build",
    "Operations Hub Workflow Redesign",
    "Automated Task Assignment Setup",
    "Multi-Step Nurture Automation",
    "Custom Workflow Logic for Renewals",
  ],
  "Portal Setup & Implementation": [
    "New HubSpot Portal Setup",
    "Enterprise HubSpot Onboarding",
    "HubSpot Implementation for Growing Team",
    "Portal Reset and Reconfiguration",
    "Initial CRM Configuration",
    "HubSpot Account Setup for New Business",
  ],
  "CRM & Sales Process": [
    "Sales Pipeline Redesign",
    "Deal Stage & Property Setup",
    "Sales Sequences and Playbook Build",
    "Forecasting Model Configuration",
    "CRM Cleanup for Sales Team",
    "Quote Template Customization",
  ],
  "Audit & Strategy": [
    "HubSpot Portal Health Audit",
    "Technical Review of Existing Setup",
    "HubSpot Strategy Assessment",
    "Process Optimization Consultation",
    "Full Account Audit and Recommendations",
    "Growth Strategy Advisory Engagement",
  ],
  "Website & CMS": [
    "HubSpot CMS Website Redesign",
    "Landing Page Design Project",
    "Blog Migration to HubSpot CMS",
    "Website Template Customization",
    "New Site Build on HubSpot CMS",
    "Web Page Design: Multi-Page Site",
  ],
  "Data Migration & Cleanup": [
    "CRM Data Migration and Cleanup",
    "Legacy System to HubSpot Migration",
    "Contact Database Deduplication",
    "Data Hygiene and Integrity Project",
    "Historical Data Import Project",
    "Post-Migration Data Cleanup",
  ],
  "RevOps & Architecture": [
    "RevOps Portal Architecture Redesign",
    "Data Model & Property Structure Overhaul",
    "Revenue Operations Process Build",
    "Cross-Team Operations Alignment Project",
    "HubSpot Architecture Consulting Engagement",
    "Property Structure Redesign for Scale",
  ],
  "Training & Enablement": [
    "Team Training on HubSpot Basics",
    "New User Onboarding & Coaching",
    "Sales Team Enablement Program",
    "HubSpot Admin Training Sessions",
    "Ongoing Enablement Support",
    "User Adoption Coaching Engagement",
  ],
  General: [
    "General HubSpot Support Project",
    "Miscellaneous HubSpot Work",
    "Ad Hoc HubSpot Assistance",
  ],
};

function mockTitle(category: string, index: number): string {
  const options = MOCK_TITLES[category] ?? MOCK_TITLES.General;
  return options[index % options.length];
}

// The real corpus mixes two things in `proposed_price`: real total project
// prices, and hourly rates that got entered into the same field for
// hourly-billed jobs (no separate column distinguishes them). Confirmed by
// inspection: ~150 rows are exactly $1 (placeholder/junk — attached to
// substantial job titles like "HubSpot & Netsuite Integration"), and there's
// a dense cluster from ~$35-$300 peaking hard at round numbers ($75 x154,
// $100, $125, $150) whose job descriptions are full migrations/audits/
// ongoing management — never actually $75-total projects. A straight
// stdev/IQR cut doesn't separate this, because $75 isn't a statistical
// outlier on a log scale, it's just a real number that means something
// different (rate, not total). So: a hard floor removes the hourly-rate
// contamination, then a generous 3-sigma cut on log10(price) catches
// genuine extreme-tail data errors on either side without trimming real
// (if rare) large enterprise projects. Keep in sync with
// supabase/functions/proposals-summary/index.ts.
const MIN_PLAUSIBLE_PROJECT_PRICE = 250;

function filterPlausiblePrices<T extends { proposed_price: number }>(rows: T[]): T[] {
  const floored = rows.filter((r) => r.proposed_price >= MIN_PLAUSIBLE_PROJECT_PRICE);
  if (floored.length < 2) return floored;

  const logPrices = floored.map((r) => Math.log10(r.proposed_price));
  const mean = logPrices.reduce((a, b) => a + b, 0) / logPrices.length;
  const variance =
    logPrices.reduce((a, b) => a + (b - mean) ** 2, 0) / (logPrices.length - 1);
  const sd = Math.sqrt(variance);
  const lower = mean - 3 * sd;
  const upper = mean + 3 * sd;

  return floored.filter((r) => {
    const lp = Math.log10(r.proposed_price);
    return lp >= lower && lp <= upper;
  });
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
  const pageSize = 1000;
  const classified: { category: string; proposed_price: number }[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("proposals")
      .select("job_title, job_description, proposed_price")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Fetch failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row.proposed_price || row.proposed_price <= 0) continue;
      const category = classify(`${row.job_title} ${row.job_description}`);
      classified.push({ category, proposed_price: row.proposed_price });
    }

    if (data.length < pageSize) break;
  }

  const filtered = filterPlausiblePrices(classified);
  const droppedCount = classified.length - filtered.length;

  const categoryCounts: Record<string, number> = {};
  const proposals = filtered.map((row, index) => {
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    return {
      category: row.category,
      proposed_price: row.proposed_price,
      job_title: mockTitle(row.category, index),
    };
  });

  writeFileSync(
    "public/data/sample-proposals.json",
    JSON.stringify({ proposals }, null, 2)
  );

  console.log(
    `Wrote ${proposals.length} real proposals to public/data/sample-proposals.json ` +
      `(dropped ${droppedCount} as implausible/hourly-rate-shaped prices)`
  );
  console.log("Category breakdown:");
  for (const [category, count] of Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  )) {
    console.log(`  ${category}: ${count}`);
  }
}

main();
