# ShopSmart Release Note: Final Challenge Release Candidate

**Team:** Team JAM

**Version and date:** Release candidate 1.1.0-rc1, 11 November 2026. Release commit `2a40de5` (starting point was `868bf02`).
**Deployment status:** **Local release candidate only.** No private staging or live site was deployed. Local smoke test passed on a Team JAM laptop on 11 November 2026 (PostgreSQL 16.15). A plan is in `docs/DEPLOYMENT_PLAN.md`.

## Working features (verified, see `docs/FINAL_TEST_RECORD.md`)

- Product catalog from PostgreSQL: list, details, server-side search with a no-results state, category filter, price sort
- Cart: add, change quantity, remove, with correct totals and stock limits
- Simulated checkout: valid fictional details create one order with server-calculated totals; invalid details are refused (browser and HTTP 422)
- Stock rule: orders above available stock are refused with HTTP 409, leaving stock, orders and cart unchanged; order placement runs in a database transaction
- Product assistant: answers grounded in in-stock catalog products, with links and sources, and an honest no-match reply. Fixed: product numbers ("1080p", "16 inch") are no longer read as budgets, filler words no longer add unrelated products, and budget-only questions work.
- Failure handling: API outage shows "Could not reach the ShopSmart API…" with Retry on the products page; an AI provider failure falls back to the verified rule-based answer
- Data safety: orders survive restarts; `npm run db:seed` refuses to delete existing orders
- `npm run check`: lint clean, 16 frontend and 23 backend tests passing, production build succeeds

## Known limitations

- **Authentication:** none. There are no accounts, no order history and no admin role. Anyone who can reach the app can place a simulated order, so it must not be deployed publicly.
- **AI:** Gemini integration exists but was **not verified with a live key**. Only the rule-based fallback was observed.
- **Cart:** stored in browser memory only, so a refresh empties it. It also keeps the stock figure from when an item was added; the server refuses the order if stock has since fallen.
- **Health check:** `/api/health` does not test the database connection.
- **Hosting:** not deployed. Before staging, add `app.set('trust proxy', 1)` for the rate limiter and an SPA rewrite rule (see the deployment plan).
- **Verification environment:** verified twice against PostgreSQL 16: first in a cloud workspace (Prisma engine-free client mode), then on a Team JAM laptop with the standard Prisma client (see the last table in the test record).
- **Dependencies:** `npm audit` reports 17 known vulnerabilities in third-party packages (4 moderate, 8 high, 5 critical); not addressed in this release.

## Local startup

Follow `README.md`, sections "Set up the ShopSmart project" steps 1 to 11. What changed from the Lab 3 version:

1. PostgreSQL is required again. `backend/.env` must contain
   `DATABASE_URL="postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public"` (adjust the password or port to your install).
2. Create the tables with **`npm run db:deploy`** (not `db:migrate`), then `npm run db:seed` on the empty database.
3. `npm run db:seed` refuses to run if orders exist. Wiping is deliberate only: `SEED_RESET=true`.
4. `backend/src/data/db.json` is no longer used and is ignored by git.

## Team record

| Member | Test they ran | Contribution | Issue they can explain |
| --- | --- | --- | --- |
| _(name)_ | T5 Assistant: "Do you have a 1080p webcam?" | Fixed assistant budget parsing and stop words (DEF-02/03/04) with regression tests | Why "1080" became a ₱1,080 budget and hid the webcam |
| _(name)_ | T3/T4 Checkout and stock refusal | Restored PostgreSQL through Prisma and removed the git-tracked JSON store (DEF-01, DEF-07) | Why committing `db.json` would have published customer data |
| _(name)_ | T6 Failure: API down and provider failure | Network-error message in `api.js` (DEF-05); replaced the duplicate fallback screenshot (DEF-08) | How the frontend tells a network failure from an API error |
| _(name)_ | T7 Data survival / reseed | Seed safety guard (DEF-06), deployment plan and diagram | Why staging uses `prisma migrate deploy` and never `migrate dev` or the seed |

_Reassign rows to match who actually did each part. Each member should be able to explain their row._
