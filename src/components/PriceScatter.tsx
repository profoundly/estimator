import { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import type { ProposalPoint } from "@/lib/proposals";

// Fixed hue per category, chosen once and never reassigned when the filter
// changes — color always means the same category, whether or not it's the
// one currently isolated. Order matches CATEGORY_KEYWORDS in
// supabase/functions/classify-project (and scripts/categorize-proposals.ts),
// which is derived from the real proposal corpus (throughline-os#2), not
// guessed up front.
export const CATEGORY_COLORS: Record<string, string> = {
  "Reporting & Dashboards": "#2563eb",
  "Marketing & Campaigns": "#ea580c",
  "Integrations": "#a16207",
  "Workflow Automation": "#16a34a",
  "Portal Setup & Implementation": "#0891b2",
  "CRM & Sales Process": "#9333ea",
  "Audit & Strategy": "#dc2626",
  "Website & CMS": "#059669",
  "Data Migration & Cleanup": "#db2777",
  "RevOps & Architecture": "#475569",
  "Training & Enablement": "#ca8a04",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_COLORS);

interface ScatterPoint {
  y: number;
  price: number;
  category: string;
  job_title: string;
}

// Deterministic pseudo-random jitter so re-renders don't reshuffle points.
// The y-axis carries no meaning on its own — it exists only to spread
// same-price dots apart vertically so they don't stack into a single line.
function seededJitter(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface PriceScatterProps {
  proposals: ProposalPoint[];
  selectedCategory: string | null;
}

export function PriceScatter({ proposals, selectedCategory }: PriceScatterProps) {
  const byCategory = useMemo(() => {
    const points: Record<string, ScatterPoint[]> = {};
    proposals.forEach((p, i) => {
      const category = p.category;
      if (!points[category]) points[category] = [];
      points[category].push({
        y: seededJitter(i) * 100,
        price: p.proposed_price,
        category,
        job_title: p.job_title,
      });
    });
    return points;
  }, [proposals]);

  const visibleCategories = selectedCategory
    ? [selectedCategory]
    : CATEGORY_ORDER.filter((c) => byCategory[c]?.length);

  // Range band reflects whatever's currently visible — the overall market
  // when nothing's selected, just that category's own spread once one is
  // picked.
  const { low, high } = useMemo(() => {
    const prices = (
      selectedCategory ? proposals.filter((p) => p.category === selectedCategory) : proposals
    ).map((p) => p.proposed_price);
    if (prices.length === 0) return { low: 0, high: 0 };
    return { low: Math.min(...prices), high: Math.max(...prices) };
  }, [proposals, selectedCategory]);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="priceRangeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {low > 0 && high > low && (
            <ReferenceArea
              x1={low}
              x2={high}
              y1={0}
              y2={100}
              fill="url(#priceRangeGradient)"
              stroke="none"
              ifOverflow="visible"
            />
          )}
          <XAxis
            type="number"
            dataKey="price"
            scale="log"
            domain={[
              (dataMin: number) => Math.max(1, Math.floor(dataMin * 0.8)),
              (dataMax: number) => Math.ceil(dataMax * 1.2),
            ]}
            allowDataOverflow
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
            }
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            label={{
              value: "price (log scale)",
              position: "insideBottom",
              offset: -5,
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            tick={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            label={{
              value: "each dot is one real HubSpot project",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ScatterPoint;
              return (
                <div className="rounded-md border border-border bg-white px-3 py-2 text-xs shadow-md max-w-xs">
                  <div className="font-medium">{point.job_title}</div>
                  <div className="text-muted-foreground">
                    ${point.price.toLocaleString()}
                  </div>
                </div>
              );
            }}
          />
          {visibleCategories.map((category) => (
            <Scatter
              key={category}
              name={category}
              data={byCategory[category] || []}
              fill={CATEGORY_COLORS[category]}
              fillOpacity={selectedCategory ? 0.85 : 0.65}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      {low > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground px-2 -mt-2">
          <span>low ${low.toLocaleString()}</span>
          <span>high ${high.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

interface CategoryFilterProps {
  proposals: ProposalPoint[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryFilter({ proposals, selected, onSelect }: CategoryFilterProps) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    proposals.forEach((p) => {
      c[p.category] = (c[p.category] || 0) + 1;
    });
    return c;
  }, [proposals]);

  const categories = CATEGORY_ORDER.filter((c) => counts[c]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          selected === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-white text-muted-foreground hover:border-primary/50"
        }`}
      >
        All categories
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category === selected ? null : category)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            selected === category
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-muted-foreground hover:border-primary/50"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[category] }}
          />
          {category}
          <span className="opacity-60">({counts[category]})</span>
        </button>
      ))}
    </div>
  );
}
