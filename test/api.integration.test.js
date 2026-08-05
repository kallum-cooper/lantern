import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = 4317;
const baseUrl = `http://127.0.0.1:${port}`;
let dataDirectory;
let serverProcess;

before(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'lantern-api-'));
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), LANTERN_DATA: path.join(dataDirectory, 'lantern.json') },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Lantern API did not start for integration tests');
});

after(async () => {
  serverProcess?.kill('SIGTERM');
  await rm(dataDirectory, { recursive: true, force: true });
});

test('creates and deletes a device with its linked IP through the API', async () => {
  const initial = await (await fetch(`${baseUrl}/api/summary`)).json();
  const network = initial.networks[0];
  const createdResponse = await fetch(`${baseUrl}/api/devices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Integration device', deviceType: 'server', networkId: network.id, ip: '192.168.1.240' }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const withDevice = await (await fetch(`${baseUrl}/api/summary`)).json();
  assert.equal(withDevice.devices.some((device) => device.id === created.id), true);
  assert.equal(withDevice.addresses.some((address) => address.deviceId === created.id), true);

  const deletedResponse = await fetch(`${baseUrl}/api/devices/${created.id}`, { method: 'DELETE' });
  assert.equal(deletedResponse.status, 200);
  const afterDelete = await (await fetch(`${baseUrl}/api/summary`)).json();
  assert.equal(afterDelete.devices.some((device) => device.id === created.id), false);
  assert.equal(afterDelete.addresses.some((address) => address.deviceId === created.id), false);
});
