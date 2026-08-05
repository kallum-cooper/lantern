import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePosition, validateGroupInput, validateLinkInput, linkKey } from '../src/topology.js';

test('clamps finite topology coordinates', () => {
  assert.deepEqual(validatePosition({ x: 20000, y: -20000 }), { x: 10000, y: -10000 });
  assert.throws(() => validatePosition({ x: 'nope', y: 2 }), /finite/);
});

test('normalizes topology group input', () => {
  assert.deepEqual(validateGroupInput({ name: ' Core ', x: 10 }), { name: 'Core', x: 10, y: 0, width: 420, height: 260, color: '#243b5c' });
});

test('validates links and detects endpoint duplicates', () => {
  const devices = [{ id: 'a' }, { id: 'b' }];
  const link = validateLinkInput({ sourceDeviceId: 'a', targetDeviceId: 'b', direction: 'forward' }, devices);
  assert.equal(linkKey(link), 'a:b');
  assert.throws(() => validateLinkInput({ sourceDeviceId: 'a', targetDeviceId: 'a' }, devices), /different devices/);
  assert.throws(() => validateLinkInput({ sourceDeviceId: 'a', targetDeviceId: 'missing' }, devices), /must exist/);
});
