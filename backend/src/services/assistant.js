// A number is only a budget when it is marked as money (₱, PHP, pesos) or follows a
// budget phrase. Plain numbers such as "1080p" or "16 inch" describe the product.
const BUDGET_PATTERN = /(?:₱\s*|\bphp\s*|\b(?:under|below|less than|cheaper than|within|up to|max(?:imum)?|budget(?: of| is)?|at most|no more than|not more than)\s+(?:₱\s*|php\s*)?)(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)\b/i;

// Common question words carry no product meaning. Without this list, words such as
// "for" and "with" matched product descriptions and produced unrelated recommendations.
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'have', 'has', 'any', 'anything', 'something', 'what', 'which',
  'who', 'does', 'can', 'are', 'there', 'that', 'this', 'these', 'those', 'sell', 'need', 'want', 'looking',
  'recommend', 'show', 'find', 'some', 'under', 'below', 'less', 'than', 'cheaper', 'within', 'budget', 'max',
  'maximum', 'most', 'more', 'not', 'pesos', 'peso', 'php', 'price', 'good', 'best', 'product', 'products',
  'item', 'items', 'please', 'about', 'from', 'get', 'buy', 'like', 'would', 'should', 'available', 'stock', 'one'
]);

export function parseBudget(question) {
  const match = question.replaceAll(',', '').match(BUDGET_PATTERN);
  if (!match) return null;
  return Number(match[1] ?? match[2]);
}

export function extractTerms(question) {
  return question.toLowerCase().split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term) && !/^\d+$/.test(term))
    .map((term) => (term.length > 4 && term.endsWith('s') ? term.slice(0, -1) : term));
}

export function rankProducts(products, question) {
  const terms = extractTerms(question);
  const budget = parseBudget(question);
  return products
    .filter((product) => product.stock > 0 && (budget === null || Number(product.price) <= budget))
    .map((product) => {
      const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return { ...product, score: terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) };
    })
    .filter((product) => terms.length === 0 || product.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.price) - Number(b.price));
}

export function buildAssistantResponse(products, question) {
  const ranked = rankProducts(products, question).slice(0, 3);
  if (ranked.length === 0) {
    return { answer: 'I could not find an in-stock product matching that request.', recommendedProducts: [], sources: [] };
  }
  const names = ranked.map((product) => product.name).join(', ');
  return {
    answer: `Based on the current ShopSmart catalog, consider: ${names}. This starter response uses rules rather than a generative AI model.`,
    recommendedProducts: ranked.map(({ id, name, price, category }) => ({ id, name, price: Number(price), category })),
    sources: ranked.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}

function safeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    stock: Number(product.stock)
  };
}

export function validateProviderDraft(draft, selectedProducts, question) {
  if (!draft || typeof draft.answer !== 'string') return null;
  const selectedIds = new Set(selectedProducts.map((product) => product.id));
  const ids = Array.isArray(draft.productIds) ? draft.productIds.filter((id) => selectedIds.has(Number(id))).map(Number) : [];
  if (ids.length === 0) return null;
  const verified = selectedProducts.filter((product) => ids.includes(product.id));
  const fallback = buildAssistantResponse(selectedProducts, question);
  const mentionedPrices = [...draft.answer.matchAll(/₱\s*([\d,]+(?:\.\d{1,2})?)/g)].map((match) => Number(match[1].replaceAll(',', '')));
  const supportedPrices = new Set(verified.map((product) => Number(product.price)));
  const namesVerified = verified.some((product) => draft.answer.toLowerCase().includes(product.name.toLowerCase()));
  if (!namesVerified || mentionedPrices.some((price) => !supportedPrices.has(price))) return fallback;
  const answer = draft.answer.trim();
  return {
    answer,
    recommendedProducts: verified.map(({ id, name, price, category }) => ({ id, name, price: Number(price), category })),
    sources: verified.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}

export async function askProvider(question, selectedProducts, fetchImpl = fetch) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: `Answer the customer using only this catalog JSON. Return JSON only with answer (string) and productIds (array of integer ids). Do not invent facts. Customer: ${question}\nCatalog: ${JSON.stringify(selectedProducts.map(safeProduct))}` }] }], generationConfig: { responseMimeType: 'application/json' } })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch { return null; } finally { clearTimeout(timeout); }
}

export async function buildGroundedAssistantResponse(products, question) {
  const selected = rankProducts(products.filter((product) => product.active !== false), question).slice(0, 3);
  const fallback = buildAssistantResponse(selected, question);
  if (selected.length === 0) return fallback;
  const draft = await askProvider(question, selected);
  return validateProviderDraft(draft, selected, question) || fallback;
}
