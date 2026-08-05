import test from 'node:test';
import assert from 'node:assert/strict';
import { validateServiceInput, serviceKey, mergeDiscoveredServices, reconcileServiceObservations, portsForDevice, serviceIcon } from '../src/services.js';

test('validates and normalizes a service', () => {
  assert.deepEqual(validateServiceInput({ name: '  Jellyfin ', deviceId: 'device_1', port: '8096', url: 'http://media.local' }), {
    name: 'Jellyfin', deviceId: 'device_1', port: 8096, protocol: 'tcp', url: 'http://media.local', description: '', enabled: true, overviewVisible: false, topologyVisible: true,
  });
});

test('rejects invalid service ports and protocols', () => {
  assert.throws(() => validateServiceInput({ name: 'bad', deviceId: 'device_1', port: 0 }), /between 1 and 65535/);
  assert.throws(() => validateServiceInput({ name: 'bad', deviceId: 'device_1', port: 65536 }), /between 1 and 65535/);
  assert.throws(() => validateServiceInput({ name: 'bad', deviceId: 'device_1', port: 80, protocol: 'udp' }), /TCP/);
});

test('merges discovered services without replacing manual services', () => {
  const manual = { id: 'svc_1', deviceId: 'device_1', name: 'Web', port: 80, protocol: 'tcp', source: 'manual', status: 'active' };
  const result = mergeDiscoveredServices([manual], [
    { deviceId: 'device_1', name: 'HTTP', port: 80, protocol: 'tcp' },
    { deviceId: 'device_1', name: 'HTTPS', port: 443, protocol: 'tcp' },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0], manual);
  assert.equal(result[1].source, 'discovered');
  assert.equal(serviceKey(result[1]), 'device_1:tcp:443');
});

test('returns enabled TCP ports for one device', () => {
  assert.deepEqual(portsForDevice({ id: 'device_1' }, [
    { deviceId: 'device_1', port: 80, protocol: 'tcp', enabled: true },
    { deviceId: 'device_1', port: 80, protocol: 'tcp', enabled: true },
    { deviceId: 'device_1', port: 443, protocol: 'tcp', enabled: false },
    { deviceId: 'device_2', port: 22, protocol: 'tcp', enabled: true },
  ]), [80]);
});

test('classifies common homelab services with a generic fallback', () => {
  assert.equal(serviceIcon({ name: 'Docker Engine', port: 2375 }), '🐳');
  assert.equal(serviceIcon({ name: 'Traefik dashboard', port: 8080 }), '🔀');
  assert.equal(serviceIcon({ name: 'Unknown app', port: 1234 }), '◇');
});

test('reconciles open ports without replacing manual service metadata', () => {
  const manual = { id: 'manual', deviceId: 'device_1', name: 'Reverse proxy', description: 'Keep this note', port: 443, protocol: 'tcp', source: 'manual', status: 'active' };
  const result = reconcileServiceObservations([manual], 'device_1', [443, 8123], '2026-08-05T12:00:00.000Z');
  assert.equal(result[0].name, 'Reverse proxy');
  assert.equal(result[0].description, 'Keep this note');
  assert.equal(result[0].lastObservedOpen, true);
  assert.equal(result[0].lastCheckedAt, '2026-08-05T12:00:00.000Z');
  assert.equal(result.length, 2);
  assert.equal(result[1].port, 8123);
});

test('normalizes whether a service appears on the overview', () => {
  assert.equal(validateServiceInput({ name: 'Docker', deviceId: 'device_1', port: 2375, overviewVisible: true }).overviewVisible, true);
  assert.equal(validateServiceInput({ name: 'Docker', deviceId: 'device_1', port: 2375, overviewVisible: false }).overviewVisible, false);
  assert.equal(validateServiceInput({ name: 'Docker', deviceId: 'device_1', port: 2375 }).topologyVisible, true);
  assert.equal(validateServiceInput({ name: 'Docker', deviceId: 'device_1', port: 2375, topologyVisible: false }).topologyVisible, false);
});
