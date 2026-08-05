import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_PROFILES, profileFor, validProfile, rackProfiles } from '../src/profiles.js';

test('exposes the supported generic device profiles', () => {
  assert.ok(DEVICE_PROFILES.length >= 12);
  assert.ok(validProfile('patch-panel-24'));
  assert.ok(validProfile('unifi-switch-24'));
  assert.ok(validProfile('dell-server-1u'));
  assert.ok(validProfile('synology-nas-2u'));
  assert.ok(validProfile('unifi-switch-48'));
  assert.ok(validProfile('unifi-udm-pro'));
  assert.ok(validProfile('unifi-uxg-pro'));
  assert.equal(profileFor('dell-optiplex-micro').defaultRackWidth, 'half');
  assert.equal(profileFor('lenovo-thinkcentre-tiny').defaultRackWidth, 'half');
  assert.equal(validProfile('cisco-9000'), false);
  assert.ok(rackProfiles().every((profile) => profile.rackMount));
});

test('falls back to the 1U server profile', () => {
  assert.equal(profileFor('missing').id, 'generic-1u');
  assert.equal(profileFor('server-1u').id, 'generic-1u');
  assert.equal(profileFor('patch-panel-48').asset, 'patch-panel-48.png');
  assert.equal(new Set(DEVICE_PROFILES.map((profile) => profile.asset)).size, DEVICE_PROFILES.length);
});
