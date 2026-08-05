export const DEVICE_PROFILES = [
  { id: 'generic-1u', label: 'Generic 1U server', brand: 'Generic', asset: 'rack-generic-1u.png', height: 1, rackMount: true, passive: false },
  { id: 'generic-2u', label: 'Generic 2U server', brand: 'Generic', asset: 'rack-generic-2u.png', height: 2, rackMount: true, passive: false },
  { id: 'unifi-switch-24', label: 'Ubiquiti UniFi 24-port switch', brand: 'Ubiquiti', asset: 'rack-unifi-switch-24.png', height: 1, rackMount: true, passive: false },
  { id: 'cisco-switch-24', label: 'Cisco-style 24-port switch', brand: 'Cisco', asset: 'rack-cisco-switch-24.png', height: 1, rackMount: true, passive: false },
  { id: 'switch-24', label: 'Generic 24-port switch', brand: 'Generic', asset: 'rack-switch-24.png', height: 1, rackMount: true, passive: false },
  { id: 'switch-48', label: 'Generic 48-port switch', brand: 'Generic', asset: 'rack-switch-48.png', height: 1, rackMount: true, passive: false },
  { id: 'router', label: 'Firewall / router', brand: 'Generic', asset: 'rack-router.png', height: 1, rackMount: true, passive: false },
  { id: 'nas-2u', label: 'Rack NAS', brand: 'Generic', asset: 'rack-nas-2u.png', height: 2, rackMount: true, passive: false },
  { id: 'ups-2u', label: 'Rack UPS', brand: 'APC-style', asset: 'rack-ups-2u.png', height: 2, rackMount: true, passive: false },
  { id: 'patch-panel-24', label: '24-port patch panel', brand: 'Generic', asset: 'patch-panel-24.png', height: 1, rackMount: true, passive: true },
  { id: 'patch-panel-48', label: '48-port patch panel', brand: 'Generic', asset: 'patch-panel-48.png', height: 1, rackMount: true, passive: true },
  { id: 'appliance-1u', label: '1U network appliance', brand: 'Generic', asset: 'rack-appliance-1u.png', height: 1, rackMount: true, passive: false },
];

const aliases = { 'server-1u': 'generic-1u', 'server-2u': 'generic-2u', 'server-tower': 'generic-1u', 'switch-24': 'switch-24', 'switch-48': 'switch-48', firewall: 'router', nas: 'nas-2u', appliance: 'appliance-1u' };

export function validProfile(id) {
  return DEVICE_PROFILES.some((profile) => profile.id === id) || Boolean(aliases[id]);
}

export function profileFor(id) {
  const normalized = aliases[id] || id;
  return DEVICE_PROFILES.find((profile) => profile.id === normalized) || DEVICE_PROFILES[0];
}

export function rackProfiles() {
  return DEVICE_PROFILES.filter((profile) => profile.rackMount);
}
