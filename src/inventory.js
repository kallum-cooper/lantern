export function validateDeviceInput(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Device name is required');
  const height = Number(input.height || 1);
  if (!Number.isInteger(height) || height < 1 || height > 48) throw new Error('Device height must be between 1U and 48U');
  return { name, height };
}

export function normalizeDeviceType(type = '') {
  const value = String(type || '').trim().toLowerCase();
  if (['vm', 'virtual-machine', 'virtual machine', 'virtual'].includes(value)) return 'vm';
  if (['container', 'docker', 'docker-container'].includes(value)) return 'container';
  if (['router', 'switch', 'server', 'nas', 'ups', 'patch-panel', 'other'].includes(value)) return value;
  return 'other';
}

export function isVirtualDevice(device = {}) { return ['vm', 'container'].includes(normalizeDeviceType(device.deviceType)); }

export function normalizeRackWidth(value = '') { return String(value).toLowerCase() === 'half' ? 'half' : 'full'; }
export function normalizeRackPosition(value = '', rackWidth = 'full') {
  if (normalizeRackWidth(rackWidth) !== 'half') return 'full';
  return ['left', 'right'].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : 'left';
}

export function rackPlacementAvailable(devices, rackId, rackUnit, height = 1, ignoreId = null, rackWidth = 'full', rackPosition = 'full') {
  if (!rackId || !rackUnit) return true;
  const start = Number(rackUnit);
  const end = start + Number(height) - 1;
  return !devices.some((device) => {
    if (device.id === ignoreId || device.rackId !== rackId || !device.rackUnit) return false;
    const otherStart = Number(device.rackUnit);
    const otherEnd = otherStart + Number(device.height || 1) - 1;
    if (!(start <= otherEnd && end >= otherStart)) return false;
    const otherWidth = device.rackWidth || 'full';
    const otherPosition = device.rackPosition || 'full';
    if (rackWidth === 'half' && otherWidth === 'half' && start === otherStart && end === otherEnd && rackPosition !== 'full' && otherPosition !== 'full') return rackPosition === otherPosition;
    return true;
  });
}

export function buildAddress(input = {}) {
  return {
    networkId: input.networkId,
    ip: String(input.ip || '').trim(),
    hostname: String(input.hostname || '').trim(),
    description: String(input.description || '').trim(),
    deviceId: input.deviceId || null,
    source: input.source || 'manual',
  };
}

export function addressAlreadyAllocated(addresses, ip) {
  return addresses.some((address) => address.ip === String(ip || '').trim());
}

export function removeDevice(state, deviceId) {
  state.devices = state.devices.filter((device) => device.id !== deviceId);
  state.addresses = state.addresses.filter((address) => address.deviceId !== deviceId);
  return state;
}

export function removeDeviceCompletely(state, deviceId) {
  removeDevice(state, deviceId);
  state.services = (state.services || []).filter((service) => service.deviceId !== deviceId);
  state.topologyLinks = (state.topologyLinks || []).filter((link) => link.sourceDeviceId !== deviceId && link.targetDeviceId !== deviceId);
  return state;
}

export function removeRack(state, rackId) {
  const placedDevices = state.devices.filter((device) => device.rackId === rackId && Number(device.rackUnit) > 0);
  if (placedDevices.length) return false;
  // Older records could retain a rackId after being visually unplaced. Clean
  // those stale references while removing the otherwise empty rack.
  state.devices.filter((device) => device.rackId === rackId).forEach((device) => {
    device.rackId = null;
    device.rackUnit = null;
    device.rackWidth = 'full';
    device.rackPosition = 'full';
  });
  const index = state.racks.findIndex((rack) => rack.id === rackId);
  if (index === -1) return false;
  state.racks.splice(index, 1);
  return true;
}

export function removeSite(state, siteId) {
  if (state.racks.some((rack) => rack.siteId === siteId) || state.networks.some((network) => network.siteId === siteId)) return false;
  const index = state.sites.findIndex((site) => site.id === siteId);
  if (index === -1) return false;
  state.sites.splice(index, 1);
  return true;
}

export function moveDeviceInRack(devices, deviceId, rackId, rackUnit, rackWidth = 'full', rackPosition = 'full') {
  const source = devices.find((device) => device.id === deviceId);
  if (!source) throw new Error('Device not found');
  const target = devices.find((device) => device.rackId === rackId && device.rackUnit === Number(rackUnit) && device.id !== deviceId && !rackPlacementAvailable([device], rackId, rackUnit, source.height, source.id, rackWidth, rackPosition));
  if (target && rackWidth === 'half' && (source.rackWidth || 'full') === 'half' && (target.rackWidth || 'full') === 'half' && source.height === 1 && target.height === 1 && rackPosition !== (target.rackPosition || 'full')) {
    source.rackId = rackId;
    source.rackUnit = Number(rackUnit);
    source.rackWidth = rackWidth;
    source.rackPosition = rackPosition;
    return devices;
  }
  if (target && (source.height !== 1 || target.height !== 1)) throw new Error('Only 1U devices can be swapped directly');
  if (target) {
    const oldRackId = source.rackId;
    const oldRackUnit = source.rackUnit;
    target.rackId = oldRackId;
    target.rackUnit = oldRackUnit;
  }
  source.rackId = rackId;
  source.rackUnit = Number(rackUnit);
  source.rackWidth = rackWidth;
  source.rackPosition = rackPosition;
  return devices;
}
