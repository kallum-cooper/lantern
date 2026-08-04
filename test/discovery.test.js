import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyServices, inferDeviceRole } from '../src/discovery.js';

test('classifies common open ports into useful services', () => {
  assert.deepEqual(classifyServices([22, 80, 443, 445]), ['SSH', 'HTTP', 'HTTPS', 'SMB']);
});

test('infers a useful device role from observed services', () => {
  assert.equal(inferDeviceRole([53, 80, 443], 'gateway.home'), 'Router / gateway');
  assert.equal(inferDeviceRole([22, 3389], 'windows-server'), 'Server');
  assert.equal(inferDeviceRole([80], 'switch.home'), 'Network device');
  assert.equal(inferDeviceRole([], ''), 'Unknown device');
});
