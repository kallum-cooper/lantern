import test from 'node:test';
import assert from 'node:assert/strict';
import { removeDeviceCompletely, removeRack, removeSite } from '../src/inventory.js';

test('complete device removal cleans linked inventory and topology records', () => {
  const state = {
    devices: [{ id: 'device_1' }, { id: 'device_2' }],
    addresses: [{ deviceId: 'device_1' }, { deviceId: 'device_2' }],
    services: [{ deviceId: 'device_1' }, { deviceId: 'device_2' }],
    topologyLinks: [{ sourceDeviceId: 'device_1', targetDeviceId: 'device_2' }, { sourceDeviceId: 'device_2', targetDeviceId: 'other' }],
  };
  removeDeviceCompletely(state, 'device_1');
  assert.deepEqual(state.devices.map((item) => item.id), ['device_2']);
  assert.deepEqual(state.addresses, [{ deviceId: 'device_2' }]);
  assert.deepEqual(state.services, [{ deviceId: 'device_2' }]);
  assert.deepEqual(state.topologyLinks, [{ sourceDeviceId: 'device_2', targetDeviceId: 'other' }]);
});

test('rack and site removal report whether relationships block deletion', () => {
  const state = { racks: [{ id: 'rack_1', siteId: 'site_1' }, { id: 'rack_2', siteId: 'site_2' }], devices: [{ rackId: 'rack_1' }], sites: [{ id: 'site_1' }, { id: 'site_2' }], networks: [{ siteId: 'site_1' }] };
  assert.equal(removeRack(state, 'rack_1'), false);
  assert.equal(removeRack(state, 'rack_2'), true);
  assert.equal(removeSite(state, 'site_1'), false);
  assert.equal(removeSite(state, 'site_2'), true);
  assert.equal(state.racks.length, 1);
  assert.equal(state.sites.length, 1);
});
