import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const emptyState = {
  sites: [],
  networks: [],
  racks: [],
  devices: [],
  addresses: [],
  services: [],
  topologyGroups: [],
  topologyLinks: [],
  cloudSites: [],
  cloudResources: [],
  users: [],
  sessions: [],
  discoveries: [],
  changes: [],
};

export function createId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export async function loadState(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ...emptyState, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return structuredClone(emptyState);
  }
}

export async function saveState(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  await fs.rename(temporaryPath, filePath);
}

export function seedState(state) {
  if (state.sites.length) return state;
  const siteId = createId('site');
  const rackId = createId('rack');
  const networkId = createId('net');
  return {
    ...state,
    sites: [{ id: siteId, name: 'Home Lab', location: 'Home', description: 'Primary homelab site' }],
    racks: [{ id: rackId, siteId, name: 'Main Rack', height: 12, width: 600 }],
    networks: [{ id: networkId, name: 'Management LAN', cidr: '192.168.1.0/24', vlan: 1, siteId }],
    changes: [{ id: createId('change'), type: 'system', message: 'Lantern workspace created', at: new Date().toISOString() }],
  };
}

export function addChange(state, type, message) {
  state.changes.unshift({ id: createId('change'), type, message, at: new Date().toISOString() });
  state.changes = state.changes.slice(0, 30);
}
