import { Card, CardContent } from "@/components/ui/card";
import { Info, ArrowRight } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="flex items-start gap-2 px-1">
      <Info className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground/80">
          This is not a quote.
        </span>{" "}
        Your actual price will vary based on scope, complexity, timeline, and
        partner type.
      </p>
    </div>
  );
}

export function MatchCta() {
  return (
    <Card className="text-center">
      <CardContent className="py-8 px-6">
        <p className="text-base font-medium text-foreground mb-4">
          Want a more accurate price for your HubSpot needs?
        </p>
        <p className="text-sm text-muted-foreground mb-5">
          Tell us about your needs and we'll connect you with a shortlist
          of vetted HubSpot experts in ~24 hours.
        </p>
        <a
          href="https://profound.ly/help-request/book-a-call"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(262,80%,50%)] hover:bg-[hsl(262,80%,45%)] text-white text-sm font-semibold transition-colors shadow-sm"
        >
          Discuss your needs
          <ArrowRight className="w-4 h-4" />
        </a>
      </CardContent>
    </Card>
  );
}
