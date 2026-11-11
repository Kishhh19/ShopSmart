# ShopSmart Final Challenge: Test Record

**Date:** 11 November 2026
**Starting version:** commit `868bf02` ("Complete grounded ShopSmart assistant challenge")
**Release candidate:** `868bf02` plus the changes listed under "Defects" below
**Environment:** Node.js 22, PostgreSQL 16, Chromium (Playwright), frontend at `http://localhost:5173`, API at `http://localhost:3000/api`
**Data used:** fictional customers only (Juan Dela Prueba, Maria Halimbawa, `@example.com` addresses)
**Recorder:** _(team member name)_

Evidence screenshots are in `docs/evidence/`.

---

## Activity 1: Baseline

### Feature inventory

| Feature | Status | Notes |
| --- | --- | --- |
| Product list, details, server-side search, category filter, price sort | Present | Lab 3 |
| Cart (add, change quantity, remove) | Present | Kept in React memory only; a page refresh empties it |
| Simulated checkout | Present | Server recalculates prices and checks stock |
| Product assistant | Present | Rule-based ranking with optional Gemini wording |
| Authentication and roles | **Absent** | No sign-in, so guest/owner/other-customer tests do not apply |
| Live AI | **Present in code, not verified** | `GEMINI_API_KEY` is not configured, so only the verified rule-based fallback was observed |
| Health endpoint | Present | `GET /api/health` returns `{"status":"ok"}`; it does not check the database |

### Baseline `npm run check` (before any change)

| Step | Observed |
| --- | --- |
| Frontend lint | 0 errors |
| Backend lint | 0 errors |
| Frontend tests | 13 passed (3 files) |
| Backend tests | 14 passed |
| Frontend build | Built, `dist/assets/index-*.js` 273.88 kB |
| **Result** | Exit code 0 |

The checks were green, but the baseline review found that the backend did **not** use PostgreSQL. `backend/src/lib/prisma.js` was a hand-written imitation of Prisma that read and wrote `backend/src/data/db.json`, while `schema.prisma` and the migration targeted MySQL. The green checks therefore did not test the database the project and deployment plan require (see DEF-01).

---

## Activity 2: Customer journey

Results T1 to T7 were observed on the release candidate running against PostgreSQL. The "Baseline" column shows what the starting version did where it differed.

### T1 Browse and search

| Field | Record |
| --- | --- |
| Starting state | Database seeded with the 6 sample products, no orders |
| Action | Open `/`; type `keyboard`; type `notfoundword`; clear the box |
| Expected | 6 cards; only the keyboard for `keyboard`; a clear no-results message with toolbar still usable; 6 cards again after clearing |
| Observed | 6 cards on load. `keyboard` showed only "Compact Mechanical Keyboard". `notfoundword` showed "No products found. Try another search term or category." Clearing restored 6 cards. |
| Evidence | `01_products_loaded.png`, `02_search_no_results.png` |
| Decision | **Pass** |

### T2 Cart

| Field | Record |
| --- | --- |
| Starting state | Empty cart |
| Action | Add Wireless Mouse (₱650) twice and USB-C Study Lamp (₱900) once; set mouse quantity to 3; try 13 (stock is 12); remove the lamp; refresh the page |
| Expected | Totals recalculate correctly after each action; quantity above stock is refused; a refresh empties the cart (no persistence in this design) |
| Observed | After adds: nav `Cart (3)`, Items 3, Total ₱2,200. Quantity 3: Items 4, Total ₱2,850 (3 × 650 + 900). Quantity 13: "Only 12 unit(s) are available." and the total stayed ₱2,850. Remove lamp: Items 3, Total ₱1,950. Refresh: "Your cart is empty". |
| Evidence | `03_cart_quantity_changed.png` |
| Decision | **Pass**, with a known limitation: the cart does not survive a refresh |

### T3 Checkout

| Field | Record |
| --- | --- |
| Starting state | Cart: 1 Wireless Mouse (₱650) + 1 Laptop Stand (₱1,200); 0 orders in the database |
| Action 1 (invalid) | Name `Juan Dela Prueba`, email `not-an-email`, address `short`, click **Place simulated order** |
| Expected | Order refused; nothing saved |
| Observed | The browser blocked submission: email "missing an '@'", address "Please lengthen this text to 10 characters or more". Order count stayed 0. The API refuses the same input directly with HTTP 422 `INVALID_ORDER` and field errors (automated test `POST /api/orders refuses invalid customer details with 422`). |
| Action 2 (valid) | Email `juan.prueba@example.com`, address `12 Sample Street, Fictional City`, submit once |
| Expected | Exactly one order; total ₱1,850; stock decremented; cart cleared |
| Observed | "Thank you, Juan Dela Prueba! Your simulated order number is #1. Total: ₱1,850.00". The database showed order 1, total 1850.00, 2 order items. Stock: mouse 12 → 11, stand 9 → 8. Nav shows `Cart (0)`. |
| Evidence | `04_checkout_confirmation.png` |
| Decision | **Pass** |

### T4 Stock

| Field | Record |
| --- | --- |
| Starting state | 1080p Webcam stock 6; 1 order in the database |
| Action | On `/products/4` click **Add to cart** 7 times. In the cart, quantity is 6 (₱8,700). Simulate another buyer by setting webcam stock to 2 in the database, then place the order with fictional details (Maria Halimbawa) |
| Expected | 7th add refused; checkout refused with a stock message; no order created; stock and cart unchanged |
| Observed | 7th add: "Only 6 unit(s) of 1080p Webcam are available." Checkout: error "Only 2 unit(s) of 1080p Webcam are available." (HTTP 409 `INSUFFICIENT_STOCK`). Orders stayed at 1; webcam stock stayed 2; cart total stayed ₱8,700. |
| Evidence | `05_stock_refused.png`; automated test `refuses quantity above stock with 409 and leaves stock unchanged` |
| Decision | **Pass**. Limitation: the cart keeps the stock figure from when the item was added, so the customer must lower the quantity manually. |

### T5 Assistant

| Question | Expected | Baseline (before fix) | Observed (release candidate) | Decision |
| --- | --- | --- | --- | --- |
| Which keyboard is below ₱2,000? | Compact Mechanical Keyboard, ₱1,850, with source | Correct | Keyboard, ₱1,850, source listed, link to `/products/2` (`06_assistant_catalog_match.png`) | Pass |
| Do you have a 1080p webcam? | 1080p Webcam | **"I could not find an in-stock product"**: `1080` was read as a ₱1,080 budget | 1080p Webcam, ₱1,450 (`07_assistant_1080p_fixed.png`) | Fail → **Pass after DEF-02** |
| laptop stand for 16 inch laptops | Laptop Stand | **No match**: `16` was read as a ₱16 budget | Laptop Stand | Fail → **Pass after DEF-02** |
| keyboard for gaming | Keyboard only | **Laptop Stand and Keyboard**: "for" matched "stand for laptops" | Keyboard only | Fail → **Pass after DEF-03** |
| a quiet mouse with a receiver | Wireless Mouse only | **Mouse, Study Lamp, Headset**: "with" matched their descriptions | Wireless Mouse only | Fail → **Pass after DEF-03** |
| anything under 1000 pesos | Mouse (₱650) and Lamp (₱900) | **No match** | Wireless Mouse, USB-C Study Lamp | Fail → **Pass after DEF-04** |
| Do you sell blenders? | Honest no-match, no sources | Honest no-match | "I could not find an in-stock product matching that request." with no links or sources (`08_assistant_no_match.png`) | Pass |
| `hi` (2 characters) | HTTP 422 | HTTP 422 `INVALID_QUESTION` | Same | Pass |

### T6 Failure handling

| Case | Action | Expected | Observed | Evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| API down, assistant | Stop the API, ask "Which keyboard is below ₱2,000?" | Loading ends, useful message | Baseline: bare "Failed to fetch". Release candidate: loading ended in about 0.1 s, button re-enabled, message "Could not reach the ShopSmart API. Check that the backend is running, then try again." | `09_assistant_api_down.png` | Fail → **Pass after DEF-05** |
| API down, products | Open `/` with the API stopped | Error and Retry, no crash | Same message with a **Retry** button. After restarting the API, the page loaded 6 cards. | `10_products_api_down.png` | Pass |
| AI provider failure | Start the API with an invalid `GEMINI_API_KEY`, ask the keyboard question | Loading ends, verified fallback | Provider call failed. Within about 0.1 s the rule-based answer appeared with the keyboard, ₱1,850 and its source. | `11_assistant_provider_fallback.png` | Pass |

### T7 Data survival

| Case | Observed | Decision |
| --- | --- | --- |
| Restart the API | Order #1 (Juan Dela Prueba) still present after restart | Pass |
| Accidental `npm run db:seed` with an order present | Release candidate: "Seed stopped: the database already contains 1 order(s)…", exit code 1, order count still 1. Baseline: the seed deleted every order without warning. | **Pass after DEF-06** |

---

## Activity 3: Defects

| ID | Severity | Reproduction (start → action → actual → expected) | Fix | Verification |
| --- | --- | --- | --- | --- |
| **DEF-01** | High (data exposure, wrong database) | Start from commit `868bf02` → place an order → the customer name and email were written to `backend/src/data/db.json`, which is **tracked by git**, and `git status` showed it modified → orders should be in PostgreSQL, and customer data must never reach the repository | Replaced the JSON imitation in `backend/src/lib/prisma.js` with the real `PrismaClient`. Switched `schema.prisma` and `migration_lock.toml` to `postgresql`, rewrote the initial migration as PostgreSQL SQL, removed `db.json` from git and added `backend/src/data/` to `.gitignore`. Order placement now runs in a real database transaction. | Migration applied to PostgreSQL 16; T1 to T7 pass on PostgreSQL; 23/23 backend tests pass against PostgreSQL; `git ls-files` lists no `.env` or `db.json` |
| **DEF-02** | High (wrong assistant answer) | Seeded catalog → ask "Do you have a 1080p webcam?" → "could not find" because any 2 to 6 digit number became a budget → recommend the webcam | `parseBudget` now treats a number as a budget only when it is marked as money (₱, PHP, pesos) or follows a budget word (under, below, within, up to…) | New tests `DEF-02…`; old code fails them, new code passes |
| **DEF-03** | Medium (unsupported recommendations) | Ask "keyboard for gaming" → Laptop Stand recommended → keyboard only | Added a stop-word list (for, with, the, have…) and simple plural handling before matching | New test `DEF-03…` |
| **DEF-04** | Medium | Ask "anything under 1000 pesos" → no match → mouse and lamp | Follows from DEF-02/03: with no product words left, every in-stock product within the budget is returned | New test `DEF-04…` |
| **DEF-05** | Medium (failure message) | Stop the API → ask the assistant or submit checkout → "Failed to fetch" → a message saying what to do | `api.js` converts network failures into "Could not reach the ShopSmart API…" with code `NETWORK_ERROR` and still passes aborts through unchanged. `ProductsPage` no longer appends a duplicate hint. | 3 new frontend tests; T6 |
| **DEF-06** | Medium (accidental data loss) | Database with orders → `npm run db:seed` → all orders deleted silently → refuse unless the reset is deliberate | `seed.js` stops when orders exist unless `SEED_RESET=true`, and always stops when `NODE_ENV=production` | T7 |
| **DEF-07** | Medium (found while verifying DEF-01) | PostgreSQL → reseed → products got ids 7 to 12 (sequences do not reset), so `/products/1` returned 404 and 2 tests failed → stable ids 1 to 6 | Seed inserts explicit ids, then moves the id sequence with `setval` | 23/23 backend tests after reseeding |
| **DEF-08** | Low (evidence) | `screenshot_assistant_catalog_match.png` and `screenshot_assistant_provider_fallback.png` were byte-identical (same git blob `72ce731`), so the earlier fallback evidence was not a separate observation | Replaced the fallback screenshot with a real provider-failure capture (`11_assistant_provider_fallback.png`) | T6 |

No test was deleted or weakened. One new test was adjusted while it was being written so it reads a product id from the API instead of assuming id 4.

### Not fixed (known limitations)

| Issue | Impact | Safe temporary limitation |
| --- | --- | --- |
| Cart is not persisted | A refresh empties the cart | State this in the release note. The server still validates every order. |
| Cart keeps the stock figure from when the item was added | The customer sees a stock error at checkout and must lower the quantity manually | The server refuses the order (T4), so no oversell is possible |
| `/api/health` does not check the database | Health can report `ok` while PostgreSQL is down | Smoke test must also load `/api/products` |
| Live Gemini not verified | The AI wording path is untested with a real key | Leave `GEMINI_API_KEY` empty for staging. The verified fallback is used. |
| No authentication | Anyone who reaches the site can place orders | Keep staging private and use fictional data only (see the deployment plan) |

---

## Activity 5: Release candidate check

| Release check | Result |
| --- | --- |
| Build and tests | `npm run check` exit 0: lint 0 errors, frontend 16/16, backend 23/23 (against PostgreSQL), build OK |
| Health and API | `/api/health` 200; frontend bundle calls `http://localhost:3000/api` |
| Database | Products load from PostgreSQL; order #1 placed; data survived API restart and a blocked reseed |
| Assistant | Grounded answers with sources; provider failure and API outage are handled (T5, T6) |
| Secrets | No `.env` or `db.json` tracked; build bundle searched for `DATABASE_URL`, `postgresql://`, `shopsmart_dev`, `GEMINI`, `generativelanguage`: none found |
| Privacy | Only fictional names and `@example.com` emails used |

**Note on the test environment:** the runs above used a cloud workspace where Prisma's native engine download is blocked. There, Prisma 6.19.3 was run in its engine-free client mode (`engineType = "client"` with `@prisma/adapter-pg`) against a real PostgreSQL 16 server. Queries and schema are the same, but the committed project uses the standard Prisma client. **The team must repeat the smoke test on a team laptop** (README steps 5 to 11) and add the result here:

| Date | Machine | `npm run check` | Health | Products | Cart | Checkout | Assistant | Tester |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-11 13:10 | Team laptop: Windows, Node 25.8.1, PostgreSQL 16.15, standard Prisma client 6.19.3 | **Pass**: `db:deploy` applied 1 migration, seed inserted 6 products, lint 0 errors, frontend 16/16, backend 23/23, build OK | **Pass**: `{"status":"ok"}` | **Pass**: 6 cards; `keyboard` search returns only Compact Mechanical Keyboard | **Pass**: 2 × Wireless Mouse = Items 2, ₱1,300 | **Pass**: fictional "Pedro Sample", `pedro.sample@example.com` → "order number is #1", Total ₱1,300.00 | **Pass**: "Do you have a 1080p webcam?" → 1080p Webcam ₱1,450 with source | _(name)_, run in Chrome |

Laptop finding: the first `db:deploy` attempt failed with `P1001: Can't reach database server at localhost:5432` because PostgreSQL was not installed. After installing PostgreSQL 16.15 and creating `shopsmart_user` and the `shopsmart` database (README step D), every step passed.
