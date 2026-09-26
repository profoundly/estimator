import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EmailCaptureModal, type ContactInfo } from "@/components/EmailCaptureModal";
import { PriceScatter, CategoryFilter } from "@/components/PriceScatter";
import { Disclaimer, MatchCta } from "@/components/DisclaimerCta";
import { PricingDrivers } from "@/components/PricingDrivers";
import { fetchProposalsSummary, captureLead, type ProposalPoint } from "@/lib/proposals";
import { MOCK_PROPOSALS } from "@/lib/mockProposals";
import { submitToHubSpotForm } from "@/lib/hubspot";
import { AlertCircle, ScatterChart } from "lucide-react";

type AppState = "gate" | "loading" | "results" | "error";

export default function Index() {
  const [state, setState] = useState<AppState>("gate");
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState<ProposalPoint[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setState("loading");
    try {
      const data = await fetchProposalsSummary();
      setProposals(data);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pricing data");
      setState("error");
    }
  }, []);

  const handleGateSubmit = useCallback(
    async (contact: ContactInfo) => {
      // Dual write, in parallel: HubSpot is the system of record for the
      // lead, Supabase is kept alongside it (per explicit direction, not a
      // fallback for one or the other). Neither blocks the other, and
      // neither blocks the user from reaching the results — a transient
      // write failure here shouldn't gate content the way the email
      // capture itself does.
      const results = await Promise.allSettled([
        submitToHubSpotForm({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
        }),
        captureLead({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          turnstileToken: contact.turnstileToken,
        }),
      ]);

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(
            `Lead capture write ${i === 0 ? "(HubSpot)" : "(Supabase)"} failed:`,
            r.reason
          );
        }
      });

      loadProposals();
    },
    [loadProposals]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex flex-1 flex-col mx-auto w-full max-w-7xl px-4 py-8">
        {state === "gate" && (
          <div className="relative">
            {/* Same layout as the real results page (header, category
                chips, CTA card, pricing drivers) greyed out and
                non-interactive — but the chart itself is a plain empty
                state, not fake/mock data, and nothing here is fetched
                from the server before the email is submitted. */}
            <div
              className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start grayscale opacity-40 pointer-events-none select-none"
              aria-hidden="true"
            >
              <div className="space-y-6 min-w-0">
                <div>
                  <h2 className="text-lg font-semibold">What HubSpot projects actually cost</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every dot is one real HubSpot project. Pick a category to see just that range.
                  </p>
                </div>

                <CategoryFilter proposals={MOCK_PROPOSALS} selected={null} onSelect={() => {}} />

                <div className="w-full h-[420px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <ScatterChart className="w-10 h-10 text-muted-foreground/40" />
                </div>

                <Disclaimer />
              </div>

              <div className="space-y-6">
                <MatchCta />
                <PricingDrivers compact redacted />
              </div>
            </div>

            <EmailCaptureModal open={true} onSubmit={handleGateSubmit} />
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-1 items-center justify-center py-24">
            <p className="text-sm text-muted-foreground">Loading pricing data...</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-destructive font-medium">Error</p>
            <p className="text-muted-foreground text-sm max-w-md text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary underline hover:no-underline"
            >
              Reload page
            </button>
          </div>
        )}

        {state === "results" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="space-y-6 min-w-0">
              <div>
                <h2 className="text-lg font-semibold">What HubSpot projects actually cost</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Every dot is one real HubSpot project. Pick a category to see just that range.
                </p>
              </div>

              <CategoryFilter
                proposals={proposals}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />

              <PriceScatter proposals={proposals} selectedCategory={selectedCategory} />

              <Disclaimer />
            </div>

            {/* Sidebar keeps the CTA and pricing drivers visible alongside
                the chart on desktop, rather than requiring a scroll past it. */}
            <div className="space-y-6 lg:sticky lg:top-8">
              <MatchCta />
              <PricingDrivers compact />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
