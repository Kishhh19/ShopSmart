import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// Uses unique @example.com accounts and removes everything it creates. The order used
// for the ownership check is inserted directly, so product stock is not changed.
let server;
let baseUrl;
const stamp = Date.now();
const alice = { name: 'Alice Test', email: `alice.${stamp}@example.com`, password: 'fictional-pass-1' };
const bob = { name: 'Bob Test', email: `bob.${stamp}@example.com`, password: 'fictional-pass-2' };
let orderId;

test.before(async () => {
  await new Promise((resolve) => { server = createApp().listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); }); });
});
test.after(async () => {
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.user.deleteMany({ where: { email: { in: [alice.email, bob.email] } } });
  await prisma.$disconnect();
  if (server) await new Promise((resolve) => server.close(resolve));
});

const call = (path, { method = 'GET', body, cookie } = {}) => fetch(`${baseUrl}${path}`, {
  method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined
});
const sessionCookie = (res) => res.headers.get('set-cookie')?.split(';')[0];

test('guest is refused private order data and cannot place an order', async () => {
  assert.equal((await call('/api/orders')).status, 401);
  assert.equal((await call('/api/orders/1')).status, 401);
  const res = await call('/api/orders', { method: 'POST', body: { customerName: 'Guest', email: 'g@example.com', address: '1 Sample Street', items: [{ productId: 1, quantity: 1 }] } });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, 'SIGN_IN_REQUIRED');
});

test('register rejects a short password and duplicate email', async () => {
  assert.equal((await call('/api/auth/register', { method: 'POST', body: { ...alice, password: 'short' } })).status, 422);
  const first = await call('/api/auth/register', { method: 'POST', body: alice });
  assert.equal(first.status, 201);
  const cookie = sessionCookie(first);
  assert.match(first.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await call('/api/auth/register', { method: 'POST', body: alice })).status, 409);
  const me = await call('/api/auth/me', { cookie });
  assert.equal((await me.json()).user.email, alice.email);
});

test('login rejects a wrong password with a generic message', async () => {
  const res = await call('/api/auth/login', { method: 'POST', body: { email: alice.email, password: 'wrong-password' } });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, 'INVALID_CREDENTIALS');
});

test('owner can read an order; another customer is denied', async () => {
  const aliceCookie = sessionCookie(await call('/api/auth/login', { method: 'POST', body: alice }));
  const bobCookie = sessionCookie(await call('/api/auth/register', { method: 'POST', body: bob }));
  const owner = await prisma.user.findUnique({ where: { email: alice.email } });
  const product = await prisma.product.findFirst();
  const order = await prisma.order.create({ data: {
    customerName: alice.name, email: alice.email, address: '1 Sample Street, Test City', total: product.price, userId: owner.id,
    items: { create: [{ productId: product.id, quantity: 1, unitPrice: product.price }] }
  } });
  orderId = order.id;

  assert.equal((await call(`/api/orders/${order.id}`, { cookie: aliceCookie })).status, 200);
  const mine = await (await call('/api/orders', { cookie: aliceCookie })).json();
  assert.ok(mine.orders.some((o) => o.id === order.id));

  const denied = await call(`/api/orders/${order.id}`, { cookie: bobCookie });
  assert.equal(denied.status, 403);
  const bobList = await (await call('/api/orders', { cookie: bobCookie })).json();
  assert.equal(bobList.orders.length, 0);
});

test('logout ends the session', async () => {
  const cookie = sessionCookie(await call('/api/auth/login', { method: 'POST', body: alice }));
  assert.equal((await call('/api/auth/logout', { method: 'POST', cookie })).status, 204);
  assert.equal((await call('/api/auth/me', { cookie })).status, 401);
});
