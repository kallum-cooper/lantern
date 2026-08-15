import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(String(password), salt, 64);
  return `scrypt:${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [, salt, expectedHex] = String(encoded || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSession(userId, now = Date.now()) {
  const token = randomBytes(32).toString('hex');
  return { id: `session_${randomUUID().slice(0, 8)}`, userId, tokenHash: hashToken(token), createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 30).toISOString(), token };
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function activeSession(sessions, token, now = Date.now()) {
  const hash = hashToken(token);
  return (sessions || []).find((session) => session.tokenHash === hash && new Date(session.expiresAt).getTime() > now) || null;
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, createdAt: user.createdAt };
}
