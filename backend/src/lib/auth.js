import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './prisma.js';

// ShopSmart customer identity (not AWS IAM). Passwords are hashed with scrypt from
// Node's standard library; sessions are random tokens kept in an HTTP-only cookie.
const scrypt = promisify(crypto.scrypt);
export const SESSION_COOKIE = 'shopsmart_session';
const SESSION_DAYS = 7;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltB64, keyB64] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function readCookie(request, name) {
  const header = request.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Secure cookies are only sent over HTTPS, which the hosted version always uses.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  };
}

export async function startSession(response, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) }
  });
  response.cookie(SESSION_COOKIE, token, cookieOptions());
}

export async function endSession(request, response) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  const options = cookieOptions();
  delete options.maxAge;
  response.clearCookie(SESSION_COOKIE, options);
}

export const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

// Attaches request.user when a valid session cookie is present. Never rejects by itself.
export async function loadUser(request, _response, next) {
  try {
    request.user = null;
    const token = readCookie(request, SESSION_COOKIE);
    if (!token) return next();
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (session && session.expiresAt > new Date()) request.user = session.user;
    else if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    next();
  } catch (error) { next(error); }
}

export function requireUser(request, response, next) {
  if (!request.user) return response.status(401).json({ error: { code: 'SIGN_IN_REQUIRED', message: 'Sign in to continue.' } });
  next();
}
