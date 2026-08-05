import test from 'node:test';
import assert from 'node:assert/strict';
import { healthStatus } from '../src/health.js';

test('calculates unknown health when no ports can be checked', () => {
  assert.equal(healthStatus([]), 'unknown');
});

test('calculates online health when every expected port responds', () => {
  assert.equal(healthStatus([{ port: 80, open: true }, { port: 443, open: true }]), 'online');
});

test('calculates degraded health when some expected ports respond', () => {
  assert.equal(healthStatus([{ port: 80, open: true }, { port: 443, open: false }]), 'degraded');
});

test('calculates offline health when no expected port responds', () => {
  assert.equal(healthStatus([{ port: 80, open: false }, { port: 443, open: false }]), 'offline');
});
