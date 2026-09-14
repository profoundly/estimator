#!/usr/bin/env -S npx tsx
//
// Import proposals from a CSV file into the Supabase `proposals` table.
// Strips PII columns (provider/customer names and IDs) before inserting.
//
// Usage:
//   npm run import:proposals [-- path/to/proposals.csv] [--force]
//
// --force skips the large-deletion safety guard (see below). Only use it when a
// big prune is genuinely intended.
//
// Reads Supabase credentials from a .env file in the project root (or from real
// exported environment variables, which take precedence). Needs:
//   - SUPABASE_URL (falls back to the frontend's VITE_SUPABASE_URL)
//   - SUPABASE_SERVICE_ROLE_KEY  (server-side only; must NOT be VITE_-prefixed,
//     or Vite would bundle this RLS-bypassing key into the public browser build)
//
// By default reads the CSV from data/proposals.csv if no path is given.

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  isLargeStaleDeletion,
  parseProposalCsv,
  toProposals,
} from "./lib/proposals-csv";

// Load .env if present. This does not override real exported env vars, and is a
// no-op when there is no .env, so both the .env and export workflows work.
dotenv.config({ quiet: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// The URL is not secret, so if a VITE_SUPABASE_URL is set (e.g. for the frontend
// build) the import reuses it as a fallback: an admin then only needs to add the
// service role key.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase credentials. Add them to your .env (or export them):"
  );
  console.error("  SUPABASE_URL=...            (or reuse VITE_SUPABASE_URL)");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...   (server-side; no VITE_ prefix)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Args: the first non-flag argument is the CSV path; --force skips the
// large-deletion guard.
const args = process.argv.slice(2);
const force = args.includes("--force");
const positional = args.filter((a) => !a.startsWith("--"));
const csvPath = resolve(positional[0] || "data/proposals.csv");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Reading CSV from: ${csvPath}`);
  const csvText = readFileSync(csvPath, "utf-8");

  const rows = parseProposalCsv(csvText);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const proposals = toProposals(rows);
  console.log(`${proposals.length} valid proposals after filtering`);

  // Safety guard: never let an empty parse wipe the table. The stale-row
  // cleanup below deletes every id not present in this import, so proceeding
  // with zero rows (a wrong/truncated file, a parse failure, an unexpected
  // header) would clear all proposals. Abort instead and leave the data intact.
  if (proposals.length === 0) {
    console.error(
      "Refusing to import: 0 valid proposals parsed from the CSV. " +
        "Check the file path, headers, and contents. No changes were made."
    );
    process.exit(1);
  }

  const BATCH_SIZE = 500;

  // Work out which rows would be pruned (in the table but not in this import)
  // BEFORE writing anything, so the large-deletion guard can abort with the
  // table untouched. Computing stale ids from the pre-upsert snapshot yields
  // the same set as post-upsert: the upsert only adds imported ids, which are
  // excluded from stale by definition.
  const importedIds = new Set(proposals.map((p) => p.proposal_id));
  const { data: existing, error: fetchError } = await supabase
    .from("proposals")
    .select("proposal_id");

  if (fetchError) {
    console.error("Failed to read existing proposals:", fetchError.message);
    process.exit(1);
  }

  const existingIds = (existing ?? []).map((r) => r.proposal_id as number);
  const staleIds = existingIds.filter((id) => !importedIds.has(id));

  // Large-deletion guard: a truncated or wrong file can parse a handful of valid
  // rows (so the zero-row guard passes) yet still prune most of the table. Refuse
  // unless explicitly forced. Checked before any write, so this leaves the data
  // intact.
  if (!force && isLargeStaleDeletion(existingIds.length, staleIds.length)) {
    console.error(
      `Refusing to import: this would delete ${staleIds.length} of ` +
        `${existingIds.length} existing proposals (keeping ${proposals.length}). ` +
        "That usually means a truncated or wrong file. No changes were made. " +
        "Re-run with --force if this large prune is intentional."
    );
    process.exit(1);
  }

  // Upsert the new data first, then remove anything no longer present. This
  // avoids the empty-table window a delete-then-insert would create: the
  // `estimate` function always sees a fully populated table.
  let inserted = 0;

  for (let i = 0; i < proposals.length; i += BATCH_SIZE) {
    const batch = proposals.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("proposals")
      .upsert(batch, { onConflict: "proposal_id" });

    if (insertError) {
      console.error(
        `Failed to insert batch ${i}-${i + batch.length}:`,
        insertError.message
      );
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Upserted ${inserted}/${proposals.length}`);
  }

  if (staleIds.length > 0) {
    console.log(`Removing ${staleIds.length} stale proposals...`);
    for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
      const chunk = staleIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from("proposals")
        .delete()
        .in("proposal_id", chunk);

      if (deleteError) {
        console.error("Failed to delete stale proposals:", deleteError.message);
        process.exit(1);
      }
    }
  }

  console.log(`\nDone. ${inserted} proposals imported, ${staleIds.length} removed.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
