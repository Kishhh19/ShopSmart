import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// These cases only exercise refusals, so they never create orders or change stock
// in the developer database. A successful order is covered by the manual smoke test.
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
  });
});
test.after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

const customer = { customerName: 'Test Customer', email: 'test.customer@example.com', address: '1 Sample Street, Test City' };
const post = (body) => fetch(`${baseUrl}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('POST /api/orders refuses invalid customer details with 422', async () => {
  const res = await post({ customerName: 'A', email: 'not-an-email', address: 'short', items: [] });
  assert.equal(res.status, 422);
  const data = await res.json();
  assert.equal(data.error.code, 'INVALID_ORDER');
  assert.ok(data.error.details.fieldErrors.email);
});

test('POST /api/orders refuses quantity above stock with 409 and leaves stock unchanged', async () => {
  const { products } = await (await fetch(`${baseUrl}/api/products`)).json();
  const before = products[0];
  const res = await post({ ...customer, items: [{ productId: before.id, quantity: before.stock + 1 }] });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'INSUFFICIENT_STOCK');
  const after = await (await fetch(`${baseUrl}/api/products/${before.id}`)).json();
  assert.equal(after.stock, before.stock);
});

test('POST /api/orders refuses an unknown product with 422', async () => {
  const res = await post({ ...customer, items: [{ productId: 999999, quantity: 1 }] });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).error.code, 'PRODUCT_UNAVAILABLE');
});

test('GET /api/health responds ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});
