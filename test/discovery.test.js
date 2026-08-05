import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyServices, inferDeviceRole, mergeScanDiscoveries } from '../src/discovery.js';

test('classifies common open ports into useful services', () => {
  assert.deepEqual(classifyServices([22, 80, 443, 445]), ['SSH', 'HTTP', 'HTTPS', 'SMB']);
});

test('infers a useful device role from observed services', () => {
  assert.equal(inferDeviceRole([53, 80, 443], 'gateway.home'), 'Router / gateway');
  assert.equal(inferDeviceRole([22, 3389], 'windows-server'), 'Server');
  assert.equal(inferDeviceRole([80], 'switch.home'), 'Network device');
  assert.equal(inferDeviceRole([], ''), 'Unknown device');
});

test('allows a deleted inventory address to return as a new discovery', () => {
  const existing = [{ id: 'old', networkId: 'net_1', ip: '192.168.1.20', status: 'confirmed' }];
  const fresh = [{ id: 'new', networkId: 'net_1', ip: '192.168.1.20', status: 'pending' }];
  const result = mergeScanDiscoveries(existing, fresh, new Set());
  assert.deepEqual(result.map((item) => item.id), ['new']);
});
