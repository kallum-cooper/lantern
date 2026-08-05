import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_PROFILES, profileFor, validProfile, rackProfiles } from '../src/profiles.js';

test('exposes the supported generic device profiles', () => {
  assert.ok(DEVICE_PROFILES.length >= 12);
  assert.ok(validProfile('patch-panel-24'));
  assert.ok(validProfile('unifi-switch-24'));
  assert.equal(validProfile('cisco-9000'), false);
  assert.ok(rackProfiles().every((profile) => profile.rackMount));
});

test('falls back to the 1U server profile', () => {
  assert.equal(profileFor('missing').id, 'generic-1u');
  assert.equal(profileFor('server-1u').id, 'generic-1u');
  assert.equal(profileFor('patch-panel-48').asset, 'server-face.png');
  assert.equal(profileFor('generic-1u').asset, 'server-face.png');
});
