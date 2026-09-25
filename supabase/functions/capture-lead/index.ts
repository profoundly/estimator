// Supabase Edge Function: /capture-lead
//
// Replaces the contact-capture half of the old /estimate function now that
// the email gate fires before any project description exists. Verifies
// Turnstile, then writes a submissions row. The client calls this in
// parallel with a direct POST to the HubSpot form (see src/lib/hubspot.ts)
// — this is the Supabase side of that dual write, not a replacement for it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Same pattern as supabase/functions/estimate/index.ts — verification is
// only enforced when TURNSTILE_SECRET_KEY is set, so this ships before the
// widget is provisioned.
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");

async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET!);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { email, firstName, lastName, turnstileToken } = await req.json();

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "A valid email is required" }, 400);
    }

    if (TURNSTILE_SECRET) {
      if (typeof turnstileToken !== "string" || !turnstileToken) {
        return jsonResponse({ error: "Verification required" }, 400);
      }
      const remoteIp = req.headers.get("x-forwarded-for") || "";
      const verified = await verifyTurnstile(turnstileToken, remoteIp);
      if (!verified) {
        return jsonResponse({ error: "Verification failed" }, 400);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const safeFirstName =
      typeof firstName === "string" && firstName.trim() ? firstName.trim().slice(0, 200) : null;
    const safeLastName =
      typeof lastName === "string" && lastName.trim() ? lastName.trim().slice(0, 200) : null;

    // NOTE: submissions has columns (description, estimate_low, etc.) left
    // over from the old text-description flow — not verified here whether
    // any of those are NOT NULL without a default, since no migration file
    // for this table exists in the repo (see migration 20250807's own
    // comment). If this insert fails on a missing-column constraint, that's
    // the first thing to check.
    const { error: insertError } = await supabase.from("submissions").insert({
      email,
      first_name: safeFirstName,
      last_name: safeLastName,
    });

    if (insertError) {
      console.error("Failed to save submission:", insertError.message);
      return jsonResponse({ error: "Failed to save" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("capture-lead error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
