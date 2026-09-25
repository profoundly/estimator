// Supabase Edge Function for project classification
// Provides server-side classification of project descriptions into categories

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClassificationResult {
  categories: string[];
  primaryCategory: string;
  confidence: number;
}

// Derived from the real proposal corpus, not guessed up front — see
// scripts/categorize-proposals.ts for the analysis and throughline-os#2.
// Keep in sync with that script.
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

function classifyProject(description: string): ClassificationResult {
  const lower = description.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const categories = sorted.map(([cat]) => cat);
  const primaryCategory = categories[0] || "General";
  const maxScore = sorted.length > 0 ? sorted[0][1] : 0;
  const confidence = Math.min(maxScore / 5, 1);

  return { categories, primaryCategory, confidence };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'description' field" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const result = classifyProject(description);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
