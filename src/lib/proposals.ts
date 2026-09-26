import { supabase } from "./supabase";

export interface ProposalPoint {
  category: string;
  proposed_price: number;
  // Scrubbed job title (see scrubTitle in scripts/export-real-fixture.ts /
  // supabase/functions/proposals-summary) — best-effort removal of
  // client-identifying names, not guaranteed fully anonymized.
  job_title: string;
}

export async function fetchProposalsSummary(): Promise<ProposalPoint[]> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.functions.invoke("proposals-summary");

  if (error) {
    throw new Error(error.message || "Failed to load pricing data");
  }

  return data.proposals as ProposalPoint[];
}

export interface CaptureLeadInput {
  email: string;
  firstName: string;
  lastName: string;
  turnstileToken?: string;
}

export async function captureLead(
  input: CaptureLeadInput
): Promise<{ success: boolean }> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.functions.invoke("capture-lead", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Failed to save your details");
  }

  return data;
}
