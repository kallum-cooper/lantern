import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudResourceKey, mergeCloudImport, normalizeCloudImport } from '../src/cloud.js';

test('normalizes provider-neutral cloud records and derives cloud sites', () => {
  const result = normalizeCloudImport({ records: [{ provider: 'AWS', accountId: '123', accountName: 'Production', region: 'eu-west-2', availabilityZone: 'eu-west-2a', resourceType: 'ec2', resourceId: 'i-123', name: 'web-01', status: 'running', tags: { env: 'prod' } }] });
  assert.equal(result.errors.length, 0);
  assert.equal(result.resources[0].resourceType, 'EC2');
  assert.equal(result.resources[0].tags.env, 'prod');
  assert.equal(result.sites[0].kind, 'cloud');
  assert.equal(result.sites[0].provider, 'aws');
});

test('reports invalid records without rejecting valid records', () => {
  const result = normalizeCloudImport({ records: [{ provider: 'aws', accountId: '123', region: 'us-east-1', resourceType: 's3', resourceId: 'bucket-1', name: 'bucket' }, { provider: 'aws', region: 'us-east-1', resourceType: 'ec2', resourceId: 'i-bad' }] });
  assert.equal(result.resources.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /accountId/);
});

test('uses a stable provider/account/region/type/resource key', () => {
  assert.equal(cloudResourceKey({ provider: 'AWS', accountId: '123', region: 'eu-west-2', resourceType: 'ec2', resourceId: 'i-123' }), 'aws:123:eu-west-2:EC2:i-123');
});

test('merges imports without duplicating resources', () => {
  const state = { cloudSites: [], cloudResources: [] };
  const first = normalizeCloudImport({ records: [{ provider: 'aws', accountId: '123', region: 'eu-west-2', resourceType: 'ec2', resourceId: 'i-123', name: 'web-01', status: 'running' }] });
  const second = normalizeCloudImport({ records: [{ provider: 'aws', accountId: '123', region: 'eu-west-2', resourceType: 'ec2', resourceId: 'i-123', name: 'web-renamed', status: 'stopped' }] });
  assert.deepEqual(mergeCloudImport(state, first), { created: 1, updated: 0 });
  assert.deepEqual(mergeCloudImport(state, second), { created: 0, updated: 1 });
  assert.equal(state.cloudResources[0].name, 'web-renamed');
  assert.equal(state.cloudSites.length, 1);
});
