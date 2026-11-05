import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssistantResponse, parseBudget, rankProducts, validateProviderDraft } from '../src/services/assistant.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]));
test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));
test('provider ids and unsupported prices are rejected in favor of verified fallback', () => {
  const result = validateProviderDraft({ answer: 'Keyboard costs ₱999.', productIds: [1] }, products, 'keyboard');
  assert.equal(result.recommendedProducts[0].id, 1);
  assert.match(result.answer, /current ShopSmart catalog/);
});
