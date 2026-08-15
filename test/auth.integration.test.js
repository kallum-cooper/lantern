import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = 4322;
const baseUrl = `http://127.0.0.1:${port}`;
let dataDirectory;
let serverProcess;

before(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'lantern-auth-'));
  serverProcess = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), LANTERN_DATA: path.join(dataDirectory, 'lantern.json') }, stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error('Lantern API did not start for auth integration test');
});

after(async () => { serverProcess?.kill('SIGTERM'); await rm(dataDirectory, { recursive: true, force: true }); });

test('sets up an admin, protects inventory, and supports separate users', async () => {
  const status = await (await fetch(`${baseUrl}/api/auth/status`)).json();
  assert.equal(status.setupRequired, true);
  const setup = await fetch(`${baseUrl}/api/auth/setup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', displayName: 'Admin', password: 'correct horse' }) });
  assert.equal(setup.status, 201);
  const adminCookie = setup.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${baseUrl}/api/summary`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/summary`, { headers: { cookie: adminCookie } })).status, 200);
  const member = await fetch(`${baseUrl}/api/users`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: adminCookie }, body: JSON.stringify({ username: 'member', displayName: 'Member', password: 'member pass' }) });
  assert.equal(member.status, 201);
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'member', password: 'member pass' }) });
  assert.equal(login.status, 200);
  const memberCookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await fetch(`${baseUrl}/api/auth/status`, { headers: { cookie: memberCookie } })).json()).user.username, 'member');
});
