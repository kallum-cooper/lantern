import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDeviceInput, normalizeDeviceType, isVirtualDevice, rackPlacementAvailable, buildAddress, addressAlreadyAllocated, removeDevice, moveDeviceInRack } from '../src/inventory.js';

test('requires a device name and normalises its rack height', () => {
  assert.deepEqual(validateDeviceInput({ name: '  Router  ', height: '2' }), { name: 'Router', height: 2 });
  assert.throws(() => validateDeviceInput({ name: ' ' }), /Device name is required/);
});

test('normalizes physical, VM, and container device types', () => {
  assert.equal(normalizeDeviceType('virtual-machine'), 'vm');
  assert.equal(normalizeDeviceType('docker'), 'container');
  assert.equal(normalizeDeviceType('router'), 'router');
  assert.equal(isVirtualDevice({ deviceType: 'vm' }), true);
  assert.equal(isVirtualDevice({ deviceType: 'server' }), false);
});

test('rejects overlapping devices in rack units', () => {
  const devices = [{ rackId: 'rack_1', rackUnit: 5, height: 2 }];
  assert.equal(rackPlacementAvailable(devices, 'rack_1', 6, 1), false);
  assert.equal(rackPlacementAvailable(devices, 'rack_1', 3, 2), true);
  assert.equal(rackPlacementAvailable(devices, null, 6, 1), true);
});

test('builds a canonical IP address record', () => {
  assert.deepEqual(buildAddress({ networkId: 'net_1', ip: '192.168.1.5', hostname: 'router', deviceId: 'device_1' }), {
    networkId: 'net_1', ip: '192.168.1.5', hostname: 'router', description: '', deviceId: 'device_1', source: 'manual',
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

test('moves a rack device and swaps another 1U device when needed', () => {
  const devices = [{ id: 'a', rackId: 'rack_1', rackUnit: 1, height: 1 }, { id: 'b', rackId: 'rack_1', rackUnit: 4, height: 1 }];
  moveDeviceInRack(devices, 'a', 'rack_1', 4);
  assert.equal(devices.find((device) => device.id === 'a').rackUnit, 4);
  assert.equal(devices.find((device) => device.id === 'b').rackUnit, 1);
});
