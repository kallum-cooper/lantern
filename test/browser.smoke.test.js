import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const port = 4321;
const baseUrl = `http://127.0.0.1:${port}`;
let dataDirectory;
let serverProcess;

before(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'lantern-browser-'));
  serverProcess = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), LANTERN_DATA: path.join(dataDirectory, 'lantern.json'), LANTERN_AUTH_DISABLED: 'true' }, stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error('Lantern API did not start for browser smoke test');
});

after(async () => { serverProcess?.kill('SIGTERM'); await rm(dataDirectory, { recursive: true, force: true }); });

test('renders the main Lantern shell and dynamic inventory views in Chrome', async () => {
  const { stdout } = await run('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--dump-dom', '--virtual-time-budget=2500', baseUrl]);
  assert.match(stdout, /Lantern · Homelab inventory/);
  assert.match(stdout, /id="view-overview"/);
  assert.match(stdout, /id="view-topology"/);
  assert.match(stdout, /id="view-cloud"/);
});

test('keeps login controls usable when setup-only fields are hidden', async () => {
  const [html, authCss, appJs] = await Promise.all([
    fetch(`${baseUrl}/`).then((response) => response.text()),
    fetch(`${baseUrl}/auth.css`).then((response) => response.text()),
    fetch(`${baseUrl}/app.js`).then((response) => response.text()),
  ]);
  assert.match(html, /name="username"[^>]*autocomplete="username"/);
  assert.match(html, /name="password"[^>]*type="password"/);
  assert.match(authCss, /\.auth-card \[hidden\]\{display:none!important\}/);
  assert.match(appJs, /submit\.disabled = true/);
  assert.match(appJs, /Could not reach Lantern/);
});
