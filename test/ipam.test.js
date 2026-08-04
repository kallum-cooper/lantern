import test from 'node:test';
import assert from 'node:assert/strict';
import { cidrInfo, ipToNumber, numberToIp, nextAvailableIp, isIpInCidr, usableIps } from '../src/ipam.js';

test('parses a CIDR and calculates usable addresses', () => {
  const subnet = cidrInfo('192.168.1.0/29');
  assert.equal(subnet.network, '192.168.1.0');
  assert.equal(subnet.broadcast, '192.168.1.7');
  assert.equal(subnet.total, 8);
  assert.equal(subnet.usable, 6);
});

test('converts IPv4 values both ways', () => {
  assert.equal(ipToNumber('10.0.0.42'), 167772202);
  assert.equal(numberToIp(167772202), '10.0.0.42');
});

test('finds the first unused usable address', () => {
  assert.equal(nextAvailableIp('192.168.1.0/29', ['192.168.1.1', '192.168.1.2']), '192.168.1.3');
  assert.equal(nextAvailableIp('192.168.1.0/31', []), null);
});

test('checks whether an address belongs to a subnet', () => {
  assert.equal(isIpInCidr('192.168.1.42', '192.168.1.0/24'), true);
  assert.equal(isIpInCidr('192.168.2.42', '192.168.1.0/24'), false);
});

test('enumerates usable addresses without network or broadcast addresses', () => {
  assert.deepEqual(usableIps('192.168.1.0/30'), ['192.168.1.1', '192.168.1.2']);
});
