// Supabase Edge Function: /proposals-summary
//
// Returns {category, proposed_price, job_title} for every categorized
// proposal — job_title is scrubbed (see scrubTitle below) before it
// leaves this function, never job_description or any other raw field.
// Used to render the price scatter and its per-dot tooltip without
// exposing the full raw proposal text to the client.
//
// proposals has no anon read policy (see 20250806_create_proposals.sql),
// so this function's service-role key is the only way the client can see
// this data at all.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Real status values, confirmed against live data: PENDING (2,392),
  // NOT_ACCEPTED (597), ACCEPTED (197). Deliberately not filtering by
  // status — ACCEPTED-only would shrink the dataset to 197 rows spread
  // across 11 categories (too sparse for some), and PENDING/NOT_ACCEPTED
  // prices are still real quotes for real scoped work, just not the ones
  // that happened to close.
  const { data, error } = await supabase
    .from("proposals")
    .select("category, proposed_price, job_title")
    .not("category", "is", null);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const proposals = filterPlausiblePrices(data ?? []).map((row) => ({
    category: row.category,
    proposed_price: row.proposed_price,
    job_title: scrubTitle(row.job_title ?? ""),
  }));

  return new Response(JSON.stringify({ proposals }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

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
// scripts/export-real-fixture.ts.
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

// Best-effort removal of client-identifying names from job_title before it
// leaves this function. job_title is freeform text entered by job
// posters — the "PII stripped at import time" guarantee on this table
// only covers structured provider/customer name/ID fields, not names that
// show up inside the title itself (e.g. "Location pages for Ambs Call
// Center"). This catches the common "for/at/with/@ <Company Name>"
// pattern at the end of a title; it is NOT a guarantee of full
// anonymization, just a reduction of the most common leak shape. Keep in
// sync with scripts/export-real-fixture.ts.
function scrubTitle(title: string): string {
  const cleaned = title
    .replace(/\s+(for|at|with|@)\s+[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,4}\s*$/, "")
    .replace(/[\s\-|:]+$/, "")
    .trim();
  return cleaned.length >= 4 ? cleaned : "HubSpot project";
}
