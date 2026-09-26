# Pricing Tool Strategy

## The problem it solves

Nobody knows what a HubSpot project should cost. The market has no public
benchmark — pricing lives in scattered proposals, agency-specific rate cards,
and word of mouth. A prospect evaluating whether to hire Profoundly (or
anyone) for a CRM implementation, an integration, or a migration has no way
to sanity-check a quote against reality. That opacity cuts both ways: it
makes buyers distrustful of quotes that seem high, and it makes them
under-scope projects that then blow past a "typical" price because the
work was never typical to begin with.

This tool exists to close that gap — but only partway, and on purpose.

## What it shows

A single-page, interactive scatter plot of real prices from actual closed
HubSpot proposals, plotted on a log price scale and grouped by project
category. Selecting a category isolates just that category's dots, so a
visitor can see the real spread for the type of work they're considering —
not a single average, not a "starting at" number, but the full range of
what similar projects have actually cost.

Access is gated behind an email capture (name + work email, HubSpot form +
Supabase, in parallel) — the data itself is the value exchange for the
lead.

## The strategic bet: transparency as trust-building, not as an answer

The core idea is that **showing the real, wide range builds more trust than
hiding it would** — and that the width of the range is itself the pitch for
talking to a human.

Project prices for a given category can span 10x or more (a "HubSpot Audit"
might run $1,000 or $15,000 depending on scope). A visitor who sees that
spread learns two things simultaneously:

1. **We're not hiding the ball.** Real numbers, real variance, no rounded-up
   sales-friendly range. This is the opposite of a typical agency's opaque
   "let's hop on a call to discuss pricing" stonewall, and it's meant to
   read that way.
2. **Their number depends entirely on their scope.** The range is too wide
   to be useful as a quote on its own — and that's the honest truth, not a
   sales tactic dressed up as one. The tool explicitly disclaims itself
   ("This is not a quote. Your actual price will vary based on scope,
   complexity, timeline, and partner type.") rather than implying precision
   it doesn't have.

The "what drives pricing" section does the next piece of work: it names
the actual variables that move a project up or down the range (number of
Hubs involved, integrations, custom development, enterprise features, team
size/training). This converts an abstract "it depends" into a concrete list
a visitor can hold their own project up against — which is exactly the
input a project advisor needs to narrow that range into a real number.

## Where the advisor conversation comes in

The tool is deliberately built to create — not resolve — the tension it
shows. Real data proves the range is wide and real; the pricing-drivers
list proves the range is explainable, not random; but neither one can tell
a visitor where *their* project falls, because that depends on specifics
only a conversation can surface. The CTA ("Get matched with a vetted
HubSpot expert") is positioned as the natural next step once that tension
is felt, not as an escape hatch from a confusing chart.

In other words: the chart's job is to make "I don't actually know what
this should cost" concrete and credible. The advisor call's job is to
resolve it. The tool should never try to do the advisor's job — no
estimate calculator, no "your project is probably around $X" logic. That
line is intentional: the moment the tool starts guessing a number, it
stops being a trust-building transparency play and starts being a
under-informed quote generator that will be wrong often enough to undercut
the trust it built.

## How it's expected to be used

- **Top-of-funnel content**, linked from marketing (ads, blog posts,
  outbound) promising real pricing data — the kind of resource that gets
  shared precisely because it's unusually candid for the category.
- **Lead capture mechanism**: every view starts with an email gate, feeding
  both HubSpot (system of record) and Supabase (internal tracking) so the
  lead exists in both systems regardless of whether they ever click through
  to book a call.
- **Qualification signal, informally**: which category someone filters to
  is itself a signal of project type for whoever follows up with them —
  not tracked/scored today, but a natural extension if this proves out.
- **Not a self-serve pricing tool** — it should never be positioned as a
  substitute for a scoping call, only as the thing that makes a visitor
  want one.

## Data integrity note

The credibility of the whole approach depends on the data being real and
the categories being honest. Right now the category taxonomy is a guessed
keyword classifier, not derived from the actual proposal corpus (tracked in
[throughline-os#2](https://github.com/sbalcombe/throughline-os/issues/2)) —
worth resolving before this goes live, since a mislabeled category
undermines the "we're not hiding anything" premise the whole tool is built
on.
