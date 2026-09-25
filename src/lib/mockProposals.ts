import { CATEGORY_COLORS } from "@/components/PriceScatter";
import type { ProposalPoint } from "@/lib/proposals";

const CATEGORIES = Object.keys(CATEGORY_COLORS);

// Purely decorative data for the email gate's greyed-out preview of the
// category filter row — gives it the real 11 category chips with
// plausible-looking counts instead of a single "All categories" pill.
// No fetch happens here; the gate still blocks any server call until the
// email is submitted (see handleGateSubmit in Index.tsx). Deterministic
// so it doesn't reshuffle on re-render.
function seeded(i: number): number {
  const x = Math.sin(i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const MOCK_PROPOSALS: ProposalPoint[] = CATEGORIES.flatMap((category, ci) => {
  const count = 10 + Math.floor(seeded(ci) * 25);
  return Array.from({ length: count }, () => ({
    category,
    proposed_price: 0,
    job_title: "",
  }));
});
