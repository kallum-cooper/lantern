const serviceNames = new Map([[22, 'SSH'], [53, 'DNS'], [80, 'HTTP'], [443, 'HTTPS'], [445, 'SMB'], [3389, 'RDP'], [8080, 'HTTP-alt']]);

export function classifyServices(ports = []) {
  return ports.filter((port) => serviceNames.has(Number(port))).map((port) => serviceNames.get(Number(port)));
}

export function inferDeviceRole(ports = [], hostname = '') {
  const name = String(hostname).toLowerCase();
  if (ports.includes(53) || /router|gateway|firewall|opnsense|pfsense|mikrotik|unifi/.test(name)) return 'Router / gateway';
  if (ports.includes(22) || ports.includes(3389) || /server|nas|proxmox|truenas|ubuntu|debian|windows/.test(name)) return 'Server';
  if (ports.some((port) => [80, 443, 8080].includes(port)) || /switch|ap|access.point/.test(name)) return 'Network device';
  return 'Unknown device';
}

export function deviceTypeForRole(role = '') {
  if (/router|gateway|firewall/i.test(role)) return 'router';
  if (/switch|network/i.test(role)) return 'switch';
  if (/server|nas|hypervisor/i.test(role)) return 'server';
  return 'server';
}
