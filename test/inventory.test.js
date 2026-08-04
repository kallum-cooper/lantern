import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDeviceInput, rackPlacementAvailable, buildAddress } from '../src/inventory.js';

test('requires a device name and normalises its rack height', () => {
  assert.deepEqual(validateDeviceInput({ name: '  Router  ', height: '2' }), { name: 'Router', height: 2 });
  assert.throws(() => validateDeviceInput({ name: ' ' }), /Device name is required/);
});

test('rejects overlapping devices in rack units', () => {
  const devices = [{ rackId: 'rack_1', rackUnit: 5, height: 2 }];
  assert.equal(rackPlacementAvailable(devices, 'rack_1', 6, 1), false);
  assert.equal(rackPlacementAvailable(devices, 'rack_1', 3, 2), true);
  assert.equal(rackPlacementAvailable(devices, null, 6, 1), true);
});

test('builds a canonical IP address record', () => {
  assert.deepEqual(buildAddress({ networkId: 'net_1', ip: '192.168.1.5', hostname: 'router', deviceId: 'device_1' }), {
    networkId: 'net_1', ip: '192.168.1.5', hostname: 'router', deviceId: 'device_1', source: 'manual',
  });
});
