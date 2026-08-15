import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSession, createSession, hashPassword, publicUser, verifyPassword } from '../src/auth.js';

test('hashes and verifies passwords without storing plaintext', async () => {
  const encoded = await hashPassword('correct horse battery staple');
  assert.notEqual(encoded, 'correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', encoded), true);
  assert.equal(await verifyPassword('wrong password', encoded), false);
});

test('creates expiring sessions and exposes only public user fields', () => {
  const session = createSession('user-1', Date.parse('2026-01-01T00:00:00Z'));
  assert.equal(activeSession([session], session.token, Date.parse('2026-01-02T00:00:00Z')).userId, 'user-1');
  assert.equal(activeSession([session], session.token, Date.parse('2026-02-01T00:00:00Z')), null);
  assert.deepEqual(publicUser({ id: 'user-1', username: 'admin', displayName: 'Admin', role: 'admin', passwordHash: 'secret', createdAt: 'now' }), { id: 'user-1', username: 'admin', displayName: 'Admin', role: 'admin', createdAt: 'now' });
});
