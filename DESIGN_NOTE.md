# ShopSmart Grounded Product Assistant

## Request flow

```text
AssistantPage.jsx -> api.askAssistant() -> POST /api/assistant/questions
-> assistant route validates input and retrieves active, in-stock products
-> assistant service ranks candidates, optionally asks Gemini for wording
-> service verifies returned ids and catalog prices -> JSON response
-> React renders answer, product links, and sources
```

## Design decisions

1. Retrieval uses only active products with stock greater than zero. Ranking uses question terms and an extracted peso budget.
2. The provider receives only id, name, description, category, numeric price, and stock; these public fields are sufficient to explain a recommendation without exposing customer data.
3. Gemini is called only from the backend using `GEMINI_API_KEY` in `backend/.env`; the browser never receives the key. The call has an eight-second timeout.
4. Provider output is treated as a draft. Product ids are intersected with the selected catalog records, and recommendations and sources are rebuilt from verified records. Unsupported drafts are discarded.
5. No-match requests never call the provider and return an honest empty result. Missing keys, timeouts, rate limits, malformed JSON, or other provider failures use the deterministic rule-based response.

## Limitation

The provider is optional so the application remains usable in local development and during quota outages. When no key is configured, the verified rule-based answer is shown.

## Team record

- Contribution: implemented grounded retrieval, provider boundary, output verification, and fallback behavior.
- Issue resolved: provider output could invent product references; the server now accepts only ids from the selected catalog and reconstructs links and sources from those records.
