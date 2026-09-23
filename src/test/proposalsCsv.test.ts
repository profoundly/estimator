import { describe, it, expect } from "vitest";
import {
  isLargeStaleDeletion,
  parseProposalCsv,
  toProposals,
} from "../../scripts/lib/proposals-csv";

const HEADER =
  "proposal_id,job_id,job_title,job_description,currency,proposed_price,proposal_status,created_at";
const ROW = "7,3,HubSpot CRM Setup,<div>desc</div>,usd,54000,ACCEPTED,2026-01-02";

describe("parseProposalCsv", () => {
  it("strips a leading UTF-8 BOM so the first column is still proposal_id", () => {
    // A BOM-bearing CSV is exactly what an Excel round-trip produces. Without
    // bom:true the first header becomes "\uFEFFproposal_id", so row.proposal_id
    // is undefined and the row is dropped -- the failure that can wipe the table.
    const withBom = `\uFEFF${HEADER}\n${ROW}`;

    const rows = parseProposalCsv(withBom);
    const proposals = toProposals(rows);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].proposal_id).toBe(7);
    expect(proposals[0].job_title).toBe("HubSpot CRM Setup");
  });
});

describe("toProposals", () => {
  it("keeps rows with a usable id and title, mapping the estimator columns", () => {
    const rows = parseProposalCsv(`${HEADER}\n${ROW}`);
    const proposals = toProposals(rows);

    expect(proposals[0]).toMatchObject({
      proposal_id: 7,
      job_id: 3,
      job_title: "HubSpot CRM Setup",
      currency: "usd",
      proposed_price: 54000,
      proposal_status: "ACCEPTED",
    });
  });

  it("returns [] when nothing usable parses, so the importer can refuse to wipe the table", () => {
    // Unexpected headers (a wrong or malformed file): every row lacks a numeric
    // proposal_id, so all are filtered out. The importer keys its abort guard
    // off this empty result rather than deleting every existing row.
    const garbage = "foo,bar\n1,2\n3,4";

    expect(toProposals(parseProposalCsv(garbage))).toEqual([]);
    expect(toProposals(parseProposalCsv(""))).toEqual([]);
  });

  it("drops rows missing an id or a title", () => {
    const rows = parseProposalCsv(
      `${HEADER}\n` +
        `0,3,No Id Kept,,usd,100,PENDING,2026-01-02\n` + // id 0 -> dropped
        `8,3,,,usd,100,PENDING,2026-01-02\n` + // no title -> dropped
        `9,3,Kept,,usd,100,PENDING,2026-01-02` // kept
    );

    const proposals = toProposals(rows);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].proposal_id).toBe(9);
  });
});

describe("isLargeStaleDeletion", () => {
  it("flags pruning most of a real-sized table (the truncated-file case)", () => {
    // 5 rows parsed out of ~2000 would delete ~1995: exactly what --force guards.
    expect(isLargeStaleDeletion(2000, 1995)).toBe(true);
  });

  it("allows a normal refresh that churns a modest fraction", () => {
    expect(isLargeStaleDeletion(2000, 300)).toBe(false);
  });

  it("does not trip at exactly half (only strictly greater)", () => {
    expect(isLargeStaleDeletion(100, 50)).toBe(false);
    expect(isLargeStaleDeletion(100, 51)).toBe(true);
  });

  it("skips the guard on a tiny or empty table, avoiding false positives", () => {
    // Below the floor a big fraction is meaningless (dev tables, first run).
    expect(isLargeStaleDeletion(5, 5)).toBe(false);
    expect(isLargeStaleDeletion(0, 0)).toBe(false);
  });
});
