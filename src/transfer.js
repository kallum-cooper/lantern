const collections = ['sites', 'networks', 'racks', 'devices', 'addresses', 'services', 'topologyGroups', 'topologyLinks', 'discoveries', 'changes'];

export function exportPayload(state) {
  return { format: 'lantern-backup', version: 1, exportedAt: new Date().toISOString(), state: { ...structuredClone(state), services: structuredClone(state.services || []), topologyGroups: structuredClone(state.topologyGroups || []), topologyLinks: structuredClone(state.topologyLinks || []) } };
}

export function validateImport(payload) {
  if (!payload || payload.format !== 'lantern-backup') throw new Error('Unsupported backup format');
  if (payload.version !== 1) throw new Error('Unsupported backup version');
  const requiredCollections = collections.filter((collection) => !['services', 'topologyGroups', 'topologyLinks'].includes(collection));
  if (!payload.state || requiredCollections.some((collection) => !Array.isArray(payload.state[collection]))) throw new Error('Backup is missing collection data');
  return { ...structuredClone(payload.state), services: structuredClone(payload.state.services || []), topologyGroups: structuredClone(payload.state.topologyGroups || []), topologyLinks: structuredClone(payload.state.topologyLinks || []) };
}
