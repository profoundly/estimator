# Profoundly Estimator

A public price estimator for HubSpot projects. A visitor describes their project,
and the app returns a price range (low / typical / high) plus a handful of
similar past projects for context. The estimate is derived from Profoundly's
historical responses (proposals) data.

The raw responses data never reaches the browser. The visitor's description is
sent to a server-side Supabase Edge Function, which runs the similarity search
and price calculation against the data and returns only the computed estimate
and anonymized reference points.

## Architecture

- **Frontend:** React + TypeScript + Vite. It collects the project description
  and an email, calls the `estimate` function, and renders the result. It holds
  no proposal data.
- **`estimate` Edge Function** (`supabase/functions/estimate`): the core. Given a
  description, it queries the `proposals` table, runs the TF-IDF similarity
  search, scope analysis, and price calculation, saves the submission, and
  returns the estimate plus anonymized similar-project titles and prices.
- **`proposals` table** (`supabase/migrations`): the estimator's dataset. It
  holds only the columns needed to estimate (title, description, currency,
  price, status, dates) and no provider or customer identity. Row-level security
  is on with no public read policy, so the only access path is the `estimate`
  function via the service role.
- **`submissions` table:** captures each visitor's description, email, and the
  estimate returned, for follow-up.

### Why the data lives server-side

The estimator is public. An earlier version shipped the full dataset as a static
CSV the browser downloaded, which exposed provider and customer names, internal
IDs, and response pitch text to anyone. Moving the data into a locked-down table
behind the `estimate` function means the browser only ever sees a computed
estimate and generalized project titles, never the underlying records.

## Local development

Prerequisites: Node 20+ and npm.

```bash
npm install
npm run dev      # start the dev server (http://127.0.0.1:8080)
npm run build    # type-check and build for production
npm run test     # run unit tests
npm run lint     # lint
```

### Environment variables

For the data refresh below, copy `.env.example` to `.env` (gitignored) and set
the import script's credentials:

- `SUPABASE_SERVICE_ROLE_KEY` — server-side only (see the warning below).
- `SUPABASE_URL` — the project URL. Optional if `VITE_SUPABASE_URL` is set, as
  the import falls back to it.

> **Never prefix the service role key with `VITE_`.** It bypasses row-level
> security, and a `VITE_` prefix would bundle it into the public browser build,
> handing anyone full access to your database. Keep it un-prefixed so Vite never
> touches it.

The frontend build reads its own public, RLS-gated vars (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`), and the Edge
Functions read their secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`). In a
deploy these are configured by whoever ships the app (the hosting platform's
build env and Supabase function secrets); add the `VITE_*` vars to your `.env`
as well if you run the frontend locally. None of them are needed just to run the
import.

## Updating the proposals data

The estimator is only as good as its data, so refresh it whenever the historical
responses have changed materially. There are two steps: export a fresh CSV from
the Profoundly app, then import it into the estimator's Supabase table.

### 1. Export the CSV from the Profoundly admin

In the Profoundly app, sign in as an admin and open **Responses**. Above the
table there is an **Export for Estimator** button; click it to download
`proposals.csv`.

The export is anonymized at the source: it joins each response to its project
for the title and description, resolves a usable price (the agreed price, or the
midpoint of the initial estimate range when there is no firm price yet), and
omits all provider and customer identity and the response pitch text. So the
file is safe to hand off, but still treat it as internal data (it contains
project titles, descriptions, and prices) and do not commit it.

(The same file can be produced headlessly with the `estimator:export-proposals`
Artisan command in the Profoundly repo; the button is the everyday path.)

### 2. Import the CSV into Supabase

Save the downloaded file to `data/proposals.csv` in this repo. The `data/`
directory is gitignored, so the CSV is never committed or served publicly.

Make sure your `.env` points at the project you want to update, then run the
import. **To update production, use the production project's URL and service
role key** (from the Supabase dashboard: Project Settings -> API).

```bash
npm run import:proposals
# or point at a file elsewhere:
npm run import:proposals -- /path/to/proposals.csv
```

The script reads credentials from `.env` (see Environment variables above). For
a one-off run against a different project you can still export the vars in your
shell instead; real environment variables take precedence over `.env`.

The script parses the CSV, keeps only the estimator columns, and upserts by
`proposal_id` in batches, then deletes any rows no longer present in the file.
It upserts before deleting so the table is never empty mid-run and the
`estimate` function keeps serving throughout. No redeploy is needed: the
function reads the table live, so new estimates use the updated data as soon as
the import finishes.

Two safety guards protect against a bad file wiping the table: the import aborts
if the CSV parses to zero valid rows, and it refuses to prune more than half of
the existing rows (the sign of a truncated or wrong file), leaving the data
untouched. If a large prune is genuinely intended, re-run with `--force`:

```bash
npm run import:proposals -- --force
```

To refresh production data you only run this import. You do not need to touch the
frontend or the Edge Functions unless their code changed.

## Deploying

The Supabase pieces are deployed with the Supabase CLI; the frontend is a static
build.

1. Apply migrations to the Supabase project (creates/updates the `proposals` and
   `submissions` tables).
2. Import the initial data (see above).
3. Deploy the Edge Functions, e.g. `supabase functions deploy estimate`.
4. Build the frontend (`npm run build`) and deploy the `dist/` output to your
   static host.
