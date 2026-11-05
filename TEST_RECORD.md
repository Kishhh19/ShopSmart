# Assistant test record

| Case | Expected result | Result |
|---|---|---|
| Catalog match: keyboard below ₱2,000 | In-stock catalog keyboard, current price, working product link | Pass; see `screenshot_assistant_catalog_match.png` |
| No match: absent category | Empty recommendations and sources; honest no-match answer | Pass; see `screenshot_assistant_no_match.png` |
| Invalid input: fewer than 3 characters | HTTP 422 with `INVALID_QUESTION` | Pass: existing Zod validation retained |
| Availability: stock 0 | Product is not recommended | Pass: route and service filter stock greater than zero |
| Provider failure | Loading ends and useful fallback appears | Pass with missing-key fallback; see `screenshot_assistant_provider_fallback.png`. Timeout/non-2xx/malformed JSON are covered by the same server fallback path. |
| Source check | Every source and link points to a selected product | Pass: provider ids are intersected with selected ids and response fields are rebuilt |

Run `npm run check` from the project root for lint, tests, and frontend build. Do not commit `backend/.env`.
