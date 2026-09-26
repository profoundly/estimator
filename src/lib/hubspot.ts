// Direct client-side submission to the existing HubSpot form
// (FORM-USERS-PRICINGBENCHMARK-2026, portal 47127618) via HubSpot's public
// Forms Submission API — this is the same mechanism HubSpot's own embedded
// forms use, so no secret key is needed and no edge function is required
// for this half of the dual write. The Supabase write (capture-lead) is
// separate and runs in parallel, not instead of this.
//
// VITE_HUBSPOT_FORM_GUID is required and not yet set anywhere — find it in
// the form's HubSpot settings (Options > Embed, or the form's URL) and add
// it to .env. Portal ID is hardcoded since it's been confirmed consistent
// across every HubSpot tool call this session (accountId/hubId 47127618).

const HUBSPOT_PORTAL_ID = "47127618";

export interface HubSpotFormFields {
  email: string;
  firstName: string;
  lastName: string;
}

export async function submitToHubSpotForm(
  fields: HubSpotFormFields
): Promise<{ success: boolean; error?: string }> {
  const formGuid = import.meta.env.VITE_HUBSPOT_FORM_GUID;

  if (!formGuid) {
    console.warn(
      "VITE_HUBSPOT_FORM_GUID is not set — skipping HubSpot form submission. " +
        "The lead was still captured in Supabase via capture-lead."
    );
    return { success: false, error: "HubSpot form not configured" };
  }

  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formGuid}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: [
          { name: "email", value: fields.email },
          { name: "firstname", value: fields.firstName },
          { name: "lastname", value: fields.lastName },
        ],
        context: {
          pageUri: window.location.href,
          pageName: document.title,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("HubSpot form submission failed:", res.status, body);
      return { success: false, error: `HubSpot responded ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("HubSpot form submission error:", err);
    return { success: false, error: "Network error submitting to HubSpot" };
  }
}
