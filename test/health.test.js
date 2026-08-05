import test from 'node:test';
import assert from 'node:assert/strict';
import { healthStatus, checkDeviceHealth } from '../src/health.js';

test('calculates unknown health when no ports can be checked', () => {
  assert.equal(healthStatus([]), 'unknown');
});

test('calculates online health when every expected port responds', () => {
  assert.equal(healthStatus([{ port: 80, open: true }, { port: 443, open: true }]), 'online');
});

test('calculates degraded health when some expected ports respond', () => {
  assert.equal(healthStatus([{ port: 80, open: true }, { port: 443, open: false }]), 'degraded');
});

test('calculates offline health when no expected port responds', () => {
  assert.equal(healthStatus([{ port: 80, open: false }, { port: 443, open: false }]), 'offline');
});

test('checks only enabled TCP services for a device', async () => {
  const checked = [];
  const result = await checkDeviceHealth({ id: 'device_1', address: { ip: '192.168.1.20' } }, [
    { deviceId: 'device_1', port: 80, protocol: 'tcp', enabled: true },
    { deviceId: 'device_1', port: 443, protocol: 'tcp', enabled: false },
  ], async (ip, port) => { checked.push(`${ip}:${port}`); return true; });
  assert.deepEqual(checked, ['192.168.1.20:80']);
  assert.equal(result.status, 'online');
});
