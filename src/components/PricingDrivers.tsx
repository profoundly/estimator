import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Layers, Plug, Code2, Sparkles, Users, Info } from "lucide-react";

const DRIVERS = [
  {
    icon: Layers,
    title: "Number of HubSpot Hubs involved",
    description:
      "Projects spanning multiple Hubs (Marketing, Sales, Service, CMS, Operations) require more setup, configuration, and cross-Hub coordination than a single-Hub engagement.",
  },
  {
    icon: Plug,
    title: "Integrations with other systems",
    description:
      "Connecting HubSpot to a CRM, ERP, data warehouse, or other tools adds discovery, field mapping, and sync work that varies significantly by system and complexity.",
  },
  {
    icon: Code2,
    title: "Custom development",
    description:
      "Custom objects, modules, workflows, and reports built specifically for your business sit higher than out-of-the-box configuration.",
  },
  {
    icon: Sparkles,
    title: "Enterprise features",
    description:
      "Advanced capabilities like multi-touch attribution, account-based marketing, and predictive scoring need additional configuration and modeling.",
  },
  {
    icon: Users,
    title: "Team size, training, and enablement",
    description:
      "The number of users, depth of training, and ongoing enablement needs all influence the overall effort to deliver a successful rollout.",
  },
] as const;

interface PricingDriversProps {
  // Sidebar placement (to keep it above the fold alongside the chart) needs
  // a much shorter card than the full below-the-fold version — icon+title
  // only, no descriptions, tighter spacing.
  compact?: boolean;
  // Gate preview only: renders each driver's title as a grey bar instead
  // of legible copy, so nothing real reads as actual page content before
  // the email is submitted. Never set true on the real results page.
  redacted?: boolean;
}

export function PricingDrivers({ compact = false, redacted = false }: PricingDriversProps) {
  return (
    <Card>
      <CardHeader className={compact ? "pb-4" : undefined}>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className={compact ? "text-base" : "text-lg"}>
              What drives pricing
            </CardTitle>
            {!compact && (
              <CardDescription>
                Ranges are wide because every project's mix of these factors
                is different.
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className={compact ? "space-y-2.5" : "space-y-4"}>
          {DRIVERS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-center gap-3">
              <div
                className={`flex-shrink-0 rounded-lg bg-secondary/60 flex items-center justify-center ${
                  compact ? "w-7 h-7" : "w-9 h-9"
                }`}
              >
                <Icon className={compact ? "w-3.5 h-3.5 text-muted-foreground" : "w-4 h-4 text-muted-foreground"} />
              </div>
              <div className={`flex-1 min-w-0 ${redacted ? "flex items-center" : ""}`}>
                {redacted ? (
                  <span
                    className="block h-4 w-4/5 rounded bg-gray-300"
                    aria-hidden="true"
                  />
                ) : (
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                )}
                {!compact && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
