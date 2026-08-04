import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import net from 'node:net';
import { loadState, saveState, seedState, createId, addChange } from './src/store.js';
import { cidrInfo, isIpInCidr, usableIps } from './src/ipam.js';

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
    racks: state.racks.map((rack) => ({ ...rack, devices: state.devices.filter((device) => device.rackId === rack.id) })),
    devices: state.devices,
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
    for (const result of found.filter(Boolean)) discoveries.push({
      id: createId('discovery'), networkId: network.id, ip: result.address,
      hostname: localAddresses.includes(result.address) ? os.hostname() : '',
      vendor: localAddresses.includes(result.address) ? 'Local interface' : 'Unidentified',
      ports: result.openPorts, status: 'pending', discoveredAt: new Date().toISOString(),
    });
  }
  state.discoveries = [...discoveries, ...state.discoveries];
  addChange(state, 'scan', `Scan completed for ${network.name}`);
  await saveState(dataPath, state);
}

async function api(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/summary') return json(response, 200, summary());
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
  if (request.method === 'POST' && url.pathname === '/api/devices') {
    const input = await body(request);
    if (!input.name?.trim()) return json(response, 400, { error: 'Device name is required' });
    const device = { id: createId('device'), name: input.name.trim(), role: input.role || 'Unassigned', rackId: input.rackId || null, rackUnit: Number(input.rackUnit) || null, height: Number(input.height) || 1, status: 'active' };
    state.devices.push(device);
    addChange(state, 'device', `Added ${device.name}`);
    await saveState(dataPath, state);
    return json(response, 201, device);
  }
  if (request.method === 'POST' && url.pathname.startsWith('/api/discoveries/') && url.pathname.endsWith('/confirm')) {
    const id = url.pathname.split('/')[3];
    const discovery = state.discoveries.find((item) => item.id === id);
    if (!discovery) return json(response, 404, { error: 'Discovery not found' });
    const input = await body(request);
    const device = { id: createId('device'), name: input.name?.trim() || discovery.hostname || discovery.ip, role: input.role || 'Discovered device', rackId: input.rackId || null, rackUnit: Number(input.rackUnit) || null, height: 1, status: 'active' };
    state.devices.push(device);
    state.addresses.push({ id: createId('ip'), networkId: discovery.networkId, ip: discovery.ip, hostname: device.name, deviceId: device.id, source: 'discovery' });
    discovery.status = 'confirmed';
    addChange(state, 'device', `Confirmed ${device.name} from discovery`);
    await saveState(dataPath, state);
    return json(response, 201, device);
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
