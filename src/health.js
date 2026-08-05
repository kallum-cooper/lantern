import net from 'node:net';

export function healthStatus(results = []) {
  if (!results.length) return 'unknown';
  const open = results.filter((result) => result.open).length;
  if (open === results.length) return 'online';
  if (open > 0) return 'degraded';
  return 'offline';
}

export function tcpProbe(address, port, timeout = 350) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: address, port });
    let settled = false;
    const finish = (open) => { if (settled) return; settled = true; socket.destroy(); resolve(open); };
    socket.setTimeout(timeout, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export async function checkDeviceHealth(device, services = [], probe = tcpProbe) {
  const ip = device.address?.ip || device.ip || '';
  const ports = [...new Set(services.filter((service) => service.deviceId === device.id && service.enabled !== false && String(service.protocol || 'tcp').toLowerCase() === 'tcp').map((service) => Number(service.port)).filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535))];
  if (!ip || !ports.length) return { status: 'unknown', results: [] };
  const results = await Promise.all(ports.map(async (port) => ({ port, open: await probe(ip, port) })));
  return { status: healthStatus(results), results };
}
