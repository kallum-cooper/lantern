export const DEVICE_PROFILES = [
  { id: 'server-1u', label: '1U server', asset: 'server-1u.png' },
  { id: 'server-2u', label: '2U server', asset: 'server-2u.png' },
  { id: 'server-tower', label: 'Tower server', asset: 'server-tower.png' },
  { id: 'switch-24', label: '24-port switch', asset: 'switch-24.png' },
  { id: 'switch-48', label: '48-port switch', asset: 'switch-48.png' },
  { id: 'firewall', label: 'Firewall / router', asset: 'firewall.png' },
  { id: 'nas', label: 'NAS', asset: 'nas.png' },
  { id: 'appliance', label: 'Small appliance', asset: 'appliance.png' },
];

export function validProfile(id) {
  return DEVICE_PROFILES.some((profile) => profile.id === id);
}

export function profileFor(id) {
  return DEVICE_PROFILES.find((profile) => profile.id === id) || DEVICE_PROFILES[0];
}
