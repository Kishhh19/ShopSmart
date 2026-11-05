import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/products returns all active products with deterministic ordering', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.products));
  assert.equal(data.products.length, 6);
  assert.equal(data.products[0].id, 1);
  assert.equal(typeof data.products[0].price, 'number');
});

test('GET /api/products?search=keyboard returns active products matching by name', async () => {
  const res = await fetch(`${baseUrl}/api/products?search=keyboard`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.products));
  assert.ok(data.products.length > 0);
  assert.ok(data.products.some((p) => p.name.toLowerCase().includes('keyboard')));
});

test('GET /api/products?search=privacy returns active products matching by description', async () => {
  const res = await fetch(`${baseUrl}/api/products?search=privacy`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.products));
  assert.equal(data.products.length, 1);
  assert.equal(data.products[0].name, '1080p Webcam');
  assert.ok(data.products[0].description.toLowerCase().includes('privacy'));
});

test('GET /api/products search is case-insensitive and trims whitespace', async () => {
  const res = await fetch(`${baseUrl}/api/products?search=%20%20PRIVACY%20%20`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.products.length, 1);
  assert.equal(data.products[0].name, '1080p Webcam');
});

test('GET /api/products?search=notfoundword returns an empty products array', async () => {
  const res = await fetch(`${baseUrl}/api/products?search=notfoundword`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.products));
  assert.equal(data.products.length, 0);
});

test('GET /api/products?search= with empty or whitespace returns full active catalog', async () => {
  const res = await fetch(`${baseUrl}/api/products?search=%20%20%20`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.products.length, 6);
});
