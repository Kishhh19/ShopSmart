# Grounded Assistant Evidence

The following screenshots were captured from the running ShopSmart application at `http://localhost:5173/assistant`:

| Evidence | File | Observation |
|---|---|---|
| Catalog match | `screenshot_assistant_catalog_match.png` | Compact Mechanical Keyboard is linked at the current catalog price ₱1,850 and listed as the source. |
| No match | `screenshot_assistant_no_match.png` | Teleporter request returns an honest no-match response with no products or sources. |
| Provider fallback | `screenshot_assistant_provider_fallback.png` | With no provider key configured, the server completes the request using its verified rule-based fallback; loading ends and the catalog result remains usable. |

The provider key is intentionally not included in this repository. Configure `GEMINI_API_KEY` only in the server's ignored `backend/.env` when live provider testing is available.
