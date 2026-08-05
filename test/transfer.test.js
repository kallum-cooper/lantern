import test from 'node:test';
import assert from 'node:assert/strict';
import { exportPayload, validateImport } from '../src/transfer.js';

test('exports a versioned Lantern backup payload', () => {
  const payload = exportPayload({ sites: [{ id: 'site_1' }], devices: [] });
  assert.equal(payload.format, 'lantern-backup');
  assert.equal(payload.version, 1);
  assert.deepEqual(payload.state.sites, [{ id: 'site_1' }]);
  assert.ok(payload.exportedAt);
});

test('rejects malformed imports without mutating them', () => {
  assert.throws(() => validateImport({ format: 'other' }), /Unsupported backup format/);
  assert.throws(() => validateImport({ format: 'lantern-backup', version: 1, state: {} }), /missing collection/);
});

test('keeps service data in backups and backfills it for older backups', () => {
  const state = { sites: [], networks: [], racks: [], devices: [], addresses: [], services: [{ id: 'svc_1' }], discoveries: [], changes: [] };
  const payload = exportPayload(state);
  assert.deepEqual(validateImport(payload).services, state.services);
  const older = { ...payload, state: { ...payload.state } };
  delete older.state.services;
  assert.deepEqual(validateImport(older).services, []);
});

test('round-trips service health fields through a backup', () => {
  const state = { sites: [], networks: [], racks: [], devices: [{ id: 'device_1' }], addresses: [], services: [{ id: 'svc_1', deviceId: 'device_1', port: 8080, source: 'manual', status: 'active', lastObservedOpen: true }], discoveries: [], changes: [] };
  assert.deepEqual(validateImport(exportPayload(state)).services, state.services);
});

test('round-trips visual profiles and topology state through a backup', () => {
  const state = {
    sites: [], networks: [], racks: [], devices: [{ id: 'device_1', visualProfile: 'switch-48', topologyPosition: { x: 40, y: 80 } }], addresses: [], services: [],
    topologyGroups: [{ id: 'group_1', name: 'Core', x: 0, y: 0, width: 420, height: 260, color: '#243b5c' }], topologyLinks: [{ id: 'link_1', sourceDeviceId: 'device_1', targetDeviceId: 'device_2', label: 'LAN', direction: 'none' }], discoveries: [], changes: [],
  };
  const restored = validateImport(exportPayload(state));
  assert.deepEqual(restored.devices[0].topologyPosition, { x: 40, y: 80 });
  assert.deepEqual(restored.topologyGroups, state.topologyGroups);
  assert.deepEqual(restored.topologyLinks, state.topologyLinks);
});
