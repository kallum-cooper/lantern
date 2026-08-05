export function validateServiceInput(input = {}) {
  const name = String(input.name || '').trim();
  const deviceId = String(input.deviceId || '').trim();
  const port = Number(input.port);
  const protocol = String(input.protocol || 'tcp').trim().toLowerCase();
  if (!name) throw new Error('Service name is required');
  if (!deviceId) throw new Error('A device is required');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Service port must be between 1 and 65535');
  if (protocol !== 'tcp') throw new Error('Only TCP services are supported');
  return {
    name, deviceId, port, protocol,
    url: String(input.url || '').trim(),
    description: String(input.description || '').trim(),
    enabled: input.enabled === false || input.enabled === 'false' ? false : true,
  };
}

export function serviceKey(service) {
  return `${service.deviceId}:${String(service.protocol || 'tcp').toLowerCase()}:${Number(service.port)}`;
}

export function mergeDiscoveredServices(existing = [], discovered = []) {
  const result = [...existing];
  const keys = new Set(result.map(serviceKey));
  for (const candidate of discovered) {
    const normalized = { ...candidate, protocol: String(candidate.protocol || 'tcp').toLowerCase(), port: Number(candidate.port) };
    if (!normalized.deviceId || !Number.isInteger(normalized.port) || normalized.protocol !== 'tcp') continue;
    const key = serviceKey(normalized);
    if (keys.has(key)) continue;
    result.push({ ...normalized, id: normalized.id, source: 'discovered', status: 'pending', enabled: true, url: '', description: normalized.description || '' });
    keys.add(key);
  }
  return result;
}

export function portsForDevice(device, services = []) {
  return [...new Set(services.filter((service) => service.deviceId === device.id && service.enabled !== false && String(service.protocol || 'tcp').toLowerCase() === 'tcp').map((service) => Number(service.port)).filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535))].sort((a, b) => a - b);
}
