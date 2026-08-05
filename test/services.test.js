import test from 'node:test';
import assert from 'node:assert/strict';
import { validateServiceInput, serviceKey, mergeDiscoveredServices, portsForDevice } from '../src/services.js';

test('validates and normalizes a service', () => {
  assert.deepEqual(validateServiceInput({ name: '  Jellyfin ', deviceId: 'device_1', port: '8096', url: 'http://media.local' }), {
    name: 'Jellyfin', deviceId: 'device_1', port: 8096, protocol: 'tcp', url: 'http://media.local', description: '', enabled: true,
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
