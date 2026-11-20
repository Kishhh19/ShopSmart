# Team Explainer: the two improvements and the AWS release

Read this before the demo. Every member should be able to answer the questions at the end in their own words.

## Which improvements, and why these two

The deployment guide says the hosted app must let a fictional customer **sign in** and that **the API must enforce access to private order records**. The teaching roadmap lists the same work as Week 4 ("hash passwords and create a login/session flow", "protect order history by ownership"), and `orders.js` was marked `WEEK 4 IMPROVEMENT`. So the release implements:

1. **Customer sign-in with a server-side session**
2. **Server-enforced order ownership**

> Check with the instructor that these are the two improvements the exam expects. If the exam names different ones, the retest table in `RELEASE_NOTE.md` is where to change them.

## Improvement 1: sign-in

**Flow:** React `LoginPage` → `POST /api/auth/register` or `/api/auth/login` → `backend/src/routes/auth.js` → Prisma `User` + `Session` tables.

- **Passwords are never stored.** `hashPassword()` in `backend/src/lib/auth.js` uses Node's built-in `scrypt` with a random 16-byte salt per user. Login re-hashes the attempt and compares with `timingSafeEqual`.
- **Session token:** after login the server makes 32 random bytes, stores only its **SHA-256 hash** in `Session`, and sends the token in a cookie named `shopsmart_session`. If the database leaked, the stored hashes could not be used as cookies.
- **Cookie flags:** `HttpOnly` (JavaScript, including any injected script, cannot read it), `Secure` in production (only over HTTPS), `SameSite=Lax`, 7-day expiry.
- **Guessing protection:** login/register are rate-limited (20 per 15 min per IP); wrong email and wrong password give the **same** message so the API does not reveal which emails exist.
- **Logout** deletes the session row and clears the cookie.
- `loadUser` middleware reads the cookie on every request and sets `request.user`; `requireUser` returns **401** when nobody is signed in.

## Improvement 2: order ownership

- Migration `20261120090000_add_users_sessions_order_owner` added `Order.userId` (nullable, so the older orders were kept, not deleted).
- `POST /api/orders` now needs sign-in and saves `userId: request.user.id`, so the browser cannot choose the owner.
- `GET /api/orders` returns only `where: { userId: request.user.id }`.
- `GET /api/orders/:id`: no session → **401**; another customer's order → **403 ORDER_FORBIDDEN**; owner → **200**.
- **Key idea:** hiding a link in React is not security. The check lives in Express, so a direct request with someone else's order ID is still refused (we tested exactly that with `curl` on the live site).
- **AWS IAM is a different identity.** IAM decides who can manage AWS resources; ShopSmart sign-in decides which customer is calling the API.

## The AWS release in one paragraph

One EC2 t3.micro in Singapore. **Caddy** is the only public program (ports 80/443): it gets a free Let's Encrypt certificate for `47-130-123-197.sslip.io`, serves the Vite build with an SPA rewrite, and forwards `/api/*` to Express on `127.0.0.1:3000`. **PostgreSQL 16** listens on `127.0.0.1:5432` only. **systemd** starts Postgres, the API and Caddy after every reboot. The database password was generated on the server into `/etc/shopsmart/api.env` (readable only by root and the app user). Releases are applied with `prisma migrate deploy`, never `migrate dev`, and the seed only ran on the empty catalog.

## Retests (what we ran on the hosted version)

| Improvement | Retest | Result |
| --- | --- | --- |
| Sign-in | register 201, wrong password 401, guest `/api/auth/me` 401, cookie HttpOnly + Secure, logout ends session | Pass |
| Ownership | guest 401, owner 200, other customer 403, owner's order still there after API restart and full reboot | Pass |

## Questions to practise

1. Why does the server store a hash of the session token instead of the token?
2. What would happen if the frontend sent `userId` in the order body and the server trusted it?
3. Why is a 403 from the API stronger evidence than "the link is hidden in the UI"?
4. Why is port 3000 not in the security group, and how do requests still reach Express?
5. Why `prisma migrate deploy` and not `migrate dev` or the seed on the server?
6. Why can a `VITE_` variable hold the API URL but never `DATABASE_URL`?
7. What still costs credits if we terminate the instance but forget the Elastic IP?
8. The assistant shows "Rule-based assistant (no live AI provider)". Why label it?
