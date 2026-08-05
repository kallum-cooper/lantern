export function validatePosition(input) {
  if (input === null || input === undefined) return null;
  const x = Number(input.x);
  const y = Number(input.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Topology position must contain finite x and y values');
  return { x: Math.max(-10000, Math.min(10000, x)), y: Math.max(-10000, Math.min(10000, y)) };
}

export function validateGroupInput(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Topology group name is required');
  const position = validatePosition({ x: input.x ?? 0, y: input.y ?? 0 });
  const width = Math.max(180, Math.min(3000, Number(input.width) || 420));
  const height = Math.max(120, Math.min(2000, Number(input.height) || 260));
  return { name, ...position, width, height, color: String(input.color || '#243b5c').trim() };
}

export function validateLinkInput(input = {}, devices = []) {
  const sourceDeviceId = String(input.sourceDeviceId || '').trim();
  const targetDeviceId = String(input.targetDeviceId || '').trim();
  if (!sourceDeviceId || !targetDeviceId || sourceDeviceId === targetDeviceId) throw new Error('A link needs two different devices');
  if (!devices.some((device) => device.id === sourceDeviceId) || !devices.some((device) => device.id === targetDeviceId)) throw new Error('Both linked devices must exist');
  const direction = ['none', 'forward', 'backward'].includes(input.direction) ? input.direction : 'none';
  return { sourceDeviceId, targetDeviceId, label: String(input.label || '').trim(), direction };
}

export function linkKey(link) {
  return [link.sourceDeviceId, link.targetDeviceId].sort().join(':');
}
