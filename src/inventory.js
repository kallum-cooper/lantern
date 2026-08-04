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
