import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { endSession, hashPassword, publicUser, requireUser, startSession, verifyPassword } from '../lib/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
const router = Router();

// Slows down password guessing. Behind Caddy, app.set('trust proxy', 1) gives the real client IP.
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const invalid = (response, code, message, details) => response.status(422).json({ error: { code, message, details } });

router.post('/register', authLimiter, async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return invalid(response, 'INVALID_ACCOUNT', 'Use a name, a valid email and a password of at least 8 characters.', parsed.error.flatten());
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account with that email already exists.' } });
    const user = await prisma.user.create({ data: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) } });
    await startSession(response, user.id);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return invalid(response, 'INVALID_LOGIN', 'Enter your email and password.');
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    // Same message for unknown email and wrong password, so the API does not reveal which accounts exist.
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    }
    await startSession(response, user.id);
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', async (request, response, next) => {
  try { await endSession(request, response); response.status(204).end(); } catch (error) { next(error); }
});

router.get('/me', requireUser, (request, response) => response.json({ user: publicUser(request.user) }));

export default router;
