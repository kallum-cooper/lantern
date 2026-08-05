import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_PROFILES, profileFor, validProfile } from '../src/profiles.js';

test('exposes the supported generic device profiles', () => {
  assert.equal(DEVICE_PROFILES.length, 8);
  assert.ok(validProfile('switch-48'));
  assert.ok(validProfile('nas'));
  assert.equal(validProfile('cisco-9000'), false);
});

test('falls back to the 1U server profile', () => {
  assert.equal(profileFor('missing').id, 'server-1u');
  assert.equal(profileFor('firewall').asset, 'firewall.png');
});
