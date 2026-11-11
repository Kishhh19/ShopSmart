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

// Regression tests for DEF-02/03/04 (Final challenge, Activity 3). Catalog mirrors the seed data.
const catalog = [
  { id: 1, name: 'Wireless Mouse', category: 'Accessories', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', price: 650, stock: 12 },
  { id: 2, name: 'Compact Mechanical Keyboard', category: 'Accessories', description: 'Hot-swappable compact keyboard with tactile switches.', price: 1850, stock: 8 },
  { id: 3, name: 'USB-C Study Lamp', category: 'Study', description: 'Adjustable desk lamp with three brightness levels.', price: 900, stock: 10 },
  { id: 4, name: '1080p Webcam', category: 'Video', description: 'Full HD webcam with privacy cover and built-in microphone.', price: 1450, stock: 6 },
  { id: 5, name: 'Laptop Stand', category: 'Study', description: 'Foldable aluminum stand for laptops up to 16 inches.', price: 1200, stock: 9 },
  { id: 6, name: 'USB Headset', category: 'Audio', description: 'Over-ear headset with noise-reducing boom microphone.', price: 1350, stock: 7 }
];
const ids = (question) => buildAssistantResponse(catalog, question).recommendedProducts.map((p) => p.id);

test('DEF-02: product numbers such as 1080p or 16 inch are not treated as a budget', () => {
  assert.equal(parseBudget('Do you have a 1080p webcam?'), null);
  assert.equal(parseBudget('laptop stand for 16 inch laptops'), null);
  assert.deepEqual(ids('Do you have a 1080p webcam?'), [4]);
  assert.deepEqual(ids('laptop stand for 16 inch laptops'), [5]);
});

test('DEF-02: marked budgets are still recognised', () => {
  assert.equal(parseBudget('Which keyboard is below ₱2,000?'), 2000);
  assert.equal(parseBudget('lamp under 1000'), 1000);
  assert.equal(parseBudget('something for 1500 pesos'), 1500);
  assert.equal(parseBudget('headset PHP 1,400'), 1400);
  assert.deepEqual(ids('Which keyboard is below ₱2,000?'), [2]);
});

test('DEF-03: filler words like "for" and "with" do not add unrelated products', () => {
  assert.deepEqual(ids('keyboard for gaming'), [2]);
  assert.deepEqual(ids('a quiet mouse with a receiver'), [1]);
});

test('DEF-04: a budget-only question returns in-stock products within the budget', () => {
  assert.deepEqual(ids('anything under 1000 pesos'), [1, 3]);
});

test('unsupported requests still return an honest empty result', () => {
  const result = buildAssistantResponse(catalog, 'Do you sell blenders?');
  assert.deepEqual(result.recommendedProducts, []);
  assert.deepEqual(result.sources, []);
  assert.match(result.answer, /could not find/);
});
