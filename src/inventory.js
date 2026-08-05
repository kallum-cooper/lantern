export function validateDeviceInput(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Device name is required');
  const height = Number(input.height || 1);
  if (!Number.isInteger(height) || height < 1 || height > 48) throw new Error('Device height must be between 1U and 48U');
  return { name, height };
}

export function rackPlacementAvailable(devices, rackId, rackUnit, height = 1, ignoreId = null) {
  if (!rackId || !rackUnit) return true;
  const start = Number(rackUnit);
  const end = start + Number(height) - 1;
  return !devices.some((device) => {
    if (device.id === ignoreId || device.rackId !== rackId || !device.rackUnit) return false;
    const otherStart = Number(device.rackUnit);
    const otherEnd = otherStart + Number(device.height || 1) - 1;
    return start <= otherEnd && end >= otherStart;
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
  if (state.devices.some((device) => device.rackId === rackId)) return false;
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

export function moveDeviceInRack(devices, deviceId, rackId, rackUnit) {
  const source = devices.find((device) => device.id === deviceId);
  if (!source) throw new Error('Device not found');
  const target = devices.find((device) => device.rackId === rackId && device.rackUnit === Number(rackUnit) && device.id !== deviceId);
  if (target && (source.height !== 1 || target.height !== 1)) throw new Error('Only 1U devices can be swapped directly');
  if (target) {
    const oldRackId = source.rackId;
    const oldRackUnit = source.rackUnit;
    target.rackId = oldRackId;
    target.rackUnit = oldRackUnit;
  }
  source.rackId = rackId;
  source.rackUnit = Number(rackUnit);
  return devices;
}
