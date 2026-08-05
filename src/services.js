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
    overviewVisible: input.overviewVisible === true || input.overviewVisible === 'true',
    topologyVisible: input.topologyVisible === undefined ? true : input.topologyVisible === true || input.topologyVisible === 'true',
  };
}

export function serviceKey(service) {
  return `${service.deviceId}:${String(service.protocol || 'tcp').toLowerCase()}:${Number(service.port)}`;
}

export function serviceIcon(service = {}) {
  const text = `${service.name || ''} ${service.description || ''}`.toLowerCase();
  if (text.includes('docker')) return '🐳';
  if (text.includes('traefik')) return '🔀';
  if (text.includes('adguard')) return '🛡';
  if (text.includes('jellyfin')) return '▶';
  if (text.includes('portainer')) return '⚓';
  if (text.includes('plex')) return '▸';
  if (Number(service.port) === 53) return '⌁';
  if ([80, 443, 8080, 8443].includes(Number(service.port))) return '◉';
  return '◇';
}

export function mergeDiscoveredServices(existing = [], discovered = []) {
  const result = [...existing];
  const keys = new Set(result.map(serviceKey));
  for (const candidate of discovered) {
    const normalized = { ...candidate, protocol: String(candidate.protocol || 'tcp').toLowerCase(), port: Number(candidate.port) };
    if (!normalized.deviceId || !Number.isInteger(normalized.port) || normalized.protocol !== 'tcp') continue;
    const key = serviceKey(normalized);
    if (keys.has(key)) continue;
    result.push({ ...normalized, id: normalized.id, source: 'discovered', status: 'pending', enabled: true, topologyVisible: true, url: '', description: normalized.description || '', icon: serviceIcon(normalized) });
    keys.add(key);
  }
  return result;
}

export function reconcileServiceObservations(existing = [], deviceId, ports = [], now = new Date().toISOString()) {
  const observed = new Set(ports.map(Number));
  const updated = existing.map((service) => service.deviceId === deviceId && observed.has(Number(service.port))
    ? { ...service, lastObservedOpen: true, lastCheckedAt: now, icon: service.icon || serviceIcon(service) }
    : service);
  return mergeDiscoveredServices(updated, ports.map((port) => ({ id: `discovered-${deviceId}-${port}`, deviceId, name: `Port ${port}`, port, protocol: 'tcp' })));
}

export function portsForDevice(device, services = []) {
  return [...new Set(services.filter((service) => service.deviceId === device.id && service.enabled !== false && String(service.protocol || 'tcp').toLowerCase() === 'tcp').map((service) => Number(service.port)).filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535))].sort((a, b) => a - b);
}
