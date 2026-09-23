import { parse } from "csv-parse/sync";

// Pure, side-effect-free CSV parsing/mapping for the proposals import. Kept
// separate from import-proposals.ts (which loads .env, talks to Supabase, and
// runs on import) so this logic can be unit-tested in isolation.

export interface Proposal {
  proposal_id: number;
  job_id: number;
  job_title: string;
  job_description: string;
  currency: string;
  proposed_price: number;
  proposal_status: string;
  created_at: string;
}

function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,£]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parse the proposals CSV into raw rows keyed by header.
 *
 * `bom: true` strips a leading UTF-8 BOM so it does not bind to the first
 * header ("proposal_id"). Without it every row's id would parse as 0, get
 * dropped by toProposals(), and the importer's stale-row cleanup would then
 * delete every existing row (wiping the table).
 */
export function parseProposalCsv(csvText: string): Record<string, string>[] {
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];
}

// Below this many existing rows the delete guard is skipped: on a tiny dev or
// first-run table a large deletion fraction is meaningless (and expected).
export const DELETE_GUARD_MIN_EXISTING = 10;

// Fraction of existing rows above which a stale-delete is treated as suspicious
// (a truncated or wrong file) rather than a normal refresh.
export const DELETE_GUARD_MAX_FRACTION = 0.5;

/**
 * True when deleting `staleCount` of `existingCount` rows is large enough to
 * look like a truncated/wrong import rather than a normal refresh, so the
 * importer should refuse unless explicitly forced. The zero-row guard only
 * catches a fully empty parse; this catches a partial file that would still
 * prune most of the table.
 */
export function isLargeStaleDeletion(
  existingCount: number,
  staleCount: number
): boolean {
  if (existingCount < DELETE_GUARD_MIN_EXISTING) return false;
  return staleCount / existingCount > DELETE_GUARD_MAX_FRACTION;
}

/**
 * Map raw rows to proposals, keeping only the estimator columns (dropping any
 * PII) and only rows with a usable id and title.
 */
export function toProposals(rows: Record<string, string>[]): Proposal[] {
  return rows
    .map((row) => ({
      proposal_id: parseInt(row.proposal_id) || 0,
      job_id: parseInt(row.job_id) || 0,
      job_title: (row.job_title || "").trim(),
      job_description: (row.job_description || "").trim(),
      currency: (row.currency || "usd").toLowerCase(),
      proposed_price: parsePrice(row.proposed_price),
      proposal_status: (row.proposal_status || "").trim(),
      created_at: row.created_at || new Date().toISOString(),
    }))
    .filter((p) => p.proposal_id > 0 && p.job_title);
}
