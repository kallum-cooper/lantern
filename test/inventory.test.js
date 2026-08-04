import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDeviceInput, rackPlacementAvailable, buildAddress, addressAlreadyAllocated, removeDevice } from '../src/inventory.js';

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

test('detects duplicate IP allocations', () => {
  assert.equal(addressAlreadyAllocated([{ ip: '192.168.1.5' }], '192.168.1.5'), true);
  assert.equal(addressAlreadyAllocated([{ ip: '192.168.1.5' }], '192.168.1.6'), false);
});

test('removes a device and its linked address records', () => {
  const state = { devices: [{ id: 'device_1' }, { id: 'device_2' }], addresses: [{ id: 'ip_1', deviceId: 'device_1' }, { id: 'ip_2', deviceId: 'device_2' }] };
  removeDevice(state, 'device_1');
  assert.deepEqual(state.devices, [{ id: 'device_2' }]);
  assert.deepEqual(state.addresses, [{ id: 'ip_2', deviceId: 'device_2' }]);
});
