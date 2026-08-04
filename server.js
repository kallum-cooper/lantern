import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import net from 'node:net';
import dns from 'node:dns/promises';
import { loadState, saveState, seedState, createId, addChange } from './src/store.js';
import { cidrInfo, isIpInCidr, usableIps } from './src/ipam.js';
import { validateDeviceInput, rackPlacementAvailable, buildAddress, addressAlreadyAllocated, removeDevice } from './src/inventory.js';
import { exportPayload, validateImport } from './src/transfer.js';
import { classifyServices, inferDeviceRole, deviceTypeForRole } from './src/discovery.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const dataPath = process.env.LANTERN_DATA || path.join(root, 'data', 'lantern.json');
let state = seedState(await loadState(dataPath));
await saveState(dataPath, state);

const json = (response, status, payload) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

async function body(request) {
  let value = '';
  for await (const chunk of request) value += chunk;
  return value ? JSON.parse(value) : {};
}

function summary() {
  return {
    site: state.sites[0],
    sites: state.sites.map((site) => ({ ...site, rackCount: state.racks.filter((rack) => rack.siteId === site.id).length, deviceCount: state.devices.filter((device) => state.racks.some((rack) => rack.id === device.rackId && rack.siteId === site.id)).length, networkCount: state.networks.filter((network) => network.siteId === site.id).length })),
    counts: {
      devices: state.devices.length,
      addresses: state.addresses.length,
      networks: state.networks.length,
      racks: state.racks.length,
      discoveries: state.discoveries.filter((item) => item.status === 'pending').length,
    },
    networks: state.networks.map((network) => ({
      ...network,
      addressCount: state.addresses.filter((address) => address.networkId === network.id).length,
      capacity: cidrInfo(network.cidr).usable,
    })),
    racks: state.racks.map((rack) => ({ ...rack, devices: state.devices.filter((device) => device.rackId === rack.id).map((device) => ({ ...device, address: state.addresses.find((address) => address.deviceId === device.id) || null })) })),
    devices: state.devices.map((device) => ({ ...device, address: state.addresses.find((address) => address.deviceId === device.id) || null })),
    addresses: state.addresses,
    discoveries: state.discoveries,
    changes: state.changes,
  };
}

async function scanNetwork(network) {
  const info = cidrInfo(network.cidr);
  if (info.usable > 1024) throw new Error('Scan target is larger than the 1024-address safety limit');
  const localAddresses = Object.values(os.networkInterfaces()).flat().filter(Boolean).map((item) => item.address);
  const discoveries = [];
  const addresses = usableIps(network.cidr);
  const candidates = addresses.filter((address) => isIpInCidr(address, network.cidr));
  const commonPorts = [22, 80, 443, 445, 3389, 8080];
  const reverseHostname = async (address) => { try { return (await dns.reverse(address))[0] || ''; } catch { return ''; } };
  const probe = (address, port) => new Promise((resolve) => {
    const socket = net.createConnection({ host: address, port });
    let settled = false;
    const finish = (open) => { if (settled) return; settled = true; socket.destroy(); resolve(open); };
    socket.setTimeout(180, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
  for (let offset = 0; offset < candidates.length; offset += 16) {
    const batch = candidates.slice(offset, offset + 16);
    const found = await Promise.all(batch.map(async (address) => {
      const openPorts = [];
      for (const port of commonPorts) if (await probe(address, port)) openPorts.push(port);
      return openPorts.length || localAddresses.includes(address) ? { address, openPorts } : null;
    }));
    for (const result of found.filter(Boolean)) {
      const hostname = localAddresses.includes(result.address) ? os.hostname() : await reverseHostname(result.address);
      const role = inferDeviceRole(result.openPorts, hostname);
      discoveries.push({
        id: createId('discovery'), networkId: network.id, ip: result.address,
        hostname, vendor: localAddresses.includes(result.address) ? 'Local interface' : 'Unidentified',
        ports: result.openPorts, services: classifyServices(result.openPorts), role, deviceType: deviceTypeForRole(role),
        description: `Observed ${result.openPorts.length} open service${result.openPorts.length === 1 ? '' : 's'}`,
        status: 'pending', discoveredAt: new Date().toISOString(),
      });
    }
  }
  state.discoveries = [...discoveries, ...state.discoveries];
  addChange(state, 'scan', `Scan completed for ${network.name}`);
  await saveState(dataPath, state);
}

async function api(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', service: 'lantern', data: dataPath });
  if (request.method === 'GET' && url.pathname === '/api/summary') return json(response, 200, summary());
  if (request.method === 'GET' && url.pathname === '/api/export') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="lantern-backup.json"' });
    return response.end(JSON.stringify(exportPayload(state), null, 2));
  }
  if (request.method === 'GET' && url.pathname.startsWith('/api/networks/') && url.pathname.endsWith('/addresses')) {
    const networkId = url.pathname.split('/')[3];
    const network = state.networks.find((item) => item.id === networkId);
    if (!network) return json(response, 404, { error: 'Network not found' });
    const used = state.addresses.filter((address) => address.networkId === networkId).map((address) => ({ ...address, deviceName: state.devices.find((device) => device.id === address.deviceId)?.name || null })).sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
    const usedSet = new Set(used.map((address) => address.ip));
    const unused = usableIps(network.cidr).filter((ip) => !usedSet.has(ip)).map((ip) => ({ ip, description: '' }));
    return json(response, 200, { network, used, unused });
  }
  if (request.method === 'POST' && url.pathname.startsWith('/api/networks/') && url.pathname.endsWith('/addresses')) {
    const networkId = url.pathname.split('/')[3];
    const network = state.networks.find((item) => item.id === networkId);
    if (!network) return json(response, 404, { error: 'Network not found' });
    const input = await body(request);
    if (!input.ip || !isIpInCidr(input.ip, network.cidr)) return json(response, 400, { error: 'IP address is outside this network' });
    if (addressAlreadyAllocated(state.addresses, input.ip)) return json(response, 409, { error: 'That IP address is already allocated' });
    const address = { id: createId('ip'), ...buildAddress({ networkId, ip: input.ip, hostname: input.hostname, description: input.description, deviceId: input.deviceId || null }) };
    state.addresses.push(address);
    addChange(state, 'ip', `Reserved ${address.ip} in ${network.name}`);
    await saveState(dataPath, state);
    return json(response, 201, address);
  }
  if (request.method === 'PATCH' && url.pathname.startsWith('/api/addresses/')) {
    const id = url.pathname.split('/')[3];
    const address = state.addresses.find((item) => item.id === id);
    if (!address) return json(response, 404, { error: 'Address not found' });
    const input = await body(request);
    const network = state.networks.find((item) => item.id === address.networkId);
    const nextIp = String(input.ip || address.ip).trim();
    if (!network || !isIpInCidr(nextIp, network.cidr)) return json(response, 400, { error: 'IP address is outside this network' });
    if (nextIp !== address.ip && addressAlreadyAllocated(state.addresses, nextIp)) return json(response, 409, { error: 'That IP address is already allocated' });
    address.ip = nextIp;
    address.description = String(input.description || '').trim();
    address.hostname = String(input.hostname || address.hostname || '').trim();
    addChange(state, 'ip', `Updated ${address.ip}`);
    await saveState(dataPath, state);
    return json(response, 200, address);
  }
  if (request.method === 'POST' && url.pathname === '/api/import') {
    try {
      state = validateImport(await body(request));
    } catch (error) {
      return json(response, 400, { error: error.message });
    }
    addChange(state, 'system', 'Inventory restored from backup');
    await saveState(dataPath, state);
    return json(response, 200, { ok: true, counts: summary().counts });
  }
  if (request.method === 'POST' && url.pathname === '/api/scan') {
    const input = await body(request);
    const network = state.networks.find((item) => item.id === input.networkId);
    if (!network) return json(response, 404, { error: 'Network not found' });
    try {
      await scanNetwork(network);
    } catch (error) {
      return json(response, 400, { error: error.message });
    }
    return json(response, 202, { ok: true });
  }
  if (request.method === 'POST' && url.pathname === '/api/networks') {
    const input = await body(request);
    const name = String(input.name || '').trim();
    if (!name) return json(response, 400, { error: 'Network name is required' });
    let details;
    try { details = cidrInfo(input.cidr); } catch (error) { return json(response, 400, { error: error.message }); }
    if (state.networks.some((network) => network.cidr === input.cidr)) return json(response, 409, { error: 'That network already exists' });
    const network = { id: createId('net'), name, cidr: input.cidr, vlan: Number(input.vlan) || null, siteId: state.sites[0]?.id || null };
    state.networks.push(network);
    addChange(state, 'network', `Added ${network.name} (${details.network}/${details.prefix})`);
    await saveState(dataPath, state);
    return json(response, 201, network);
  }
  if (request.method === 'POST' && url.pathname === '/api/sites') {
    const input = await body(request);
    const name = String(input.name || '').trim();
    if (!name) return json(response, 400, { error: 'Site name is required' });
    const site = { id: createId('site'), name, location: String(input.location || '').trim(), description: String(input.description || '').trim() };
    state.sites.push(site);
    addChange(state, 'site', `Added ${site.name}`);
    await saveState(dataPath, state);
    return json(response, 201, site);
  }
  if (request.method === 'POST' && url.pathname === '/api/racks') {
    const input = await body(request);
    const name = String(input.name || '').trim();
    const height = Number(input.height || 12);
    if (!name) return json(response, 400, { error: 'Rack name is required' });
    if (!Number.isInteger(height) || height < 1 || height > 60) return json(response, 400, { error: 'Rack height must be between 1U and 60U' });
    const rack = { id: createId('rack'), siteId: input.siteId || state.sites[0]?.id || null, name, height, width: Number(input.width) || 600 };
    state.racks.push(rack);
    addChange(state, 'rack', `Added ${rack.name}`);
    await saveState(dataPath, state);
    return json(response, 201, rack);
  }
  if (request.method === 'POST' && url.pathname === '/api/devices') {
    const input = await body(request);
    let details;
    try { details = validateDeviceInput(input); } catch (error) { return json(response, 400, { error: error.message }); }
    const rack = input.rackId ? state.racks.find((item) => item.id === input.rackId) : null;
    const rackUnit = Number(input.rackUnit) || null;
    if (input.rackId && !rack) return json(response, 404, { error: 'Rack not found' });
    if (rack && rackUnit && (rackUnit < 1 || rackUnit + details.height - 1 > rack.height)) return json(response, 400, { error: 'Device does not fit in that rack position' });
    if (!rackPlacementAvailable(state.devices, input.rackId, rackUnit, details.height)) return json(response, 409, { error: 'Those rack units are already occupied' });
    const network = input.networkId ? state.networks.find((item) => item.id === input.networkId) : null;
    if (input.networkId && !network) return json(response, 404, { error: 'Network not found' });
    if (input.ip && (!network || !isIpInCidr(input.ip, network.cidr))) return json(response, 400, { error: 'IP address is outside the selected network' });
    const existingAddress = input.ip ? state.addresses.find((address) => address.ip === input.ip) : null;
    if (existingAddress?.deviceId) return json(response, 409, { error: 'That IP is already assigned to an existing device; edit its rack placement instead' });
    const role = input.role || 'Unassigned';
    const device = { id: createId('device'), name: details.name, role, deviceType: input.deviceType || deviceTypeForRole(role), description: String(input.description || '').trim(), rackId: input.rackId || null, rackUnit, height: details.height, status: 'active' };
    state.devices.push(device);
    if (input.ip && existingAddress) Object.assign(existingAddress, buildAddress({ networkId: network.id, ip: input.ip, hostname: input.hostname || device.name, description: input.description, deviceId: device.id, source: existingAddress.source || 'manual' }));
    else if (input.ip) state.addresses.push({ id: createId('ip'), ...buildAddress({ networkId: network.id, ip: input.ip, hostname: input.hostname || device.name, description: input.description, deviceId: device.id }) });
    addChange(state, 'device', `Added ${device.name}`);
    await saveState(dataPath, state);
    return json(response, 201, device);
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/api/devices/')) {
    const id = url.pathname.split('/')[3];
    const device = state.devices.find((item) => item.id === id);
    if (!device) return json(response, 404, { error: 'Device not found' });
    removeDevice(state, id);
    addChange(state, 'device', `Removed ${device.name}; linked IP records released`);
    await saveState(dataPath, state);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'PATCH' && url.pathname.startsWith('/api/devices/')) {
    const id = url.pathname.split('/')[3];
    const device = state.devices.find((item) => item.id === id);
    if (!device) return json(response, 404, { error: 'Device not found' });
    const input = await body(request);
    let details;
    try { details = validateDeviceInput(input); } catch (error) { return json(response, 400, { error: error.message }); }
    const rack = input.rackId ? state.racks.find((item) => item.id === input.rackId) : null;
    const rackUnit = Number(input.rackUnit) || null;
    if (input.rackId && !rack) return json(response, 404, { error: 'Rack not found' });
    if (rack && rackUnit && (rackUnit < 1 || rackUnit + details.height - 1 > rack.height)) return json(response, 400, { error: 'Device does not fit in that rack position' });
    if (!rackPlacementAvailable(state.devices, input.rackId, rackUnit, details.height, id)) return json(response, 409, { error: 'Those rack units are already occupied' });
    const currentAddress = state.addresses.find((address) => address.deviceId === id);
    const nextIp = String(input.ip || '').trim();
    if (nextIp) {
      const network = state.networks.find((item) => item.id === input.networkId);
      if (!network || !isIpInCidr(nextIp, network.cidr)) return json(response, 400, { error: 'IP address is outside the selected network' });
      const conflictingAddress = state.addresses.find((address) => address.ip === nextIp && address.deviceId !== id);
      if (conflictingAddress) return json(response, 409, { error: 'That IP is already assigned to another device' });
      if (currentAddress) Object.assign(currentAddress, buildAddress({ networkId: network.id, ip: nextIp, hostname: input.hostname || details.name, description: input.description, deviceId: id, source: currentAddress.source || 'manual' }));
      else state.addresses.push({ id: createId('ip'), ...buildAddress({ networkId: network.id, ip: nextIp, hostname: input.hostname || details.name, description: input.description, deviceId: id }) });
    } else if (currentAddress) state.addresses = state.addresses.filter((address) => address.id !== currentAddress.id);
    Object.assign(device, { name: details.name, role: input.role || device.role, deviceType: input.deviceType || device.deviceType || deviceTypeForRole(input.role || device.role), description: String(input.description || '').trim(), rackId: input.rackId || null, rackUnit, height: details.height });
    addChange(state, 'device', `Updated ${device.name}`);
    await saveState(dataPath, state);
    return json(response, 200, device);
  }
  if (request.method === 'POST' && url.pathname.startsWith('/api/discoveries/') && url.pathname.endsWith('/confirm')) {
    const id = url.pathname.split('/')[3];
    const discovery = state.discoveries.find((item) => item.id === id);
    if (!discovery) return json(response, 404, { error: 'Discovery not found' });
    const input = await body(request);
    const device = { id: createId('device'), name: input.name?.trim() || discovery.hostname || discovery.ip, role: input.role || discovery.role || 'Discovered device', deviceType: discovery.deviceType || 'server', description: discovery.description || '', rackId: input.rackId || null, rackUnit: Number(input.rackUnit) || null, height: 1, status: 'active' };
    if (addressAlreadyAllocated(state.addresses, discovery.ip)) return json(response, 409, { error: 'That IP is already assigned; merge this observation instead' });
    state.devices.push(device);
    state.addresses.push({ id: createId('ip'), networkId: discovery.networkId, ip: discovery.ip, hostname: device.name, description: discovery.description || '', deviceId: device.id, source: 'discovery' });
    discovery.status = 'confirmed';
    addChange(state, 'device', `Confirmed ${device.name} from discovery`);
    await saveState(dataPath, state);
    return json(response, 201, device);
  }
  if (request.method === 'POST' && url.pathname.startsWith('/api/discoveries/') && url.pathname.endsWith('/ignore')) {
    const id = url.pathname.split('/')[3];
    const discovery = state.discoveries.find((item) => item.id === id);
    if (!discovery) return json(response, 404, { error: 'Discovery not found' });
    discovery.status = 'ignored';
    addChange(state, 'discovery', `Ignored discovery at ${discovery.ip}`);
    await saveState(dataPath, state);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && url.pathname.startsWith('/api/discoveries/') && url.pathname.endsWith('/merge')) {
    const id = url.pathname.split('/')[3];
    const discovery = state.discoveries.find((item) => item.id === id);
    if (!discovery) return json(response, 404, { error: 'Discovery not found' });
    const input = await body(request);
    const device = state.devices.find((item) => item.id === input.deviceId);
    if (!device) return json(response, 404, { error: 'Device not found' });
    if (addressAlreadyAllocated(state.addresses, discovery.ip)) return json(response, 409, { error: 'That IP is already assigned' });
    state.addresses.push(buildAddress({ networkId: discovery.networkId, ip: discovery.ip, hostname: device.name, deviceId: device.id, source: 'discovery' }));
    discovery.status = 'merged';
    addChange(state, 'discovery', `Merged ${discovery.ip} into ${device.name}`);
    await saveState(dataPath, state);
    return json(response, 200, { ok: true });
  }
  return json(response, 404, { error: 'Not found' });
}

async function serveStatic(response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(root, 'public', requested);
  if (!filePath.startsWith(path.join(root, 'public'))) return json(response, 400, { error: 'Invalid path' });
  try {
    const content = await fs.readFile(filePath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
    response.writeHead(200, { 'content-type': `${types[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(content);
  } catch { json(response, 404, { error: 'Not found' }); }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await api(request, response, url);
    else await serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    json(response, 500, { error: 'Unexpected server error' });
  }
});

server.listen(port, () => console.log(`Lantern running at http://localhost:${port}`));
