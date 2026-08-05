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
