const collections = ['sites', 'networks', 'racks', 'devices', 'addresses', 'discoveries', 'changes'];

export function exportPayload(state) {
  return { format: 'lantern-backup', version: 1, exportedAt: new Date().toISOString(), state: structuredClone(state) };
}

export function validateImport(payload) {
  if (!payload || payload.format !== 'lantern-backup') throw new Error('Unsupported backup format');
  if (payload.version !== 1) throw new Error('Unsupported backup version');
  if (!payload.state || collections.some((collection) => !Array.isArray(payload.state[collection]))) throw new Error('Backup is missing collection data');
  return structuredClone(payload.state);
}
