import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { emptyState } from '../src/store.js';
import { createPersistence } from '../src/persistence.js';

test('uses JSON persistence when no database URL is configured', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lantern-persistence-'));
  const filePath = path.join(directory, 'lantern.json');
  const persistence = await createPersistence({ filePath });
  const state = { ...structuredClone(emptyState), sites: [{ id: 'site-1', name: 'Test site' }] };
  await persistence.save(state);
  const loaded = await persistence.load();
  assert.equal(loaded.sites[0].name, 'Test site');
  await persistence.close();
  await rm(directory, { recursive: true, force: true });
});
